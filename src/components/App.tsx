import React from 'react';
import { Game } from '../game/game'; // Upewnij się, że ścieżka jest poprawna
import '../styles/style.css'
// import Stats from './Stats';

// // Provider statystyk oparty o sockety
// import { StatsProvider } from '../providers/statsProvider';

const App: React.FC = () => {
    React.useEffect(() => {
        const game = new Game(); // Inicjalizuj grę
        game.start(); // Rozpocznij grę

        return () => {
            // Logika czyszczenia, jeśli potrzebna
        };
    }, []);

    return (
        <div>
            <h1>AlfaForce</h1>
            <p>Gra 2D Multiplayer Shooter</p>

            {/* <StatsProvider>
                <Stats></Stats>
            </StatsProvider> */}

            <canvas id="gameCanvas" width="800" height="600"></canvas>
        </div>
    );
};

export default App;
