import React, { useState, useEffect, useRef } from 'react';
import GameHUD from '../Hud/GameHUD.tsx';
import { Game } from '../../game/pixiGame.ts';
import { Room } from 'colyseus.js';
import { UserData } from '../App';

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

            const game = new Game(container, gameRoom, (updates: Partial<HudState>) => {
                            setHudState(prevState => ({
                                ...prevState,
                                ...updates
                            }));
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
                <GameHUD userData={userData} onGameExit={handleGameExit} hudState={hudState}/>
            </div>
        </div>
    ) 
};

export default GameComponent;