import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 8080;

// Serve static files
app.use(express.static(join(__dirname, 'dist')));

// Games storage
const games = new Map();
const waitingPlayers = [];
let onlinePlayers = 0;

// Generate game ID
function generateGameId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create new game
function createGame(playerId, playerName) {
  const gameId = generateGameId();
  const game = {
    id: gameId,
    players: [
      {
        id: playerId,
        name: playerName,
        item: null,
        positions: [],
        revealed: [],
        ready: false,
        score: 0
      }
    ],
    currentTurn: null,
    phase: 'waiting',
    winner: null,
    lastMove: null,
    createdAt: Date.now()
  };
  games.set(gameId, game);
  return game;
}

// Join game
function joinGame(gameId, playerId, playerName) {
  const game = games.get(gameId);
  if (!game) return null;
  if (game.players.length >= 2) return null;
  if (game.players.find(p => p.id === playerId)) return game;
  
  game.players.push({
    id: playerId,
    name: playerName,
    item: null,
    positions: [],
    revealed: [],
    ready: false,
    score: 0
  });
  
  game.phase = 'selecting';
  return game;
}

// Get sanitized game state (hide opponent positions until revealed)
function getSanitizedGame(game, forPlayerId) {
  const sanitized = {
    ...game,
    players: game.players.map(player => {
      if (player.id === forPlayerId) {
        return player;
      }
      // For opponent, only show revealed positions
      return {
        ...player,
        positions: player.revealed || []
      };
    })
  };
  return sanitized;
}

// Broadcast game update
function broadcastGameUpdate(game) {
  game.players.forEach(player => {
    const socket = io.sockets.sockets.get(player.id);
    if (socket) {
      socket.emit('gameUpdated', getSanitizedGame(game, player.id));
    }
  });
}

// Check for winner
function checkWinner(game) {
  for (const player of game.players) {
    const opponent = game.players.find(p => p.id !== player.id);
    if (opponent && player.score >= 3) {
      return player.id;
    }
  }
  return null;
}

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  onlinePlayers++;
  io.emit('onlinePlayers', onlinePlayers);

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    onlinePlayers = Math.max(0, onlinePlayers - 1);
    io.emit('onlinePlayers', onlinePlayers);
    
    // Remove from waiting queue
    const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
    if (waitingIndex > -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }
    
    // Handle game disconnection
    games.forEach((game, gameId) => {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex > -1) {
        // Notify other player
        const otherPlayer = game.players.find(p => p.id !== socket.id);
        if (otherPlayer) {
          const otherSocket = io.sockets.sockets.get(otherPlayer.id);
          if (otherSocket) {
            game.phase = 'finished';
            game.winner = otherPlayer.id;
            otherSocket.emit('gameEnded', { winner: otherPlayer.id, game: getSanitizedGame(game, otherPlayer.id) });
          }
        }
        games.delete(gameId);
      }
    });
  });

  // Create game
  socket.on('createGame', ({ playerName }) => {
    console.log('Creating game for:', playerName);
    const game = createGame(socket.id, playerName);
    socket.join(game.id);
    socket.emit('gameCreated', getSanitizedGame(game, socket.id));
  });

  // Join game
  socket.on('joinGame', ({ gameId, playerName }) => {
    console.log('Joining game:', gameId, playerName);
    const game = joinGame(gameId.toUpperCase(), socket.id, playerName);
    if (!game) {
      socket.emit('gameError', 'Игра не найдена или уже заполнена');
      return;
    }
    socket.join(game.id);
    broadcastGameUpdate(game);
  });

  // Quick match
  socket.on('quickMatch', ({ playerName }) => {
    console.log('Quick match for:', playerName);
    
    // Find waiting player
    if (waitingPlayers.length > 0) {
      const waitingPlayer = waitingPlayers.shift();
      const waitingSocket = io.sockets.sockets.get(waitingPlayer.id);
      
      if (waitingSocket) {
        // Create game with waiting player
        const game = createGame(waitingPlayer.id, waitingPlayer.name);
        joinGame(game.id, socket.id, playerName);
        
        waitingSocket.join(game.id);
        socket.join(game.id);
        
        broadcastGameUpdate(game);
      } else {
        // Waiting player disconnected, add to queue
        waitingPlayers.push({ id: socket.id, name: playerName });
        const tempGame = createGame(socket.id, playerName);
        socket.emit('gameCreated', getSanitizedGame(tempGame, socket.id));
      }
    } else {
      // No waiting players, add to queue and create game
      waitingPlayers.push({ id: socket.id, name: playerName });
      const game = createGame(socket.id, playerName);
      socket.join(game.id);
      socket.emit('gameCreated', getSanitizedGame(game, socket.id));
    }
  });

  // Select item
  socket.on('selectItem', ({ gameId, item }) => {
    console.log('Select item:', gameId, item.name);
    const game = games.get(gameId);
    if (!game) return;
    
    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;
    
    player.item = item;
    
    // Check if both players selected items
    const allSelected = game.players.every(p => p.item);
    if (allSelected && game.players.length === 2) {
      game.phase = 'placing';
    }
    
    broadcastGameUpdate(game);
  });

  // Confirm positions
  socket.on('confirmPositions', ({ gameId, positions }) => {
    console.log('Confirm positions:', gameId, positions);
    const game = games.get(gameId);
    if (!game) {
      console.log('Game not found');
      return;
    }
    
    const player = game.players.find(p => p.id === socket.id);
    if (!player) {
      console.log('Player not found');
      return;
    }
    
    if (positions.length !== 3) {
      console.log('Invalid positions count');
      return;
    }
    
    player.positions = positions;
    player.revealed = [];
    player.ready = true;
    
    console.log('Player ready:', player.name, player.positions);
    
    // Check if both players ready
    const allReady = game.players.every(p => p.ready);
    console.log('All ready:', allReady, game.players.map(p => ({ name: p.name, ready: p.ready })));
    
    if (allReady && game.players.length === 2) {
      game.phase = 'playing';
      // Random first turn
      game.currentTurn = game.players[Math.floor(Math.random() * 2)].id;
      console.log('Game started, first turn:', game.currentTurn);
    }
    
    broadcastGameUpdate(game);
  });

  // Reveal cell
  socket.on('revealCell', ({ gameId, cellIndex }) => {
    console.log('Reveal cell:', gameId, cellIndex);
    const game = games.get(gameId);
    if (!game) return;
    if (game.phase !== 'playing') return;
    if (game.currentTurn !== socket.id) return;
    
    const player = game.players.find(p => p.id === socket.id);
    const opponent = game.players.find(p => p.id !== socket.id);
    if (!player || !opponent) return;
    
    // Check if already revealed
    if (opponent.revealed.includes(cellIndex)) return;
    
    game.lastMove = cellIndex;
    
    // Check if hit
    if (opponent.positions.includes(cellIndex)) {
      opponent.revealed.push(cellIndex);
      player.score++;
      console.log('Hit! Score:', player.score);
      
      // Check for winner
      if (player.score >= 3) {
        game.phase = 'finished';
        game.winner = player.id;
        
        game.players.forEach(p => {
          const pSocket = io.sockets.sockets.get(p.id);
          if (pSocket) {
            pSocket.emit('gameEnded', { winner: player.id, game: getSanitizedGame(game, p.id) });
          }
        });
        return;
      }
    }
    
    // Switch turn
    game.currentTurn = opponent.id;
    
    broadcastGameUpdate(game);
  });
});

// SPA fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('.')) {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
