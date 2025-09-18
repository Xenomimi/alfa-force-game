import React, { useState, useEffect, useRef } from 'react';
import LoginRegisterScreen from './LoginRegisterScreen.tsx';
import LobbyScreen from './Lobby/LobbyScreen.tsx';
import GameComponent from './GameComponent.tsx';
import '../styles/style.css';
import { Client, Room } from 'colyseus.js';


const App: React.FC = () => {
    const [screen, setScreen] = useState<'login' | 'lobby' | 'game'>(() => {
        const stored = localStorage.getItem('isLoggedIn');
        return stored === 'true' ? 'lobby' : 'login';
    });

    const clientRef = useRef<Client>(null);

    const [isClientReady, setIsClientReady] = useState(false);
    const [lobbyRoom, setLobbyRoom] = useState<Room | null>(null);
    const [gameRoom, setGameRoom] = useState<Room | null>(null);

    const handleLogin = async () => {
        localStorage.setItem('isLoggedIn', 'true');
        setScreen('lobby');
    };

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        lobbyRoom?.leave();
        setLobbyRoom(null);
        setScreen('login');
    };

    const handleGameExit = async () => {
        try {
            console.log(gameRoom);
            if (gameRoom) {
                gameRoom.leave();
                setGameRoom(null);
            }
            setScreen('lobby')
        } catch (err) {
        console.error("Błąd przy opuszczaniu pokoju:", err);
        }
    }

    useEffect(() => {
        if (screen === 'lobby' && !clientRef.current) {
            clientRef.current = new Client("ws://localhost:2567");
            setIsClientReady(true);
        }
    }, []);


    if (screen === 'login') {
        return <LoginRegisterScreen onLogin={handleLogin} />;
    }

    if (screen === 'lobby') {
        if (!isClientReady) {
            return (
                <div style={{ padding: 24, color: '#fff', textAlign: 'center' }}>
                    <p>Inicjalizacja klienta...</p>
                </div>
            );
        }

        return (
            <LobbyScreen
            client={clientRef.current}
            onStartGame={(room: Room) => {
                setGameRoom(room); // zapisz pokój
                setScreen('game');
            }}
            onLogout={handleLogout}
            />
        );
    }

    if (screen === 'game') { 
        return <GameComponent gameRoom={gameRoom} handleExit={handleGameExit}/>; 
    }
};

export default App;