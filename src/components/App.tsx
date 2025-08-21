import React, { useState, useEffect, useRef } from 'react';
import LoginRegisterScreen from './LoginRegisterScreen.tsx';
import LobbyScreen from './Lobby/LobbyScreen.tsx';
import GameHUD from './Hud/GameHUD.tsx';
import { Game } from '../game/pixiGame.ts';
import '../styles/style.css';

const App: React.FC = () => {
  const [screen, setScreen] = useState<'login' | 'lobby' | 'game'>(() => {
    const stored = localStorage.getItem('isLoggedIn');
    return stored === 'true' ? 'game' : 'login';
  });

  const gameInstanceRef = useRef<Game | null>(null);
  const pixiContainerRef = useRef<HTMLDivElement>(null);

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
    if (screen === 'game' && pixiContainerRef.current) {
      const container = pixiContainerRef.current;

      const updateCanvasSize = () => {
        const targetWidth = 1920;
        const targetHeight = 1080;
        const aspectRatio = targetWidth / targetHeight;

        let containerWidth = window.innerWidth;
        let containerHeight = window.innerHeight;

        if (containerWidth / containerHeight > aspectRatio) {
          containerWidth = containerHeight * aspectRatio;
        } else {
          containerHeight = containerWidth / aspectRatio;
        }

        container.style.width = `${containerWidth}px`;
        container.style.height = `${containerHeight}px`;
      };

      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);

      const game = new Game(container);
      gameInstanceRef.current = game;
      game.start();

      return () => {
        window.removeEventListener('resize', updateCanvasSize);
        if (gameInstanceRef.current) {
          gameInstanceRef.current.stop();
          gameInstanceRef.current = null;
        }
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
      <div id="pixiContainer" ref={pixiContainerRef}>
        <GameHUD onLogout={handleGameExit} />
      </div>
    </div>
  );
};

export default App;