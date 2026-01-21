import React, { useEffect, useState } from 'react';
import './css/GameHUD.css';
import LobbyHeader from '../Lobby/LobbyHeader';
import { UserData } from '../App';
import { HudState } from '../Game/GameComponent';

/* Dummy-dane – w prawdziwej grze leci to z WebSocketa lub kontekstu gry */
const mockScoreboard = [
  { id: 1, name: 'PlayerOne',  kills: 15, deaths: 7,  ping: 42 },
  { id: 2, name: 'PlayerTwo',  kills: 12, deaths: 9,  ping: 65 },
  { id: 3, name: 'You',        kills: 10, deaths: 5,  ping: 34, me: true },
  { id: 4, name: 'EnemyFour',  kills:  7, deaths: 8,  ping: 88 },
  { id: 5, name: 'EnemyFive',  kills:  3, deaths:12,  ping:120 },
];

export type ScoreboardEntry = {
    id: string; // sessionId
    name: string;
    kills: number;
    deaths: number;
    ping: number;
    isMe: boolean;
};

interface GameHUDProps {
  userData: UserData | null; 
  onGameExit: () => void;
  hudState: HudState;
  scoreboardData: ScoreboardEntry[];
}

const GameHUD: React.FC<GameHUDProps> = ({ userData, onGameExit, hudState, scoreboardData }) => {
  const [showScore, setShowScore] = useState(false);
  const ammoPercentage = hudState.maxAmmo > 0 
      ? Math.min(100, Math.max(0, (hudState.ammo / hudState.maxAmmo) * 100)) 
      : 0;

    const healthPercentage = hudState.maxHealth > 0
      ? Math.min(100, Math.max(0, (hudState.health / hudState.maxHealth) * 100))
      : 0;

    const jetpackPercentage = hudState.maxJetpackEnergy > 0
      ? Math.min(100, Math.max(0, (hudState.jetpackEnergy / hudState.maxJetpackEnergy) * 100))
      : 0;


  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') { e.preventDefault(); setShowScore(true); }
    };
    const handleUp   = (e: KeyboardEvent) => {
      if (e.code === 'Tab') { e.preventDefault(); setShowScore(false); }
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup',   handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup',   handleUp);
    };
  }, []);

  return (
    <div className="game-hud-container">
      {/* górny pasek */}
      <LobbyHeader userData={userData} hudState={hudState} onLogout={onGameExit} />

      {/* ►► SCOREBOARD ◄◄ */}
      {showScore && (
        <div className="scoreboard-overlay">
          <div className="table-wrapper scoreboard-wrapper">
            <table className="leader-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Gracz</th>
                  <th>Zab.</th>
                  <th>Zg.</th>
                  <th>Ping</th>
                </tr>
              </thead>
              <tbody>
                {/* Używamy scoreboardData zamiast mockScoreboard */}
                {scoreboardData.map((p, i) => (
                  <tr
                    key={p.id}
                    className={[
                      p.isMe          ? 'current-user-row' : '',
                      i < 3           ? 'top-row'          : '',
                    ].join(' ').trim()}
                  >
                    <td className="cell-rank">{i + 1}</td>
                    <td className="cell-player">
                      {/* Avatar placeholder - można później zmienić na avatar z profilu */}
                      <img
                        src={`https://placehold.co/200x200/2C2F33/FFFFFF/png?text=${p.name.substring(0,2).toUpperCase()}`}
                        className={i === 0 ? 'img-first' : undefined}
                        alt=""                        
                      />
                      {p.name}
                    </td>
                    <td className="cell-points" style={{color: '#39FF14'}}>{p.kills}</td>
                    <td className="cell-points" style={{color: '#E94560'}}>{p.deaths}</td>
                    <td style={{color: p.ping < 50 ? '#39FF14' : p.ping < 100 ? 'orange' : 'red'}}>
                        {p.ping} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* dolny HUD */}
        <div className="hud-bottom">
          <div className="hud-info-group">
            <div className="hud-label">Granaty: 5</div>
            <div className="hud-weapon hud-outline">
              {/* Dynamiczne ID broni */}
              <img src={`/weapons/${hudState.weaponId}.png`} alt="Broń" />
            </div>
          </div>

          <div className="hud-bars">
            
            {/* Pasek AMUNICJI */}
            <div className="hud-bar ammo">
              <div className="hud-text-row">
                <span className="hud-label">Amunicja</span>
                <span className="hud-value">{hudState.ammo} / {hudState.maxAmmo}</span>
              </div>
              <div className="hud-progress-track">
                <div 
                  className="hud-progress-fill" 
                  style={{ width: `${ammoPercentage}%` }}
                />
              </div>
            </div>

            {/* Pasek ŻYCIA */}
            <div className="hud-bar jetpack">
              <div className="hud-text-row">
                <span className="hud-label">Energia Jetpacka</span>
                <span className="hud-value">{Math.ceil(hudState.jetpackEnergy)} / {hudState.maxJetpackEnergy}</span>
              </div>
              <div className="hud-progress-track">
                <div 
                  className="hud-progress-fill" 
                  style={{ width: `${jetpackPercentage}%` }}
                />
              </div>
            </div>

            {/* Pasek ZYCIA */}
            <div className="hud-bar health">
              <div className="hud-text-row">
                <span className="hud-label">Punkty życia</span>
                <span className="hud-value">{Math.ceil(hudState.health)} / {hudState.maxHealth}</span>
              </div>
              <div className="hud-progress-track">
                 <div 
                  className="hud-progress-fill" 
                  style={{ width: `${healthPercentage}%` }}
                />
              </div>
            </div>
            
          </div>
        </div>
    </div>
  );
};

export default GameHUD;
