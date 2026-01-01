import React from 'react';
import './css/LobbyHeader.css';
import {
  Trophy, Zap, Coins, DollarSign,
  HelpCircle, Volume2, LogOut
} from 'lucide-react';
import { UserData } from '../App';
import { HudState } from '../Game/GameComponent';

interface LobbyHeaderProps {
  userData: UserData | null;
  hudState?: Partial<HudState>;
  onLogout: () => void;
}

const LobbyHeader: React.FC<LobbyHeaderProps> = ({ userData, hudState, onLogout }) => {
  if (!userData) {
    return <div className="loading-header">Ładowanie...</div>;
  }

  const profile = userData.user.profile;
  const extraData = userData.user as any; 
  
  // --- NOWA LOGIKA ---
  
  // 1. Pobieramy wartości. Priorytet: HUD (gra na żywo) -> API (dane z lobby)
  const level = hudState?.level ?? profile.level;
  
  // W nowym systemie 'experience' to już jest wartość zresetowana (np. 45), a nie całkowita (np. 1045)
  const currentXP = hudState?.experience ?? profile.experience;
  
  // MaxXP przychodzi teraz z API (jako nextLevelXP). Dajemy fallback 100, żeby nie dzielić przez 0/undefined.
  const maxXP = hudState?.nextLevelXP ?? extraData.nextLevelXP ?? 100;

  // 2. Obliczamy procent
  // Jeśli serwer przysłał gotowy procent (levelProgress), używamy go.
  // Jeśli nie, liczymy sami: (obecne / wymagane) * 100.
  let progressPercent = 0;

  if (hudState?.levelProgress !== undefined) {
      progressPercent = hudState.levelProgress;
  } else if (extraData.levelProgress !== undefined) {
      progressPercent = extraData.levelProgress;
  } else {
      // Zabezpieczenie na wypadek braku danych z API (prosta kalkulacja)
      progressPercent = maxXP > 0 ? (currentXP / maxXP) * 100 : 0;
  }

  // Upewniamy się, że pasek nie wyjedzie poza zakres 0-100%
  progressPercent = Math.min(100, Math.max(0, progressPercent));

 return (
  <>
    <header className="lobby-header">
      <div className="user-info">

        <div className="user-badge">
          <span className="username">{userData.user.username}</span>
        </div>

        <div className="user-badge">
          <Trophy size={16} color="#f79824"/> <span>{level}</span>
        </div>

        {/* Tooltip pokazuje teraz proste wartości: np. EXP: 45 / 100 */}
        <div className="user-badge exp-wrapper" title={`EXP: ${currentXP} / ${maxXP}`}>
          <Zap size={16} color="#00D9FF"/>
          <div className="exp-bar">
            <div 
                className="exp-fill" 
                style={{width: `${progressPercent}%`}}
            />
          </div>
        </div>

        <div className="user-badge">
          <Coins size={16} color="#f79824"/> <span>{hudState?.coins ?? profile.coins}</span>
        </div>

        <div className="user-badge">
          <DollarSign size={16} color="#39FF14"/> <span>{hudState?.cash ?? profile.cash}</span>
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