import React, { useState, useEffect, useRef } from 'react';
import GameHUD from '../Hud/GameHUD.tsx';
import { Game } from '../../game/pixiGame.ts';
import { Room } from 'colyseus.js';
import { UserData } from '../App';
import { ScoreboardEntry } from '../Hud/GameHUD';

export interface HudState {
    weaponId: number;
    kills: number;
    deaths: number;
    ammo: number;
    maxAmmo: number;
    health: number;
    maxHealth: number;
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
    const [hudState, setHudState] = useState<HudState>({
        weaponId: 1,
        kills: 0,
        deaths: 0,
        ammo: 0,
        maxAmmo: 0,
        health: 0,
        maxHealth: 0
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
                            if (Object.keys(updates).length > 0) {
                                setHudState(prev => ({ ...prev, ...updates }));
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