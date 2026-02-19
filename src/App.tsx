import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type GamePhase = 'menu' | 'lobby' | 'waiting' | 'setup' | 'playing' | 'finished';
type PlayerNumber = 1 | 2;

interface Item {
  id: string;
  name: string;
  image: string;
  color: string;
}

interface GameState {
  phase: GamePhase;
  gameId: string | null;
  playerNumber: PlayerNumber | null;
  selectedItem: Item | null;
  selectedPositions: number[];
  opponentItem: Item | null;
  opponentReady: boolean;
  board: (boolean | null)[];
  revealedCells: boolean[];
  currentPlayer: PlayerNumber | null;
  timer: number;
  winner: PlayerNumber | null;
  winningItem: Item | null;
  myScore: number;
  opponentScore: number;
}

interface Stats {
  wins: number;
  losses: number;
  gamesPlayed: number;
}

const ITEMS: Item[] = [
  { id: 'chanel', name: 'CHANEL', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop', color: '#000000' },
  { id: 'rolex', name: 'ROLEX', image: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=400&h=400&fit=crop', color: '#006039' },
  { id: 'gucci', name: 'GUCCI', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', color: '#8B4513' },
  { id: 'prada', name: 'PRADA', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop', color: '#000000' },
  { id: 'dior', name: 'DIOR', image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop', color: '#C4A35A' },
  { id: 'lv', name: 'LOUIS VUITTON', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop', color: '#8B4513' },
  { id: 'hermes', name: 'HERMÈS', image: 'https://images.unsplash.com/photo-1559563458-527698bf5295?w=400&h=400&fit=crop', color: '#FF6600' },
  { id: 'cartier', name: 'CARTIER', image: 'https://images.unsplash.com/photo-1603561596112-0a132b757442?w=400&h=400&fit=crop', color: '#8B0000' },
  { id: 'versace', name: 'VERSACE', image: 'https://images.unsplash.com/photo-1622434641406-a158123450f9?w=400&h=400&fit=crop', color: '#FFD700' },
  { id: 'burberry', name: 'BURBERRY', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop', color: '#8B4513' },
  { id: 'balenciaga', name: 'BALENCIAGA', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=400&fit=crop', color: '#000000' },
  { id: 'fendi', name: 'FENDI', image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&h=400&fit=crop', color: '#8B4513' },
];

let socket: Socket | null = null;

export function App() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'menu',
    gameId: null,
    playerNumber: null,
    selectedItem: null,
    selectedPositions: [],
    opponentItem: null,
    opponentReady: false,
    board: Array(9).fill(null),
    revealedCells: Array(9).fill(false),
    currentPlayer: null,
    timer: 30,
    winner: null,
    winningItem: null,
    myScore: 0,
    opponentScore: 0,
  });

  const [joinGameId, setJoinGameId] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [stats, setStats] = useState<Stats>({ wins: 0, losses: 0, gamesPlayed: 0 });
  const [connectedPlayers, setConnectedPlayers] = useState(0);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [showItemPreview, setShowItemPreview] = useState<Item | null>(null);

  // Load stats from localStorage
  useEffect(() => {
    const savedStats = localStorage.getItem('luxuryBattleStats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  // Save stats to localStorage
  const saveStats = useCallback((newStats: Stats) => {
    setStats(newStats);
    localStorage.setItem('luxuryBattleStats', JSON.stringify(newStats));
  }, []);

  useEffect(() => {
    const serverUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8080' 
      : window.location.origin;
    socket = io(serverUrl);

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('playersOnline', (count) => {
      setConnectedPlayers(count);
    });

    socket.on('gameCreated', ({ gameId, playerNumber }) => {
      setGameState(prev => ({
        ...prev,
        phase: 'lobby',
        gameId,
        playerNumber
      }));
    });

    socket.on('playerAssigned', ({ playerNumber }) => {
      setGameState(prev => ({
        ...prev,
        playerNumber
      }));
    });

    socket.on('gameStarted', () => {
      setGameState(prev => ({
        ...prev,
        phase: 'setup'
      }));
    });

    socket.on('waitingForPlayer', () => {
      setGameState(prev => ({
        ...prev,
        phase: 'waiting'
      }));
    });

    socket.on('itemSelected', ({ playerNumber, item }) => {
      setGameState(prev => {
        if (playerNumber === `player${prev.playerNumber}`) {
          return prev;
        }
        return {
          ...prev,
          opponentItem: item
        };
      });
    });

    socket.on('positionsSelected', ({ playerNumber }) => {
      setGameState(prev => {
        if (playerNumber !== `player${prev.playerNumber}`) {
          return { ...prev, opponentReady: true };
        }
        return prev;
      });
    });

    socket.on('gamePhase', ({ phase, currentPlayer, timer }) => {
      setGameState(prev => ({
        ...prev,
        phase: phase === 'playing' ? 'playing' : prev.phase,
        currentPlayer: parseInt(currentPlayer.replace('player', '')) as PlayerNumber,
        timer
      }));
    });

    socket.on('cellRevealed', ({ position, player, isHit }) => {
      setLastMove(position);
      setTimeout(() => setLastMove(null), 1000);
      
      setGameState(prev => {
        const newRevealedCells = [...prev.revealedCells];
        newRevealedCells[position] = true;
        
        const newBoard = [...prev.board];
        newBoard[position] = isHit;
        
        const isMyTurn = player === `player${prev.playerNumber}`;
        
        return {
          ...prev,
          revealedCells: newRevealedCells,
          board: newBoard,
          myScore: isMyTurn && isHit ? prev.myScore + 1 : prev.myScore,
          opponentScore: !isMyTurn && isHit ? prev.opponentScore + 1 : prev.opponentScore,
        };
      });
    });

    socket.on('turnChange', ({ currentPlayer, timer }) => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: parseInt(currentPlayer.replace('player', '')) as PlayerNumber,
        timer
      }));
    });

    socket.on('timerUpdate', (timer) => {
      setGameState(prev => ({
        ...prev,
        timer
      }));
    });

    socket.on('gameOver', ({ winner, item }) => {
      const winnerNumber = parseInt(winner.replace('player', '')) as PlayerNumber;
      setGameState(prev => {
        const isWinner = winnerNumber === prev.playerNumber;
        const newStats = {
          wins: stats.wins + (isWinner ? 1 : 0),
          losses: stats.losses + (isWinner ? 0 : 1),
          gamesPlayed: stats.gamesPlayed + 1
        };
        saveStats(newStats);
        
        return {
          ...prev,
          phase: 'finished',
          winner: winnerNumber,
          winningItem: item
        };
      });
    });

    socket.on('playerDisconnected', () => {
      alert('Opponent disconnected!');
      resetGame();
    });

    socket.on('error', (message) => {
      alert(message);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [saveStats, stats]);

  const createGame = () => {
    if (socket) {
      socket.emit('createGame');
    }
  };

  const joinGame = () => {
    if (joinGameId.trim() && socket) {
      socket.emit('joinGame', joinGameId.trim().toUpperCase());
      setShowJoinModal(false);
      setJoinGameId('');
    }
  };

  const findGame = () => {
    if (socket) {
      socket.emit('findGame');
    }
  };

  const selectItem = (item: Item) => {
    setGameState(prev => ({
      ...prev,
      selectedItem: item
    }));
    if (socket && gameState.gameId) {
      socket.emit('selectItem', { gameId: gameState.gameId, item });
    }
  };

  const togglePosition = (position: number) => {
    setGameState(prev => {
      const positions = [...prev.selectedPositions];
      const index = positions.indexOf(position);
      
      if (index > -1) {
        positions.splice(index, 1);
      } else if (positions.length < 3) {
        positions.push(position);
      }
      
      return {
        ...prev,
        selectedPositions: positions
      };
    });
  };

  const confirmPositions = () => {
    if (gameState.selectedPositions.length === 3 && socket && gameState.gameId) {
      socket.emit('selectPositions', {
        gameId: gameState.gameId,
        positions: gameState.selectedPositions
      });
    }
  };

  const selectCell = (position: number) => {
    if (socket && gameState.gameId && gameState.currentPlayer === gameState.playerNumber) {
      if (!gameState.revealedCells[position]) {
        socket.emit('selectCell', { gameId: gameState.gameId, position });
      }
    }
  };

  const copyGameId = async () => {
    if (gameState.gameId) {
      try {
        await navigator.clipboard.writeText(gameState.gameId);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = gameState.gameId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    }
  };

  const resetGame = () => {
    setGameState({
      phase: 'menu',
      gameId: null,
      playerNumber: null,
      selectedItem: null,
      selectedPositions: [],
      opponentItem: null,
      opponentReady: false,
      board: Array(9).fill(null),
      revealedCells: Array(9).fill(false),
      currentPlayer: null,
      timer: 30,
      winner: null,
      winningItem: null,
      myScore: 0,
      opponentScore: 0,
    });
    setShowJoinModal(false);
    setJoinGameId('');
    setLastMove(null);
  };

  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.wins / stats.gamesPlayed) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.1) 10px,
            rgba(255,255,255,0.1) 20px
          )`,
        }} />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-2xl mx-auto">
          
          {/* Header - Always centered */}
          <header className="text-center mb-8 sm:mb-12">
            <div className="inline-block">
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-none">
                LUXURY
              </h1>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-extralight tracking-[0.4em] text-white/60 mt-1">
                BATTLE
              </h2>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-white/50" />
              <div className="w-2 h-2 bg-white rotate-45" />
              <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-l from-transparent to-white/50" />
            </div>
            
            {/* Online Players Counter */}
            {gameState.phase === 'menu' && connectedPlayers > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-white/50">{connectedPlayers} players online</span>
              </div>
            )}
          </header>

          {/* Menu */}
          {gameState.phase === 'menu' && (
            <div className="w-full animate-fadeIn">
              {/* Stats Bar */}
              {stats.gamesPlayed > 0 && (
                <div className="flex items-center justify-center gap-6 sm:gap-8 mb-8 py-4 border-y border-white/10">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-black">{stats.wins}</div>
                    <div className="text-[10px] sm:text-xs text-white/40 tracking-widest">WINS</div>
                  </div>
                  <div className="w-[1px] h-10 bg-white/20" />
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-black">{stats.losses}</div>
                    <div className="text-[10px] sm:text-xs text-white/40 tracking-widest">LOSSES</div>
                  </div>
                  <div className="w-[1px] h-10 bg-white/20" />
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-black">{winRate}%</div>
                    <div className="text-[10px] sm:text-xs text-white/40 tracking-widest">WIN RATE</div>
                  </div>
                </div>
              )}

              {/* Buttons - Centered */}
              <div className="flex flex-col items-center gap-3 sm:gap-4 mb-8">
                <button
                  onClick={createGame}
                  className="w-full max-w-sm bg-white text-black font-bold py-4 sm:py-5 px-6 text-base sm:text-lg tracking-widest transition-all duration-300 hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-[0.98]"
                >
                  CREATE GAME
                </button>

                <button
                  onClick={() => setShowJoinModal(true)}
                  className="w-full max-w-sm bg-transparent border-2 border-white text-white font-bold py-4 sm:py-5 px-6 text-base sm:text-lg tracking-widest transition-all duration-300 hover:bg-white hover:text-black active:scale-[0.98]"
                >
                  JOIN GAME
                </button>

                <button
                  onClick={findGame}
                  className="w-full max-w-sm bg-transparent border border-white/30 text-white/60 font-bold py-4 sm:py-5 px-6 text-base sm:text-lg tracking-widest transition-all duration-300 hover:border-white hover:text-white active:scale-[0.98]"
                >
                  QUICK MATCH
                </button>
              </div>

              {/* Rules Button */}
              <div className="text-center">
                <button
                  onClick={() => setShowRules(true)}
                  className="text-white/40 text-sm tracking-widest hover:text-white transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  HOW TO PLAY
                </button>
              </div>
            </div>
          )}

          {/* Rules Modal */}
          {showRules && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-fadeIn">
              <div className="bg-black border border-white/20 p-6 sm:p-8 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-widest">HOW TO PLAY</h3>
                  <button
                    onClick={() => setShowRules(false)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-6 text-white/70">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-white text-black flex items-center justify-center font-bold">1</div>
                    <div>
                      <p className="text-white font-medium mb-1">Choose Your Brand</p>
                      <p className="text-sm">Select a luxury item from the collection</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-white text-black flex items-center justify-center font-bold">2</div>
                    <div>
                      <p className="text-white font-medium mb-1">Hide Your Items</p>
                      <p className="text-sm">Place 3 items on a 3×3 grid</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-white text-black flex items-center justify-center font-bold">3</div>
                    <div>
                      <p className="text-white font-medium mb-1">Hunt & Seek</p>
                      <p className="text-sm">Take turns revealing cells on opponent's board</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-white text-black flex items-center justify-center font-bold">4</div>
                    <div>
                      <p className="text-white font-medium mb-1">Win!</p>
                      <p className="text-sm">First to find all 3 opponent's items wins the prize!</p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4 mt-4">
                    <p className="text-xs text-white/40 text-center">30 seconds per turn • Auto-skip if time runs out</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Join Modal */}
          {showJoinModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-fadeIn">
              <div className="bg-black border border-white/20 p-6 sm:p-8 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-widest">JOIN GAME</h3>
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-6">
                  <label className="block text-xs text-white/40 mb-3 tracking-widest">ENTER GAME CODE</label>
                  <input
                    type="text"
                    value={joinGameId}
                    onChange={(e) => setJoinGameId(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && joinGame()}
                    placeholder="XXXX"
                    maxLength={6}
                    className="w-full bg-transparent border-2 border-white/30 px-4 py-4 text-2xl sm:text-3xl font-mono tracking-[0.5em] text-center focus:border-white focus:outline-none transition-colors placeholder:text-white/20"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 border border-white/30 text-white/60 font-bold py-3 tracking-widest hover:border-white hover:text-white transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={joinGame}
                    disabled={!joinGameId.trim()}
                    className={`flex-1 font-bold py-3 tracking-widest transition-all ${
                      joinGameId.trim()
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-white/10 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    JOIN
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lobby - Waiting for Player 2 */}
          {gameState.phase === 'lobby' && (
            <div className="w-full animate-fadeIn">
              <div className="border border-white/20 p-6 sm:p-10">
                {/* Player Badge */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs tracking-widest">PLAYER {gameState.playerNumber}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-widest mb-2">WAITING</h2>
                  <p className="text-white/40 tracking-wider text-sm">for opponent to join</p>
                </div>

                {/* Game Code */}
                <div className="bg-white/5 border border-white/10 p-4 sm:p-6 mb-6">
                  <p className="text-[10px] sm:text-xs text-white/40 tracking-widest text-center mb-3">GAME CODE</p>
                  <div className="text-center">
                    <code className="text-3xl sm:text-5xl font-mono tracking-[0.4em] font-bold">
                      {gameState.gameId}
                    </code>
                  </div>
                </div>

                {/* Copy Button */}
                <button
                  onClick={copyGameId}
                  className={`w-full font-bold py-4 tracking-widest transition-all duration-300 flex items-center justify-center gap-3 ${
                    showCopied
                      ? "bg-green-500 text-white"
                      : "bg-white text-black hover:bg-white/90"
                  }`}
                >
                  {showCopied ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      COPIED!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      COPY CODE
                    </>
                  )}
                </button>

                {/* Loading Animation */}
                <div className="flex items-center justify-center gap-2 my-8">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>

                <p className="text-center text-white/30 text-xs sm:text-sm tracking-wider mb-6">
                  Share this code with your friend
                </p>

                <button
                  onClick={resetGame}
                  className="w-full border border-white/20 text-white/40 font-bold py-3 tracking-widest hover:border-white hover:text-white transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Waiting for Quick Match */}
          {gameState.phase === 'waiting' && (
            <div className="w-full animate-fadeIn">
              <div className="border border-white/20 p-6 sm:p-10 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-widest mb-2">SEARCHING</h2>
                <p className="text-white/40 tracking-wider text-sm mb-8">Looking for opponent...</p>
                
                {/* Spinner */}
                <div className="flex justify-center mb-8">
                  <div className="w-16 h-16 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                </div>

                <button
                  onClick={resetGame}
                  className="w-full border border-white/20 text-white/40 font-bold py-3 tracking-widest hover:border-white hover:text-white transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Setup Phase */}
          {gameState.phase === 'setup' && (
            <div className="w-full animate-fadeIn">
              {/* Player Badge */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs tracking-widest">PLAYER {gameState.playerNumber}</span>
                </div>
              </div>

              {/* Item Selection */}
              {!gameState.selectedItem && (
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-widest mb-2">SELECT YOUR ITEM</h2>
                  <p className="text-white/40 text-sm tracking-wider mb-6">Choose your luxury brand</p>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                    {ITEMS.map(item => (
                      <button
                        key={item.id}
                        onClick={() => selectItem(item)}
                        onMouseEnter={() => setShowItemPreview(item)}
                        onMouseLeave={() => setShowItemPreview(null)}
                        className="group relative aspect-square overflow-hidden border border-white/20 hover:border-white transition-all duration-300"
                      >
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-all duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-1 sm:py-2 text-[10px] sm:text-xs font-bold tracking-wider">
                          {item.name}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Item Preview Tooltip */}
                  {showItemPreview && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 text-sm font-bold tracking-wider z-50 animate-fadeIn">
                      {showItemPreview.name}
                    </div>
                  )}
                </div>
              )}

              {/* Position Selection */}
              {gameState.selectedItem && (
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-widest mb-2">PLACE YOUR ITEMS</h2>
                  <p className="text-white/40 text-sm tracking-wider mb-6">Select 3 positions on the grid</p>
                  
                  {/* Selected Item Display */}
                  <div className="inline-flex items-center gap-4 border border-white/20 p-3 sm:p-4 mb-6">
                    <img 
                      src={gameState.selectedItem.image} 
                      alt={gameState.selectedItem.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 object-cover"
                    />
                    <div className="text-left">
                      <p className="font-bold tracking-wider text-sm sm:text-base">{gameState.selectedItem.name}</p>
                      <p className="text-xs sm:text-sm text-white/40">{gameState.selectedPositions.length}/3 placed</p>
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="max-w-xs sm:max-w-sm mx-auto mb-6">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {Array.from({ length: 9 }, (_, i) => {
                        const isSelected = gameState.selectedPositions.includes(i);
                        return (
                          <button
                            key={i}
                            onClick={() => togglePosition(i)}
                            className={`aspect-square border-2 font-bold text-xl sm:text-2xl transition-all duration-300 overflow-hidden ${
                              isSelected
                                ? "border-white bg-white"
                                : "border-white/30 hover:border-white text-white/30 hover:text-white"
                            }`}
                          >
                            {isSelected && gameState.selectedItem ? (
                              <img 
                                src={gameState.selectedItem.image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{i + 1}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <button
                    onClick={confirmPositions}
                    disabled={gameState.selectedPositions.length !== 3}
                    className={`w-full max-w-xs sm:max-w-sm mx-auto font-bold py-4 tracking-widest transition-all duration-300 ${
                      gameState.selectedPositions.length === 3
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-white/10 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    {gameState.selectedPositions.length === 3 ? 'CONFIRM' : `SELECT ${3 - gameState.selectedPositions.length} MORE`}
                  </button>

                  {gameState.opponentReady && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-green-500 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="tracking-wider">Opponent is ready!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Playing Phase */}
          {gameState.phase === 'playing' && (
            <div className="w-full animate-fadeIn">
              {/* Game Status Bar */}
              <div className="flex items-center justify-between max-w-xs sm:max-w-sm mx-auto mb-6 border border-white/20 p-3 sm:p-4">
                <div className="text-center">
                  <div className={`px-3 py-1 font-bold text-xs sm:text-sm tracking-wider transition-all ${
                    gameState.currentPlayer === gameState.playerNumber
                      ? "bg-white text-black"
                      : "bg-transparent text-white/40"
                  }`}>
                    YOU
                  </div>
                  <div className="text-lg sm:text-xl font-bold mt-1">{gameState.myScore}/3</div>
                </div>

                <div className="text-center">
                  <div className={`text-3xl sm:text-4xl font-black tabular-nums ${
                    gameState.timer <= 10 ? "text-red-500 animate-pulse" : "text-white"
                  }`}>
                    {gameState.timer}
                  </div>
                  <div className="text-[8px] sm:text-[10px] text-white/40 tracking-widest">SECONDS</div>
                </div>

                <div className="text-center">
                  <div className={`px-3 py-1 font-bold text-xs sm:text-sm tracking-wider transition-all ${
                    gameState.currentPlayer !== gameState.playerNumber
                      ? "bg-white text-black"
                      : "bg-transparent text-white/40"
                  }`}>
                    OPP
                  </div>
                  <div className="text-lg sm:text-xl font-bold mt-1">{gameState.opponentScore}/3</div>
                </div>
              </div>

              {/* Turn Indicator */}
              <div className="text-center mb-6">
                {gameState.currentPlayer === gameState.playerNumber ? (
                  <p className="text-lg sm:text-xl font-bold tracking-widest text-white">YOUR TURN</p>
                ) : (
                  <p className="text-lg sm:text-xl font-bold tracking-widest text-white/40">OPPONENT'S TURN</p>
                )}
              </div>

              {/* Game Board */}
              <div className="max-w-xs sm:max-w-sm mx-auto mb-6">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {Array.from({ length: 9 }, (_, i) => {
                    const isRevealed = gameState.revealedCells[i];
                    const isHit = gameState.board[i] === true;
                    const canClick = gameState.currentPlayer === gameState.playerNumber && !isRevealed;
                    const isLastMove = lastMove === i;

                    return (
                      <button
                        key={i}
                        onClick={() => selectCell(i)}
                        disabled={!canClick}
                        className={`aspect-square border-2 font-bold text-2xl sm:text-3xl transition-all duration-300 relative overflow-hidden ${
                          isRevealed && isHit 
                            ? "border-green-500 bg-green-500/20" 
                            : isRevealed 
                            ? "border-red-500/50 bg-red-500/10"
                            : canClick 
                            ? "border-white/50 hover:border-white cursor-pointer hover:bg-white/5"
                            : "border-white/20 cursor-not-allowed opacity-50"
                        } ${isLastMove ? "ring-2 ring-yellow-500 ring-offset-2 ring-offset-black" : ""}`}
                      >
                        {isRevealed ? (
                          <div className="absolute inset-0 flex items-center justify-center animate-scaleIn">
                            {isHit && gameState.opponentItem ? (
                              <img 
                                src={gameState.opponentItem.image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <svg className="w-8 h-8 text-red-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/30">?</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Items Display */}
              <div className="flex items-center justify-center gap-6 sm:gap-8">
                {gameState.selectedItem && (
                  <div className="text-center">
                    <p className="text-[10px] text-white/40 tracking-widest mb-2">YOUR ITEM</p>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 border border-white overflow-hidden">
                      <img 
                        src={gameState.selectedItem.image} 
                        alt={gameState.selectedItem.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {gameState.opponentItem && (
                  <div className="text-center">
                    <p className="text-[10px] text-white/40 tracking-widest mb-2">FINDING</p>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 border border-white/30 overflow-hidden">
                      <img 
                        src={gameState.opponentItem.image} 
                        alt={gameState.opponentItem.name}
                        className="w-full h-full object-cover grayscale"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Finished Phase */}
          {gameState.phase === 'finished' && (
            <div className="w-full animate-fadeIn">
              <div className="border border-white/20 p-6 sm:p-10 text-center">
                {gameState.winner === gameState.playerNumber ? (
                  <>
                    <div className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter mb-2 animate-pulse">
                      VICTORY
                    </div>
                    <p className="text-white/40 tracking-widest text-sm mb-8">You found all items!</p>
                    
                    {gameState.opponentItem && (
                      <>
                        <div className="inline-block border-4 border-white overflow-hidden mb-4 animate-scaleIn">
                          <img 
                            src={gameState.opponentItem.image} 
                            alt={gameState.opponentItem.name}
                            className="w-32 h-32 sm:w-48 sm:h-48 object-cover"
                          />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold tracking-widest mb-8">
                          {gameState.opponentItem.name}
                        </div>
                      </>
                    )}

                    <div className="text-sm text-green-500 tracking-wider mb-6">
                      +1 WIN ADDED TO YOUR STATS
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white/30 mb-2">
                      DEFEAT
                    </div>
                    <p className="text-white/30 tracking-widest text-sm mb-8">Better luck next time</p>
                    
                    {gameState.winningItem && (
                      <>
                        <div className="inline-block border-4 border-white/30 overflow-hidden mb-4 opacity-50">
                          <img 
                            src={gameState.winningItem.image} 
                            alt={gameState.winningItem.name}
                            className="w-32 h-32 sm:w-48 sm:h-48 object-cover grayscale"
                          />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold tracking-widest text-white/30 mb-8">
                          {gameState.winningItem.name}
                        </div>
                      </>
                    )}
                  </>
                )}

                <button
                  onClick={resetGame}
                  className="w-full max-w-sm mx-auto bg-white text-black font-bold py-4 tracking-widest hover:bg-white/90 transition-all"
                >
                  PLAY AGAIN
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-white/20 text-xs tracking-widest">
        LUXURY BATTLE © 2024
      </footer>
    </div>
  );
}
