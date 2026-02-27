import { Room } from '../App';

type GameResultsProps = {
  room: Room;
  onBackToMenu: () => void;
};

export function GameResults({ room, onBackToMenu }: GameResultsProps) {
  const survivors = room.players.filter(p => p.isAlive);
  const eliminated = room.players.filter(p => !p.isAlive);

  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <img 
            src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=400&fit=crop" 
            alt="Victory" 
            className="w-full h-80 object-cover rounded-2xl shadow-2xl opacity-70 mb-8"
          />
          <h1 className="text-7xl font-black mb-6 bg-gradient-to-r from-green-400 to-emerald-400 text-transparent bg-clip-text">
            Игра Окончена!
          </h1>
        </div>

        <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 backdrop-blur-sm rounded-2xl p-10 shadow-2xl border border-green-800/50 mb-8">
          <h2 className="text-5xl font-black mb-8 text-center text-green-400">Выжившие</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {survivors.map(player => (
              <div key={player.id} className="bg-black/30 rounded-xl p-8 border-2 border-green-500">
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-5xl font-bold text-black">
                    {player.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-4xl font-bold">{player.name}</div>
                    {player.character && (
                      <div className="text-2xl text-green-400">{player.character.profession}</div>
                    )}
                  </div>
                </div>
                {player.character && (
                  <div className="space-y-3 text-xl">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Возраст:</span>
                      <span className="font-bold">{player.character.age} лет</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Здоровье:</span>
                      <span className="font-bold">{player.character.health}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Способность:</span>
                      <span className="font-bold text-yellow-400">{player.character.specialAbility}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {eliminated.length > 0 && (
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-10 shadow-2xl border border-gray-700 mb-8">
            <h2 className="text-4xl font-black mb-8 text-center text-gray-400">Изгнанные</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {eliminated.map(player => (
                <div key={player.id} className="bg-black/30 rounded-xl p-6 border-2 border-red-900/50 opacity-60">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-900 to-rose-900 rounded-full flex items-center justify-center text-3xl font-bold">
                      {player.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{player.name}</div>
                      {player.character && (
                        <div className="text-lg text-gray-500">{player.character.profession}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 mb-8">
          <h3 className="text-3xl font-bold mb-6 text-center">Статистика Игры</h3>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-6xl font-bold text-purple-400 mb-2">{room.round}</div>
              <div className="text-2xl text-gray-400">Раундов</div>
            </div>
            <div>
              <div className="text-6xl font-bold text-green-400 mb-2">{survivors.length}</div>
              <div className="text-2xl text-gray-400">Выживших</div>
            </div>
            <div>
              <div className="text-6xl font-bold text-red-400 mb-2">{eliminated.length}</div>
              <div className="text-2xl text-gray-400">Изгнанных</div>
            </div>
          </div>
        </div>

        <button
          onClick={onBackToMenu}
          className="w-full py-6 text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          Вернуться в Меню
        </button>
      </div>
    </div>
  );
}
