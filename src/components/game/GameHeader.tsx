import React from 'react';
import { Settings, Volume2, VolumeX, Heart } from 'lucide-react';

interface GameHeaderProps {
  onAdminRequest: () => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  totalStagesCompleted: number;
  questionCount: number;
  gameState: string;
  life: number;
  score: number;
  highScore: number;
  scoreAnimation: boolean;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  onAdminRequest,
  isMuted,
  setIsMuted,
  totalStagesCompleted,
  questionCount,
  gameState,
  life,
  score,
  highScore,
  scoreAnimation,
}) => {
  return (
    <div className="text-center mb-4">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={onAdminRequest}
          className="flex items-center gap-1 px-3 py-1 text-sm rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
        >
          <Settings className="w-4 h-4" />
          管理
        </button>
        <h1 className="text-2xl font-bold">タイピングHANAKO</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full hover:bg-gray-200 transition-transform hover:scale-110"
          >
            {isMuted ? <VolumeX /> : <Volume2 />}
          </button>
        </div>
      </div>
      <div className="flex justify-between items-center px-4">
        <div>
          <p className="text-lg">ステージ {totalStagesCompleted + 1}</p>
          {gameState === 'playing' && (
            <p className="text-sm">のこり {20 - questionCount}問</p>
          )}
        </div>
        <div className="flex gap-1 flex-wrap max-w-[200px]">
          {[...Array(life)].map((_, i) => (
            <Heart
              key={i}
              className="text-red-500 transition-transform hover:scale-125"
              size={16}
              fill="red"
            />
          ))}
        </div>
        <div>
          <p
            className={`text-lg transform transition-all duration-300 ${
              scoreAnimation ? 'scale-125 text-green-600' : ''
            }`}
          >
            スコア: {score}
          </p>
          <p className="text-sm text-gray-600">ハイスコア: {highScore}</p>
        </div>
      </div>
    </div>
  );
};

export default GameHeader;