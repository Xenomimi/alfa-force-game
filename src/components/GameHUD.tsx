import React from 'react';
import '../styles/GameHUD.css';
import LobbyHeader from './Lobby/LobbyHeader';

interface GameHUDProps {
  onLogout: () => void;
}

const GameHUD: React.FC<GameHUDProps> = ({ onLogout }) => {
  return (
    <div className="game-hud-container">
      {/* Górna belka bez nawigacji */}
      <LobbyHeader onLogout={onLogout} />

      {/* Dolne informacje HUD */}
      <div className="hud-bottom">
        <div className="hud-info-group">
          <div className="hud-label">Granaty: 5</div>
          <div className="hud-weapon hud-outline">
            asdasd
          </div>
        </div>
        <div className="hud-bars">
          <div className="hud-bar ammo">
            <span className="hud-label">Pasek amunicji</span>
            <span className="hud-value">6</span>
          </div>
          <div className="hud-bar health">
            <span className="hud-label">Pasek życia</span>
            <span className="hud-value">250 / 250</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
