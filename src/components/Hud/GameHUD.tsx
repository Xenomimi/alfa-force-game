import React, { useEffect, useState } from 'react';
import './css/GameHUD.css';
import LobbyHeader from '../Lobby/LobbyHeader';

/* Dummy-dane – w prawdziwej grze leci to z WebSocketa lub kontekstu gry */
const mockScoreboard = [
  { id: 1, name: 'PlayerOne',  kills: 15, deaths: 7,  ping: 42 },
  { id: 2, name: 'PlayerTwo',  kills: 12, deaths: 9,  ping: 65 },
  { id: 3, name: 'You',        kills: 10, deaths: 5,  ping: 34, me: true },
  { id: 4, name: 'EnemyFour',  kills:  7, deaths: 8,  ping: 88 },
  { id: 5, name: 'EnemyFive',  kills:  3, deaths:12,  ping:120 },
];

interface GameHUDProps { onLogout: () => void }

const GameHUD: React.FC<GameHUDProps> = ({ onLogout }) => {
  const [showScore, setShowScore] = useState(false);

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
      <LobbyHeader onLogout={onLogout} />

      {/* ►► SCOREBOARD ◄◄ */}
      {showScore && (
        <div className="scoreboard-overlay">
          {/* korzystamy z dokładnie tych samych klas, co w LeadersScreen */}
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
                {mockScoreboard.map((p, i) => (
                  <tr
                    key={p.id}
                    className={[
                      p.me            ? 'current-user-row' : '',
                      i < 3           ? 'top-row'          : '',
                    ].join(' ').trim()}
                  >
                    <td className="cell-rank">{i + 1}</td>
                    <td className="cell-player">
                      <img
                        src="https://dummyimage.com/200x200/000/fff"
                        className={i === 0 ? 'img-first' : undefined}
                        alt=""                        
                      />
                      {p.name}
                    </td>
                    <td className="cell-points">{p.kills}</td>
                    <td className="cell-points">{p.deaths}</td>
                    <td>{p.ping}</td>
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
            <img src="/1654.png" alt="Broń" />
          </div>
        </div>

        <div className="hud-bars">
          <div className="hud-bar ammo">
            <span className="hud-label">Amunicja</span>
            <span className="hud-value">6</span>
          </div>
          <div className="hud-bar health">
            <span className="hud-label">Punkty życia</span>
            <span className="hud-value">250 / 250</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
