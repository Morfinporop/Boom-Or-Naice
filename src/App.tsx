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
  positionsConfirmed: boolean;
}

interface Stats {
  wins: number;
  losses: number;
  gamesPlayed: number;
}

// Надежные картинки (прямые ссылки без редиректов)
const ITEMS: Item[] = [
  // Сумки
  { id: 'chanel', name: 'CHANEL', image: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'bags' },
  { id: 'lv', name: 'LOUIS VUITTON', image: 'https://images.pexels.com/photos/904350/pexels-photo-904350.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'bags' },
  { id: 'hermes', name: 'HERMÈS', image: 'https://images.pexels.com/photos/1204464/pexels-photo-1204464.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'bags' },
  { id: 'gucci', name: 'GUCCI', image: 'https://images.pexels.com/photos/1038000/pexels-photo-1038000.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'bags' },
  { id: 'prada', name: 'PRADA', image: 'https://images.pexels.com/photos/2081199/pexels-photo-2081199.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'bags' },
  { id: 'dior', name: 'DIOR', image: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'bags' },
  
  // Часы
  { id: 'rolex', name: 'ROLEX', image: 'https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'watches' },
  { id: 'patek', name: 'PATEK', image: 'https://images.pexels.com/photos/277390/pexels-photo-277390.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'watches' },
  { id: 'cartier', name: 'CARTIER', image: 'https://images.pexels.com/photos/9978722/pexels-photo-9978722.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'watches' },
  { id: 'omega', name: 'OMEGA', image: 'https://images.pexels.com/photos/236915/pexels-photo-236915.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'watches' },
  { id: 'hublot', name: 'HUBLOT', image: 'https://images.pexels.com/photos/2783873/pexels-photo-2783873.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'watches' },
  { id: 'audemars', name: 'AUDEMARS', image: 'https://images.pexels.com/photos/125779/pexels-photo-125779.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'watches' },
  
  // Обувь
  { id: 'jordan', name: 'AIR JORDAN', image: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'shoes' },
  { id: 'louboutin', name: 'LOUBOUTIN', image: 'https://images.pexels.com/photos/336372/pexels-photo-336372.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'shoes' },
  { id: 'balenciaga', name: 'BALENCIAGA', image: 'https://images.pexels.com/photos/1032110/pexels-photo-1032110.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'shoes' },
  { id: 'yeezy', name: 'YEEZY', image: 'https://images.pexels.com/photos/1478442/pexels-photo-1478442.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'shoes' },
  
  // Украшения
  { id: 'tiffany', name: 'TIFFANY', image: 'https://images.pexels.com/photos/1458867/pexels-photo-1458867.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'jewelry' },
  { id: 'bulgari', name: 'BULGARI', image: 'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'jewelry' },
  { id: 'vancleef', name: 'VAN CLEEF', image: 'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'jewelry' },
  { id: 'chopard', name: 'CHOPARD', image: 'https://images.pexels.com/photos/1616096/pexels-photo-1616096.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'jewelry' },
  
  // Аксессуары
  { id: 'versace', name: 'VERSACE', image: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'accessories' },
  { id: 'burberry', name: 'BURBERRY', image: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'accessories' },
  { id: 'fendi', name: 'FENDI', image: 'https://images.pexels.com/photos/934070/pexels-photo-934070.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'accessories' },
  { id: 'givenchy', name: 'GIVENCHY', image: 'https://images.pexels.com/photos/1036856/pexels-photo-1036856.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', category: 'accessories' },
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
      timer: '30 секунд на ход',
    },
    close: 'ЗАКРЫТЬ',
    waiting: 'ОЖИДАНИЕ',
    forOpponent: 'противника',
    gameCode: 'КОД ИГРЫ',
    copyCode: 'КОПИРОВАТЬ',
    copied: 'СКОПИРОВАНО!',
    shareCode: 'Отправь код другу',
    cancel: 'ОТМЕНА',
    searching: 'ПОИСК',
    lookingForOpponent: 'Ищем противника...',
    player: 'ИГРОК',
    selectItem: 'ВЫБЕРИ ПРЕДМЕТ',
    chooseBrand: 'Выбери свой люксовый бренд',
    placeItems: 'РАССТАВЬ ПРЕДМЕТЫ',
    selectPositions: 'Выбери 3 клетки на поле',
    placed: 'выбрано',
    confirm: 'ПОДТВЕРДИТЬ',
    selectMore: 'ВЫБЕРИ ЕЩЁ',
    opponentReady: 'Противник готов!',
    waitingOpponent: 'Ждём противника...',
    you: 'ТЫ',
    opponent: 'ПРОТИВНИК',
    seconds: 'СЕК',
    yourTurn: 'ТВОЙ ХОД',
    opponentTurn: 'ХОД ПРОТИВНИКА',
    yourItem: 'ТВОЁ',
    finding: 'ИЩЕМ',
    victory: 'ПОБЕДА',
    youFoundAll: 'Ты нашёл все предметы!',
    winAdded: '+1 К ПОБЕДАМ',
    defeat: 'ПОРАЖЕНИЕ',
    betterLuck: 'Повезёт в следующий раз',
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
    tapToSelect: 'Нажми чтобы выбрать',
    ready: 'ГОТОВО',
    found: 'НАЙДЕНО',
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
      step1title: 'Choose Brand',
      step1desc: 'Select a luxury item from the collection',
      step2title: 'Hide Items',
      step2desc: 'Place 3 items on a 3×3 grid',
      step3title: 'Hunt & Seek',
      step3desc: 'Take turns revealing opponent\'s cells',
      step4title: 'Win!',
      step4desc: 'First to find all 3 items wins!',
      timer: '30 seconds per turn',
    },
    close: 'CLOSE',
    waiting: 'WAITING',
    forOpponent: 'for opponent',
    gameCode: 'GAME CODE',
    copyCode: 'COPY',
    copied: 'COPIED!',
    shareCode: 'Share code with friend',
    cancel: 'CANCEL',
    searching: 'SEARCHING',
    lookingForOpponent: 'Looking for opponent...',
    player: 'PLAYER',
    selectItem: 'SELECT ITEM',
    chooseBrand: 'Choose your luxury brand',
    placeItems: 'PLACE ITEMS',
    selectPositions: 'Select 3 cells on the grid',
    placed: 'selected',
    confirm: 'CONFIRM',
    selectMore: 'SELECT MORE',
    opponentReady: 'Opponent ready!',
    waitingOpponent: 'Waiting for opponent...',
    you: 'YOU',
    opponent: 'OPPONENT',
    seconds: 'SEC',
    yourTurn: 'YOUR TURN',
    opponentTurn: 'OPPONENT\'S TURN',
    yourItem: 'YOUR',
    finding: 'FINDING',
    victory: 'VICTORY',
    youFoundAll: 'You found all items!',
    winAdded: '+1 WIN ADDED',
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
    tapToSelect: 'Tap to select',
    ready: 'READY',
    found: 'FOUND',
  },
};

let socket: Socket | null = null;

// Компонент картинки с fallback
function ItemImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fallbackLetter = alt.charAt(0) || '?';

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center ${className}`}>
        <span className="text-3xl font-black text-white/60">{fallbackLetter}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse flex items-center justify-center">
          <span className="text-xl font-black text-white/30">{fallbackLetter}</span>
        </div>
      )}
      <img 
        src={src} 
        alt={alt}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
      />
    </div>
  );
}

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
    positionsConfirmed: false,
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

  // Фильтрация
  const filteredItems = selectedCategory === 'all' 
    ? ITEMS 
    : ITEMS.filter(item => item.category === selectedCategory);

  // Load stats and language
  useEffect(() => {
    const savedStats = localStorage.getItem('luxuryBattleStats');
    const savedLang = localStorage.getItem('luxuryBattleLang');
    if (savedStats) setStats(JSON.parse(savedStats));
    if (savedLang) setLang(savedLang as Language);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('luxuryBattleLang', newLang);
  };

  const saveStats = useCallback((newStats: Stats) => {
    setStats(newStats);
    localStorage.setItem('luxuryBattleStats', JSON.stringify(newStats));
  }, []);

  useEffect(() => {
    const serverUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8080' 
      : window.location.origin;
    socket = io(serverUrl);

    socket.on('connect', () => console.log('Connected'));
    socket.on('playersOnline', (count) => setConnectedPlayers(count));

    socket.on('gameCreated', ({ gameId, playerNumber }) => {
      setGameState(prev => ({ ...prev, phase: 'lobby', gameId, playerNumber }));
    });

    socket.on('playerAssigned', ({ playerNumber }) => {
      setGameState(prev => ({ ...prev, playerNumber }));
    });

    socket.on('gameStarted', () => {
      setGameState(prev => ({ ...prev, phase: 'setup' }));
    });

    socket.on('waitingForPlayer', () => {
      setGameState(prev => ({ ...prev, phase: 'waiting' }));
    });

    socket.on('itemSelected', ({ playerNumber, item }) => {
      setGameState(prev => {
        if (playerNumber === `player${prev.playerNumber}`) return prev;
        return { ...prev, opponentItem: item };
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
      setTimeout(() => setLastMove(null), 2000);
      
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
      setGameState(prev => ({ ...prev, timer }));
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

    socket.on('error', (message) => alert(message));

    return () => { if (socket) socket.disconnect(); };
  }, [saveStats, stats, t.disconnected]);

  const createGame = () => socket?.emit('createGame');
  
  const joinGame = () => {
    if (joinGameId.trim() && socket) {
      socket.emit('joinGame', joinGameId.trim().toUpperCase());
      setShowJoinModal(false);
      setJoinGameId('');
    }
  };
  
  const findGame = () => socket?.emit('findGame');

  const selectItem = (item: Item) => {
    setGameState(prev => ({ ...prev, selectedItem: item }));
    if (socket && gameState.gameId) {
      socket.emit('selectItem', { gameId: gameState.gameId, item });
    }
  };

  const togglePosition = (position: number) => {
    if (gameState.positionsConfirmed) return;
    
    setGameState(prev => {
      const positions = [...prev.selectedPositions];
      const index = positions.indexOf(position);
      
      if (index > -1) {
        positions.splice(index, 1);
      } else if (positions.length < 3) {
        positions.push(position);
      }
      
      return { ...prev, selectedPositions: positions };
    });
  };

  const confirmPositions = () => {
    console.log('confirmPositions called', {
      length: gameState.selectedPositions.length,
      socket: !!socket,
      gameId: gameState.gameId,
      confirmed: gameState.positionsConfirmed
    });
    
    if (gameState.selectedPositions.length !== 3) {
      console.log('Not 3 positions selected');
      return;
    }
    
    if (!socket) {
      console.log('No socket');
      return;
    }
    
    if (!gameState.gameId) {
      console.log('No game ID');
      return;
    }
    
    if (gameState.positionsConfirmed) {
      console.log('Already confirmed');
      return;
    }

    console.log('Emitting selectPositions');
    socket.emit('selectPositions', {
      gameId: gameState.gameId,
      positions: gameState.selectedPositions
    });
    
    setGameState(prev => ({ ...prev, positionsConfirmed: true }));
  };

  const selectCell = (position: number) => {
    if (!socket || !gameState.gameId) return;
    if (gameState.currentPlayer !== gameState.playerNumber) return;
    if (gameState.revealedCells[position]) return;
    
    socket.emit('selectCell', { gameId: gameState.gameId, position });
  };

  const copyGameId = async () => {
    if (!gameState.gameId) return;
    try {
      await navigator.clipboard.writeText(gameState.gameId);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = gameState.gameId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
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
      positionsConfirmed: false,
    });
    setShowJoinModal(false);
    setJoinGameId('');
    setLastMove(null);
    setSelectedCategory('all');
  };

  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.wins / stats.gamesPlayed) * 100) 
    : 0;

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-black text-white tracking-tighter animate-pulse">LUXURY</h1>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Language Switcher */}
      <div className="fixed top-4 right-4 z-50 flex gap-1 bg-zinc-900 rounded-full p-1">
        <button
          onClick={() => changeLang('ru')}
          className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
            lang === 'ru' ? 'bg-white text-black' : 'text-white/50 hover:text-white'
          }`}
        >
          RU
        </button>
        <button
          onClick={() => changeLang('en')}
          className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
            lang === 'en' ? 'bg-white text-black' : 'text-white/50 hover:text-white'
          }`}
        >
          EN
        </button>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
        
        {/* === MENU === */}
        {gameState.phase === 'menu' && (
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* Logo */}
            <div className="text-center mb-8">
              <h1 className="text-6xl font-black tracking-tighter">{t.title}</h1>
              <h2 className="text-2xl font-light tracking-[0.4em] text-white/40 mt-1">{t.subtitle}</h2>
              <div className="flex items-center justify-center gap-3 mt-4">
                <div className="h-px w-12 bg-white/20" />
                <div className="w-1.5 h-1.5 bg-white rotate-45" />
                <div className="h-px w-12 bg-white/20" />
              </div>
              {connectedPlayers > 0 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-white/40">{connectedPlayers} {t.playersOnline}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            {stats.gamesPlayed > 0 && (
              <div className="w-full flex items-center justify-center gap-6 mb-8 py-4 border-y border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-black">{stats.wins}</div>
                  <div className="text-[10px] text-white/40 tracking-widest">{t.wins}</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-black">{stats.losses}</div>
                  <div className="text-[10px] text-white/40 tracking-widest">{t.losses}</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-black">{winRate}%</div>
                  <div className="text-[10px] text-white/40 tracking-widest">{t.winRate}</div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="w-full flex flex-col items-center gap-3 mb-8">
              <button
                onClick={createGame}
                className="w-full bg-white text-black font-bold py-4 text-sm tracking-widest hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                {t.createGame}
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="w-full border-2 border-white text-white font-bold py-4 text-sm tracking-widest hover:bg-white hover:text-black active:scale-[0.98] transition-all"
              >
                {t.joinGame}
              </button>
              <button
                onClick={findGame}
                className="w-full border border-white/30 text-white/60 font-bold py-4 text-sm tracking-widest hover:border-white hover:text-white active:scale-[0.98] transition-all"
              >
                {t.quickMatch}
              </button>
            </div>

            {/* Rules */}
            <button
              onClick={() => setShowRules(true)}
              className="flex items-center gap-2 text-white/40 text-sm tracking-widest hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.howToPlay}
            </button>
          </div>
        )}

        {/* === LOBBY === */}
        {gameState.phase === 'lobby' && (
          <div className="w-full max-w-sm flex flex-col items-center">
            <div className="w-full border border-white/20 p-8">
              {/* Player Badge */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs tracking-widest">{t.player} {gameState.playerNumber}</span>
                </div>
              </div>

              {/* Status */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold tracking-widest">{t.waiting}</h2>
                <p className="text-white/40 text-sm mt-1">{t.forOpponent}</p>
              </div>

              {/* Game Code */}
              <div className="bg-zinc-900 p-4 mb-6 text-center">
                <p className="text-[10px] text-white/40 tracking-widest mb-2">{t.gameCode}</p>
                <code className="text-4xl font-mono font-bold tracking-[0.4em]">{gameState.gameId}</code>
              </div>

              {/* Copy */}
              <button
                onClick={copyGameId}
                className={`w-full font-bold py-4 tracking-widest transition-all flex items-center justify-center gap-2 ${
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

              {/* Loading Dots */}
              <div className="flex items-center justify-center gap-2 my-6">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>

              <p className="text-center text-white/30 text-sm mb-6">{t.shareCode}</p>

              <button
                onClick={resetGame}
                className="w-full border border-white/20 text-white/40 font-bold py-3 tracking-widest hover:border-white hover:text-white transition-all"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        )}

        {/* === WAITING === */}
        {gameState.phase === 'waiting' && (
          <div className="w-full max-w-sm flex flex-col items-center">
            <div className="w-full border border-white/20 p-8 text-center">
              <h2 className="text-2xl font-bold tracking-widest mb-2">{t.searching}</h2>
              <p className="text-white/40 text-sm mb-8">{t.lookingForOpponent}</p>
              
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

        {/* === SETUP === */}
        {gameState.phase === 'setup' && (
          <div className="w-full max-w-md flex flex-col items-center">
            {/* Player Badge */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs tracking-widest">{t.player} {gameState.playerNumber}</span>
              </div>
            </div>

            {/* Step 1: Select Item */}
            {!gameState.selectedItem && (
              <div className="w-full text-center">
                <h2 className="text-xl font-bold tracking-widest mb-2">{t.selectItem}</h2>
                <p className="text-white/40 text-sm mb-4">{t.chooseBrand}</p>
                
                {/* Categories */}
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
                
                {/* Items Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => selectItem(item)}
                      className="group aspect-square border border-white/20 hover:border-white transition-all overflow-hidden relative"
                    >
                      <ItemImage 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-1 text-[8px] font-bold tracking-wider">
                        {item.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Place Items */}
            {gameState.selectedItem && (
              <div className="w-full max-w-xs text-center">
                <h2 className="text-xl font-bold tracking-widest mb-2">{t.placeItems}</h2>
                <p className="text-white/40 text-sm mb-6">{t.selectPositions}</p>
                
                {/* Selected Item Preview */}
                <div className="flex items-center justify-center gap-4 border border-white/20 p-3 mb-6">
                  <div className="w-14 h-14 overflow-hidden">
                    <ItemImage 
                      src={gameState.selectedItem.image} 
                      alt={gameState.selectedItem.name}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-bold tracking-wider text-sm">{gameState.selectedItem.name}</p>
                    <p className="text-xs text-white/40">{gameState.selectedPositions.length}/3 {t.placed}</p>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {Array.from({ length: 9 }, (_, i) => {
                    const isSelected = gameState.selectedPositions.includes(i);
                    const isDisabled = gameState.positionsConfirmed;
                    
                    return (
                      <button
                        key={i}
                        onClick={() => togglePosition(i)}
                        disabled={isDisabled}
                        className={`aspect-square border-2 text-xl font-bold transition-all overflow-hidden ${
                          isSelected
                            ? "border-white bg-white"
                            : isDisabled
                            ? "border-white/10 opacity-50 cursor-not-allowed"
                            : "border-white/30 hover:border-white text-white/40 hover:text-white"
                        }`}
                      >
                        {isSelected && gameState.selectedItem ? (
                          <ItemImage 
                            src={gameState.selectedItem.image}
                            alt=""
                            className="w-full h-full"
                          />
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Confirm Button */}
                {!gameState.positionsConfirmed ? (
                  <button
                    onClick={confirmPositions}
                    disabled={gameState.selectedPositions.length !== 3}
                    className={`w-full font-bold py-4 text-sm tracking-widest transition-all ${
                      gameState.selectedPositions.length === 3
                        ? "bg-white text-black hover:bg-white/90 cursor-pointer"
                        : "bg-zinc-800 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    {gameState.selectedPositions.length === 3 
                      ? t.confirm 
                      : `${t.selectMore} ${3 - gameState.selectedPositions.length}`}
                  </button>
                ) : (
                  <div className="w-full py-4 bg-green-500/20 border border-green-500/50 text-green-400 font-bold text-sm tracking-widest flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t.ready}
                  </div>
                )}

                {/* Status */}
                <div className="mt-4 text-sm">
                  {gameState.opponentReady ? (
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t.opponentReady}
                    </div>
                  ) : gameState.positionsConfirmed ? (
                    <div className="flex items-center justify-center gap-2 text-white/40">
                      <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                      {t.waitingOpponent}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === PLAYING === */}
        {gameState.phase === 'playing' && (
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* Score */}
            <div className="w-full flex items-center justify-between mb-4 border border-white/20 p-4">
              <div className="text-center flex-1">
                <div className={`inline-block px-3 py-1 font-bold text-xs tracking-widest ${
                  gameState.currentPlayer === gameState.playerNumber
                    ? "bg-white text-black"
                    : "text-white/40"
                }`}>
                  {t.you}
                </div>
                <div className="text-2xl font-black mt-1">{gameState.myScore}/3</div>
              </div>

              <div className="text-center px-4">
                <div className={`text-4xl font-black tabular-nums ${
                  gameState.timer <= 10 ? "text-red-500 animate-pulse" : ""
                }`}>
                  {gameState.timer}
                </div>
                <div className="text-[10px] text-white/40 tracking-widest">{t.seconds}</div>
              </div>

              <div className="text-center flex-1">
                <div className={`inline-block px-3 py-1 font-bold text-xs tracking-widest ${
                  gameState.currentPlayer !== gameState.playerNumber
                    ? "bg-white text-black"
                    : "text-white/40"
                }`}>
                  {t.opponent}
                </div>
                <div className="text-2xl font-black mt-1">{gameState.opponentScore}/3</div>
              </div>
            </div>

            {/* Turn */}
            <div className="text-center mb-4">
              <p className={`text-lg font-bold tracking-widest ${
                gameState.currentPlayer === gameState.playerNumber ? "text-white" : "text-white/40"
              }`}>
                {gameState.currentPlayer === gameState.playerNumber ? t.yourTurn : t.opponentTurn}
              </p>
            </div>

            {/* Board */}
            <div className="w-full grid grid-cols-3 gap-2 mb-6">
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
                    className={`aspect-square border-2 text-2xl font-bold transition-all relative overflow-hidden ${
                      isRevealed && isHit 
                        ? "border-green-500 bg-green-500/20" 
                        : isRevealed 
                        ? "border-red-500/50 bg-red-500/10"
                        : canClick 
                        ? "border-white/40 hover:border-white cursor-pointer hover:bg-white/5"
                        : "border-white/20 cursor-not-allowed opacity-50"
                    } ${isLastMove ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-black" : ""}`}
                  >
                    {isRevealed ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {isHit && gameState.opponentItem ? (
                          <ItemImage 
                            src={gameState.opponentItem.image}
                            alt=""
                            className="w-full h-full"
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

            {/* Items */}
            <div className="flex items-center justify-center gap-8">
              {gameState.selectedItem && (
                <div className="text-center">
                  <p className="text-[10px] text-white/40 tracking-widest mb-2">{t.yourItem}</p>
                  <div className="w-12 h-12 border border-white overflow-hidden">
                    <ItemImage 
                      src={gameState.selectedItem.image} 
                      alt={gameState.selectedItem.name}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}
              {gameState.opponentItem && (
                <div className="text-center">
                  <p className="text-[10px] text-white/40 tracking-widest mb-2">{t.finding}</p>
                  <div className="w-12 h-12 border border-white/30 overflow-hidden">
                    <ItemImage 
                      src={gameState.opponentItem.image} 
                      alt={gameState.opponentItem.name}
                      className="w-full h-full grayscale"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === FINISHED === */}
        {gameState.phase === 'finished' && (
          <div className="w-full max-w-sm flex flex-col items-center">
            <div className="w-full border border-white/20 p-8 text-center">
              {gameState.winner === gameState.playerNumber ? (
                <>
                  <div className="text-5xl font-black tracking-tighter mb-2 animate-pulse">
                    {t.victory}
                  </div>
                  <p className="text-white/40 text-sm mb-6">{t.youFoundAll}</p>
                  
                  {gameState.opponentItem && (
                    <>
                      <div className="inline-block border-4 border-white overflow-hidden mb-4 w-32 h-32">
                        <ItemImage 
                          src={gameState.opponentItem.image} 
                          alt={gameState.opponentItem.name}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="text-lg font-bold tracking-widest mb-6">
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
                  <div className="text-5xl font-black tracking-tighter text-white/30 mb-2">
                    {t.defeat}
                  </div>
                  <p className="text-white/30 text-sm mb-6">{t.betterLuck}</p>
                  
                  {gameState.winningItem && (
                    <>
                      <div className="inline-block border-4 border-white/30 overflow-hidden mb-4 w-32 h-32 opacity-50">
                        <ItemImage 
                          src={gameState.winningItem.image} 
                          alt={gameState.winningItem.name}
                          className="w-full h-full grayscale"
                        />
                      </div>
                      <div className="text-lg font-bold tracking-widest text-white/30 mb-6">
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

        {/* === MODALS === */}

        {/* Rules Modal */}
        {showRules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95">
            <div className="bg-black border border-white/20 p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold tracking-widest">{t.rules.title}</h3>
                <button onClick={() => setShowRules(false)} className="text-white/40 hover:text-white p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
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
                      <p className="font-medium text-sm">{step.title}</p>
                      <p className="text-xs text-white/60">{step.desc}</p>
                    </div>
                  </div>
                ))}

                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-white/40 text-center">{t.rules.timer}</p>
                </div>
              </div>

              <button
                onClick={() => setShowRules(false)}
                className="w-full mt-6 bg-white text-black font-bold py-3 tracking-widest hover:bg-white/90"
              >
                {t.close}
              </button>
            </div>
          </div>
        )}

        {/* Join Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95">
            <div className="bg-black border border-white/20 p-6 max-w-sm w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold tracking-widest">{t.joinGame}</h3>
                <button onClick={() => setShowJoinModal(false)} className="text-white/40 hover:text-white p-2">
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
                      : "bg-zinc-800 text-white/30 cursor-not-allowed"
                  }`}
                >
                  {t.join}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 text-center py-4 text-white/20 text-xs tracking-widest">
        {t.footer}
      </footer>
    </div>
  );
}
