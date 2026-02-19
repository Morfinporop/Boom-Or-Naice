import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

// Типы
interface Player {
  id: string
  name: string
  item: LuxuryItem | null
  positions: number[]
  ready: boolean
  score: number
}

interface GameState {
  id: string
  players: Player[]
  currentTurn: string
  phase: 'waiting' | 'selecting' | 'placing' | 'playing' | 'finished'
  winner: string | null
  lastMove: number | null
}

interface LuxuryItem {
  id: string
  name: string
  nameRu: string
  category: string
  categoryRu: string
  gradient: string
  letter: string
}

// 24 люксовых предмета с градиентами
const LUXURY_ITEMS: LuxuryItem[] = [
  // Сумки
  { id: 'chanel', name: 'CHANEL', nameRu: 'ШАНЕЛЬ', category: 'Bags', categoryRu: 'Сумки', gradient: 'from-neutral-900 to-neutral-700', letter: 'C' },
  { id: 'lv', name: 'LOUIS VUITTON', nameRu: 'ЛУИ ВИТОН', category: 'Bags', categoryRu: 'Сумки', gradient: 'from-amber-800 to-amber-600', letter: 'LV' },
  { id: 'hermes', name: 'HERMÈS', nameRu: 'ЭРМЕС', category: 'Bags', categoryRu: 'Сумки', gradient: 'from-orange-600 to-orange-400', letter: 'H' },
  { id: 'gucci', name: 'GUCCI', nameRu: 'ГУЧЧИ', category: 'Bags', categoryRu: 'Сумки', gradient: 'from-green-800 to-red-700', letter: 'G' },
  { id: 'prada', name: 'PRADA', nameRu: 'ПРАДА', category: 'Bags', categoryRu: 'Сумки', gradient: 'from-neutral-800 to-neutral-600', letter: 'P' },
  { id: 'dior', name: 'DIOR', nameRu: 'ДИОР', category: 'Bags', categoryRu: 'Сумки', gradient: 'from-gray-400 to-gray-200', letter: 'D' },
  
  // Часы
  { id: 'rolex', name: 'ROLEX', nameRu: 'РОЛЕКС', category: 'Watches', categoryRu: 'Часы', gradient: 'from-green-700 to-yellow-500', letter: 'R' },
  { id: 'patek', name: 'PATEK PHILIPPE', nameRu: 'ПАТЕК ФИЛИПП', category: 'Watches', categoryRu: 'Часы', gradient: 'from-blue-900 to-blue-700', letter: 'PP' },
  { id: 'cartier', name: 'CARTIER', nameRu: 'КАРТЬЕ', category: 'Watches', categoryRu: 'Часы', gradient: 'from-red-700 to-red-500', letter: 'C' },
  { id: 'omega', name: 'OMEGA', nameRu: 'ОМЕГА', category: 'Watches', categoryRu: 'Часы', gradient: 'from-blue-600 to-blue-400', letter: 'Ω' },
  { id: 'ap', name: 'AUDEMARS PIGUET', nameRu: 'ОДЕМАР ПИГЕ', category: 'Watches', categoryRu: 'Часы', gradient: 'from-slate-700 to-slate-500', letter: 'AP' },
  { id: 'hublot', name: 'HUBLOT', nameRu: 'ХУБЛОТ', category: 'Watches', categoryRu: 'Часы', gradient: 'from-neutral-900 to-neutral-700', letter: 'H' },
  
  // Обувь
  { id: 'jordan', name: 'AIR JORDAN', nameRu: 'ЭЙР ДЖОРДАН', category: 'Shoes', categoryRu: 'Обувь', gradient: 'from-red-600 to-black', letter: 'J' },
  { id: 'louboutin', name: 'LOUBOUTIN', nameRu: 'ЛУБУТЕН', category: 'Shoes', categoryRu: 'Обувь', gradient: 'from-red-600 to-red-800', letter: 'L' },
  { id: 'balenciaga', name: 'BALENCIAGA', nameRu: 'БАЛЕНСИАГА', category: 'Shoes', categoryRu: 'Обувь', gradient: 'from-neutral-900 to-neutral-700', letter: 'B' },
  { id: 'yeezy', name: 'YEEZY', nameRu: 'ИЗИИ', category: 'Shoes', categoryRu: 'Обувь', gradient: 'from-stone-500 to-stone-300', letter: 'Y' },
  
  // Украшения
  { id: 'tiffany', name: 'TIFFANY & CO', nameRu: 'ТИФФАНИ', category: 'Jewelry', categoryRu: 'Украшения', gradient: 'from-teal-400 to-teal-300', letter: 'T' },
  { id: 'bulgari', name: 'BVLGARI', nameRu: 'БУЛГАРИ', category: 'Jewelry', categoryRu: 'Украшения', gradient: 'from-yellow-500 to-yellow-300', letter: 'B' },
  { id: 'vancleef', name: 'VAN CLEEF', nameRu: 'ВАН КЛИФ', category: 'Jewelry', categoryRu: 'Украшения', gradient: 'from-emerald-500 to-emerald-300', letter: 'VC' },
  { id: 'chopard', name: 'CHOPARD', nameRu: 'ШОПАР', category: 'Jewelry', categoryRu: 'Украшения', gradient: 'from-rose-400 to-rose-300', letter: 'C' },
  
  // Аксессуары
  { id: 'versace', name: 'VERSACE', nameRu: 'ВЕРСАЧЕ', category: 'Accessories', categoryRu: 'Аксессуары', gradient: 'from-yellow-500 to-yellow-400', letter: 'V' },
  { id: 'burberry', name: 'BURBERRY', nameRu: 'БАРБЕРИ', category: 'Accessories', categoryRu: 'Аксессуары', gradient: 'from-amber-700 to-amber-500', letter: 'B' },
  { id: 'fendi', name: 'FENDI', nameRu: 'ФЕНДИ', category: 'Accessories', categoryRu: 'Аксессуары', gradient: 'from-yellow-600 to-neutral-800', letter: 'F' },
  { id: 'givenchy', name: 'GIVENCHY', nameRu: 'ЖИВАНШИ', category: 'Accessories', categoryRu: 'Аксессуары', gradient: 'from-neutral-800 to-neutral-600', letter: 'G' },
]

const CATEGORIES = [
  { id: 'all', name: 'All', nameRu: 'Все' },
  { id: 'Bags', name: 'Bags', nameRu: 'Сумки' },
  { id: 'Watches', name: 'Watches', nameRu: 'Часы' },
  { id: 'Shoes', name: 'Shoes', nameRu: 'Обувь' },
  { id: 'Jewelry', name: 'Jewelry', nameRu: 'Украшения' },
  { id: 'Accessories', name: 'Accessories', nameRu: 'Аксессуары' },
]

// Тексты
const TEXTS = {
  ru: {
    title: 'LUXURY',
    subtitle: 'BATTLE',
    online: 'игроков онлайн',
    wins: 'ПОБЕД',
    losses: 'ПОРАЖЕНИЙ',
    winrate: 'ВИНРЕЙТ',
    createGame: 'СОЗДАТЬ ИГРУ',
    joinGame: 'ВОЙТИ В ИГРУ',
    quickMatch: 'БЫСТРАЯ ИГРА',
    howToPlay: 'КАК ИГРАТЬ',
    rules: [
      '1. Создайте игру или присоединитесь к существующей',
      '2. Выберите свой люксовый предмет',
      '3. Разместите 3 копии предмета на поле 3×3',
      '4. По очереди открывайте клетки противника',
      '5. Найдите все 3 предмета противника первым!',
    ],
    close: 'ЗАКРЫТЬ',
    enterCode: 'Введите код игры',
    join: 'ВОЙТИ',
    cancel: 'ОТМЕНА',
    gameCode: 'Код игры',
    copied: 'Скопировано!',
    waiting: 'Ожидание игрока...',
    selectItem: 'Выберите предмет',
    placeItems: 'Расставьте предметы',
    placed: 'расставлено',
    confirm: 'ПОДТВЕРДИТЬ',
    confirmed: 'ПОДТВЕРЖДЕНО',
    waitingOpponent: 'Ожидание противника...',
    yourTurn: 'Ваш ход!',
    opponentTurn: 'Ход противника',
    yourField: 'Ваше поле',
    opponentField: 'Поле противника',
    found: 'найдено',
    victory: 'ПОБЕДА!',
    defeat: 'ПОРАЖЕНИЕ',
    playAgain: 'ИГРАТЬ СНОВА',
    backToLobby: 'В ЛОББИ',
    you: 'ВЫ',
    opponent: 'ПРОТИВНИК',
    ready: 'ГОТОВ',
    notReady: 'НЕ ГОТОВ',
    tapToSelect: 'Нажмите на 3 клетки',
  },
  en: {
    title: 'LUXURY',
    subtitle: 'BATTLE',
    online: 'players online',
    wins: 'WINS',
    losses: 'LOSSES',
    winrate: 'WIN RATE',
    createGame: 'CREATE GAME',
    joinGame: 'JOIN GAME',
    quickMatch: 'QUICK MATCH',
    howToPlay: 'HOW TO PLAY',
    rules: [
      '1. Create a game or join existing one',
      '2. Choose your luxury item',
      '3. Place 3 copies of your item on 3×3 grid',
      '4. Take turns revealing opponent cells',
      '5. Find all 3 opponent items first to win!',
    ],
    close: 'CLOSE',
    enterCode: 'Enter game code',
    join: 'JOIN',
    cancel: 'CANCEL',
    gameCode: 'Game Code',
    copied: 'Copied!',
    waiting: 'Waiting for player...',
    selectItem: 'Select your item',
    placeItems: 'Place your items',
    placed: 'placed',
    confirm: 'CONFIRM',
    confirmed: 'CONFIRMED',
    waitingOpponent: 'Waiting for opponent...',
    yourTurn: 'Your turn!',
    opponentTurn: 'Opponent\'s turn',
    yourField: 'Your field',
    opponentField: 'Opponent\'s field',
    found: 'found',
    victory: 'VICTORY!',
    defeat: 'DEFEAT',
    playAgain: 'PLAY AGAIN',
    backToLobby: 'BACK TO LOBBY',
    you: 'YOU',
    opponent: 'OPPONENT',
    ready: 'READY',
    notReady: 'NOT READY',
    tapToSelect: 'Tap on 3 cells',
  }
}

// Карточка предмета
function ItemCard({ item, selected, onClick, size = 'normal', lang = 'ru' }: { 
  item: LuxuryItem
  selected?: boolean
  onClick?: () => void
  size?: 'small' | 'normal' | 'large'
  lang?: 'ru' | 'en'
}) {
  const sizeClasses = {
    small: 'w-12 h-12 text-xs',
    normal: 'w-20 h-20 text-sm',
    large: 'w-24 h-24 text-base'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onTouchEnd={(e) => {
        e.preventDefault()
        onClick?.()
      }}
      className={`
        ${sizeClasses[size]}
        bg-gradient-to-br ${item.gradient}
        rounded-xl flex flex-col items-center justify-center
        transition-all duration-200 select-none
        ${selected ? 'ring-4 ring-white scale-105' : 'ring-1 ring-white/20'}
        ${onClick ? 'active:scale-95 cursor-pointer' : ''}
      `}
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
    >
      <span className="font-black text-white drop-shadow-lg" style={{ fontSize: size === 'small' ? '14px' : size === 'large' ? '24px' : '18px' }}>
        {item.letter}
      </span>
      <span className="text-white/80 font-medium truncate w-full text-center px-1" style={{ fontSize: size === 'small' ? '6px' : size === 'large' ? '10px' : '8px' }}>
        {lang === 'ru' ? item.nameRu : item.name}
      </span>
    </button>
  )
}

export default function App() {
  // Состояния
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [playerId, setPlayerId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')
  const [screen, setScreen] = useState<'lobby' | 'game'>('lobby')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedItem, setSelectedItem] = useState<LuxuryItem | null>(null)
  const [selectedPositions, setSelectedPositions] = useState<number[]>([])
  const [positionsConfirmed, setPositionsConfirmed] = useState(false)
  const [timer, setTimer] = useState(30)
  const [timerActive, setTimerActive] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [onlinePlayers, setOnlinePlayers] = useState(1)
  const [stats, setStats] = useState({ wins: 0, losses: 0 })
  const [lang, setLang] = useState<'ru' | 'en'>('ru')
  const [category, setCategory] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const t = TEXTS[lang]

  // Загрузка данных
  useEffect(() => {
    const savedLang = localStorage.getItem('luxuryBattleLang') as 'ru' | 'en' | null
    if (savedLang) setLang(savedLang)

    const savedStats = localStorage.getItem('luxuryBattleStats')
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats))
      } catch (e) {
        console.error('Failed to parse stats', e)
      }
    }

    const savedName = localStorage.getItem('luxuryBattleName')
    if (savedName) setPlayerName(savedName)

    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Socket соединение
  useEffect(() => {
    const socketUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8080' 
      : window.location.origin

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
      setPlayerId(newSocket.id || '')
      setError(null)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err)
      setError('Ошибка подключения к серверу')
    })

    newSocket.on('onlinePlayers', (count: number) => {
      setOnlinePlayers(count)
    })

    newSocket.on('gameCreated', (game: GameState) => {
      console.log('Game created:', game)
      setGameState(game)
      setScreen('game')
    })

    newSocket.on('gameJoined', (game: GameState) => {
      console.log('Game joined:', game)
      setGameState(game)
      setScreen('game')
      setShowJoinModal(false)
      setJoinCode('')
    })

    newSocket.on('gameUpdated', (game: GameState) => {
      console.log('Game updated:', game)
      setGameState(game)
      
      if (game.phase === 'playing') {
        setTimerActive(true)
        setTimer(30)
      }
    })

    newSocket.on('gameError', (message: string) => {
      console.error('Game error:', message)
      setError(message)
      setTimeout(() => setError(null), 3000)
    })

    newSocket.on('gameEnded', (data: { winner: string, game: GameState }) => {
      console.log('Game ended:', data)
      setGameState(data.game)
      setTimerActive(false)
      
      const isWinner = data.winner === playerId
      const newStats = {
        wins: stats.wins + (isWinner ? 1 : 0),
        losses: stats.losses + (isWinner ? 0 : 1)
      }
      setStats(newStats)
      localStorage.setItem('luxuryBattleStats', JSON.stringify(newStats))
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Таймер
  useEffect(() => {
    if (!timerActive || !gameState || gameState.phase !== 'playing') return

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          // Автоматический ход при истечении времени
          if (gameState.currentTurn === playerId) {
            const opponent = gameState.players.find(p => p.id !== playerId)
            if (opponent) {
              const hiddenCells = [0,1,2,3,4,5,6,7,8].filter(i => !opponent.positions.includes(i))
              if (hiddenCells.length > 0) {
                const randomCell = hiddenCells[Math.floor(Math.random() * hiddenCells.length)]
                handleCellClick(randomCell)
              }
            }
          }
          return 30
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timerActive, gameState, playerId])

  // Смена языка
  const toggleLang = useCallback(() => {
    const newLang = lang === 'ru' ? 'en' : 'ru'
    setLang(newLang)
    localStorage.setItem('luxuryBattleLang', newLang)
  }, [lang])

  // Создание игры
  const createGame = useCallback(() => {
    if (!socket || !connected) return
    const name = playerName || `Player_${Math.random().toString(36).substring(7)}`
    setPlayerName(name)
    localStorage.setItem('luxuryBattleName', name)
    socket.emit('createGame', { playerName: name })
  }, [socket, connected, playerName])

  // Присоединение к игре
  const joinGame = useCallback(() => {
    if (!socket || !connected || !joinCode.trim()) return
    const name = playerName || `Player_${Math.random().toString(36).substring(7)}`
    setPlayerName(name)
    localStorage.setItem('luxuryBattleName', name)
    socket.emit('joinGame', { gameId: joinCode.toUpperCase().trim(), playerName: name })
  }, [socket, connected, joinCode, playerName])

  // Быстрая игра
  const quickMatch = useCallback(() => {
    if (!socket || !connected) return
    const name = playerName || `Player_${Math.random().toString(36).substring(7)}`
    setPlayerName(name)
    localStorage.setItem('luxuryBattleName', name)
    socket.emit('quickMatch', { playerName: name })
  }, [socket, connected, playerName])

  // Выбор предмета
  const selectItem = useCallback((item: LuxuryItem) => {
    if (!socket || !gameState) return
    setSelectedItem(item)
    socket.emit('selectItem', { gameId: gameState.id, item })
  }, [socket, gameState])

  // Выбор позиции
  const togglePosition = useCallback((index: number) => {
    if (positionsConfirmed) return
    
    setSelectedPositions(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      }
      if (prev.length >= 3) {
        return prev
      }
      return [...prev, index]
    })
  }, [positionsConfirmed])

  // Подтверждение позиций
  const confirmPositions = useCallback(() => {
    console.log('confirmPositions called', { socket: !!socket, gameState: !!gameState, selectedPositions, positionsConfirmed })
    
    if (!socket || !gameState) {
      console.log('No socket or gameState')
      return
    }
    
    if (selectedPositions.length !== 3) {
      console.log('Not enough positions:', selectedPositions.length)
      return
    }
    
    if (positionsConfirmed) {
      console.log('Already confirmed')
      return
    }
    
    console.log('Emitting confirmPositions')
    setPositionsConfirmed(true)
    socket.emit('confirmPositions', { gameId: gameState.id, positions: selectedPositions })
  }, [socket, gameState, selectedPositions, positionsConfirmed])

  // Клик по клетке противника
  const handleCellClick = useCallback((index: number) => {
    if (!socket || !gameState || gameState.currentTurn !== playerId) return
    socket.emit('revealCell', { gameId: gameState.id, cellIndex: index })
    setTimer(30)
  }, [socket, gameState, playerId])

  // Копирование кода
  const copyCode = useCallback(() => {
    if (!gameState) return
    navigator.clipboard.writeText(gameState.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [gameState])

  // Возврат в лобби
  const backToLobby = useCallback(() => {
    setScreen('lobby')
    setGameState(null)
    setSelectedItem(null)
    setSelectedPositions([])
    setPositionsConfirmed(false)
    setTimerActive(false)
    setTimer(30)
  }, [])

  // Фильтрация предметов
  const filteredItems = category === 'all' 
    ? LUXURY_ITEMS 
    : LUXURY_ITEMS.filter(item => item.category === category)

  // Получение данных игрока
  const me = gameState?.players.find(p => p.id === playerId)
  const opponent = gameState?.players.find(p => p.id !== playerId)
  const isMyTurn = gameState?.currentTurn === playerId
  const winRate = stats.wins + stats.losses > 0 
    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) 
    : 0

  // Загрузка
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="text-4xl font-black text-white tracking-wider mb-4">LUXURY</div>
        <div className="text-5xl font-black text-white tracking-widest mb-8">BATTLE</div>
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  // Лобби
  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Шапка */}
        <header className="p-4 flex justify-between items-center">
          <div className="text-xs text-white/50">
            {connected ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {onlinePlayers} {t.online}
              </span>
            ) : (
              <span className="text-red-500">Offline</span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleLang}
            onTouchEnd={(e) => { e.preventDefault(); toggleLang(); }}
            className="px-3 py-1 bg-white/10 rounded-lg text-sm font-bold active:bg-white/20 select-none"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>
        </header>

        {/* Основной контент */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          {/* Лого */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-black tracking-wider mb-1">{t.title}</h1>
            <h2 className="text-5xl sm:text-6xl font-black tracking-widest">{t.subtitle}</h2>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="w-12 h-px bg-white/30" />
              <div className="w-2 h-2 bg-white rotate-45" />
              <div className="w-12 h-px bg-white/30" />
            </div>
          </div>

          {/* Статистика */}
          <div className="flex justify-center gap-6 mb-10">
            <div className="text-center">
              <div className="text-3xl font-black">{stats.wins}</div>
              <div className="text-xs text-white/50">{t.wins}</div>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center">
              <div className="text-3xl font-black">{stats.losses}</div>
              <div className="text-xs text-white/50">{t.losses}</div>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center">
              <div className="text-3xl font-black">{winRate}%</div>
              <div className="text-xs text-white/50">{t.winrate}</div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="w-full max-w-xs space-y-4">
            <button
              type="button"
              onClick={createGame}
              onTouchEnd={(e) => { e.preventDefault(); createGame(); }}
              disabled={!connected}
              className="w-full py-4 bg-white text-black font-bold text-lg rounded-xl active:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed select-none transition-all"
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              {t.createGame}
            </button>

            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              onTouchEnd={(e) => { e.preventDefault(); setShowJoinModal(true); }}
              disabled={!connected}
              className="w-full py-4 bg-transparent border-2 border-white text-white font-bold text-lg rounded-xl active:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed select-none transition-all"
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              {t.joinGame}
            </button>

            <button
              type="button"
              onClick={quickMatch}
              onTouchEnd={(e) => { e.preventDefault(); quickMatch(); }}
              disabled={!connected}
              className="w-full py-4 bg-white/10 text-white font-bold text-lg rounded-xl active:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed select-none transition-all"
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              {t.quickMatch}
            </button>
          </div>

          {/* Как играть */}
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            onTouchEnd={(e) => { e.preventDefault(); setShowRulesModal(true); }}
            className="mt-8 text-white/50 text-sm flex items-center gap-2 active:text-white select-none transition-all"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.howToPlay}
          </button>

          {/* Ошибка */}
          {error && (
            <div className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </main>

        {/* Футер */}
        <footer className="p-4 text-center text-white/30 text-xs">
          LUXURY BATTLE © 2024
        </footer>

        {/* Модалка присоединения */}
        {showJoinModal && (
          <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50"
            onClick={() => setShowJoinModal(false)}
          >
            <div 
              className="bg-neutral-900 rounded-2xl p-6 w-full max-w-sm border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-center mb-6">{t.enterCode}</h3>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={6}
                className="w-full px-4 py-4 bg-black border border-white/20 rounded-xl text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-white mb-6"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  onTouchEnd={(e) => { e.preventDefault(); setShowJoinModal(false); }}
                  className="flex-1 py-3 bg-white/10 rounded-xl font-bold active:bg-white/20 select-none"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={joinGame}
                  onTouchEnd={(e) => { e.preventDefault(); joinGame(); }}
                  disabled={joinCode.length < 4}
                  className="flex-1 py-3 bg-white text-black rounded-xl font-bold active:bg-white/80 disabled:opacity-50 select-none"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  {t.join}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модалка правил */}
        {showRulesModal && (
          <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50"
            onClick={() => setShowRulesModal(false)}
          >
            <div 
              className="bg-neutral-900 rounded-2xl p-6 w-full max-w-sm border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-center mb-6">{t.howToPlay}</h3>
              <div className="space-y-3 text-sm text-white/80 mb-6">
                {t.rules.map((rule, i) => (
                  <p key={i}>{rule}</p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                onTouchEnd={(e) => { e.preventDefault(); setShowRulesModal(false); }}
                className="w-full py-3 bg-white text-black rounded-xl font-bold active:bg-white/80 select-none"
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                {t.close}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Игра
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Шапка игры */}
      <header className="p-4 flex justify-between items-center border-b border-white/10">
        <button
          type="button"
          onClick={backToLobby}
          onTouchEnd={(e) => { e.preventDefault(); backToLobby(); }}
          className="text-white/50 active:text-white select-none"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        
        {gameState && (
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-xs">{t.gameCode}:</span>
            <button
              type="button"
              onClick={copyCode}
              onTouchEnd={(e) => { e.preventDefault(); copyCode(); }}
              className="px-3 py-1 bg-white/10 rounded-lg font-mono text-sm active:bg-white/20 select-none"
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              {copied ? t.copied : gameState.id}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={toggleLang}
          onTouchEnd={(e) => { e.preventDefault(); toggleLang(); }}
          className="px-3 py-1 bg-white/10 rounded-lg text-sm font-bold active:bg-white/20 select-none"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>
      </header>

      {/* Основной контент игры */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        
        {/* Ожидание игрока */}
        {gameState?.phase === 'waiting' && (
          <div className="text-center">
            <div className="text-xl font-bold mb-6">{t.waiting}</div>
            <div className="flex gap-2 justify-center">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Выбор предмета */}
        {gameState?.phase === 'selecting' && (
          <div className="w-full max-w-md">
            <h2 className="text-xl font-bold text-center mb-6">{t.selectItem}</h2>
            
            {/* Категории */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  onTouchEnd={(e) => { e.preventDefault(); setCategory(cat.id); }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all select-none ${
                    category === cat.id 
                      ? 'bg-white text-black' 
                      : 'bg-white/10 text-white active:bg-white/20'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  {lang === 'ru' ? cat.nameRu : cat.name}
                </button>
              ))}
            </div>

            {/* Сетка предметов */}
            <div className="grid grid-cols-4 gap-3 justify-items-center">
              {filteredItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selected={selectedItem?.id === item.id}
                  onClick={() => selectItem(item)}
                  lang={lang}
                />
              ))}
            </div>
          </div>
        )}

        {/* Расстановка предметов */}
        {gameState?.phase === 'placing' && (
          <div className="w-full max-w-sm">
            <h2 className="text-xl font-bold text-center mb-2">{t.placeItems}</h2>
            <p className="text-center text-white/50 text-sm mb-6">
              {selectedPositions.length}/3 {t.placed}
            </p>

            {/* Выбранный предмет */}
            {selectedItem && (
              <div className="flex justify-center mb-6">
                <ItemCard item={selectedItem} size="large" lang={lang} />
              </div>
            )}

            {/* Поле 3x3 */}
            <div className="grid grid-cols-3 gap-2 mb-6 max-w-[280px] mx-auto">
              {[0,1,2,3,4,5,6,7,8].map(index => {
                const isSelected = selectedPositions.includes(index)
                const isDisabled = positionsConfirmed
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => !isDisabled && togglePosition(index)}
                    onTouchEnd={(e) => { 
                      e.preventDefault()
                      if (!isDisabled) togglePosition(index)
                    }}
                    disabled={isDisabled}
                    className={`
                      aspect-square rounded-xl flex items-center justify-center
                      transition-all select-none
                      ${isSelected 
                        ? `bg-gradient-to-br ${selectedItem?.gradient || 'from-white/20 to-white/10'}` 
                        : 'bg-white/5 border border-white/20'
                      }
                      ${!isDisabled ? 'active:scale-95' : ''}
                    `}
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  >
                    {isSelected && selectedItem && (
                      <span className="text-2xl font-black text-white drop-shadow-lg">
                        {selectedItem.letter}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Кнопка подтверждения */}
            {!positionsConfirmed ? (
              <button
                type="button"
                onClick={() => {
                  console.log('Button clicked')
                  confirmPositions()
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Button touched')
                  confirmPositions()
                }}
                disabled={selectedPositions.length !== 3}
                className={`
                  w-full py-4 rounded-xl font-bold text-lg select-none transition-all
                  ${selectedPositions.length === 3 
                    ? 'bg-white text-black active:bg-white/80' 
                    : 'bg-white/20 text-white/50 cursor-not-allowed'
                  }
                `}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                {t.confirm}
              </button>
            ) : (
              <div className="w-full py-4 rounded-xl font-bold text-lg text-center bg-green-500/20 text-green-400 border border-green-500/30">
                ✓ {t.confirmed}
              </div>
            )}

            {positionsConfirmed && (
              <p className="text-center text-white/50 text-sm mt-4">
                {t.waitingOpponent}
              </p>
            )}
          </div>
        )}

        {/* Игровой процесс */}
        {gameState?.phase === 'playing' && me && opponent && (
          <div className="w-full max-w-md">
            {/* Статус хода */}
            <div className="text-center mb-4">
              <div className={`text-lg font-bold ${isMyTurn ? 'text-green-400' : 'text-white/50'}`}>
                {isMyTurn ? t.yourTurn : t.opponentTurn}
              </div>
              <div className={`text-3xl font-mono font-bold mt-2 ${timer <= 10 ? 'text-red-500' : 'text-white'}`}>
                {timer}
              </div>
            </div>

            {/* Счёт */}
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-sm text-white/50">{t.you}</div>
                <div className="text-2xl font-bold text-green-400">{me.score}/3</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-white/50">{t.opponent}</div>
                <div className="text-2xl font-bold text-red-400">{opponent.score}/3</div>
              </div>
            </div>

            {/* Поле противника */}
            <div className="mb-6">
              <h3 className="text-sm text-white/50 text-center mb-2">{t.opponentField}</h3>
              <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
                {[0,1,2,3,4,5,6,7,8].map(index => {
                  const isRevealed = opponent.positions.includes(index)
                  const isLastMove = gameState.lastMove === index
                  const canClick = isMyTurn && !isRevealed
                  
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => canClick && handleCellClick(index)}
                      onTouchEnd={(e) => {
                        e.preventDefault()
                        if (canClick) handleCellClick(index)
                      }}
                      disabled={!canClick}
                      className={`
                        aspect-square rounded-xl flex items-center justify-center
                        transition-all select-none
                        ${isRevealed 
                          ? `bg-gradient-to-br ${opponent.item?.gradient || 'from-green-500 to-green-600'}` 
                          : canClick 
                            ? 'bg-white/10 border-2 border-white/30 active:scale-95 active:bg-white/20' 
                            : 'bg-white/5 border border-white/10'
                        }
                        ${isLastMove && isRevealed ? 'ring-4 ring-yellow-400' : ''}
                      `}
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      {isRevealed && opponent.item ? (
                        <span className="text-2xl font-black text-white drop-shadow-lg">
                          {opponent.item.letter}
                        </span>
                      ) : (
                        <span className="text-2xl text-white/20">?</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Моё поле */}
            <div>
              <h3 className="text-sm text-white/50 text-center mb-2">{t.yourField}</h3>
              <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto opacity-60">
                {[0,1,2,3,4,5,6,7,8].map(index => {
                  const hasItem = me.positions.includes(index)
                  
                  return (
                    <div
                      key={index}
                      className={`
                        aspect-square rounded-lg flex items-center justify-center
                        ${hasItem 
                          ? `bg-gradient-to-br ${me.item?.gradient || 'from-blue-500 to-blue-600'}` 
                          : 'bg-white/5 border border-white/10'
                        }
                      `}
                    >
                      {hasItem && me.item && (
                        <span className="text-lg font-black text-white drop-shadow-lg">
                          {me.item.letter}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Конец игры */}
        {gameState?.phase === 'finished' && (
          <div className="text-center">
            <div className={`text-5xl font-black mb-4 ${gameState.winner === playerId ? 'text-green-400' : 'text-red-400'}`}>
              {gameState.winner === playerId ? t.victory : t.defeat}
            </div>
            
            <div className="text-6xl mb-8">
              {gameState.winner === playerId ? '🏆' : '😢'}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={backToLobby}
                onTouchEnd={(e) => { e.preventDefault(); backToLobby(); }}
                className="w-64 py-4 bg-white text-black rounded-xl font-bold text-lg active:bg-white/80 select-none"
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                {t.playAgain}
              </button>
            </div>
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </main>
    </div>
  )
}
