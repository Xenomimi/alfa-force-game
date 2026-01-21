import React, { useState, useEffect, useRef } from 'react';
import GameHUD from '../Hud/GameHUD.tsx';
import { Game } from '../../game/pixiGame.ts';
import { Room } from 'colyseus.js';
import { UserData } from '../App';
import { ScoreboardEntry } from '../Hud/GameHUD';

// USUNIĘTO: import { LevelSystem } from '../../server/game/levelSystem'; 
// Frontend nie powinien importować logiki serwera bezpośrednio.

export interface HudState {
    weaponId: number;
    kills: number;
    deaths: number;
    ammo: number;
    maxAmmo: number;
    health: number;
    maxHealth: number;
    level: number;
    experience: number;   // Teraz to jest "obecne XP w pasku" (np. 15)
    nextLevelXP: number;  // Teraz to jest "maksimum tego paska" (np. 100)
    coins: number;
    cash: number;
    jetpackEnergy: number;
    maxJetpackEnergy: number;
    levelProgress?: number; // Gotowy % (opcjonalny, bo możemy go wyliczyć)
    addedXP?: number;
    addedCoins?: number;
}

interface GameProps {
    userData: UserData | null;
    gameRoom: Room;
    handleExit: () => void;
}

const GameComponent: React.FC<GameProps> = ({ userData, gameRoom, handleExit }) => { 
    const gameInstanceRef = useRef<Game | null>(null);
    const pixiContainerRef = useRef<HTMLDivElement>(null);
    const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);

    const profile = userData?.user.profile;
    // Rzutujemy na any, żeby pobrać pola 'nextLevelXP'/'levelProgress', 
    // które serwer teraz dokleja w endpointcie /playerinfo (jeśli tam są)
    const extraData = userData?.user as any;

    // Ustalamy wartości początkowe. 
    // Fallback '100' dla nextLevelXP zapobiega dzieleniu przez zero na starcie.
    const initialNextLevelXP = extraData?.nextLevelXP || 100;
    const initialCurrentXP = profile?.experience || 0;

    // Obliczamy startowy postęp (zabezpieczenie jeśli serwer nie przysłał gotowego %)
    const initialProgress = extraData?.levelProgress ?? (
        initialNextLevelXP > 0 
            ? (initialCurrentXP / initialNextLevelXP) * 100 
            : 0
    );

    const [hudState, setHudState] = useState<HudState>({
        weaponId: 1,
        kills: 0,
        deaths: 0,
        ammo: 0,
        maxAmmo: 0,
        health: 0,
        maxHealth: 0,
        level: profile?.level || 1,
        experience: initialCurrentXP,
        nextLevelXP: initialNextLevelXP, 
        coins: profile?.coins || 0,
        cash: profile?.cash || 0,
        jetpackEnergy: 100,
        maxJetpackEnergy: 100,
        levelProgress: Math.min(100, Math.max(0, initialProgress))
    });

    const handleGameExit = () => {
        if (gameInstanceRef.current) {
            gameInstanceRef.current.stop();
            gameInstanceRef.current = null;
        }
        handleExit();
    };

    const updateCanvasSize = (container: HTMLDivElement) => {
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

    useEffect(() => {
        if (pixiContainerRef.current) {
            const container = pixiContainerRef.current;

            updateCanvasSize(container);
            window.addEventListener('resize', updateCanvasSize.bind(null, container));

            const game = new Game(container, gameRoom, (updates: Partial<HudState>, newScoreboard: any) => {
                            // Aktualizacja HUD (paski)
                            // Tutaj przyjdą dane z serwera (np. po zabójstwie), które nadpiszą stan
                            if (Object.keys(updates).length > 0) {
                                setHudState(prev => {
                                    // Jeśli przychodzi update XP, przeliczamy procent od razu tutaj
                                    // (chyba że serwer przysyła też levelProgress)
                                    const nextState = { ...prev, ...updates };
                                    
                                    // Opcjonalne: wymuszenie przeliczenia % jeśli zmieniło się XP
                                    if (updates.experience !== undefined || updates.nextLevelXP !== undefined) {
                                        const mx = nextState.nextLevelXP || 100;
                                        const cur = nextState.experience || 0;
                                        nextState.levelProgress = Math.min(100, Math.max(0, (cur / mx) * 100));
                                    }

                                    return nextState;
                                });
                            }
                            // Aktualizacja Scoreboard (TAB)
                            if (newScoreboard) {
                                setScoreboard(newScoreboard);
                            }
                        });
            gameInstanceRef.current = game;

            return () => {
                window.removeEventListener('resize', updateCanvasSize.bind(null, container));
                if (gameInstanceRef.current) {
                    gameInstanceRef.current.stop();
                    gameInstanceRef.current = null;
                }
            };
        }        
    }, []);
    
    return (    
        <div className="game-wrapper">
            <div id="pixiContainer" ref={pixiContainerRef}>
                <GameHUD userData={userData} onGameExit={handleGameExit} hudState={hudState} scoreboardData={scoreboard}/>
            </div>
        </div>
    ) 
};

export default GameComponent;
