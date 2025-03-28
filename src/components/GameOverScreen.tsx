import React from 'react';

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  onRestart,
}) => {
  return (
    <div className='start-screen'>
      <h1 className='game-title'>游戏结束</h1>
      <h2>你的分数: {score}</h2>
      <button className='start-button' onClick={onRestart}>
        再玩一次
      </button>
    </div>
  );
};

export default GameOverScreen;
