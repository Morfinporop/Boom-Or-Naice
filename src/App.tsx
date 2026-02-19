import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { cn } from './utils/cn';

/* ─────────────── TYPES ─────────────── */
type Phase = 'menu' | 'lobby' | 'waiting' | 'setup' | 'placing' | 'waitingOpponent' | 'playing' | 'finished';
type PN = 1 | 2;
type Lang = 'ru' | 'en';

interface Item {
  id: string;
  name: string;
  image: string;
}

interface GS {
  phase: Phase;
  gameId: string | null;
  pn: PN | null;
  item: Item | null;
  positions: number[];
  oppItem: Item | null;
  oppReady: boolean;
  board: (string | null)[];
  revealed: boolean[];
  turn: PN | null;
  timer: number;
  winner: PN | null;
  winItem: Item | null;
  myFound: number;
  oppFound: number;
}

/* ─────────────── i18n ─────────────── */
const T: Record<string, Record<Lang, string>> = {
  multiplayer: { ru: 'МУЛЬТИПЛЕЕР', en: 'MULTIPLAYER' },
  luxury: { ru: 'LUXURY', en: 'LUXURY' },
  battle: { ru: 'БАТТЛ', en: 'BATTLE' },
  create: { ru: 'СОЗДАТЬ ИГРУ', en: 'CREATE GAME' },
  join: { ru: 'ВОЙТИ В ИГРУ', en: 'JOIN GAME' },
  quick: { ru: 'БЫСТРЫЙ ПОИСК', en: 'QUICK MATCH' },
  howTitle: { ru: 'КАК ИГРАТЬ', en: 'HOW TO PLAY' },
  how1: { ru: 'Выберите люксовый бренд', en: 'Choose a luxury brand' },
  how2: { ru: 'Спрячьте 3 предмета на поле 3×3', en: 'Hide 3 items on a 3×3 grid' },
  how3: { ru: 'По очереди открывайте клетки соперника', en: 'Take turns revealing opponent cells' },
  how4: { ru: 'Кто первый найдёт все 3 — побеждает!', en: 'First to find all 3 wins!' },
  enterCode: { ru: 'ВВЕДИТЕ КОД ИГРЫ', en: 'ENTER GAME CODE' },
  back: { ru: 'НАЗАД', en: 'BACK' },
  joinBtn: { ru: 'ВОЙТИ', en: 'JOIN' },
  player: { ru: 'ИГРОК', en: 'PLAYER' },
  waitingFor: { ru: 'ОЖИДАНИЕ', en: 'WAITING' },
  forOpp: { ru: 'соперника...', en: 'for opponent...' },
  gameCode: { ru: 'КОД ИГРЫ', en: 'GAME CODE' },
  copy: { ru: 'КОПИРОВАТЬ КОД', en: 'COPY CODE' },
  copied: { ru: 'СКОПИРОВАНО!', en: 'COPIED!' },
  shareCode: { ru: 'Отправьте этот код другу', en: 'Share this code with a friend' },
  cancel: { ru: 'ОТМЕНА', en: 'CANCEL' },
  searching: { ru: 'ПОИСК', en: 'SEARCHING' },
  lookingFor: { ru: 'ищем соперника...', en: 'looking for opponent...' },
  mayTake: { ru: 'Это может занять время...', en: 'This may take a moment...' },
  chooseItem: { ru: 'ВЫБЕРИТЕ ПРЕДМЕТ', en: 'CHOOSE YOUR ITEM' },
  chooseDesc: { ru: 'Какой бренд будете прятать?', en: 'Select a luxury brand to hide' },
  placeItems: { ru: 'РАЗМЕСТИТЕ ПРЕДМЕТЫ', en: 'PLACE YOUR ITEMS' },
  placeDesc: { ru: 'Выберите 3 клетки для скрытия', en: 'Select 3 cells to hide items' },
  placed: { ru: 'размещено', en: 'placed' },
  confirm: { ru: 'ПОДТВЕРДИТЬ', en: 'CONFIRM' },
  selectMore: { ru: 'ВЫБЕРИТЕ ЕЩЁ', en: 'SELECT MORE' },
  itemsPlaced: { ru: 'ПРЕДМЕТЫ РАЗМЕЩЕНЫ', en: 'ITEMS PLACED' },
  waitOpp: { ru: 'Ожидание соперника...', en: 'Waiting for opponent...' },
  yourGrid: { ru: 'ВАШЕ ПОЛЕ', en: 'YOUR GRID' },
  yourTurn: { ru: 'ВАШ ХОД', en: 'YOUR TURN' },
  oppTurn: { ru: 'ХОД СОПЕРНИКА', en: "OPPONENT'S TURN" },
  you: { ru: 'ВЫ', en: 'YOU' },
  opp: { ru: 'СОПЕРНИК', en: 'OPP' },
  yours: { ru: 'ВАШЕ', en: 'YOURS' },
  find: { ru: 'ИЩИТЕ', en: 'FIND' },
  congrats: { ru: 'ПОЗДРАВЛЯЕМ', en: 'CONGRATULATIONS' },
  victory: { ru: 'ПОБЕДА', en: 'VICTORY' },
  youWon: { ru: 'Вы нашли все предметы соперника!', en: "You found all opponent's items!" },
  yourPrize: { ru: 'ВАШ ПРИЗ', en: 'YOUR PRIZE' },
  gameOver: { ru: 'КОНЕЦ ИГРЫ', en: 'GAME OVER' },
  defeat: { ru: 'ПОРАЖЕНИЕ', en: 'DEFEAT' },
  youLost: { ru: 'Соперник нашёл все ваши предметы первым', en: 'Opponent found all your items first' },
  nextTime: { ru: 'ПОВЕЗЁТ В СЛЕДУЮЩИЙ РАЗ', en: 'BETTER LUCK NEXT TIME' },
  playAgain: { ru: 'ИГРАТЬ СНОВА', en: 'PLAY AGAIN' },
  connecting: { ru: 'ПОДКЛЮЧЕНИЕ К СЕРВЕРУ...', en: 'CONNECTING TO SERVER...' },
  connLost: { ru: 'СОЕДИНЕНИЕ ПОТЕРЯНО — ПЕРЕПОДКЛЮЧЕНИЕ...', en: 'CONNECTION LOST — RECONNECTING...' },
  oppDisconnected: { ru: 'Соперник отключился!', en: 'Opponent disconnected!' },
  gameNotFound: { ru: 'Игра не найдена', en: 'Game not found' },
  tapToReveal: { ru: 'Нажмите на клетку, чтобы открыть', en: 'Tap a cell to reveal it' },
  waitForTurn: { ru: 'Дождитесь своего хода', en: 'Wait for your turn' },
};

/* ─────────────── ITEMS with reliable images ─────────────── */
const ITEMS: Item[] = [
  { id: 'chanel', name: 'CHANEL', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Chanel_logo_interlocking_cs.svg/200px-Chanel_logo_interlocking_cs.svg.png' },
  { id: 'rolex', name: 'ROLEX', image: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/95/Rolex_logo.svg/200px-Rolex_logo.svg.png' },
  { id: 'gucci', name: 'GUCCI', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/1960s_Gucci_Logo.svg/200px-1960s_Gucci_Logo.svg.png' },
  { id: 'prada', name: 'PRADA', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Prada-Logo.svg/200px-Prada-Logo.svg.png' },
  { id: 'dior', name: 'DIOR', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Dior_Logo.svg/200px-Dior_Logo.svg.png' },
  { id: 'lv', name: 'LOUIS VUITTON', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Louis_Vuitton_logo_and_wordmark.svg/200px-Louis_Vuitton_logo_and_wordmark.svg.png' },
  { id: 'hermes', name: 'HERMÈS', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Herm%C3%A8s_Paris.svg/200px-Herm%C3%A8s_Paris.svg.png' },
  { id: 'cartier', name: 'CARTIER', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Cartier_Logo.svg/200px-Cartier_Logo.svg.png' },
  { id: 'balenciaga', name: 'BALENCIAGA', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Balenciaga_Logo.svg/200px-Balenciaga_Logo.svg.png' },
  { id: 'versace', name: 'VERSACE', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Versace_logo.png/200px-Versace_logo.png' },
  { id: 'burberry', name: 'BURBERRY', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Burberry_Logo_2018.svg/200px-Burberry_Logo_2018.svg.png' },
  { id: 'fendi', name: 'FENDI', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Fendi_logo.svg/200px-Fendi_logo.svg.png' },
];

let socket: Socket | null = null;

const INIT: GS = {
  phase: 'menu', gameId: null, pn: null, item: null, positions: [],
  oppItem: null, oppReady: false, board: Array(9).fill(null),
  revealed: Array(9).fill(false), turn: null, timer: 30,
  winner: null, winItem: null, myFound: 0, oppFound: 0,
};

export function App() {
  const [gs, set] = useState<GS>(INIT);
  const [lang, setLang] = useState<Lang>('ru');
  const [joinId, setJoinId] = useState('');
  const [copied, setCopied] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [lastRev, setLastRev] = useState<number | null>(null);
  const [conn, setConn] = useState<'on' | 'off' | 'wait'>('wait');
  const timerRef = useRef(30);

  const t = useCallback((key: string) => T[key]?.[lang] ?? key, [lang]);

  const reset = useCallback(() => {
    set(INIT);
    setShowJoin(false);
    setJoinId('');
    setCopied(false);
  }, []);

  /* ─── Socket setup ─── */
  useEffect(() => {
    const url = window.location.hostname === 'localhost'
      ? 'http://localhost:8080'
      : window.location.origin;
    socket = io(url, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => setConn('on'));
    socket.on('disconnect', () => setConn('off'));

    socket.on('gameCreated', ({ gameId, playerNumber }: { gameId: string; playerNumber: number }) => {
      set(p => ({ ...p, phase: 'lobby', gameId, pn: playerNumber as PN }));
    });

    socket.on('playerAssigned', ({ playerNumber }: { playerNumber: number }) => {
      set(p => ({ ...p, pn: playerNumber as PN }));
    });

    socket.on('gameStarted', () => {
      set(p => ({ ...p, phase: 'setup' }));
    });

    socket.on('waitingForPlayer', () => {
      set(p => ({ ...p, phase: 'waiting' }));
    });

    socket.on('itemSelected', ({ playerNumber, item }: { playerNumber: string; item: Item }) => {
      set(p => {
        if (playerNumber === `player${p.pn}`) return p;
        return { ...p, oppItem: item };
      });
    });

    socket.on('positionsSelected', ({ playerNumber }: { playerNumber: string }) => {
      set(p => {
        if (playerNumber !== `player${p.pn}`) return { ...p, oppReady: true };
        return p;
      });
    });

    socket.on('gamePhase', ({ phase, currentPlayer, timer }: { phase: string; currentPlayer: string; timer: number }) => {
      set(p => ({
        ...p,
        phase: phase === 'playing' ? 'playing' : p.phase,
        turn: parseInt(currentPlayer.replace('player', '')) as PN,
        timer,
      }));
    });

    socket.on('cellRevealed', ({ position, player }: { position: number; player: string }) => {
      setLastRev(position);
      setTimeout(() => setLastRev(null), 600);
      set(p => {
        const rev = [...p.revealed];
        rev[position] = true;
        const b = [...p.board];
        const isMine = player === `player${p.pn}`;
        const isEmpty = player === 'empty';
        b[position] = isEmpty ? 'empty' : (isMine ? 'mine' : 'opp');
        const myF = b.filter((v, i) => rev[i] && v === 'opp').length;
        const opF = b.filter((v, i) => rev[i] && v === 'mine').length;
        return { ...p, revealed: rev, board: b, myFound: myF, oppFound: opF };
      });
    });

    socket.on('turnChange', ({ currentPlayer, timer }: { currentPlayer: string; timer: number }) => {
      set(p => ({
        ...p,
        turn: parseInt(currentPlayer.replace('player', '')) as PN,
        timer,
      }));
    });

    socket.on('timerUpdate', (timer: number) => {
      set(p => {
        timerRef.current = p.timer;
        return { ...p, timer };
      });
    });

    socket.on('gameOver', ({ winner, item }: { winner: string; item: Item }) => {
      const wn = parseInt(winner.replace('player', '')) as PN;
      set(p => ({ ...p, phase: 'finished', winner: wn, winItem: item }));
    });

    socket.on('playerDisconnected', () => {
      // will be handled in component
      set(p => ({ ...p, phase: 'menu' }));
    });

    socket.on('error', (msg: string) => alert(msg));

    return () => { socket?.disconnect(); };
  }, [reset]);

  /* ─── Actions ─── */
  const createGame = () => socket?.emit('createGame');
  const findGame = () => socket?.emit('findGame');

  const joinGame = () => {
    const id = joinId.trim().toLowerCase();
    if (id && socket) {
      socket.emit('joinGame', id);
      setShowJoin(false);
      setJoinId('');
    }
  };

  const selectItem = (item: Item) => {
    set(p => ({ ...p, item, phase: 'placing' }));
    if (socket && gs.gameId) socket.emit('selectItem', { gameId: gs.gameId, item });
  };

  const togglePos = (pos: number) => {
    set(p => {
      const a = [...p.positions];
      const i = a.indexOf(pos);
      if (i > -1) a.splice(i, 1);
      else if (a.length < 3) a.push(pos);
      return { ...p, positions: a };
    });
  };

  const confirmPositions = () => {
    if (gs.positions.length !== 3 || !socket || !gs.gameId) return;
    socket.emit('selectPositions', { gameId: gs.gameId, positions: gs.positions });
    set(p => ({ ...p, phase: 'waitingOpponent' }));
  };

  const selectCell = (pos: number) => {
    if (!socket || !gs.gameId) return;
    if (gs.turn !== gs.pn) return;
    if (gs.revealed[pos]) return;
    socket.emit('selectCell', { gameId: gs.gameId, position: pos });
  };

  const copyId = () => {
    if (gs.gameId) {
      navigator.clipboard.writeText(gs.gameId).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isMyTurn = gs.turn === gs.pn;
  const timerPct = (gs.timer / 30) * 100;
  const timerWarn = gs.timer <= 10;
  const timerCrit = gs.timer <= 5;

  /* ─── Lang switcher ─── */
  const LangSwitch = () => (
    <button
      onClick={() => setLang(l => l === 'ru' ? 'en' : 'ru')}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 border border-white/20 bg-black/80 backdrop-blur px-3 py-1.5 text-xs font-bold tracking-wider text-white/60 hover:text-white hover:border-white/40 transition-all"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {lang === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}
    </button>
  );

  /* ─── Item card for grid ─── */
  const ItemImg = ({ src, alt, className = '' }: { src: string; alt: string; className?: string }) => (
    <div className={cn("flex items-center justify-center bg-white p-1", className)}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain"
        loading="lazy"
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = 'none';
          if (el.parentElement) {
            el.parentElement.innerHTML = `<span style="color:#000;font-weight:900;font-size:10px;font-family:'Space Grotesk',sans-serif;letter-spacing:0.05em">${alt}</span>`;
          }
        }}
      />
    </div>
  );

  return (
    <div className="w-full min-h-screen min-h-[100dvh] bg-[#050505] text-white flex flex-col">
      <LangSwitch />

      {/* Connection status */}
      {conn !== 'on' && (
        <div className={cn(
          "fixed top-0 left-0 right-0 z-40 py-2 text-center text-[10px] font-semibold tracking-[0.2em]",
          conn === 'wait' ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400",
        )}>
          {conn === 'wait' ? t('connecting') : t('connLost')}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* ══════════ MENU ══════════ */}
      {/* ═══════════════════════════════════════ */}
      {gs.phase === 'menu' && !showJoin && (
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-[380px] flex flex-col items-center text-center">
            {/* Logo */}
            <div className="mb-10 flex flex-col items-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px w-8 bg-white/15" />
                <span className="text-[9px] tracking-[0.5em] text-white/25 font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {t('multiplayer')}
                </span>
                <div className="h-px w-8 bg-white/15" />
              </div>
              <h1 className="text-[56px] sm:text-[72px] font-black tracking-tighter leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                LUXURY
              </h1>
              <h2 className="text-xl sm:text-2xl font-extralight tracking-[0.5em] text-white/35 mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t('battle')}
              </h2>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-px w-6 bg-white/10" />
                <div className="w-1 h-1 bg-white/30 rotate-45" />
                <div className="h-px w-6 bg-white/10" />
              </div>
            </div>

            {/* Brands preview row */}
            <div className="flex gap-1.5 mb-8">
              {ITEMS.slice(0, 6).map(item => (
                <div key={item.id} className="w-10 h-10 border border-white/10 bg-white/5 flex items-center justify-center p-1 opacity-40">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-contain invert opacity-60"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="w-full flex flex-col gap-3 mb-10">
              <button
                onClick={createGame}
                className="w-full bg-white text-black font-bold py-4 text-sm tracking-[0.25em] hover:bg-gray-200 active:scale-[0.97] transition-all"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {t('create')}
              </button>
              <button
                onClick={() => setShowJoin(true)}
                className="w-full border-2 border-white/80 text-white font-bold py-4 text-sm tracking-[0.25em] hover:bg-white hover:text-black active:scale-[0.97] transition-all"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {t('join')}
              </button>
              <button
                onClick={findGame}
                className="w-full border border-white/20 text-white/40 font-semibold py-4 text-sm tracking-[0.25em] hover:border-white/50 hover:text-white/60 active:scale-[0.97] transition-all"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {t('quick')}
              </button>
            </div>

            {/* How to play */}
            <div className="w-full border border-white/10 p-5">
              <h3 className="text-[9px] font-bold tracking-[0.4em] text-white/20 mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t('howTitle')}
              </h3>
              <div className="flex flex-col gap-2.5">
                {[t('how1'), t('how2'), t('how3'), t('how4')].map((txt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-[10px] font-black text-white/50 shrink-0 mt-0.5 w-5 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-white/30 text-left">{txt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* ══════════ JOIN MODAL ══════════ */}
      {/* ═══════════════════════════════════════ */}
      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/95">
          <div className="w-full max-w-[380px] border-2 border-white/80 bg-[#080808] p-7 flex flex-col items-center text-center">
            <h3 className="text-2xl font-black tracking-[0.1em] mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t('join')}
            </h3>
            <p className="text-[9px] text-white/20 tracking-[0.4em] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t('enterCode')}
            </p>
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="abc123"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && joinGame()}
              className="w-full bg-transparent border-2 border-white/30 px-4 py-3.5 text-2xl tracking-[0.4em] text-center focus:border-white focus:outline-none transition-colors placeholder:text-white/10 mb-6"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
            <div className="w-full grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowJoin(false)}
                className="border border-white/20 text-white/40 font-bold py-3.5 text-sm tracking-[0.15em] hover:border-white/60 hover:text-white transition-all"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {t('back')}
              </button>
              <button
                onClick={joinGame}
                disabled={!joinId.trim()}
                className={cn(
                  "font-bold py-3.5 text-sm tracking-[0.15em] transition-all",
                  joinId.trim()
                    ? "bg-white text-black hover:bg-gray-200"
                    : "bg-white/10 text-white/20 cursor-not-allowed"
                )}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {t('joinBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* ══════════ LOBBY ══════════ */}
      {/* ═══════════════════════════════════════ */}
      {gs.phase === 'lobby' && (
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-[380px] flex flex-col items-center text-center">
            {/* Badge */}
            <div className="flex items-center gap-2 border border-white/20 px-4 py-1.5 mb-6">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] tracking-[0.4em] text-white/50" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t('player')} {gs.pn}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t('waitingFor')}
            </h2>
            <p className="text-sm text-white/20 tracking-[0.15em] mb-8">{t('forOpp')}</p>

            {/* Code box */}
            <div className="w-full border border-white/15 bg-white/[0.02] p-6 mb-5 flex flex-col items-center">
              <p className="text-[9px] text-white/15 tracking-[0.4em] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t('gameCode')}
              </p>
              <p className="text-4xl sm:text-5xl font-bold tracking-[0.3em]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {gs.gameId}
              </p>
            </div>

            <button
              onClick={copyId}
              className={cn(
                "w-full font-bold py-3.5 text-sm tracking-[0.2em] transition-all mb-6",
                copied ? "bg-green-500 text-white" : "bg-white text-black hover:bg-gray-200"
              )}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {copied ? t('copied') : t('copy')}
            </button>

            {/* Animated dots */}
            <div className="flex gap-2.5 mb-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-white rounded-full"
                  style={{ animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <p className="text-white/15 text-xs tracking-wider mb-6">{t('shareCode')}</p>

            <button
              onClick={reset}
              className="w-full border border-white/15 text-white/25 font-semibold py-3.5 text-sm tracking-[0.15em] hover:border-white/40 hover:text-white/50 transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* ══════════ QUICK MATCH WAITING ══════════ */}
      {/* ═══════════════════════════════════════ */}
      {gs.phase === 'waiting' && (
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-[380px] flex flex-col items-center text-center">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t('searching')}
            </h2>
            <p className="text-sm text-white/20 tracking-[0.15em] mb-10">{t('lookingFor')}</p>

            <div className="relative mb-10">
              <div className="w-16 h-16 border-[3px] border-white/10 border-t-white rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            </div>

            <p className="text-xs text-white/10 tracking-wider mb-8">{t('mayTake')}</p>

            <button
              onClick={reset}
              className="w-full max-w-[280px] border border-white/15 text-white/25 font-semibold py-3.5 text-sm tracking-[0.15em] hover:border-white/40 hover:text-white/50 transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* ══════════ SETUP: CHOOSE ITEM ══════════ */}
      {/* ═══════════════════════════════════════ */}
      {gs.phase === 'setup' && (
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-[440px] flex flex-col items-center text-center">
            <div className="flex items-center gap-2 border border-white/20 px-4 py-1.5 mb-5">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[9px] tracking-[0.4em] text-white/50" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t('player')} {gs.pn}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t('chooseItem')}
            </h2>
            <p className="text-sm text-white/20 tracking-wider mb-6">{t('chooseDesc')}</p>

            <div className="w-full grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className="group flex flex-col items-center border-2 border-white/15 bg-white/[0.02] hover:border-white hover:bg-white/5 transition-all p-3 gap-2"
                >
                  <div className="w-full aspect-square flex items-center justify-center p-2 bg-white/5 group-hover:bg-white/10 transition-all">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain invert opacity-70 group-hover:opacity-100 transition-opacity"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-bold tracking-[0.1em] text-white/60 group-hover:text-white transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* ══════════ PLACING ══════════ */}
      {/* ═══════════════════════════════════════ */}
      {gs.phase === 'placing' && gs.item && (
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-[340px] flex flex-col items-center text-center">
            <h2 className="text-2xl font-black tracking-tight mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t('placeItems')}
            </h2>
            <p className="text-sm text-white/20 tracking-wider mb-5">{t('placeDesc')}</p>

            {/* Selected item display */}
            <div className="flex items-center gap-3 border border-white/15 bg-white/[0.02] px-4 py-2.5 mb-4 w-full max-w-[260px]">
              <div className="w-10 h-10 bg-white flex items-center justify-center p-1.5 shrink-0">
                <img src={gs.item.image} alt={gs.item.name} className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold tracking-[0.1em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {gs.item.name}
                </p>
                <p className="text-[10px] text-white/20 tracking-wider">
                  {gs.positions.length} / 3 {t('placed')}
                </p>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex gap-2 mb-5">
              {[0, 1, 2].map(i => (
                <div key={i} className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  i < gs.positions.length ? "bg-white scale-100" : "bg-white/15 scale-75"
                )} />
              ))}
            </div>

            {/* 3x3 Grid */}
            <div className="w-full max-w-[260px] sm:max-w-[300px] mb-6 mx-auto">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }, (_, i) => {
                  const sel = gs.positions.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => togglePos(i)}
                      className={cn(
                        "aspect-square border-2 relative overflow-hidden transition-all duration-200",
                        sel
                          ? "bg-white border-white"
                          : "bg-white/[0.02] border-white/15 hover:border-white/50 active:scale-95"
                      )}
                    >
                      {sel && gs.item ? (
                        <div className="absolute inset-0 bg-white flex items-center justify-center p-2">
                          <img src={gs.item.image} alt="" className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                      ) : (
                        <span className="text-white/10 text-sm font-mono">{i + 1}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={() => {
                if (gs.positions.length === 3) confirmPositions();
              }}
              className={cn(
                "w-full max-w-[300px] font-bold py-4 text-sm tracking-[0.2em] transition-all",
                gs.positions.length === 3
                  ? "bg-white text-black hover:bg-gray-200 active:scale-[0.97] cursor-pointer"
                  : "border border-white/15 text-white/20 cursor-not-allowed"
              )}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {gs.positions.length === 3 ? t('confirm') : `${t('selectMore')} ${3 - gs.positions.length}`}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* ══════════ WAITING FOR OPP ══════════ */}
      {/* ═══════════════════════════════════════ */}
      {gs.phase === 'waitingOpponent' && (
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-[380px] flex flex-col items-center text-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mb-5 animate-pulse" />
            <h2 className="text-2xl font-black tracking-tight mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t('itemsPlaced')}
            </h2>
            <p className="text-sm text-white/20 tracking-wider mb-8">{t('waitOpp')}</p>

            {/* Mini preview */}
            <div className="mb-6 flex flex-col items-center">
              <p className="text-[9px] text-white/10 tracking-[0.3em] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t('yourGrid')}
              </p>
              <div className="grid grid-cols-3 gap-1 w-20">
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i} className={cn(
                    "aspect-square border transition-all",
                    gs.positions.includes(i) ? "border-white bg-white/20" : "border-white/10 bg-white/[0.02]"
                  )} />
                ))}
              </div>
            </div>

            <div className="flex gap-2.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-white rounded-full"
                  style={{ animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* ══════════ PLAYING ══════════ */}
      {/* ═══════════════════════════════════════ */}
      {gs.phase === 'playing' && (
        <div className="flex-1 flex items-center justify-center px-5 py-6">
          <div className="w-full max-w-[360px] flex flex-col items-center text-center">

            {/* Turn indicator */}
            <div className={cn(
              "w-full py-2.5 text-center mb-4 border-2 transition-all",
              isMyTurn ? "bg-white text-black border-white" : "bg-transparent text-white/25 border-white/15"
            )}>
              <p className="text-xs font-black tracking-[0.3em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {isMyTurn ? t('yourTurn') : t('oppTurn')}
              </p>
            </div>

            {/* Hint */}
            <p className="text-[10px] text-white/15 tracking-wider mb-4">
              {isMyTurn ? t('tapToReveal') : t('waitForTurn')}
            </p>

            {/* Timer + Scores */}
            <div className="w-full flex items-center justify-between mb-4 gap-2">
              {/* Your score */}
              <div className="flex-1 border border-white/10 p-2.5 flex flex-col items-center gap-1.5">
                <p className="text-[8px] text-white/15 tracking-[0.3em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {t('you')}
                </p>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={cn(
                      "w-3.5 h-3.5 rounded-full border-2 transition-all",
                      i < gs.myFound ? "bg-white border-white" : "border-white/15"
                    )} />
                  ))}
                </div>
              </div>

              {/* Timer circle */}
              <div className="shrink-0 relative w-14 h-14">
                <svg className="w-full h-full" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="44" fill="none"
                    stroke={timerCrit ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)'} strokeWidth="4" />
                  <circle cx="50" cy="50" r="44" fill="none"
                    stroke={timerCrit ? '#ef4444' : timerWarn ? '#f59e0b' : '#ffffff'}
                    strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - timerPct / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn(
                    "text-lg font-black tabular-nums",
                    timerCrit && "text-red-500",
                    timerWarn && !timerCrit && "text-yellow-400",
                  )} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {gs.timer}
                  </span>
                </div>
              </div>

              {/* Opponent score */}
              <div className="flex-1 border border-white/10 p-2.5 flex flex-col items-center gap-1.5">
                <p className="text-[8px] text-white/15 tracking-[0.3em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {t('opp')}
                </p>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={cn(
                      "w-3.5 h-3.5 rounded-full border-2 transition-all",
                      i < gs.oppFound ? "bg-red-500 border-red-500" : "border-white/15"
                    )} />
                  ))}
                </div>
              </div>
            </div>

            {/* GAME BOARD */}
            <div className="w-full max-w-[264px] sm:max-w-[300px] mx-auto mb-4">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }, (_, i) => {
                  const isRev = gs.revealed[i];
                  const val = gs.board[i];
                  const isOppItem = val === 'opp';
                  const isMineItem = val === 'mine';
                  const canClick = isMyTurn && !isRev;
                  const justRev = lastRev === i;

                  return (
                    <button
                      key={i}
                      onClick={() => canClick && selectCell(i)}
                      disabled={!canClick}
                      className={cn(
                        "aspect-square border-2 relative overflow-hidden transition-all duration-300",
                        justRev && "animate-revealCell",
                        isRev && isOppItem && "border-white bg-white",
                        isRev && isMineItem && "border-red-500/40 bg-red-500/10",
                        isRev && val === 'empty' && "border-white/8 bg-white/[0.01]",
                        !isRev && canClick && "border-white/25 hover:border-white hover:bg-white/[0.05] cursor-pointer active:scale-90",
                        !isRev && !canClick && "border-white/8 cursor-default",
                      )}
                    >
                      {isRev ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {isOppItem && gs.oppItem ? (
                            <ItemImg src={gs.oppItem.image} alt={gs.oppItem.name} className="w-full h-full" />
                          ) : isMineItem && gs.item ? (
                            <div className="relative w-full h-full">
                              <ItemImg src={gs.item.image} alt={gs.item.name} className="w-full h-full opacity-30" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
                              <span className="text-white/10 text-[10px] tracking-wider font-bold">—</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={cn(
                            "text-xl font-bold",
                            canClick ? "text-white/20" : "text-white/8"
                          )}>?</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend items */}
            <div className="w-full flex justify-center gap-5">
              {gs.item && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 border border-white/20 bg-white flex items-center justify-center p-1">
                    <img src={gs.item.image} alt="" className="w-full h-full object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <div className="text-left">
                    <p className="text-[7px] text-white/15 tracking-[0.2em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t('yours')}</p>
                    <p className="text-[10px] font-bold tracking-wider">{gs.item.name}</p>
                  </div>
                </div>
              )}
              {gs.oppItem && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 border border-white/10 bg-white/80 flex items-center justify-center p-1">
                    <img src={gs.oppItem.image} alt="" className="w-full h-full object-contain opacity-60"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <div className="text-left">
                    <p className="text-[7px] text-white/15 tracking-[0.2em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t('find')}</p>
                    <p className="text-[10px] font-bold tracking-wider text-white/50">{gs.oppItem.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* ══════════ FINISHED ══════════ */}
      {/* ═══════════════════════════════════════ */}
      {gs.phase === 'finished' && (
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-[380px] flex flex-col items-center text-center">
            {gs.winner === gs.pn ? (
              <>
                <p className="text-[9px] text-white/20 tracking-[0.4em] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {t('congrats')}
                </p>
                <h2 className="text-5xl sm:text-7xl font-black tracking-tight mb-4 animate-victoryPulse" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {t('victory')}
                </h2>
                <p className="text-sm text-white/25 tracking-wider mb-6">{t('youWon')}</p>

                {gs.winItem && (
                  <div className="mb-6 flex flex-col items-center">
                    <div className="w-36 h-36 sm:w-44 sm:h-44 border-4 border-white bg-white flex items-center justify-center p-4 animate-glow">
                      <img src={gs.winItem.image} alt={gs.winItem.name} className="w-full h-full object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div className="bg-white text-black px-5 py-1 font-black text-xs tracking-[0.15em] mt-[-10px] relative z-10" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {gs.winItem.name}
                    </div>
                  </div>
                )}

                <p className="text-[9px] text-white/10 tracking-[0.3em] mb-8">{t('yourPrize')}</p>
              </>
            ) : (
              <>
                <p className="text-[9px] text-white/10 tracking-[0.4em] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {t('gameOver')}
                </p>
                <h2 className="text-5xl sm:text-7xl font-black tracking-tight mb-4 text-white/15" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {t('defeat')}
                </h2>
                <p className="text-sm text-white/15 tracking-wider mb-6">{t('youLost')}</p>

                {gs.winItem && (
                  <div className="mb-6 flex flex-col items-center">
                    <div className="w-36 h-36 sm:w-44 sm:h-44 border-2 border-white/15 bg-white/5 flex items-center justify-center p-4 opacity-25">
                      <img src={gs.winItem.image} alt={gs.winItem.name} className="w-full h-full object-contain invert"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <p className="text-xs font-bold tracking-[0.15em] text-white/15 mt-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {gs.winItem.name}
                    </p>
                  </div>
                )}

                <p className="text-[9px] text-white/8 tracking-[0.3em] mb-8">{t('nextTime')}</p>
              </>
            )}

            <button
              onClick={reset}
              className="w-full max-w-[320px] bg-white text-black font-bold py-4 text-sm tracking-[0.2em] hover:bg-gray-200 active:scale-[0.97] transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {t('playAgain')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
