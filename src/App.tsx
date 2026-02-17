import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Prize {
  name: string;
  image: string;
}

interface Player {
  id: string;
  name: string;
  selectedCircles: number[];
  guesses: number[];
  correctGuesses: number[];
  canSelect: boolean;
  prize: Prize;
  score: number;
  lastMove?: number;
}

interface Room {
  id: string;
  maxPlayers: number;
  players: Player[];
  state: 'waiting' | 'selecting' | 'guessing' | 'finished';
  currentTurn: number;
  host: string;
  winner?: string;
  turnStartTime?: number;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

let socket: Socket;

const EMOJIS = ['🔥', '😎', '💯', '⚡', '🎯', '👑', '💎', '🌟'];

export function App() {
  const [screen, setScreen] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [mySelection, setMySelection] = useState<number[]>([]);
  const [wonPrizes, setWonPrizes] = useState<Prize[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showEmojis, setShowEmojis] = useState(false);
  const [soundWave, setSoundWave] = useState(false);
  const [notification, setNotification] = useState('');
  const [stats, setStats] = useState({ wins: 0, gamesPlayed: 0, prizesWon: 0 });
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedStats = localStorage.getItem('mysteryCirclesStats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  useEffect(() => {
    const socketUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : window.location.origin;
    
    socket = io(socketUrl);

    socket.on('online_count', (count: number) => {
      setOnlineCount(count);
    });

    socket.on('lobby_created', ({ room }: { room: Room }) => {
      setRoom(room);
      setScreen('lobby');
      showNotification('Лобби создано! 🎉');
    });

    socket.on('lobby_joined', ({ room }: { room: Room }) => {
      setRoom(room);
      setScreen('lobby');
      setJoinCode('');
      showNotification('Вы присоединились к лобби! 🎮');
    });

    socket.on('lobby_updated', ({ room }: { room: Room }) => {
      setRoom(room);
    });

    socket.on('game_started', ({ room }: { room: Room }) => {
      setRoom(room);
      setScreen('game');
      setMySelection([]);
      setChatMessages([]);
      setWonPrizes([]);
      showNotification('Игра началась! 🚀');
      playSoundEffect();
    });

    socket.on('selection_updated', ({ selectedCircles }: { selectedCircles: number[] }) => {
      setMySelection(selectedCircles);
    });

    socket.on('next_player_selecting', ({ room }: { room: Room }) => {
      setRoom(room);
      showNotification('Следующий игрок выбирает...');
    });

    socket.on('guessing_phase', ({ room }: { room: Room }) => {
      setRoom(room);
      setMySelection([]);
      showNotification('Начинается фаза угадывания! 🎯');
      playSoundEffect();
    });

    socket.on('guess_made', ({ room, correct }: { room: Room, correct: boolean }) => {
      setRoom(room);
      if (correct) {
        createExplosion();
        showNotification('Правильно! ✅');
        playSoundEffect();
      } else {
        showNotification('Мимо! ❌');
      }
    });

    socket.on('prize_won', ({ prize }: { prize: Prize }) => {
      setWonPrizes(prev => [...prev, prize]);
      createExplosion();
      showNotification(`Приз получен: ${prize.name}! 🎁`);
      playSoundEffect();
      setStats(prev => {
        const newStats = { ...prev, prizesWon: prev.prizesWon + 1 };
        localStorage.setItem('mysteryCirclesStats', JSON.stringify(newStats));
        return newStats;
      });
    });

    socket.on('game_finished', ({ room }: { room: Room }) => {
      setRoom(room);
      const isWinner = room.winner === socket.id;
      if (isWinner) {
        showNotification('🏆 ПОБЕДА! 🏆');
        createMassiveExplosion();
        setStats(prev => {
          const newStats = { ...prev, wins: prev.wins + 1, gamesPlayed: prev.gamesPlayed + 1 };
          localStorage.setItem('mysteryCirclesStats', JSON.stringify(newStats));
          return newStats;
        });
      } else {
        showNotification('Игра окончена');
        setStats(prev => {
          const newStats = { ...prev, gamesPlayed: prev.gamesPlayed + 1 };
          localStorage.setItem('mysteryCirclesStats', JSON.stringify(newStats));
          return newStats;
        });
      }
    });

    socket.on('chat_message', ({ message }: { message: ChatMessage }) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('emoji_sent', ({ emoji }: { emoji: string }) => {
      createEmojiAnimation(emoji);
    });

    socket.on('error', ({ message }: { message: string }) => {
      showNotification(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!room || room.state !== 'guessing') return;

    const interval = setInterval(() => {
      if (room.turnStartTime) {
        const elapsed = Math.floor((Date.now() - room.turnStartTime) / 1000);
        const remaining = Math.max(0, 30 - elapsed);
        setTimeLeft(remaining);

        if (remaining === 0) {
          const isMyTurn = room.players[room.currentTurn]?.id === socket.id;
          if (isMyTurn) {
            showNotification('Время вышло! ⏱️');
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.5,
            life: p.life - 1,
          }))
          .filter(p => p.life > 0)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [particles]);

  const showNotification = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(''), 3000);
  };

  const playSoundEffect = () => {
    setSoundWave(true);
    setTimeout(() => setSoundWave(false), 500);
  };

  const createExplosion = () => {
    const newParticles: Particle[] = [];
    const colors = ['#fff', '#fbbf24', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];
    
    for (let i = 0; i < 40; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 25,
        vy: (Math.random() - 0.5) * 25 - 12,
        life: 80,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 2,
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  const createMassiveExplosion = () => {
    const newParticles: Particle[] = [];
    const colors = ['#fff', '#fbbf24', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#10b981'];
    
    for (let i = 0; i < 150; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40 - 15,
        life: 120,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 3,
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  const createEmojiAnimation = (emoji: string) => {
    showNotification(emoji);
  };

  const createLobby = (maxPlayers: number) => {
    const name = playerName.trim();
    if (!name) {
      showNotification('Введите имя! ❌');
      return;
    }
    socket.emit('create_lobby', { playerName: name, maxPlayers });
  };

  const joinLobby = () => {
    const name = playerName.trim();
    const code = joinCode.trim().toUpperCase();
    if (!name || !code) {
      showNotification('Заполните все поля! ❌');
      return;
    }
    socket.emit('join_lobby', { roomId: code, playerName: name });
  };

  const startGame = () => {
    if (room && room.players.length >= 2) {
      socket.emit('start_game', { roomId: room.id });
    }
  };

  const selectCircle = (index: number) => {
    if (room) {
      socket.emit('select_circle', { roomId: room.id, circleIndex: index });
      playSoundEffect();
    }
  };

  const confirmSelection = () => {
    if (room && mySelection.length === 3) {
      socket.emit('confirm_selection', { roomId: room.id });
      showNotification('Выбор подтвержден! ✅');
      playSoundEffect();
    }
  };

  const makeGuess = (index: number) => {
    if (room) {
      socket.emit('make_guess', { roomId: room.id, circleIndex: index });
    }
  };

  const leaveLobby = () => {
    if (room) {
      socket.emit('leave_lobby', { roomId: room.id });
    }
    setScreen('menu');
    setRoom(null);
    setMySelection([]);
    setWonPrizes([]);
    setChatMessages([]);
  };

  const copyCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.id);
      showNotification('Код скопирован! 📋');
    }
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !room) return;
    
    socket.emit('send_chat', { roomId: room.id, text: chatInput.trim() });
    setChatInput('');
  };

  const sendEmoji = (emoji: string) => {
    if (!room) return;
    socket.emit('send_emoji', { roomId: room.id, emoji });
    setShowEmojis(false);
  };

  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-zinc-950 via-black to-zinc-950"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="absolute top-6 right-6 glass-card px-4 py-2.5 flex items-center gap-2 z-20">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="text-white font-semibold text-sm">{onlineCount}</span>
        </div>

        {stats.gamesPlayed > 0 && (
          <div className="absolute top-6 left-6 glass-card px-4 py-3 z-20">
            <div className="text-white text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="opacity-60">Игр:</span>
                <span className="font-bold">{stats.gamesPlayed}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Побед:</span>
                <span className="font-bold text-emerald-400">{stats.wins}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Призов:</span>
                <span className="font-bold text-amber-400">{stats.prizesWon}</span>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-3">
              <div className="text-7xl font-black text-white tracking-tighter drop-shadow-2xl animate-pulse">
                MYSTERY
              </div>
              <div className="text-7xl font-black text-white tracking-tighter drop-shadow-2xl animate-pulse" style={{ animationDelay: '0.2s' }}>
                CIRCLES
              </div>
              <div className="h-1 w-32 bg-gradient-to-r from-transparent via-white to-transparent mx-auto"></div>
              <p className="text-white/60 text-sm">Угадай секретные круги и выиграй призы!</p>
            </div>

            <div className="glass-card p-8 space-y-4">
              <input
                type="text"
                placeholder="ВВЕДИ СВОЁ ИМЯ"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
                className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/60 transition-all text-center font-bold uppercase tracking-wider"
              />

              <button
                onClick={() => createLobby(2)}
                className="w-full glass-card px-6 py-5 text-white font-black rounded-xl hover:bg-white/10 transition-all border border-white/30 hover:border-white/60 hover:scale-105 transform text-lg tracking-wider"
              >
                1 VS 1
              </button>

              <button
                onClick={() => createLobby(6)}
                className="w-full glass-card px-6 py-5 text-white font-black rounded-xl hover:bg-white/10 transition-all border border-white/30 hover:border-white/60 hover:scale-105 transform text-lg tracking-wider"
              >
                СОЗДАТЬ ЛОББИ
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-black text-white/40 text-sm font-bold">ИЛИ</span>
                </div>
              </div>

              <input
                type="text"
                placeholder="ВВЕДИ КОД ЛОББИ"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/60 transition-all text-center font-mono font-black uppercase tracking-widest text-xl"
              />

              <button
                onClick={joinLobby}
                className="w-full glass-card px-6 py-5 text-white font-black rounded-xl hover:bg-white/10 transition-all border border-white/30 hover:border-white/60 hover:scale-105 transform text-lg tracking-wider"
              >
                ВОЙТИ В ЛОББИ
              </button>
            </div>
          </div>
        </div>

        <style>{`
          .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 16px;
          }
        `}</style>
      </div>
    );
  }

  if (screen === 'lobby' && room) {
    const isHost = socket.id === room.host;

    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-zinc-950 via-black to-zinc-950"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="absolute top-6 right-6 glass-card px-4 py-2.5 flex items-center gap-2 z-20">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="text-white font-semibold text-sm">{onlineCount}</span>
        </div>

        {notification && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 glass-card px-6 py-3 z-30 border border-white/30 animate-bounce">
            <span className="text-white font-bold">{notification}</span>
          </div>
        )}

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black text-white tracking-tight">ЛОББИ</h2>
              <div className="inline-flex items-center gap-3 glass-card px-8 py-4 border border-white/30">
                <span className="text-white font-mono text-3xl font-black tracking-widest">{room.id}</span>
                <button
                  onClick={copyCode}
                  className="px-5 py-2.5 glass-card hover:bg-white/10 rounded-lg text-white text-sm font-bold transition-all border border-white/30 hover:scale-105 transform"
                >
                  КОПИРОВАТЬ
                </button>
              </div>
            </div>

            <div className="glass-card p-8 space-y-6 border border-white/30">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-black text-xl">
                  ИГРОКИ
                </h3>
                <span className="glass-card px-4 py-2 text-white font-bold border border-white/20">
                  {room.players.length}/{room.maxPlayers}
                </span>
              </div>

              <div className="space-y-3">
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className="glass-card flex items-center gap-4 p-5 border border-white/20 hover:border-white/40 transition-all"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-white font-black text-xl border-2 border-white/30">
                      {player.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-lg">{player.name}</div>
                      {player.id === room.host && (
                        <div className="text-amber-400 text-sm font-bold">👑 HOST</div>
                      )}
                    </div>
                    {player.id === socket.id && (
                      <span className="glass-card px-3 py-1 text-white/90 text-sm font-bold border border-white/30">ТЫ</span>
                    )}
                  </div>
                ))}
              </div>

              {room.players.length < room.maxPlayers && (
                <div className="glass-card border border-white/30 p-6 text-center">
                  <p className="text-white/70 text-sm">
                    Пригласи друзей с помощью кода:
                  </p>
                  <p className="font-mono font-black text-white text-2xl mt-2 tracking-widest">{room.id}</p>
                </div>
              )}

              {isHost && room.players.length >= 2 && (
                <button
                  onClick={startGame}
                  className="w-full glass-card px-6 py-6 text-white font-black rounded-xl hover:bg-white/10 transition-all text-xl border border-white/30 hover:border-white/60 hover:scale-105 transform"
                >
                  🚀 НАЧАТЬ ИГРУ
                </button>
              )}

              {!isHost && (
                <div className="text-center text-white/50 py-4 font-medium">
                  {room.players.length < 2 ? 'Ожидание игроков...' : 'Ожидание хоста...'}
                </div>
              )}

              <button
                onClick={leaveLobby}
                className="w-full glass-card px-6 py-4 text-white/70 font-bold rounded-xl hover:bg-white/10 transition-all border border-white/20 hover:border-red-500/50"
              >
                ВЫЙТИ ИЗ ЛОББИ
              </button>
            </div>
          </div>
        </div>

        <style>{`
          .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 16px;
          }
        `}</style>
      </div>
    );
  }

  if (screen === 'game' && room) {
    const me = room.players.find(p => p.id === socket.id);
    if (!me) return null;

    const isMyTurn = room.players[room.currentTurn]?.id === socket.id;
    const canSelect = me.canSelect && room.state === 'selecting';
    const isGuessing = room.state === 'guessing';

    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-zinc-950 via-black to-zinc-950"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {soundWave && (
          <div className="absolute inset-0 z-40 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border-4 border-white/30 rounded-full animate-ping"></div>
          </div>
        )}

        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none z-30"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.life / 80,
              transform: `scale(${p.life / 80})`,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
          />
        ))}

        <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
          {isGuessing && isMyTurn && (
            <div className="glass-card px-5 py-2.5 border border-white/30">
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm font-medium">Время:</span>
                <span className={`font-black text-lg ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
          )}
          <div className="glass-card px-4 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-white font-semibold text-sm">{onlineCount}</span>
          </div>
        </div>

        <div className="absolute top-6 left-6 flex gap-3 z-20">
          <button
            onClick={() => setShowChat(!showChat)}
            className="glass-card px-4 py-2.5 text-white font-bold border border-white/30 hover:bg-white/10 transition-all hover:scale-105 transform"
          >
            💬 {chatMessages.length > 0 && `(${chatMessages.length})`}
          </button>
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className="glass-card px-4 py-2.5 text-white font-bold border border-white/30 hover:bg-white/10 transition-all hover:scale-105 transform"
          >
            😎
          </button>
        </div>

        {notification && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 glass-card px-8 py-4 z-40 border border-white/40 animate-bounce">
            <span className="text-white font-black text-lg">{notification}</span>
          </div>
        )}

        {showEmojis && (
          <div className="absolute top-24 left-6 glass-card p-4 z-30 border border-white/30">
            <div className="grid grid-cols-4 gap-2">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => sendEmoji(emoji)}
                  className="w-12 h-12 glass-card hover:bg-white/10 rounded-lg text-2xl transition-all hover:scale-110 transform border border-white/20"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {showChat && (
          <div className="absolute top-24 left-6 w-80 glass-card p-4 z-30 border border-white/30 max-h-96 flex flex-col">
            <div className="flex-1 overflow-y-auto mb-3 space-y-2 max-h-64">
              {chatMessages.map(msg => {
                const player = room.players.find(p => p.id === msg.playerId);
                return (
                  <div key={msg.id} className="glass-card p-2 border border-white/10">
                    <div className="text-white/60 text-xs font-bold">{player?.name || 'Unknown'}</div>
                    <div className="text-white text-sm">{msg.text}</div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Сообщение..."
                maxLength={50}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 outline-none text-sm"
              />
              <button
                onClick={sendMessage}
                className="glass-card px-4 py-2 text-white font-bold border border-white/20 hover:bg-white/10 transition-all"
              >
                →
              </button>
            </div>
          </div>
        )}

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-7xl space-y-8">
            <div className="text-center space-y-3">
              <h1 className="text-6xl font-black text-white tracking-tighter drop-shadow-2xl">
                MYSTERY CIRCLES
              </h1>
              {room.state === 'selecting' && (
                <p className="text-white/70 text-xl font-bold">
                  {canSelect ? `🎯 ВЫБЕРИ 3 СЕКРЕТНЫХ КРУГА (${mySelection.length}/3)` : '⏳ ОЖИДАНИЕ ДРУГИХ ИГРОКОВ...'}
                </p>
              )}
              {room.state === 'guessing' && (
                <p className="text-white/70 text-xl font-bold">
                  {isMyTurn ? '🎮 ТВОЙ ХОД - УГАДЫВАЙ КРУГИ!' : '👀 ХОД СОПЕРНИКА...'}
                </p>
              )}
              {room.state === 'finished' && room.winner && (
                <p className="text-white text-3xl font-black animate-pulse">
                  {room.winner === socket.id ? '🏆 ТЫ ПОБЕДИЛ! 🏆' : '❌ ИГРА ОКОНЧЕНА'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {room.players.map((player, idx) => {
                const isMe = player.id === socket.id;
                const isCurrent = room.currentTurn === idx && room.state !== 'finished';

                return (
                  <div
                    key={player.id}
                    className={`glass-card p-4 transition-all border relative overflow-hidden ${
                      isCurrent ? 'border-amber-400 shadow-lg shadow-amber-400/30 scale-105' : 'border-white/20'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-transparent animate-pulse"></div>
                    )}
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black border-2 ${
                          isCurrent ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300' : 'bg-white/10 border-white/20'
                        }`}>
                          {player.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-black text-sm truncate">
                            {isMe ? '🔥 ТЫ' : player.name}
                          </div>
                          {room.state === 'guessing' && (
                            <div className="flex items-center gap-1">
                              <div className="flex gap-0.5">
                                {[0, 1, 2].map(i => (
                                  <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${
                                      i < player.correctGuesses.length ? 'bg-emerald-400' : 'bg-white/20'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-white/60 text-xs font-bold ml-1">
                                {player.correctGuesses.length}/3
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="aspect-square rounded-lg overflow-hidden border border-white/20 bg-white/5 mb-2">
                        <img
                          src={player.prize.image}
                          alt={player.prize.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-white text-center text-xs font-bold">
                        {player.prize.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="glass-card p-8 border border-white/30">
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
                  const isSelected = mySelection.includes(index);
                  const isGuessed = me.guesses.includes(index);
                  const isCorrect = me.correctGuesses.includes(index);

                  let canClick = false;
                  if (canSelect && !isSelected && mySelection.length < 3) canClick = true;
                  if (canSelect && isSelected) canClick = true;
                  if (isGuessing && isMyTurn && !isGuessed) canClick = true;

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (canSelect) selectCircle(index);
                        if (isGuessing && isMyTurn && !isGuessed) makeGuess(index);
                      }}
                      disabled={!canClick}
                      className={`aspect-square rounded-2xl border-2 transition-all flex items-center justify-center text-4xl font-black relative overflow-hidden ${
                        isSelected && canSelect ? 'bg-white/20 border-white scale-110 shadow-lg shadow-white/30' :
                        isCorrect ? 'bg-emerald-500/30 border-emerald-400 scale-110' :
                        isGuessed && !isCorrect ? 'bg-red-500/30 border-red-400' :
                        'bg-white/5 border-white/20'
                      } ${
                        canClick ? 'cursor-pointer hover:scale-110 hover:border-white/60 hover:shadow-lg' : 'cursor-not-allowed opacity-50'
                      }`}
                    >
                      {isSelected && canSelect && (
                        <>
                          <span className="text-white drop-shadow-lg z-10">✓</span>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent animate-pulse"></div>
                        </>
                      )}
                      {isCorrect && (
                        <>
                          <span className="text-white drop-shadow-lg z-10">✓</span>
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-transparent animate-pulse"></div>
                        </>
                      )}
                      {isGuessed && !isCorrect && <span className="text-white drop-shadow-lg">✗</span>}
                    </button>
                  );
                })}
              </div>

              {canSelect && mySelection.length === 3 && (
                <button
                  onClick={confirmSelection}
                  className="w-full glass-card px-6 py-6 text-white font-black rounded-xl hover:bg-white/10 transition-all text-xl border border-white/30 hover:border-white/60 hover:scale-105 transform mb-6"
                >
                  ✅ ПОДТВЕРДИТЬ ВЫБОР
                </button>
              )}

              {wonPrizes.length > 0 && (
                <div className="mt-6 glass-card border border-amber-400/50 p-6">
                  <h3 className="text-white font-black mb-4 text-xl flex items-center gap-2">
                    🎁 ВЫИГРАННЫЕ ПРИЗЫ ({wonPrizes.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {wonPrizes.map((prize, i) => (
                      <div key={i} className="glass-card p-3 border border-white/20 hover:border-white/40 transition-all">
                        <img
                          src={prize.image}
                          alt={prize.name}
                          className="w-full aspect-square object-cover rounded-lg mb-2"
                        />
                        <div className="text-white text-xs font-bold text-center">
                          {prize.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {room.state === 'finished' && (
                <button
                  onClick={leaveLobby}
                  className="w-full mt-6 glass-card px-6 py-6 text-white font-black rounded-xl hover:bg-white/10 transition-all text-xl border border-white/30 hover:scale-105 transform"
                >
                  🏠 В ГЛАВНОЕ МЕНЮ
                </button>
              )}
            </div>
          </div>
        </div>

        <style>{`
          .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 16px;
          }
        `}</style>
      </div>
    );
  }

  return null;
}
