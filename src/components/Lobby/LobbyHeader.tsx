import React from 'react';
import './css/LobbyHeader.css';
import {
  Trophy, Zap, Coins, DollarSign,
  HelpCircle, Volume2, LogOut
} from 'lucide-react';
import { UserData } from '../App';

interface LobbyHeaderProps {
  userData: UserData | null;
  onLogout: () => void;
}

const LobbyHeader: React.FC<LobbyHeaderProps> = ({ userData, onLogout }) => {
  if (!userData) {
    return <div className="loading-header">Ładowanie...</div>;
  }

  return (
  <>
    <header className="lobby-header">
      <div className="user-info">

        <div className="user-badge">
          <span className="username">{userData.user.username}</span>
        </div>

        <div className="user-badge">
          <Trophy size={16} color="#f79824"/> <span>{userData.user.profile.level}</span>
        </div>

        <div className="user-badge exp-wrapper" title={`EXP: ${userData.user.profile.experience} / 1000`}>
          <Zap size={16} color="#00D9FF"/>
          <div className="exp-bar">
            <div className="exp-fill" style={{width: `${Math.min((userData.user.profile.experience / 1000) * 100, 100)}%`}}/>
          </div>
        </div>

        <div className="user-badge">
          <Coins size={16} color="#f79824"/> <span>{userData.user.profile.coins}</span>
        </div>

        <div className="user-badge">
          <DollarSign size={16} color="#39FF14"/> <span>{userData.user.profile.cash}</span>
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
)};

export default LobbyHeader;
