import { useState } from 'react';

type GameLobbyProps = {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
};

export function GameLobby({ onCreateRoom, onJoinRoom }: GameLobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const handleSubmit = () => {
    if (playerName.trim().length < 2) return;
    
    if (mode === 'create') {
      onCreateRoom(playerName.trim());
    } else if (mode === 'join' && roomId.trim().length > 0) {
      onJoinRoom(roomId.trim().toUpperCase(), playerName.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <img 
              src="https://images.unsplash.com/photo-1614935151651-0bea6508db6b?w=600&h=300&fit=crop" 
              alt="Bunker" 
              className="w-full h-64 object-cover rounded-2xl shadow-2xl opacity-80"
            />
          </div>
          <h1 className="text-7xl font-black mb-6 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-transparent bg-clip-text tracking-tight">
            БУНКЕР
          </h1>
          <p className="text-3xl text-gray-300 font-light">
            Последнее Убежище
          </p>
          <div className="mt-8 text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed">
            Мир погружается в хаос. Осталось одно убежище. 
            <br />
            Убеди других, что именно ты достоин выжить.
          </div>
        </div>

        {/* Menu Options */}
        {mode === 'menu' && (
          <div className="space-y-6">
            <button
              onClick={() => setMode('create')}
              className="w-full py-8 px-8 text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              Создать Комнату
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-8 px-8 text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              Присоединиться
            </button>
          </div>
        )}

        {/* Create/Join Forms */}
        {mode !== 'menu' && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-10 shadow-2xl border border-gray-800">
            <button
              onClick={() => setMode('menu')}
              className="mb-8 text-gray-400 hover:text-white text-xl transition-colors"
            >
              ← Назад
            </button>
            
            <h2 className="text-4xl font-bold mb-8">
              {mode === 'create' ? 'Создание Комнаты' : 'Присоединиться к Игре'}
            </h2>

            <div className="space-y-6">
              {mode === 'join' && (
                <div>
                  <label className="block text-2xl font-medium mb-3 text-gray-300">
                    Код Комнаты
                  </label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="Введите код"
                    className="w-full px-6 py-5 text-2xl bg-gray-800 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:outline-none transition-colors uppercase"
                    maxLength={6}
                  />
                </div>
              )}

              <div>
                <label className="block text-2xl font-medium mb-3 text-gray-300">
                  Ваше Имя
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Введите имя"
                  className="w-full px-6 py-5 text-2xl bg-gray-800 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  maxLength={20}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={playerName.trim().length < 2 || (mode === 'join' && roomId.trim().length === 0)}
                className="w-full py-6 px-6 text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl shadow-xl transform hover:scale-105 transition-all duration-200 disabled:transform-none"
              >
                {mode === 'create' ? 'Создать' : 'Войти'}
              </button>
            </div>
          </div>
        )}

        {/* Game Rules */}
        <div className="mt-12 bg-gray-900/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-800">
          <h3 className="text-3xl font-bold mb-6 text-center">Правила Игры</h3>
          <div className="grid md:grid-cols-3 gap-6 text-lg text-gray-300">
            <div className="text-center">
              <div className="text-5xl mb-4">🎭</div>
              <h4 className="text-xl font-bold text-white mb-2">Получи Роль</h4>
              <p>Каждый игрок получает уникального персонажа с характеристиками</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <h4 className="text-xl font-bold text-white mb-2">Убеди Других</h4>
              <p>Докажи свою ценность и раскрывай информацию постепенно</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">🗳️</div>
              <h4 className="text-xl font-bold text-white mb-2">Голосуй</h4>
              <p>Изгоняй игроков, которые не достойны места в бункере</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
