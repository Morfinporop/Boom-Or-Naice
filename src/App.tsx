import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type GamePhase = 'menu' | 'lobby' | 'waiting' | 'setup' | 'playing' | 'finished';
type PlayerNumber = 1 | 2;
type Language = 'ru' | 'en';

interface Item {
  id: string;
  name: string;
  image: string;
  category: string;
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

// Расширенный список предметов с категориями
const ITEMS: Item[] = [
  // Сумки
  { id: 'chanel-bag', name: 'CHANEL', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop', category: 'bags' },
  { id: 'lv-bag', name: 'LOUIS VUITTON', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop', category: 'bags' },
  { id: 'hermes-bag', name: 'HERMÈS BIRKIN', image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=400&h=400&fit=crop', category: 'bags' },
  { id: 'gucci-bag', name: 'GUCCI', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', category: 'bags' },
  { id: 'prada-bag', name: 'PRADA', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop', category: 'bags' },
  { id: 'dior-bag', name: 'DIOR', image: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&h=400&fit=crop', category: 'bags' },
  
  // Часы
  { id: 'rolex', name: 'ROLEX', image: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=400&h=400&fit=crop', category: 'watches' },
  { id: 'patek', name: 'PATEK PHILIPPE', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop', category: 'watches' },
  { id: 'cartier', name: 'CARTIER', image: 'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=400&h=400&fit=crop', category: 'watches' },
  { id: 'omega', name: 'OMEGA', image: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=400&h=400&fit=crop', category: 'watches' },
  { id: 'audemars', name: 'AUDEMARS PIGUET', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=400&fit=crop', category: 'watches' },
  { id: 'hublot', name: 'HUBLOT', image: 'https://images.unsplash.com/photo-1622434641406-a158123450f9?w=400&h=400&fit=crop', category: 'watches' },
  
  // Обувь
  { id: 'jordan', name: 'AIR JORDAN', image: 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=400&h=400&fit=crop', category: 'shoes' },
  { id: 'louboutin', name: 'LOUBOUTIN', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', category: 'shoes' },
  { id: 'balenciaga', name: 'BALENCIAGA', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=400&fit=crop', category: 'shoes' },
  { id: 'yeezy', name: 'YEEZY', image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop', category: 'shoes' },
  
  // Украшения
  { id: 'tiffany', name: 'TIFFANY & CO', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', category: 'jewelry' },
  { id: 'bulgari', name: 'BULGARI', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop', category: 'jewelry' },
  { id: 'vancleef', name: 'VAN CLEEF', image: 'https://images.unsplash.com/photo-1603561596112-0a132b757442?w=400&h=400&fit=crop', category: 'jewelry' },
  { id: 'chopard', name: 'CHOPARD', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=400&fit=crop', category: 'jewelry' },
  
  // Аксессуары
  { id: 'versace', name: 'VERSACE', image: 'https://images.unsplash.com/photo-1589674781759-c21c37956a44?w=400&h=400&fit=crop', category: 'accessories' },
  { id: 'burberry', name: 'BURBERRY', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop', category: 'accessories' },
  { id: 'fendi', name: 'FENDI', image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&h=400&fit=crop', category: 'accessories' },
  { id: 'givenchy', name: 'GIVENCHY', image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop', category: 'accessories' },
];

// Переводы
const translations = {
  ru: {
    title: 'LUXURY',
    subtitle: 'БИТВА',
    playersOnline: 'игроков онлайн',
    wins: 'ПОБЕД',
    losses: 'ПОРАЖЕНИЙ',
    winRate: 'ВИНРЕЙТ',
    createGame: 'СОЗДАТЬ ИГРУ',
    joinGame: 'ВОЙТИ В ИГРУ',
    quickMatch: 'БЫСТРАЯ ИГРА',
    howToPlay: 'КАК ИГРАТЬ',
    rules: {
      title: 'ПРАВИЛА ИГРЫ',
      step1title: 'Выбери бренд',
      step1desc: 'Выбери люксовый предмет из коллекции',
      step2title: 'Спрячь предметы',
      step2desc: 'Размести 3 предмета на поле 3×3',
      step3title: 'Ищи и находи',
      step3desc: 'По очереди открывай клетки соперника',
      step4title: 'Победа!',
      step4desc: 'Кто первый найдет все 3 предмета — побеждает!',
      timer: '30 секунд на ход • Авто-пропуск если время вышло',
    },
    close: 'ЗАКРЫТЬ',
    waiting: 'ОЖИДАНИЕ',
    forOpponent: 'противника',
    gameCode: 'КОД ИГРЫ',
    copyCode: 'КОПИРОВАТЬ КОД',
    copied: 'СКОПИРОВАНО!',
    shareCode: 'Отправь этот код другу',
    cancel: 'ОТМЕНА',
    searching: 'ПОИСК',
    lookingForOpponent: 'Ищем противника...',
    player: 'ИГРОК',
    selectItem: 'ВЫБЕРИ ПРЕДМЕТ',
    chooseBrand: 'Выбери свой люксовый бренд',
    placeItems: 'РАССТАВЬ ПРЕДМЕТЫ',
    selectPositions: 'Выбери 3 позиции на поле',
    placed: 'расставлено',
    confirm: 'ПОДТВЕРДИТЬ',
    selectMore: 'ВЫБЕРИ ЕЩЕ',
    opponentReady: 'Противник готов!',
    you: 'ТЫ',
    opponent: 'ПРОТИВ',
    seconds: 'СЕКУНД',
    yourTurn: 'ТВОЙ ХОД',
    opponentTurn: 'ХОД ПРОТИВНИКА',
    yourItem: 'ТВОЙ ПРЕДМЕТ',
    finding: 'ИЩЕМ',
    victory: 'ПОБЕДА',
    youFoundAll: 'Ты нашел все предметы!',
    winAdded: '+1 ПОБЕДА В СТАТИСТИКУ',
    defeat: 'ПОРАЖЕНИЕ',
    betterLuck: 'Повезет в следующий раз',
    playAgain: 'ИГРАТЬ СНОВА',
    enterCode: 'ВВЕДИ КОД ИГРЫ',
    join: 'ВОЙТИ',
    footer: 'LUXURY БИТВА © 2024',
    categories: {
      all: 'ВСЕ',
      bags: 'СУМКИ',
      watches: 'ЧАСЫ',
      shoes: 'ОБУВЬ',
      jewelry: 'УКРАШЕНИЯ',
      accessories: 'АКСЕССУАРЫ',
    },
    disconnected: 'Противник отключился!',
  },
  en: {
    title: 'LUXURY',
    subtitle: 'BATTLE',
    playersOnline: 'players online',
    wins: 'WINS',
    losses: 'LOSSES',
    winRate: 'WIN RATE',
    createGame: 'CREATE GAME',
    joinGame: 'JOIN GAME',
    quickMatch: 'QUICK MATCH',
    howToPlay: 'HOW TO PLAY',
    rules: {
      title: 'HOW TO PLAY',
      step1title: 'Choose Your Brand',
      step1desc: 'Select a luxury item from the collection',
      step2title: 'Hide Your Items',
      step2desc: 'Place 3 items on a 3×3 grid',
      step3title: 'Hunt & Seek',
      step3desc: 'Take turns revealing opponent\'s cells',
      step4title: 'Win!',
      step4desc: 'First to find all 3 opponent\'s items wins!',
      timer: '30 seconds per turn • Auto-skip if time runs out',
    },
    close: 'CLOSE',
    waiting: 'WAITING',
    forOpponent: 'for opponent',
    gameCode: 'GAME CODE',
    copyCode: 'COPY CODE',
    copied: 'COPIED!',
    shareCode: 'Share this code with your friend',
    cancel: 'CANCEL',
    searching: 'SEARCHING',
    lookingForOpponent: 'Looking for opponent...',
    player: 'PLAYER',
    selectItem: 'SELECT YOUR ITEM',
    chooseBrand: 'Choose your luxury brand',
    placeItems: 'PLACE YOUR ITEMS',
    selectPositions: 'Select 3 positions on the grid',
    placed: 'placed',
    confirm: 'CONFIRM',
    selectMore: 'SELECT MORE',
    opponentReady: 'Opponent is ready!',
    you: 'YOU',
    opponent: 'OPP',
    seconds: 'SECONDS',
    yourTurn: 'YOUR TURN',
    opponentTurn: 'OPPONENT\'S TURN',
    yourItem: 'YOUR ITEM',
    finding: 'FINDING',
    victory: 'VICTORY',
    youFoundAll: 'You found all items!',
    winAdded: '+1 WIN ADDED TO STATS',
    defeat: 'DEFEAT',
    betterLuck: 'Better luck next time',
    playAgain: 'PLAY AGAIN',
    enterCode: 'ENTER GAME CODE',
    join: 'JOIN',
    footer: 'LUXURY BATTLE © 2024',
    categories: {
      all: 'ALL',
      bags: 'BAGS',
      watches: 'WATCHES',
      shoes: 'SHOES',
      jewelry: 'JEWELRY',
      accessories: 'ACCESSORIES',
    },
    disconnected: 'Opponent disconnected!',
  },
};

let socket: Socket | null = null;

export function App() {
  const [lang, setLang] = useState<Language>('ru');
  const t = translations[lang];
  
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Фильтрация предметов по категории
  const filteredItems = selectedCategory === 'all' 
    ? ITEMS 
    : ITEMS.filter(item => item.category === selectedCategory);

  // Load stats and language from localStorage
  useEffect(() => {
    const savedStats = localStorage.getItem('luxuryBattleStats');
    const savedLang = localStorage.getItem('luxuryBattleLang');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
    if (savedLang) {
      setLang(savedLang as Language);
    }
    
    // Имитация загрузки
    setTimeout(() => setIsLoading(false), 1500);
  }, []);

  // Save language
  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('luxuryBattleLang', newLang);
  };

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
      setTimeout(() => setLastMove(null), 1500);
      
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
      alert(t.disconnected);
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
  }, [saveStats, stats, t.disconnected]);

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
    setSelectedCategory('all');
  };

  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.wins / stats.gamesPlayed) * 100) 
    : 0;

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 animate-pulse">
            LUXURY
          </h1>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Language Switcher - Fixed */}
      <div className="fixed top-4 right-4 z-50 flex gap-1 bg-white/5 backdrop-blur-sm rounded-full p-1">
        <button
          onClick={() => changeLang('ru')}
          className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
            lang === 'ru' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
          }`}
        >
          RU
        </button>
        <button
          onClick={() => changeLang('en')}
          className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
            lang === 'en' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
          }`}
        >
          EN
        </button>
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 min-h-screen">
        <div className="w-full max-w-lg mx-auto flex flex-col items-center">
          
          {/* Header */}
          <header className="text-center mb-8 w-full">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-none">
              {t.title}
            </h1>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.3em] text-white/50 mt-1">
              {t.subtitle}
            </h2>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-white/30" />
              <div className="w-1.5 h-1.5 bg-white rotate-45" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-white/30" />
            </div>
            
            {/* Online Players */}
            {gameState.phase === 'menu' && connectedPlayers > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-white/40">{connectedPlayers} {t.playersOnline}</span>
              </div>
            )}
          </header>

          {/* Menu */}
          {gameState.phase === 'menu' && (
            <div className="w-full flex flex-col items-center animate-fadeIn">
              {/* Stats */}
              {stats.gamesPlayed > 0 && (
                <div className="w-full max-w-sm flex items-center justify-center gap-8 mb-8 py-4 border-y border-white/10">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-black">{stats.wins}</div>
                    <div className="text-[10px] text-white/40 tracking-widest">{t.wins}</div>
                  </div>
                  <div className="w-px h-10 bg-white/20" />
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-black">{stats.losses}</div>
                    <div className="text-[10px] text-white/40 tracking-widest">{t.losses}</div>
                  </div>
                  <div className="w-px h-10 bg-white/20" />
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-black">{winRate}%</div>
                    <div className="text-[10px] text-white/40 tracking-widest">{t.winRate}</div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="w-full max-w-sm flex flex-col items-center gap-3 mb-8">
                <button
                  onClick={createGame}
                  className="w-full bg-white text-black font-bold py-4 text-base tracking-widest transition-all duration-300 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-[0.98]"
                >
                  {t.createGame}
                </button>

                <button
                  onClick={() => setShowJoinModal(true)}
                  className="w-full bg-transparent border-2 border-white text-white font-bold py-4 text-base tracking-widest transition-all duration-300 hover:bg-white hover:text-black active:scale-[0.98]"
                >
                  {t.joinGame}
                </button>

                <button
                  onClick={findGame}
                  className="w-full bg-transparent border border-white/30 text-white/60 font-bold py-4 text-base tracking-widest transition-all duration-300 hover:border-white hover:text-white active:scale-[0.98]"
                >
                  {t.quickMatch}
                </button>
              </div>

              {/* Rules Button */}
              <button
                onClick={() => setShowRules(true)}
                className="text-white/40 text-sm tracking-widest hover:text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t.howToPlay}
              </button>
            </div>
          )}

          {/* Rules Modal */}
          {showRules && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 animate-fadeIn">
              <div className="bg-black border border-white/20 p-6 sm:p-8 max-w-md w-full max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold tracking-widest">{t.rules.title}</h3>
                  <button onClick={() => setShowRules(false)} className="text-white/40 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-5 text-white/70">
                  {[
                    { num: 1, title: t.rules.step1title, desc: t.rules.step1desc },
                    { num: 2, title: t.rules.step2title, desc: t.rules.step2desc },
                    { num: 3, title: t.rules.step3title, desc: t.rules.step3desc },
                    { num: 4, title: t.rules.step4title, desc: t.rules.step4desc },
                  ].map(step => (
                    <div key={step.num} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-white text-black flex items-center justify-center font-bold text-sm">
                        {step.num}
                      </div>
                      <div>
                        <p className="text-white font-medium mb-1">{step.title}</p>
                        <p className="text-sm">{step.desc}</p>
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-white/10 pt-4 mt-4">
                    <p className="text-xs text-white/40 text-center">{t.rules.timer}</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowRules(false)}
                  className="w-full mt-6 bg-white text-black font-bold py-3 tracking-widest hover:bg-white/90 transition-all"
                >
                  {t.close}
                </button>
              </div>
            </div>
          )}

          {/* Join Modal */}
          {showJoinModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 animate-fadeIn">
              <div className="bg-black border border-white/20 p-6 sm:p-8 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold tracking-widest">{t.joinGame}</h3>
                  <button onClick={() => setShowJoinModal(false)} className="text-white/40 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-6">
                  <label className="block text-xs text-white/40 mb-3 tracking-widest text-center">{t.enterCode}</label>
                  <input
                    type="text"
                    value={joinGameId}
                    onChange={(e) => setJoinGameId(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && joinGame()}
                    placeholder="XXXX"
                    maxLength={6}
                    className="w-full bg-transparent border-2 border-white/30 px-4 py-4 text-3xl font-mono tracking-[0.5em] text-center focus:border-white focus:outline-none transition-colors placeholder:text-white/20"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 border border-white/30 text-white/60 font-bold py-3 tracking-widest hover:border-white hover:text-white transition-all"
                  >
                    {t.cancel}
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
                    {t.join}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lobby */}
          {gameState.phase === 'lobby' && (
            <div className="w-full max-w-sm flex flex-col items-center animate-fadeIn">
              <div className="w-full border border-white/20 p-6 sm:p-8">
                {/* Player Badge */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-xs tracking-widest">{t.player} {gameState.playerNumber}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold tracking-widest mb-1">{t.waiting}</h2>
                  <p className="text-white/40 tracking-wider text-sm">{t.forOpponent}</p>
                </div>

                {/* Game Code */}
                <div className="bg-white/5 border border-white/10 p-4 mb-6">
                  <p className="text-[10px] text-white/40 tracking-widest text-center mb-2">{t.gameCode}</p>
                  <div className="text-center">
                    <code className="text-4xl font-mono tracking-[0.4em] font-bold">
                      {gameState.gameId}
                    </code>
                  </div>
                </div>

                {/* Copy Button */}
                <button
                  onClick={copyGameId}
                  className={`w-full font-bold py-4 tracking-widest transition-all duration-300 flex items-center justify-center gap-3 ${
                    showCopied ? "bg-green-500 text-white" : "bg-white text-black hover:bg-white/90"
                  }`}
                >
                  {showCopied ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t.copied}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {t.copyCode}
                    </>
                  )}
                </button>

                {/* Loading */}
                <div className="flex items-center justify-center gap-2 my-6">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>

                <p className="text-center text-white/30 text-sm tracking-wider mb-6">
                  {t.shareCode}
                </p>

                <button
                  onClick={resetGame}
                  className="w-full border border-white/20 text-white/40 font-bold py-3 tracking-widest hover:border-white hover:text-white transition-all"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Waiting */}
          {gameState.phase === 'waiting' && (
            <div className="w-full max-w-sm flex flex-col items-center animate-fadeIn">
              <div className="w-full border border-white/20 p-6 sm:p-8 text-center">
                <h2 className="text-2xl font-bold tracking-widest mb-2">{t.searching}</h2>
                <p className="text-white/40 tracking-wider text-sm mb-8">{t.lookingForOpponent}</p>
                
                <div className="flex justify-center mb-8">
                  <div className="w-16 h-16 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                </div>

                <button
                  onClick={resetGame}
                  className="w-full border border-white/20 text-white/40 font-bold py-3 tracking-widest hover:border-white hover:text-white transition-all"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Setup Phase */}
          {gameState.phase === 'setup' && (
            <div className="w-full flex flex-col items-center animate-fadeIn">
              {/* Player Badge */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-xs tracking-widest">{t.player} {gameState.playerNumber}</span>
                </div>
              </div>

              {/* Item Selection */}
              {!gameState.selectedItem && (
                <div className="w-full max-w-lg text-center">
                  <h2 className="text-xl font-bold tracking-widest mb-2">{t.selectItem}</h2>
                  <p className="text-white/40 text-sm tracking-wider mb-4">{t.chooseBrand}</p>
                  
                  {/* Category Filter */}
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {['all', 'bags', 'watches', 'shoes', 'jewelry', 'accessories'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 text-xs tracking-wider transition-all ${
                          selectedCategory === cat
                            ? 'bg-white text-black font-bold'
                            : 'border border-white/20 text-white/60 hover:border-white hover:text-white'
                        }`}
                      >
                        {t.categories[cat as keyof typeof t.categories]}
                      </button>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {filteredItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => selectItem(item)}
                        className="group relative aspect-square overflow-hidden border border-white/20 hover:border-white transition-all duration-300"
                      >
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-all duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-1 text-[8px] sm:text-[10px] font-bold tracking-wider">
                          {item.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Position Selection */}
              {gameState.selectedItem && (
                <div className="w-full max-w-sm text-center">
                  <h2 className="text-xl font-bold tracking-widest mb-2">{t.placeItems}</h2>
                  <p className="text-white/40 text-sm tracking-wider mb-6">{t.selectPositions}</p>
                  
                  {/* Selected Item */}
                  <div className="inline-flex items-center gap-4 border border-white/20 p-3 mb-6">
                    <img 
                      src={gameState.selectedItem.image} 
                      alt={gameState.selectedItem.name}
                      className="w-14 h-14 object-cover"
                    />
                    <div className="text-left">
                      <p className="font-bold tracking-wider text-sm">{gameState.selectedItem.name}</p>
                      <p className="text-xs text-white/40">{gameState.selectedPositions.length}/3 {t.placed}</p>
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {Array.from({ length: 9 }, (_, i) => {
                      const isSelected = gameState.selectedPositions.includes(i);
                      return (
                        <button
                          key={i}
                          onClick={() => togglePosition(i)}
                          className={`aspect-square border-2 font-bold text-xl transition-all duration-300 overflow-hidden ${
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

                  {/* Confirm */}
                  <button
                    onClick={confirmPositions}
                    disabled={gameState.selectedPositions.length !== 3}
                    className={`w-full font-bold py-4 tracking-widest transition-all duration-300 ${
                      gameState.selectedPositions.length === 3
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-white/10 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    {gameState.selectedPositions.length === 3 ? t.confirm : `${t.selectMore} ${3 - gameState.selectedPositions.length}`}
                  </button>

                  {gameState.opponentReady && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-green-400 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="tracking-wider">{t.opponentReady}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Playing Phase */}
          {gameState.phase === 'playing' && (
            <div className="w-full max-w-sm flex flex-col items-center animate-fadeIn">
              {/* Status Bar */}
              <div className="w-full flex items-center justify-between mb-6 border border-white/20 p-4">
                <div className="text-center flex-1">
                  <div className={`px-3 py-1 font-bold text-sm tracking-wider transition-all inline-block ${
                    gameState.currentPlayer === gameState.playerNumber
                      ? "bg-white text-black"
                      : "bg-transparent text-white/40"
                  }`}>
                    {t.you}
                  </div>
                  <div className="text-xl font-bold mt-1">{gameState.myScore}/3</div>
                </div>

                <div className="text-center px-4">
                  <div className={`text-4xl font-black tabular-nums ${
                    gameState.timer <= 10 ? "text-red-500 animate-pulse" : "text-white"
                  }`}>
                    {gameState.timer}
                  </div>
                  <div className="text-[8px] text-white/40 tracking-widest">{t.seconds}</div>
                </div>

                <div className="text-center flex-1">
                  <div className={`px-3 py-1 font-bold text-sm tracking-wider transition-all inline-block ${
                    gameState.currentPlayer !== gameState.playerNumber
                      ? "bg-white text-black"
                      : "bg-transparent text-white/40"
                  }`}>
                    {t.opponent}
                  </div>
                  <div className="text-xl font-bold mt-1">{gameState.opponentScore}/3</div>
                </div>
              </div>

              {/* Turn Indicator */}
              <div className="text-center mb-6">
                {gameState.currentPlayer === gameState.playerNumber ? (
                  <p className="text-xl font-bold tracking-widest text-white">{t.yourTurn}</p>
                ) : (
                  <p className="text-xl font-bold tracking-widest text-white/40">{t.opponentTurn}</p>
                )}
              </div>

              {/* Game Board */}
              <div className="w-full grid grid-cols-3 gap-3 mb-6">
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
                      className={`aspect-square border-2 font-bold text-2xl transition-all duration-300 relative overflow-hidden ${
                        isRevealed && isHit 
                          ? "border-green-500 bg-green-500/20" 
                          : isRevealed 
                          ? "border-red-500/50 bg-red-500/10"
                          : canClick 
                          ? "border-white/50 hover:border-white cursor-pointer hover:bg-white/5"
                          : "border-white/20 cursor-not-allowed opacity-50"
                      } ${isLastMove ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-black" : ""}`}
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

              {/* Items Display */}
              <div className="flex items-center justify-center gap-8">
                {gameState.selectedItem && (
                  <div className="text-center">
                    <p className="text-[10px] text-white/40 tracking-widest mb-2">{t.yourItem}</p>
                    <div className="w-14 h-14 border border-white overflow-hidden">
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
                    <p className="text-[10px] text-white/40 tracking-widest mb-2">{t.finding}</p>
                    <div className="w-14 h-14 border border-white/30 overflow-hidden">
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
            <div className="w-full max-w-sm flex flex-col items-center animate-fadeIn">
              <div className="w-full border border-white/20 p-6 sm:p-8 text-center">
                {gameState.winner === gameState.playerNumber ? (
                  <>
                    <div className="text-6xl sm:text-7xl font-black tracking-tighter mb-2 animate-pulse">
                      {t.victory}
                    </div>
                    <p className="text-white/40 tracking-widest text-sm mb-8">{t.youFoundAll}</p>
                    
                    {gameState.opponentItem && (
                      <>
                        <div className="inline-block border-4 border-white overflow-hidden mb-4 animate-scaleIn">
                          <img 
                            src={gameState.opponentItem.image} 
                            alt={gameState.opponentItem.name}
                            className="w-32 h-32 sm:w-40 sm:h-40 object-cover"
                          />
                        </div>
                        <div className="text-xl font-bold tracking-widest mb-8">
                          {gameState.opponentItem.name}
                        </div>
                      </>
                    )}

                    <div className="text-sm text-green-400 tracking-wider mb-6">
                      {t.winAdded}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-6xl sm:text-7xl font-black tracking-tighter text-white/30 mb-2">
                      {t.defeat}
                    </div>
                    <p className="text-white/30 tracking-widest text-sm mb-8">{t.betterLuck}</p>
                    
                    {gameState.winningItem && (
                      <>
                        <div className="inline-block border-4 border-white/30 overflow-hidden mb-4 opacity-50">
                          <img 
                            src={gameState.winningItem.image} 
                            alt={gameState.winningItem.name}
                            className="w-32 h-32 sm:w-40 sm:h-40 object-cover grayscale"
                          />
                        </div>
                        <div className="text-xl font-bold tracking-widest text-white/30 mb-8">
                          {gameState.winningItem.name}
                        </div>
                      </>
                    )}
                  </>
                )}

                <button
                  onClick={resetGame}
                  className="w-full bg-white text-black font-bold py-4 tracking-widest hover:bg-white/90 transition-all"
                >
                  {t.playAgain}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-white/20 text-xs tracking-widest">
        {t.footer}
      </footer>
    </div>
  );
}
