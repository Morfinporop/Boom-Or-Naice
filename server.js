import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve static files from dist
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 10000,
});

// ──── Game Storage ────
const games = new Map();
const waitingPlayers = [];
const timers = new Map();

function generateId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let r = '';
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function createGame(p1Id) {
  const id = generateId();
  const game = {
    id,
    players: {
      player1: { id: p1Id, ready: false, positions: [], item: null },
      player2: null,
    },
    board: Array(9).fill(null),
    currentPlayer: null,
    phase: 'waiting',
    timer: 30,
    winner: null,
    createdAt: Date.now(),
  };
  games.set(id, game);
  return game;
}

function clearTimer(gid) {
  if (timers.has(gid)) {
    clearInterval(timers.get(gid));
    timers.delete(gid);
  }
}

function startTimer(gid) {
  clearTimer(gid);
  const game = games.get(gid);
  if (!game || game.phase !== 'playing') return;
  game.timer = 30;

  const interval = setInterval(() => {
    const g = games.get(gid);
    if (!g || g.phase !== 'playing') { clearInterval(interval); timers.delete(gid); return; }
    g.timer--;
    if (g.timer <= 0) {
      clearInterval(interval);
      timers.delete(gid);
      g.currentPlayer = g.currentPlayer === 'player1' ? 'player2' : 'player1';
      g.timer = 30;
      io.to(gid).emit('turnChange', { currentPlayer: g.currentPlayer, timer: g.timer });
      startTimer(gid);
    } else {
      io.to(gid).emit('timerUpdate', g.timer);
    }
  }, 1000);
  timers.set(gid, interval);
}

function checkWinner(gid) {
  const game = games.get(gid);
  if (!game) return;

  const p1Cells = game.board.filter(c => c && c.player === 'player1');
  const p1Rev = p1Cells.filter(c => c.revealed);
  const p2Cells = game.board.filter(c => c && c.player === 'player2');
  const p2Rev = p2Cells.filter(c => c.revealed);

  if (p1Rev.length === 3) {
    game.phase = 'finished';
    game.winner = 'player2';
    clearTimer(gid);
    io.to(gid).emit('gameOver', { winner: 'player2', item: game.players.player2?.item });
    setTimeout(() => games.delete(gid), 300000);
  } else if (p2Rev.length === 3) {
    game.phase = 'finished';
    game.winner = 'player1';
    clearTimer(gid);
    io.to(gid).emit('gameOver', { winner: 'player1', item: game.players.player1?.item });
    setTimeout(() => games.delete(gid), 300000);
  } else {
    game.currentPlayer = game.currentPlayer === 'player1' ? 'player2' : 'player1';
    game.timer = 30;
    io.to(gid).emit('turnChange', { currentPlayer: game.currentPlayer, timer: game.timer });
    startTimer(gid);
  }
}

// Cleanup old games every 10 min
setInterval(() => {
  const now = Date.now();
  for (const [id, g] of games.entries()) {
    if (now - g.createdAt > 3600000) {
      clearTimer(id);
      games.delete(id);
    }
  }
}, 600000);

// ──── Socket.io ────
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  socket.on('createGame', () => {
    const game = createGame(socket.id);
    socket.join(game.id);
    socket.emit('gameCreated', { gameId: game.id, playerNumber: 1 });
    console.log(`[*] Game ${game.id} created`);
  });

  socket.on('joinGame', (gameId) => {
    const gid = String(gameId).trim().toLowerCase();
    const game = games.get(gid);
    if (!game) { socket.emit('error', 'Игра не найдена. Проверьте код.'); return; }
    if (game.players.player2) { socket.emit('error', 'Игра уже заполнена.'); return; }
    if (game.players.player1.id === socket.id) { socket.emit('error', 'Нельзя присоединиться к своей игре.'); return; }

    game.players.player2 = { id: socket.id, ready: false, positions: [], item: null };
    game.phase = 'setup';
    socket.join(gid);

    io.to(gid).emit('gameStarted', { gameId: gid });
    socket.emit('playerAssigned', { playerNumber: 2 });
    io.to(game.players.player1.id).emit('playerAssigned', { playerNumber: 1 });
    console.log(`[*] Player 2 joined ${gid}`);
  });

  socket.on('findGame', () => {
    // Clean stale
    for (let i = waitingPlayers.length - 1; i >= 0; i--) {
      if (!waitingPlayers[i].connected) waitingPlayers.splice(i, 1);
    }

    if (waitingPlayers.length > 0 && waitingPlayers[0].id !== socket.id) {
      const p1 = waitingPlayers.shift();
      const game = createGame(p1.id);
      game.players.player2 = { id: socket.id, ready: false, positions: [], item: null };
      game.phase = 'setup';
      p1.join(game.id);
      socket.join(game.id);
      io.to(game.id).emit('gameStarted', { gameId: game.id });
      p1.emit('playerAssigned', { playerNumber: 1 });
      socket.emit('playerAssigned', { playerNumber: 2 });
      console.log(`[*] Quick match ${game.id}`);
    } else {
      if (!waitingPlayers.find(s => s.id === socket.id)) waitingPlayers.push(socket);
      socket.emit('waitingForPlayer');
    }
  });

  socket.on('selectItem', ({ gameId, item }) => {
    const game = games.get(gameId);
    if (!game) return;
    const pn = game.players.player1.id === socket.id ? 'player1' : 'player2';
    game.players[pn].item = item;
    io.to(gameId).emit('itemSelected', { playerNumber: pn, item });
  });

  socket.on('selectPositions', ({ gameId, positions }) => {
    const game = games.get(gameId);
    if (!game) return;
    const pn = game.players.player1.id === socket.id ? 'player1' : 'player2';
    if (!Array.isArray(positions) || positions.length !== 3) return;
    if (!positions.every(p => p >= 0 && p < 9)) return;

    game.players[pn].positions = positions;
    game.players[pn].ready = true;
    positions.forEach(pos => { game.board[pos] = { player: pn, revealed: false }; });
    io.to(gameId).emit('positionsSelected', { playerNumber: pn });

    if (game.players.player1.ready && game.players.player2?.ready) {
      game.phase = 'playing';
      game.currentPlayer = 'player1';
      game.timer = 30;
      io.to(gameId).emit('gamePhase', {
        phase: 'playing',
        currentPlayer: game.currentPlayer,
        timer: game.timer,
      });
      startTimer(gameId);
      console.log(`[>] Game started ${gameId}`);
    }
  });

  socket.on('selectCell', ({ gameId, position }) => {
    const game = games.get(gameId);
    if (!game || game.phase !== 'playing') return;
    const pn = game.players.player1.id === socket.id ? 'player1' : 'player2';
    if (game.currentPlayer !== pn) return;
    if (position < 0 || position > 8) return;
    const cell = game.board[position];
    if (cell && cell.revealed) return;

    if (cell) {
      game.board[position].revealed = true;
    } else {
      game.board[position] = { player: 'empty', revealed: true };
    }

    clearTimer(gameId);
    io.to(gameId).emit('cellRevealed', { position, player: cell ? cell.player : 'empty' });
    setTimeout(() => checkWinner(gameId), 400);
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    const wIdx = waitingPlayers.findIndex(s => s.id === socket.id);
    if (wIdx !== -1) waitingPlayers.splice(wIdx, 1);

    for (const [gid, game] of games.entries()) {
      if (game.players.player1?.id === socket.id || game.players.player2?.id === socket.id) {
        io.to(gid).emit('playerDisconnected');
        clearTimer(gid);
        games.delete(gid);
        break;
      }
    }
  });
});

// ──── SPA Fallback (Express 5 compatible) ────
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/socket.io')) {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send('Building... Please wait and refresh.');
    }
  } else {
    next();
  }
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  LUXURY BATTLE Server`);
  console.log(`  Port: ${PORT}`);
  console.log(`  http://localhost:${PORT}\n`);
});
