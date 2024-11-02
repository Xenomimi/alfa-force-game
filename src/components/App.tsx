import React from 'react';
import { Game } from '../game/game';
import '../styles/style.css'


// import Login from './Login';

const App: React.FC = () => {
    React.useEffect(() => {
        const game = new Game(); // Inicjalizuj grę
        game.start(); // Rozpocznij grę

        return () => {
            // Logika czyszczenia, jeśli potrzebna
        };
    }, []);

    return (
        <canvas id="gameCanvas" width="1600" height="1048"></canvas>
    );
};

export default App;
