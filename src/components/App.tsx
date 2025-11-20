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
  token: string;
}

const App: React.FC = () => {
    const [screen, setScreen] = useState<'login' | 'lobby' | 'game' | 'loading'>('loading');
    const clientRef = useRef<Client>(null);
    const [isClientReady, setIsClientReady] = useState(false);
    const [lobbyRoom, setLobbyRoom] = useState<Room | null>(null);
    const [gameRoom, setGameRoom] = useState<Room | null>();
    const [userData, setUserData] = useState<UserData | null>(null);

    const handleLogin = async () => {
        // sprawdź sesję po zalogowaniu
        const res = await fetch("http://localhost:4000/auth/me", {
            credentials: "include",
        });
        const data = await res.json();

        if (data.loggedIn) {
            setUserData(data);
            setScreen("lobby");
        } else {
            setScreen("login");
        }
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
    };

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
                    }
                    throw new Error(`HTTP ${res.status}`);
                }
                const data = await res.json();
                setUserData(data);
                console.log("Dane użytkownika po ustawieniu stanu:", userData);
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
        if (screen === 'lobby' && userData && userData.token && !clientRef.current) {
            clientRef.current = new Client("ws://localhost:2567");
            clientRef.current.auth.token = userData.token;
            setIsClientReady(true);
        }
    }, [screen, userData]);


    if (screen === 'login') {
        return <LoginRegisterScreen onLogin={handleLogin} />;
    }

    if (screen === 'lobby') {

        if (!userData) {
            return <div>Ładowanie użytkownika...</div>;
        }

        if (!isClientReady) {
            return <div>Inicjalizacja klienta...</div>;
        }

        return (
            <LobbyScreen
                userData={userData}
                client={clientRef.current}
                onStartGame={(room: Room) => {
                    setGameRoom(room);
                    setScreen('game');
                }}
                onLogout={handleLogout}
            />
        );
    }

    if (gameRoom != null) {
        if (screen === 'game') { 
            return <GameComponent userData={userData} gameRoom={gameRoom} handleExit={handleGameExit}/>; 
        }
    }
};

export default App;