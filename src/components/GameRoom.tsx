import { useState, useEffect } from 'react';
import { Room, Player } from '../App';
import { generateCharacter, generateApocalypse } from '../utils/gameData';
import { CharacterCard } from './CharacterCard';
import { VotingPanel } from './VotingPanel';

type GameRoomProps = {
  room: Room;
  playerId: string;
  onUpdateRoom: (room: Room) => void;
  onGameEnd: (winners: Player[]) => void;
};

export function GameRoom({ room, playerId, onUpdateRoom, onGameEnd }: GameRoomProps) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ player: string; message: string }>>([]);
  const currentPlayer = room.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost || false;

  const handleStartGame = () => {
    const bunkerCapacity = Math.floor(room.players.length / 2);
    const apocalypseData = generateApocalypse();
    
    const updatedPlayers = room.players.map(player => ({
      ...player,
      character: generateCharacter(),
      isAlive: true,
      revealedTraits: 0,
    }));

    onUpdateRoom({
      ...room,
      players: updatedPlayers,
      gameState: 'playing',
      round: 1,
      bunkerCapacity,
      apocalypseScenario: apocalypseData.scenario,
      bunkerCondition: apocalypseData.condition,
      timeLeft: 300,
    });
  };

  const handleRevealTrait = () => {
    if (!currentPlayer || !currentPlayer.character) return;
    
    const updatedPlayers = room.players.map(player => {
      if (player.id === playerId && player.revealedTraits < 10) {
        return { ...player, revealedTraits: player.revealedTraits + 1 };
      }
      return player;
    });

    onUpdateRoom({ ...room, players: updatedPlayers });
  };

  const handleStartVoting = () => {
    onUpdateRoom({ ...room, gameState: 'voting', votes: {} });
  };

  const handleVote = (targetId: string) => {
    const updatedVotes = { ...room.votes, [playerId]: targetId };
    onUpdateRoom({ ...room, votes: updatedVotes });

    // Check if all alive players voted
    const alivePlayers = room.players.filter(p => p.isAlive);
    if (Object.keys(updatedVotes).length === alivePlayers.length) {
      processVotes(updatedVotes);
    }
  };

  const processVotes = (votes: Record<string, string>) => {
    const voteCounts: Record<string, number> = {};
    Object.values(votes).forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    let maxVotes = 0;
    let eliminatedId = '';
    Object.entries(voteCounts).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = id;
      }
    });

    const updatedPlayers = room.players.map(player => {
      if (player.id === eliminatedId) {
        return { ...player, isAlive: false };
      }
      return player;
    });

    const alivePlayers = updatedPlayers.filter(p => p.isAlive);
    
    if (alivePlayers.length <= room.bunkerCapacity) {
      onGameEnd(alivePlayers);
    } else {
      onUpdateRoom({
        ...room,
        players: updatedPlayers,
        gameState: 'playing',
        round: room.round + 1,
        votes: {},
      });
    }
  };

  const handleSendMessage = () => {
    if (chatMessage.trim() && currentPlayer) {
      setChatHistory([...chatHistory, { player: currentPlayer.name, message: chatMessage.trim() }]);
      setChatMessage('');
    }
  };

  useEffect(() => {
    if (room.gameState === 'playing' && room.timeLeft > 0) {
      const timer = setInterval(() => {
        onUpdateRoom({ ...room, timeLeft: room.timeLeft - 1 });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [room.timeLeft, room.gameState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (room.gameState === 'lobby') {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-10 shadow-2xl border border-gray-800 mb-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-5xl font-black mb-4">Комната Ожидания</h1>
                <p className="text-3xl text-gray-400">Код: <span className="text-white font-mono bg-gray-800 px-6 py-2 rounded-lg">{room.id}</span></p>
              </div>
              <div className="text-right">
                <div className="text-2xl text-gray-400">Игроков</div>
                <div className="text-6xl font-bold text-green-400">{room.players.length}/15</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {room.players.map((player) => (
                <div key={player.id} className="bg-gray-800/50 rounded-xl p-6 border-2 border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-3xl font-bold">
                      {player.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{player.name}</div>
                      {player.isHost && (
                        <div className="text-lg text-yellow-400">Ведущий</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isHost && room.players.length >= 2 && (
              <button
                onClick={handleStartGame}
                className="w-full py-6 text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Начать Игру
              </button>
            )}

            {!isHost && (
              <div className="text-center text-2xl text-gray-400 py-6">
                Ожидание начала игры...
              </div>
            )}

            {room.players.length < 2 && (
              <div className="text-center text-2xl text-yellow-400 py-6">
                Минимум 2 игрока для начала игры
              </div>
            )}
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800">
            <h2 className="text-3xl font-bold mb-6">О Бункере</h2>
            <div className="space-y-4 text-xl text-gray-300 leading-relaxed">
              <p>После глобальной катастрофы остался один бункер. Мест ограниченно - выживут не все.</p>
              <p>У каждого игрока есть уникальный персонаж с характеристиками: профессия, здоровье, навыки, багаж и тайны.</p>
              <p>Раскрывайте информацию о себе постепенно, убеждайте других в своей ценности.</p>
              <p>Голосуйте, кого оставить, а кого изгнать из бункера навсегда.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (room.gameState === 'voting') {
    return (
      <VotingPanel
        room={room}
        playerId={playerId}
        onVote={handleVote}
      />
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 backdrop-blur-sm rounded-2xl p-8 mb-6 border border-red-800/50">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-5xl font-black mb-3">Раунд {room.round}</h1>
              <p className="text-2xl text-gray-300">Мест в бункере: <span className="text-green-400 font-bold">{room.bunkerCapacity}</span> / {room.players.filter(p => p.isAlive).length}</p>
            </div>
            <div className="text-right">
              <div className="text-6xl font-bold text-yellow-400">{formatTime(room.timeLeft)}</div>
              <div className="text-xl text-gray-400">до голосования</div>
            </div>
          </div>

          <div className="bg-black/30 rounded-xl p-6 mb-4">
            <h3 className="text-2xl font-bold mb-3 text-red-400">Сценарий Апокалипсиса</h3>
            <p className="text-xl text-gray-200">{room.apocalypseScenario}</p>
          </div>

          <div className="bg-black/30 rounded-xl p-6">
            <h3 className="text-2xl font-bold mb-3 text-orange-400">Состояние Бункера</h3>
            <p className="text-xl text-gray-200">{room.bunkerCondition}</p>
          </div>
        </div>

        {/* Player's Character */}
        {currentPlayer?.character && (
          <div className="mb-6">
            <CharacterCard
              character={currentPlayer.character}
              playerName={currentPlayer.name}
              revealedTraits={currentPlayer.revealedTraits}
              isOwn={true}
              onRevealTrait={handleRevealTrait}
            />
          </div>
        )}

        {/* Other Players */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {room.players.filter(p => p.id !== playerId && p.isAlive).map(player => (
            <div key={player.id} className="bg-gray-900/70 backdrop-blur-sm rounded-xl p-6 border-2 border-gray-700">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-3xl font-bold">
                  {player.name[0].toUpperCase()}
                </div>
                <div className="text-2xl font-bold">{player.name}</div>
              </div>
              <div className="text-lg text-gray-400">
                Раскрыто характеристик: {player.revealedTraits}/10
              </div>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
          <h3 className="text-3xl font-bold mb-6">Обсуждение</h3>
          <div className="bg-black/30 rounded-xl p-6 h-64 overflow-y-auto mb-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className="mb-3">
                <span className="text-purple-400 font-bold text-xl">{msg.player}:</span>
                <span className="ml-3 text-gray-200 text-xl">{msg.message}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Введите сообщение..."
              className="flex-1 px-6 py-4 text-xl bg-gray-800 border-2 border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={handleSendMessage}
              className="px-8 py-4 text-xl font-bold bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors"
            >
              Отправить
            </button>
          </div>
        </div>

        {/* Actions */}
        {isHost && (
          <div className="mt-6">
            <button
              onClick={handleStartVoting}
              className="w-full py-6 text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Начать Голосование
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
