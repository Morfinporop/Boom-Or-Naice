const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

const rooms = new Map();
const userSockets = new Map();

const PRIZES = [
  { name: 'Rolex Watch', image: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=300&h=300&fit=crop' },
  { name: 'iPhone 15 Pro', image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&h=300&fit=crop' },
  { name: 'Chanel Bag', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=300&fit=crop' },
  { name: 'MacBook Pro', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop' },
  { name: 'AirPods Max', image: 'https://images.unsplash.com/photo-1625672066578-9b92bf31bbcd?w=300&h=300&fit=crop' },
  { name: 'Louis Vuitton', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=300&h=300&fit=crop' },
  { name: 'PlayStation 5', image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&h=300&fit=crop' },
  { name: 'Gucci Sneakers', image: 'https://images.unsplash.com/photo-1584735175097-719d848f8d24?w=300&h=300&fit=crop' },
  { name: 'Dior Perfume', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=300&h=300&fit=crop' },
  { name: 'Tesla Model S', image: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=300&h=300&fit=crop' },
  { name: 'Cartier Ring', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop' },
  { name: 'Hermès Bag', image: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=300&h=300&fit=crop' },
  { name: 'Balenciaga', image: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=300&h=300&fit=crop' },
  { name: 'Prada Shoes', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&h=300&fit=crop' },
  { name: 'Versace Watch', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=300&fit=crop' },
];

function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRandomPrize() {
  return PRIZES[Math.floor(Math.random() * PRIZES.length)];
}

function broadcastOnlineCount() {
  io.emit('online_count', io.engine.clientsCount);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  broadcastOnlineCount();

  socket.on('create_lobby', ({ playerName, maxPlayers }) => {
    const roomId = generateRoomId();
    
    const room = {
      id: roomId,
      maxPlayers,
      players: [{
        id: socket.id,
        name: playerName,
        selectedCircles: [],
        guesses: [],
        correctGuesses: [],
        canSelect: false,
        prize: getRandomPrize(),
        score: 0,
      }],
      state: 'waiting',
      currentTurn: 0,
      host: socket.id,
      turnStartTime: null,
    };

    rooms.set(roomId, room);
    userSockets.set(socket.id, roomId);
    socket.join(roomId);

    socket.emit('lobby_created', { room });
    broadcastOnlineCount();
  });

  socket.on('join_lobby', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Лобби не найдено ❌' });
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', { message: 'Лобби заполнено ❌' });
      return;
    }

    if (room.state !== 'waiting') {
      socket.emit('error', { message: 'Игра уже началась ❌' });
      return;
    }

    room.players.push({
      id: socket.id,
      name: playerName,
      selectedCircles: [],
      guesses: [],
      correctGuesses: [],
      canSelect: false,
      prize: getRandomPrize(),
      score: 0,
    });

    userSockets.set(socket.id, roomId);
    socket.join(roomId);

    socket.emit('lobby_joined', { room });
    io.to(roomId).emit('lobby_updated', { room });
    broadcastOnlineCount();
  });

  socket.on('start_game', ({ roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room || room.host !== socket.id || room.players.length < 2) return;

    room.state = 'selecting';
    room.currentTurn = 0;
    room.players[0].canSelect = true;

    io.to(roomId).emit('game_started', { room });
  });

  socket.on('select_circle', ({ roomId, circleIndex }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.canSelect) return;

    const index = player.selectedCircles.indexOf(circleIndex);
    if (index > -1) {
      player.selectedCircles.splice(index, 1);
    } else if (player.selectedCircles.length < 3) {
      player.selectedCircles.push(circleIndex);
    }

    socket.emit('selection_updated', { selectedCircles: player.selectedCircles });
  });

  socket.on('confirm_selection', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.canSelect || player.selectedCircles.length !== 3) return;

    player.canSelect = false;
    room.currentTurn++;

    if (room.currentTurn < room.players.length) {
      room.players[room.currentTurn].canSelect = true;
      io.to(roomId).emit('next_player_selecting', { room });
    } else {
      room.state = 'guessing';
      room.currentTurn = 0;
      room.turnStartTime = Date.now();
      io.to(roomId).emit('guessing_phase', { room });
    }
  });

  socket.on('make_guess', ({ roomId, circleIndex }) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'guessing') return;

    const guesser = room.players[room.currentTurn];
    if (guesser.id !== socket.id || guesser.guesses.includes(circleIndex)) return;

    guesser.guesses.push(circleIndex);
    guesser.lastMove = Date.now();

    let correct = false;
    room.players.forEach((player, idx) => {
      if (idx !== room.currentTurn && player.selectedCircles.includes(circleIndex)) {
        correct = true;
        if (!guesser.correctGuesses.includes(circleIndex)) {
          guesser.correctGuesses.push(circleIndex);
          guesser.score += 100;
          socket.emit('prize_won', { prize: player.prize });
        }
      }
    });

    if (guesser.correctGuesses.length >= 3) {
      room.state = 'finished';
      room.winner = guesser.id;
      io.to(roomId).emit('game_finished', { room });
    } else {
      room.currentTurn = (room.currentTurn + 1) % room.players.length;
      room.turnStartTime = Date.now();
      io.to(roomId).emit('guess_made', { room, correct });
    }
  });

  socket.on('send_chat', ({ roomId, text }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const message = {
      id: Date.now().toString(),
      playerId: socket.id,
      playerName: player.name,
      text,
      timestamp: Date.now(),
    };

    io.to(roomId).emit('chat_message', { message });
  });

  socket.on('send_emoji', ({ roomId, emoji }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    io.to(roomId).emit('emoji_sent', { playerId: socket.id, emoji });
  });

  socket.on('leave_lobby', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== socket.id);
    
    if (room.players.length === 0) {
      rooms.delete(roomId);
    } else {
      if (room.host === socket.id) {
        room.host = room.players[0].id;
      }
      io.to(roomId).emit('lobby_updated', { room });
    }

    userSockets.delete(socket.id);
    socket.leave(roomId);
    broadcastOnlineCount();
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const roomId = userSockets.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          if (room.host === socket.id) {
            room.host = room.players[0].id;
          }
          io.to(roomId).emit('lobby_updated', { room });
        }
      }
      userSockets.delete(socket.id);
    }

    broadcastOnlineCount();
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
