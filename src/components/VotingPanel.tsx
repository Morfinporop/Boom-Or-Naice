import { Room } from '../App';

type VotingPanelProps = {
  room: Room;
  playerId: string;
  onVote: (targetId: string) => void;
};

export function VotingPanel({ room, playerId, onVote }: VotingPanelProps) {
  const hasVoted = !!room.votes[playerId];
  const alivePlayers = room.players.filter(p => p.isAlive && p.id !== playerId);

  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-5xl w-full">
        <div className="bg-gradient-to-br from-red-900/50 to-rose-900/50 backdrop-blur-sm rounded-2xl p-10 shadow-2xl border border-red-800/50 mb-8">
          <h1 className="text-6xl font-black mb-6 text-center">Голосование</h1>
          <p className="text-3xl text-center text-gray-300 mb-8">
            Кого вы хотите изгнать из бункера?
          </p>
          
          <div className="bg-black/30 rounded-xl p-6 mb-8 text-center">
            <div className="text-2xl text-gray-300">
              Голосов: <span className="text-white font-bold text-3xl">{Object.keys(room.votes).length}</span> / {room.players.filter(p => p.isAlive).length}
            </div>
          </div>
        </div>

        {hasVoted ? (
          <div className="bg-green-900/30 backdrop-blur-sm rounded-2xl p-10 border-2 border-green-500 text-center">
            <h2 className="text-4xl font-bold mb-4">Ваш голос учтен</h2>
            <p className="text-2xl text-gray-300">Ожидание других игроков...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {alivePlayers.map(player => (
              <button
                key={player.id}
                onClick={() => onVote(player.id)}
                className="bg-gray-900/70 backdrop-blur-sm rounded-xl p-8 border-2 border-gray-700 hover:border-red-500 transition-all transform hover:scale-105 text-left"
              >
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center text-4xl font-bold flex-shrink-0">
                    {player.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-3xl font-bold mb-2">{player.name}</div>
                    <div className="text-xl text-gray-400">
                      Раскрыто: {player.revealedTraits}/10
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
