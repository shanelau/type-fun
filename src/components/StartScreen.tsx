import React, { useEffect, useState } from 'react';

interface StartScreenProps {
  onGameStart: () => void;
  selectedChars: string; // 添加用户选择的字符集
}

const StartScreen: React.FC<StartScreenProps> = ({
  onGameStart,
  selectedChars,
}) => {
  const [letters, setLetters] = useState<string[]>([]);

  useEffect(() => {
    // 使用selectedChars，如果为空则使用默认字母表
    const chars = selectedChars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const interval = setInterval(() => {
      const randomLetter = chars[Math.floor(Math.random() * chars.length)];

      setLetters((prev) => [...prev, randomLetter]);

      // 限制字母数量
      if (letters.length > 50) {
        setLetters((prev) => prev.slice(1));
      }
    }, 300);

    return () => clearInterval(interval);
  }, [letters.length, selectedChars]);

  return (
    <div className='start-screen'>
      {letters.map((letter, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            fontSize: `${Math.random() * 20 + 10}px`,
            opacity: Math.random() * 0.5 + 0.5,
            transform: `rotate(${Math.random() * 360}deg)`,
            color: `hsl(${Math.random() * 360}, 100%, 70%)`,
            pointerEvents: 'none',
          }}
        >
          {letter}
        </div>
      ))}
      <h1 className='game-title'>打字击落飞机</h1>
      <button className='start-button' onClick={onGameStart}>
        开始游戏
      </button>
      <p>Press Space to Start</p>
    </div>
  );
};

export default StartScreen;
