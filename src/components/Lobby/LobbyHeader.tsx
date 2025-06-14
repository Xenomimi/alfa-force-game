import React from 'react';
import './css/LobbyHeader.css';
import {
  Trophy, Zap, Coins, DollarSign,
  HelpCircle, Volume2, LogOut
} from 'lucide-react';

interface LobbyHeaderProps {
  onLogout: () => void;
}

const LobbyHeader: React.FC<LobbyHeaderProps> = ({ onLogout}) => (
  <>
    <header className="lobby-header">
      <div className="user-info">
        <div className="user-badge">
          <Trophy size={16} color="#f79824"/> <span>11</span>
        </div>

        <div className="user-badge exp-wrapper" title="EXP 10 / 500">
          <Zap size={16} color="#00D9FF"/>
          <div className="exp-bar">
            <div className="exp-fill" style={{ width: '20%'}} />
          </div>
        </div>

        <div className="user-badge">
          <Coins size={16} color="#f79824"/> <span>15385</span>
        </div>

        <div className="user-badge">
          <DollarSign size={16} color="#39FF14"/> <span>500</span>
        </div>
      </div>

      <div className="header-actions">
        <button className="icon-btn" title="Pomoc"><HelpCircle size={18} /></button>
        <button className="icon-btn" title="Dźwięk"><Volume2 size={18} /></button>
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={16} style={{ marginRight: 6 }} /> Wyjdź
        </button>
      </div>
    </header>
  </>
);

export default LobbyHeader;
