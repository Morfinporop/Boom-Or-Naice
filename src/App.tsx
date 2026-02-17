import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, remove, onDisconnect, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDDemoKeyForTestingPurpose123",
  authDomain: "guess3circles.firebaseapp.com",
  databaseURL: "https://guess3circles-default-rtdb.firebaseio.com/",
  projectId: "guess3circles",
  storageBucket: "guess3circles.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

interface Prize {
  name: string;
  image: string;
}

const allPrizes: Prize[] = [
  { name: 'Rolex Submariner', image: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=300&h=300&fit=crop' },
  { name: 'Chanel Bag', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=300&fit=crop' },
  { name: 'iPhone 15 Pro Max', image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&h=300&fit=crop' },
  { name: 'AirPods Max', image: 'https://images.unsplash.com/photo-1625738165219-67057ca73f50?w=300&h=300&fit=crop' },
  { name: 'Gucci Belt', image: 'https://images.unsplash.com/photo-1624222247344-550fb60583b2?w=300&h=300&fit=crop' },
  { name: 'Louis Vuitton', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=300&h=300&fit=crop' },
  { name: 'PlayStation 5', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=300&h=300&fit=crop' },
  { name: 'MacBook Pro M3', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop' },
  { name: 'Tesla Model S', image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=300&h=300&fit=crop' },
  { name: 'Balenciaga Shoes', image: 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=300&h=300&fit=crop' },
  { name: 'Prada Wallet', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&h=300&fit=crop' },
  { name: 'Dior Perfume', image: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59bd9?w=300&h=300&fit=crop' },
];

interface Room {
  id: string;
  host: string;
  players: { [key: string]: { name: string; ready: boolean } };
  phase: 'lobby' | 'selecting' | 'guessing' | 'result';
  selections?: number[];
  guesses?: { [key: string]: number[] };
  results?: { [key: string]: number };
  currentSelector?: string;
  currentGuesser?: string;
}

export function App() {
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [screen, setScreen] = useState<'home' | 'lobby' | 'game'>('home');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [mySelections, setMySelections] = useState<number[]>([]);
  const [myGuesses, setMyGuesses] = useState<number[]>([]);
  const [showExplosion, setShowExplosion] = useState(false);
  const [wonPrizes, setWonPrizes] = useState<Prize[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const connectionRef = useRef<any>(null);

  useEffect(() => {
    const id = Math.random().toString(36).substring(2, 15);
    setPlayerId(id);

    const connectionsRef = ref(database, 'connections');
    const myConnectionRef = push(connectionsRef);
    connectionRef.current = myConnectionRef;
    
    set(myConnectionRef, true);
    onDisconnect(myConnectionRef).remove();

    const unsubscribe = onValue(connectionsRef, (snapshot) => {
      const connections = snapshot.val();
      setOnlineCount(connections ? Object.keys(connections).length : 0);
    });

    return () => {
      unsubscribe();
      if (connectionRef.current) {
        remove(connectionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (roomCode) {
      const roomRef = ref(database, `rooms/${roomCode}`);
      const unsubscribe = onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        setCurrentRoom(data);
        
        if (data && data.phase === 'result') {
          const myResult = data.results?.[playerId] || 0;
          if (myResult > 0) {
            setShowExplosion(true);
            const newPrizes: Prize[] = Array.from({ length: myResult }, () => 
              allPrizes[Math.floor(Math.random() * allPrizes.length)]
            );
            setWonPrizes(newPrizes);
            createExplosion();
            setTimeout(() => setShowExplosion(false), 3000);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [roomCode, playerId]);

  const createExplosion = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#ff0080', '#7928ca', '#00d4ff', '#ffdd00', '#00ff88'];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        size: Math.random() * 8 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5;
        p.life -= 0.01;

        if (p.life > 0) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          particles.splice(i, 1);
        }
      });

      ctx.globalAlpha = 1;

      if (particles.length > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const createRoom = async () => {
    if (!playerName.trim()) return;
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomData: Room = {
      id: code,
      host: playerId,
      players: {
        [playerId]: { name: playerName, ready: false }
      },
      phase: 'lobby',
    };

    await set(ref(database, `rooms/${code}`), roomData);
    setRoomCode(code);
    setScreen('lobby');
  };

  const joinRoom = async (code: string) => {
    if (!playerName.trim() || !code.trim()) return;
    
    const roomRef = ref(database, `rooms/${code.toUpperCase()}`);
    const snapshot = await get(roomRef);
    
    if (snapshot.exists()) {
      const room = snapshot.val();
      const playerCount = Object.keys(room.players || {}).length;
      
      if (playerCount < 6) {
        await set(ref(database, `rooms/${code.toUpperCase()}/players/${playerId}`), {
          name: playerName,
          ready: false
        });
        setRoomCode(code.toUpperCase());
        setScreen('lobby');
      }
    }
  };

  const toggleReady = async () => {
    if (!roomCode || !currentRoom) return;
    
    const isReady = currentRoom.players[playerId]?.ready || false;
    await set(ref(database, `rooms/${roomCode}/players/${playerId}/ready`), !isReady);
  };

  const startGame = async () => {
    if (!roomCode || !currentRoom) return;
    
    const playerIds = Object.keys(currentRoom.players);
    const readyPlayers = playerIds.filter(id => currentRoom.players[id].ready);
    
    if (readyPlayers.length >= 2) {
      await set(ref(database, `rooms/${roomCode}/phase`), 'selecting');
      await set(ref(database, `rooms/${roomCode}/currentSelector`), readyPlayers[0]);
      setScreen('game');
    }
  };

  const handleCircleClick = (index: number) => {
    if (!currentRoom) return;

    if (currentRoom.phase === 'selecting' && currentRoom.currentSelector === playerId) {
      if (mySelections.includes(index)) {
        setMySelections(mySelections.filter(i => i !== index));
      } else if (mySelections.length < 3) {
        setMySelections([...mySelections, index]);
      }
    } else if (currentRoom.phase === 'guessing' && currentRoom.currentGuesser === playerId) {
      if (myGuesses.includes(index)) {
        setMyGuesses(myGuesses.filter(i => i !== index));
      } else if (myGuesses.length < 3) {
        setMyGuesses([...myGuesses, index]);
      }
    }
  };

  const confirmSelection = async () => {
    if (!roomCode || mySelections.length !== 3) return;

    await set(ref(database, `rooms/${roomCode}/selections`), mySelections);
    await set(ref(database, `rooms/${roomCode}/phase`), 'guessing');
    
    const playerIds = Object.keys(currentRoom?.players || {});
    const otherPlayer = playerIds.find(id => id !== playerId);
    await set(ref(database, `rooms/${roomCode}/currentGuesser`), otherPlayer);
  };

  const confirmGuess = async () => {
    if (!roomCode || !currentRoom || myGuesses.length !== 3) return;

    const correctCount = myGuesses.filter(g => currentRoom.selections?.includes(g)).length;
    
    await set(ref(database, `rooms/${roomCode}/guesses/${playerId}`), myGuesses);
    await set(ref(database, `rooms/${roomCode}/results/${playerId}`), correctCount);
    await set(ref(database, `rooms/${roomCode}/phase`), 'result');
  };

  const resetGame = async () => {
    if (!roomCode) return;
    
    await set(ref(database, `rooms/${roomCode}/phase`), 'lobby');
    await set(ref(database, `rooms/${roomCode}/selections`), null);
    await set(ref(database, `rooms/${roomCode}/guesses`), null);
    await set(ref(database, `rooms/${roomCode}/results`), null);
    await set(ref(database, `rooms/${roomCode}/currentSelector`), null);
    await set(ref(database, `rooms/${roomCode}/currentGuesser`), null);
    
    setMySelections([]);
    setMyGuesses([]);
    setWonPrizes([]);
    setScreen('lobby');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-80"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>

      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-50"
        style={{ display: showExplosion ? 'block' : 'none' }}
      />

      <div className="fixed top-6 right-6 z-40 glass-card px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50"></div>
          <span className="text-white font-bold text-lg">{onlineCount}</span>
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {screen === 'home' && (
          <div className="max-w-md w-full space-y-8">
            <div className="text-center mb-12">
              <h1 className="text-6xl font-black text-white mb-4 tracking-tight">
                УГАДАЙ 3
              </h1>
              <div className="h-1 w-32 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            </div>

            <div className="glass-card p-8 space-y-6">
              <input
                type="text"
                placeholder="Введите имя"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full glass-input px-6 py-4 rounded-2xl text-white text-center text-xl font-medium bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none transition-all placeholder-white/40"
              />

              <button
                onClick={createRoom}
                disabled={!playerName.trim()}
                className="w-full glass-button px-6 py-5 rounded-2xl text-white font-bold text-lg bg-white/10 border border-white/20 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Создать лобби
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 text-white/40 bg-black text-sm">или</span>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="КОД"
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="flex-1 glass-input px-6 py-4 rounded-2xl text-white text-center text-xl font-bold uppercase bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none transition-all placeholder-white/40"
                />
                <button
                  onClick={() => joinRoom(roomCode)}
                  disabled={!playerName.trim() || roomCode.length !== 6}
                  className="glass-button px-8 py-4 rounded-2xl text-white font-bold bg-white/10 border border-white/20 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  →
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-white font-bold mb-3 text-lg">Правила игры</h3>
              <div className="space-y-2 text-white/70 text-sm">
                <p>• Один игрок выбирает 3 круга</p>
                <p>• Другой пытается их угадать</p>
                <p>• За каждое попадание — приз</p>
                <p>• Играть могут 2-6 человек</p>
              </div>
            </div>
          </div>
        )}

        {screen === 'lobby' && currentRoom && (
          <div className="max-w-2xl w-full space-y-6">
            <div className="glass-card p-8 text-center">
              <h2 className="text-white/60 text-sm font-medium mb-2">КОД ЛОББИ</h2>
              <div className="text-6xl font-black text-white tracking-widest mb-6">
                {roomCode}
              </div>
              <p className="text-white/60">Поделитесь кодом с друзьями</p>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-white font-bold mb-4">Игроки ({Object.keys(currentRoom.players).length}/6)</h3>
              <div className="space-y-3">
                {Object.entries(currentRoom.players).map(([id, player]) => (
                  <div key={id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${player.ready ? 'bg-green-400' : 'bg-white/30'}`}></div>
                      <span className="text-white font-medium">{player.name}</span>
                      {currentRoom.host === id && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/30 text-purple-200">HOST</span>
                      )}
                    </div>
                    {player.ready && <span className="text-green-400 text-sm font-medium">ГОТОВ</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={toggleReady}
                className="flex-1 glass-button px-6 py-5 rounded-2xl text-white font-bold bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
              >
                {currentRoom.players[playerId]?.ready ? 'Отменить' : 'Готов'}
              </button>
              
              {currentRoom.host === playerId && (
                <button
                  onClick={startGame}
                  className="flex-1 glass-button px-6 py-5 rounded-2xl text-white font-bold bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 transition-all"
                >
                  Начать игру
                </button>
              )}
            </div>
          </div>
        )}

        {screen === 'game' && currentRoom && (
          <div className="max-w-3xl w-full space-y-8">
            {currentRoom.phase === 'selecting' && (
              <>
                <div className="glass-card p-6 text-center">
                  <h2 className="text-white text-2xl font-bold mb-2">
                    {currentRoom.currentSelector === playerId 
                      ? 'Выберите 3 круга секретно' 
                      : `${currentRoom.players[currentRoom.currentSelector || '']?.name} выбирает...`}
                  </h2>
                  {currentRoom.currentSelector === playerId && (
                    <p className="text-white/60">Выбрано: {mySelections.length}/3</p>
                  )}
                </div>

                {currentRoom.currentSelector === playerId && (
                  <>
                    <div className="grid grid-cols-3 gap-6">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => handleCircleClick(i)}
                          className={`glass-circle aspect-square rounded-3xl transition-all duration-300 transform hover:scale-105 ${
                            mySelections.includes(i)
                              ? 'bg-white/30 border-2 border-white shadow-2xl shadow-white/20 scale-105'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {mySelections.includes(i) && (
                            <div className="text-5xl">✓</div>
                          )}
                        </button>
                      ))}
                    </div>

                    {mySelections.length === 3 && (
                      <button
                        onClick={confirmSelection}
                        className="w-full glass-button px-6 py-6 rounded-2xl text-white font-bold text-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                      >
                        Подтвердить
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {currentRoom.phase === 'guessing' && (
              <>
                <div className="glass-card p-6 text-center">
                  <h2 className="text-white text-2xl font-bold mb-2">
                    {currentRoom.currentGuesser === playerId 
                      ? 'Угадайте 3 круга' 
                      : `${currentRoom.players[currentRoom.currentGuesser || '']?.name} угадывает...`}
                  </h2>
                  {currentRoom.currentGuesser === playerId && (
                    <p className="text-white/60">Выбрано: {myGuesses.length}/3</p>
                  )}
                </div>

                {currentRoom.currentGuesser === playerId && (
                  <>
                    <div className="grid grid-cols-3 gap-6">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => handleCircleClick(i)}
                          className={`glass-circle aspect-square rounded-3xl transition-all duration-300 transform hover:scale-105 ${
                            myGuesses.includes(i)
                              ? 'bg-purple-500/30 border-2 border-purple-400 shadow-2xl shadow-purple-500/20 scale-105'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {myGuesses.includes(i) && (
                            <div className="text-5xl">?</div>
                          )}
                        </button>
                      ))}
                    </div>

                    {myGuesses.length === 3 && (
                      <button
                        onClick={confirmGuess}
                        className="w-full glass-button px-6 py-6 rounded-2xl text-white font-bold text-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                      >
                        Проверить
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {currentRoom.phase === 'result' && (
              <>
                <div className="glass-card p-8 text-center">
                  <h2 className="text-white text-4xl font-black mb-4">
                    {(currentRoom.results?.[playerId] || 0) === 3 
                      ? 'ДЖЕКПОТ!' 
                      : `Угадано: ${currentRoom.results?.[playerId] || 0}/3`}
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {Array.from({ length: 9 }).map((_, i) => {
                    const isSelected = currentRoom.selections?.includes(i);
                    const isGuessed = currentRoom.guesses?.[playerId]?.includes(i);
                    const isCorrect = isSelected && isGuessed;
                    const isWrong = !isSelected && isGuessed;

                    return (
                      <div
                        key={i}
                        className={`glass-circle aspect-square rounded-3xl flex items-center justify-center transition-all duration-500 ${
                          isCorrect
                            ? 'bg-green-500/40 border-2 border-green-400 shadow-2xl shadow-green-500/30 animate-bounce'
                            : isWrong
                            ? 'bg-red-500/40 border-2 border-red-400'
                            : isSelected
                            ? 'bg-yellow-500/20 border border-yellow-400/40'
                            : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        <div className="text-5xl text-white">
                          {isCorrect ? '✓' : isWrong ? '✗' : isSelected ? '○' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {wonPrizes.length > 0 && (
                  <div className="glass-card p-8">
                    <h3 className="text-white text-2xl font-bold mb-6 text-center">Ваши призы</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {wonPrizes.map((prize, idx) => (
                        <div key={idx} className="glass-card p-4 text-center transform hover:scale-105 transition-all">
                          <img 
                            src={prize.image} 
                            alt={prize.name}
                            className="w-full h-28 object-cover rounded-xl mb-3"
                          />
                          <p className="text-white font-medium text-sm">{prize.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentRoom.host === playerId && (
                  <button
                    onClick={resetGame}
                    className="w-full glass-button px-6 py-6 rounded-2xl text-white font-bold text-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                  >
                    Новая игра
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          position: relative;
          overflow: hidden;
        }

        .glass-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
        }

        .glass-circle {
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .glass-button {
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
        }

        .glass-input {
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
        }
      `}</style>
    </div>
  );
}