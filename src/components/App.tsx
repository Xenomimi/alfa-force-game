import React from 'react';
import { Game } from '../game/game';
import '../styles/style.css';

const App: React.FC = () => {
  React.useEffect(() => {
    const backgroundCanvas = document.getElementById('backgroundCanvas') as HTMLCanvasElement;
    const collisionCanvas = document.getElementById('collisionCanvas') as HTMLCanvasElement;
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

      // Ustawienie rozmiarów dla każdego płótna
      [backgroundCanvas, collisionCanvas, gameCanvas].forEach(canvas => {
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;
        canvas.width = 1600; // Rozdzielczość wewnętrzna
        canvas.height = 1048;
      });

      // Rozdzielczość wewnętrzna płótna gry (widoczny obszar)
      gameCanvas.width = 1600;
      gameCanvas.height = 1048;

      // Większa rozdzielczość wewnętrzna tła i kolizji (rozmiar mapy)
      backgroundCanvas.width = 4800; // Podwójna szerokość
      backgroundCanvas.height = 3144; // Podwójna wysokość
      collisionCanvas.width = 4800;
      collisionCanvas.height = 3144;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const game = new Game(backgroundCanvas, collisionCanvas, gameCanvas);
    game.start();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  return (
    <div id="container">
      <canvas id="backgroundCanvas"></canvas>
      <canvas id="collisionCanvas"></canvas>
      <canvas id="gameCanvas"></canvas>
    </div>
  );
};

export default App;