import { useState, useEffect } from 'react';
import { GameLobby } from './components/GameLobby';
import { GameRoom } from './components/GameRoom';
import { GameResults } from './components/GameResults';

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  character?: Character;
  isAlive: boolean;
  revealedTraits: number;
};

export type Character = {
  gender: string;
  age: number;
  profession: string;
  health: string;
  bodyType: string;
  hobby: string;
  phobia: string;
  baggage: string;
  fact1: string;
  fact2: string;
  specialAbility: string;
};

export type GameState = 'lobby' | 'playing' | 'voting' | 'results';

export type Room = {
  id: string;
  players: Player[];
  gameState: GameState;
  round: number;
  bunkerCapacity: number;
  apocalypseScenario: string;
  bunkerCondition: string;
  timeLeft: number;
  votingTarget?: string;
  votes: Record<string, string>;
};

function App() {
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'room' | 'results'>('menu');
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string>('');

  useEffect(() => {
    // Generate unique player ID
    const id = Math.random().toString(36).substr(2, 9);
    setPlayerId(id);
  }, []);

  const handleCreateRoom = (playerName: string) => {
    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const newRoom: Room = {
      id: roomId,
      players: [{
        id: playerId,
        name: playerName,
        isHost: true,
        isAlive: true,
        revealedTraits: 0,
      }],
      gameState: 'lobby',
      round: 0,
      bunkerCapacity: 0,
      apocalypseScenario: '',
      bunkerCondition: '',
      timeLeft: 0,
      votes: {},
    };
    setRoom(newRoom);
    setCurrentScreen('room');
  };

  const handleJoinRoom = (roomId: string, playerName: string) => {
    // In a real app, this would connect to a server
    // For demo purposes, creating a mock room
    const newRoom: Room = {
      id: roomId,
      players: [{
        id: playerId,
        name: playerName,
        isHost: false,
        isAlive: true,
        revealedTraits: 0,
      }],
      gameState: 'lobby',
      round: 0,
      bunkerCapacity: 0,
      apocalypseScenario: '',
      bunkerCondition: '',
      timeLeft: 0,
      votes: {},
    };
    setRoom(newRoom);
    setCurrentScreen('room');
  };

  const handleGameEnd = () => {
    setCurrentScreen('results');
  };

  const handleBackToMenu = () => {
    setRoom(null);
    setCurrentScreen('menu');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {currentScreen === 'menu' && (
        <GameLobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
      )}
      {currentScreen === 'room' && room && (
        <GameRoom 
          room={room} 
          playerId={playerId} 
          onUpdateRoom={setRoom}
          onGameEnd={handleGameEnd}
        />
      )}
      {currentScreen === 'results' && room && (
        <GameResults 
          room={room} 
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}

export default App;
