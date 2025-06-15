import React, { useState, useEffect, useRef } from 'react';
import LoginRegisterScreen from './LoginRegisterScreen.tsx';
import LobbyScreen from './Lobby/LobbyScreen.tsx';
import GameHUD from './Hud/GameHUD.tsx';
import { Game } from '../game/game';
import '../styles/style.css';

const App: React.FC = () => {
  const [screen, setScreen] = useState<'login' | 'lobby' | 'game'>(() => {
    const stored = localStorage.getItem('isLoggedIn');
    return stored === 'true' ? 'lobby' : 'login';
  });

  const gameInstanceRef = useRef<Game | null>(null);

  const handleLogin = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setScreen('lobby');
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setScreen('login');
  };

  const handleGameExit = () => {
    if (gameInstanceRef.current) {
      gameInstanceRef.current.stop();
      gameInstanceRef.current = null;
    }
    setScreen('lobby');
  };

  useEffect(() => {
    if (screen === 'game') {
      const backgroundCanvas = document.getElementById('backgroundCanvas') as HTMLCanvasElement;
      const gameCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

      const updateCanvasSize = () => {
        const aspectRatio = 1600 / 1048;
        let canvasWidth = window.innerWidth;
        let canvasHeight = window.innerHeight;

        if (canvasWidth / canvasHeight > aspectRatio) {
          canvasWidth = canvasHeight * aspectRatio;
        } else {
          canvasHeight = canvasWidth / aspectRatio;
        }

        [backgroundCanvas, gameCanvas].forEach(canvas => {
          canvas.style.width = `${canvasWidth}px`;
          canvas.style.height = `${canvasHeight}px`;
          canvas.width = 1600;
          canvas.height = 1048;
        });

        backgroundCanvas.width = 3360;
        backgroundCanvas.height = 2538;
      };

      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);

      const game = new Game(backgroundCanvas, gameCanvas);
      gameInstanceRef.current = game;
      gameInstanceRef.current.start();

      return () => {
        window.removeEventListener('resize', updateCanvasSize);
        game.stop();
        gameInstanceRef.current = null;
      };
    }
  }, [screen]);

  if (screen === 'login') {
    return <LoginRegisterScreen onLogin={handleLogin} />;
  }

  if (screen === 'lobby') {
    return <LobbyScreen onStartGame={() => setScreen('game')} onLogout={handleLogout} />;
  }

  return (
    <div className="game-wrapper">
      <canvas style={{ display: 'none' }} id="backgroundCanvas"></canvas>
      <canvas id="gameCanvas"></canvas>
      <GameHUD onLogout={handleGameExit} />
    </div>
  );
};

export default App;
