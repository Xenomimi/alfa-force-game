import React, { useState, useEffect, useRef } from 'react';
import GameHUD from '../Hud/GameHUD.tsx';
import { Game } from '../../game/pixiGame.ts';
import { Room } from 'colyseus.js';

interface GameProps {
    gameRoom: Room | null;
    handleExit: () => void;
}

const GameComponent: React.FC<GameProps> = ({ gameRoom, handleExit }) => { 
    const gameInstanceRef = useRef<Game | null>(null);
    const pixiContainerRef = useRef<HTMLDivElement>(null);
    
    const handleGameExit = () => {
        if (gameInstanceRef.current) {
        gameInstanceRef.current.stop();
        gameInstanceRef.current = null;

        }
        console.log("GameComponent: handleGameExit called");
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

            const game = new Game(container, gameRoom);
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
                <GameHUD onGameExit={handleGameExit} />
            </div>
        </div>
    ) 
};

export default GameComponent;