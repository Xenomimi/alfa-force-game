import React, { useState, useEffect, useRef } from 'react';
import LoginRegisterScreen from './Login/LoginRegisterScreen.tsx';
import LobbyScreen from './Lobby/LobbyScreen.tsx';
import GameComponent from './Game/GameComponent.tsx';
import '../styles/style.css';
import { Client, Room } from 'colyseus.js';

export interface UserProfile {
  level: number;
  experience: number;
  coins: number;
  cash: number;
}

export interface User {
  id: number;
  username: string;
  profile: UserProfile;
}

export interface UserData {
  loggedIn: boolean;
  user: User;
}

const App: React.FC = () => {
    const [screen, setScreen] = useState<'login' | 'lobby' | 'game' | 'loading'>('loading');
    const clientRef = useRef<Client>(null);
    const [isClientReady, setIsClientReady] = useState(false);
    const [lobbyRoom, setLobbyRoom] = useState<Room | null>(null);
    const [gameRoom, setGameRoom] = useState<Room | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);

    const handleLogin = async () => {
        setScreen('lobby');
    };

    const handleLogout = async () => {
        await fetch("http://localhost:4000/auth/logout", {
            method: "POST",
            credentials: "include"
        });
        lobbyRoom?.leave();
        setLobbyRoom(null);
        setScreen('login');
    };

    const handleGameExit = async () => {
        try {
            if (gameRoom) {
                await gameRoom.leave();
                setGameRoom(null);
            }
            setScreen('lobby')
        } catch (err) {
        console.error("Błąd przy opuszczaniu pokoju:", err);
        }
    }

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("http://localhost:4000/auth/me", {
                    credentials: "include"
                });
                if (!res.ok) {
                    // nie traktuj 401 jako "błąd" — to normalny przypadek
                    if (res.status === 401) {
                        setScreen("login");
                        return;
                    }
                    throw new Error(`HTTP ${res.status}`);
                }
                const data = await res.json();
                setUserData(data);
                if (data.loggedIn) {
                    setScreen("lobby");
                } else {
                    setScreen("login");
                }
            } catch (err) {
                console.error("Błąd przy sprawdzaniu sesji:", err);
                setScreen("login");
            }
        };

        checkAuth();
    }, []);

    useEffect(() => {
    if (screen === 'lobby' && !clientRef.current) {
        clientRef.current = new Client("ws://localhost:2567");
        setIsClientReady(true);
    }
    }, [screen]);


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
            userData={userData}
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