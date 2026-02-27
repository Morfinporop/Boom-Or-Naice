import { Character } from '../App';

type CharacterCardProps = {
  character: Character;
  playerName: string;
  revealedTraits: number;
  isOwn: boolean;
  onRevealTrait?: () => void;
};

const traits = [
  { key: 'gender', label: 'Пол', index: 0 },
  { key: 'age', label: 'Возраст', index: 1 },
  { key: 'profession', label: 'Профессия', index: 2 },
  { key: 'health', label: 'Здоровье', index: 3 },
  { key: 'bodyType', label: 'Телосложение', index: 4 },
  { key: 'hobby', label: 'Хобби', index: 5 },
  { key: 'phobia', label: 'Фобия', index: 6 },
  { key: 'baggage', label: 'Багаж', index: 7 },
  { key: 'fact1', label: 'Факт 1', index: 8 },
  { key: 'fact2', label: 'Факт 2', index: 9 },
];

export function CharacterCard({ character, playerName, revealedTraits, isOwn, onRevealTrait }: CharacterCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border-2 border-purple-500/50 shadow-2xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-4xl font-black mb-2">{playerName}</h2>
          <div className="text-2xl text-purple-400">Ваш Персонаж</div>
        </div>
        <div className="text-right">
          <div className="text-xl text-gray-400">Раскрыто</div>
          <div className="text-5xl font-bold text-green-400">{revealedTraits}/10</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {traits.map(trait => (
          <div 
            key={trait.key} 
            className={`p-6 rounded-xl transition-all ${
              trait.index < revealedTraits 
                ? 'bg-purple-900/30 border-2 border-purple-500' 
                : 'bg-gray-800/50 border-2 border-gray-700'
            }`}
          >
            <div className="text-xl text-gray-400 mb-2">{trait.label}</div>
            <div className="text-2xl font-bold">
              {trait.index < revealedTraits 
                ? character[trait.key as keyof Character]
                : '???'}
            </div>
          </div>
        ))}
      </div>

      {/* Special Ability - Always visible */}
      <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 p-6 rounded-xl border-2 border-yellow-500/50 mb-6">
        <div className="text-xl text-yellow-400 mb-2">Особая Способность</div>
        <div className="text-2xl font-bold text-yellow-200">{character.specialAbility}</div>
      </div>

      {isOwn && onRevealTrait && revealedTraits < 10 && (
        <button
          onClick={onRevealTrait}
          className="w-full py-5 text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          Раскрыть Следующую Характеристику
        </button>
      )}
    </div>
  );
}
