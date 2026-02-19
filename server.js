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
  }
});

// Serve static files from dist
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Game state storage
const games = new Map();
const waitingPlayers = [];
let connectedPlayersCount = 0;

// Generate random game ID
function generateGameId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Broadcast online players count
function broadcastPlayersCount() {
  io.emit('playersOnline', connectedPlayersCount);
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  connectedPlayersCount++;
  broadcastPlayersCount();

  // Create a new game
  socket.on('createGame', () => {
    const gameId = generateGameId();
    
    games.set(gameId, {
      id: gameId,
      player1: socket.id,
      player2: null,
      player1Item: null,
      player2Item: null,
      player1Positions: [],
      player2Positions: [],
      currentPlayer: 'player1',
      phase: 'waiting',
      timer: 30,
      timerInterval: null,
      player1Found: 0,
      player2Found: 0
    });
    
    socket.join(gameId);
    socket.gameId = gameId;
    socket.playerNumber = 'player1';
    
    socket.emit('gameCreated', { gameId, playerNumber: 1 });
    console.log(`Game created: ${gameId}`);
  });

  // Join existing game
  socket.on('joinGame', (gameId) => {
    const game = games.get(gameId.toUpperCase());
    
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }
    
    if (game.player2) {
      socket.emit('error', 'Game is full');
      return;
    }
    
    game.player2 = socket.id;
    socket.join(gameId);
    socket.gameId = gameId;
    socket.playerNumber = 'player2';
    
    socket.emit('playerAssigned', { playerNumber: 2 });
    
    // Start the game
    game.phase = 'setup';
    io.to(gameId).emit('gameStarted');
    console.log(`Player 2 joined game: ${gameId}`);
  });

  // Find a random game (quick match)
  socket.on('findGame', () => {
    if (waitingPlayers.length > 0) {
      const waitingPlayer = waitingPlayers.shift();
      const gameId = generateGameId();
      
      games.set(gameId, {
        id: gameId,
        player1: waitingPlayer.id,
        player2: socket.id,
        player1Item: null,
        player2Item: null,
        player1Positions: [],
        player2Positions: [],
        currentPlayer: 'player1',
        phase: 'setup',
        timer: 30,
        timerInterval: null,
        player1Found: 0,
        player2Found: 0
      });
      
      waitingPlayer.join(gameId);
      waitingPlayer.gameId = gameId;
      waitingPlayer.playerNumber = 'player1';
      
      socket.join(gameId);
      socket.gameId = gameId;
      socket.playerNumber = 'player2';
      
      waitingPlayer.emit('playerAssigned', { playerNumber: 1 });
      socket.emit('playerAssigned', { playerNumber: 2 });
      
      io.to(gameId).emit('gameStarted');
      console.log(`Quick match started: ${gameId}`);
    } else {
      waitingPlayers.push(socket);
      socket.emit('waitingForPlayer');
      console.log('Player waiting for match');
    }
  });

  // Select item
  socket.on('selectItem', ({ gameId, item }) => {
    const game = games.get(gameId);
    if (!game) return;
    
    if (socket.playerNumber === 'player1') {
      game.player1Item = item;
    } else {
      game.player2Item = item;
    }
    
    io.to(gameId).emit('itemSelected', {
      playerNumber: socket.playerNumber,
      item
    });
  });

  // Select positions
  socket.on('selectPositions', ({ gameId, positions }) => {
    const game = games.get(gameId);
    if (!game) return;
    
    if (socket.playerNumber === 'player1') {
      game.player1Positions = positions;
    } else {
      game.player2Positions = positions;
    }
    
    io.to(gameId).emit('positionsSelected', {
      playerNumber: socket.playerNumber
    });
    
    // Check if both players are ready
    if (game.player1Positions.length === 3 && game.player2Positions.length === 3) {
      game.phase = 'playing';
      game.currentPlayer = Math.random() > 0.5 ? 'player1' : 'player2';
      game.timer = 30;
      
      io.to(gameId).emit('gamePhase', {
        phase: 'playing',
        currentPlayer: game.currentPlayer,
        timer: game.timer
      });
      
      startTimer(game, gameId);
      console.log(`Game ${gameId} started, ${game.currentPlayer} goes first`);
    }
  });

  // Select cell to reveal
  socket.on('selectCell', ({ gameId, position }) => {
    const game = games.get(gameId);
    if (!game || game.phase !== 'playing') return;
    
    if (socket.playerNumber !== game.currentPlayer) {
      return;
    }
    
    // Determine which player's positions to check
    const opponentPositions = socket.playerNumber === 'player1' 
      ? game.player2Positions 
      : game.player1Positions;
    
    const isHit = opponentPositions.includes(position);
    
    io.to(gameId).emit('cellRevealed', {
      position,
      player: socket.playerNumber,
      isHit
    });
    
    // Update found count
    if (isHit) {
      if (socket.playerNumber === 'player1') {
        game.player1Found++;
      } else {
        game.player2Found++;
      }
      
      // Check for win
      const found = socket.playerNumber === 'player1' ? game.player1Found : game.player2Found;
      if (found >= 3) {
        clearInterval(game.timerInterval);
        game.phase = 'finished';
        
        const winnerItem = socket.playerNumber === 'player1' ? game.player2Item : game.player1Item;
        io.to(gameId).emit('gameOver', {
          winner: socket.playerNumber,
          item: winnerItem
        });
        
        // Clean up game after delay
        setTimeout(() => {
          games.delete(gameId);
        }, 60000);
        
        return;
      }
    }
    
    // Switch turns
    game.currentPlayer = game.currentPlayer === 'player1' ? 'player2' : 'player1';
    game.timer = 30;
    
    io.to(gameId).emit('turnChange', {
      currentPlayer: game.currentPlayer,
      timer: game.timer
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    connectedPlayersCount--;
    broadcastPlayersCount();
    
    // Remove from waiting list
    const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
    if (waitingIndex > -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }
    
    // Notify opponent if in game
    if (socket.gameId) {
      const game = games.get(socket.gameId);
      if (game) {
        clearInterval(game.timerInterval);
        socket.to(socket.gameId).emit('playerDisconnected');
        games.delete(socket.gameId);
      }
    }
  });
});

function startTimer(game, gameId) {
  if (game.timerInterval) {
    clearInterval(game.timerInterval);
  }
  
  game.timerInterval = setInterval(() => {
    game.timer--;
    
    if (game.timer <= 0) {
      // Auto switch turn
      game.currentPlayer = game.currentPlayer === 'player1' ? 'player2' : 'player1';
      game.timer = 30;
      
      io.to(gameId).emit('turnChange', {
        currentPlayer: game.currentPlayer,
        timer: game.timer
      });
    } else {
      io.to(gameId).emit('timerUpdate', game.timer);
    }
  }, 1000);
}

const PORT = process.env.PORT || 8080;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
