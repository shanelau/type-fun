import { useState } from 'react';
import './styles/game.css';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';

enum GameState {
  START,
  PLAYING,
  GAME_OVER,
}

function App() {
  const [gameState, setGameState] = useState(GameState.PLAYING);
  const [finalScore, setFinalScore] = useState(0);

  const handleGameStart = () => {
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setGameState(GameState.GAME_OVER);
  };

  const handleRestart = () => {
    setGameState(GameState.PLAYING);
  };

  return (
    <div className='game-container'>
      {gameState === GameState.START && (
        <StartScreen onGameStart={handleGameStart} />
      )}
      {gameState === GameState.PLAYING && (
        <GameScreen onGameOver={handleGameOver} />
      )}
      {gameState === GameState.GAME_OVER && (
        <GameOverScreen score={finalScore} onRestart={handleRestart} />
      )}
    </div>
  );
}

export default App;
