import React, { useEffect } from 'react';

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  onRestart,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r') {
        onRestart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onRestart]);

  return (
    <div className='start-screen'>
      <h1 className='game-title'>游戏结束</h1>
      <h2>你的分数: {score}</h2>
      <button className='start-button' onClick={onRestart}>
        再玩一次 (R)
      </button>
      <p className='restart-hint'>Press R to start</p>
    </div>
  );
};

export default GameOverScreen;
