// src/Leaders/LeadersScreen.tsx
import React from 'react';
import './css/LeadersScreen.css';
import { Crown } from 'lucide-react';

interface Player {
  id: number;
  name: string;
  avatar: string;
  points: number;
  reward: string;
}

// Funkcja pomocnicza do tworzenia inicjałów
const getInitials = (name: string) => {
  const names = name.split(/(?=[A-Z])/); // Dzieli po wielkich literach (np. ShadowHunter -> [Shadow, Hunter])
  if (names.length > 1) {
    return `${names[0][0]}${names[1][0]}`;
  }
  return name.substring(0, 2).toUpperCase();
};

const players: Player[] = [
    { id: 1, name: 'ShadowHunter', avatar: `https://placehold.co/140x140/1E1E1E/ffd700/png?text=${getInitials('ShadowHunter')}`, points: 6150, reward: '+5000' },
    { id: 2, name: 'CyberFox',     avatar: `https://placehold.co/140x140/1E1E1E/c0c0c0/png?text=${getInitials('CyberFox')}`, points: 5880, reward: '+4500' },
    { id: 3, name: 'IronBlade',    avatar: `https://placehold.co/140x140/1E1E1E/cd7f32/png?text=${getInitials('IronBlade')}`, points: 5600, reward: '+4000' },
    { id: 4, name: 'AKTUALNIE ZALOGOWANY GRACZ',  avatar: `https://placehold.co/80x80/2C2F33/FFFFFF/png?text=${getInitials('super_nazwa')}`, points: 5890, reward: '+2000'  },
    { id: 5, name: 'PlayerName',   avatar: `https://placehold.co/80x80/2C2F33/FFFFFF/png?text=${getInitials('PlayerName')}`, points: 4250, reward: '+1500'  },
    { id: 6, name: 'GamerPro',     avatar: `https://placehold.co/80x80/2C2F33/FFFFFF/png?text=${getInitials('GamerPro')}`, points: 3890, reward: '+1200'  },
    { id: 7, name: 'SharpShooter', avatar: `https://placehold.co/80x80/2C2F33/FFFFFF/png?text=${getInitials('SharpShooter')}`, points: 3456, reward: '+1000'  },
  ];

const LeadersScreen: React.FC = () => {
  const podium = players.slice(0, 3);
  
  // Załóżmy, że ID zalogowanego gracza to 4, aby zademonstrować podświetlenie
  const currentUserId = 4; 

  return (
    <div className="leaders-root card">
      {/* ▬▬▬▬▬ PODIUM ▬▬▬▬▬ */}
      <div className="podium">
        {podium.map((p, idx) => (
          <div key={p.id} className={`podium-slot place-${idx + 1}`}>
              {/* Ikona korony przeniesiona poza .avatar-wrap i renderowana warunkowo */}
              {idx === 0 && (
                <div className="podium-crown">
                  <Crown size={32} strokeWidth={2.5}/>
                </div>
              )}
            <div className="avatar-wrap">
              <img src={p.avatar} alt={p.name} />
              <div className="podium-place">{idx + 1}</div>
            </div>
            <span className="podium-name">{p.name}</span>
            <span className="podium-reward">{p.reward}</span>
            <span className="podium-points">{p.points} pkt</span>
          </div>
        ))}
      </div>

      {/* ▬▬▬▬▬ TABELA ▬▬▬▬▬ */}
      <div className="table-wrapper">
        <table className="leader-table">
          <thead>
            <tr>
              <th>Miejsce</th>
              <th>Nazwa gracza</th>
              <th>Nagroda</th>
              <th>Punkty</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr 
                key={p.id} 
                className={`${i < 3 ? 'top-row' : ''} ${p.id === currentUserId ? 'current-user-row' : ''}`}
              >
                <td className="cell-rank">{i + 1}</td>
                <td className="cell-player">
                  <img className={`${i == 0 ? 'img-first' : ''}`} src={p.avatar.replace('140x140', '80x80')} alt={p.name} /> {p.name}
                </td>
                <td className="cell-reward">{p.reward} 💰</td>
                <td className="cell-points">{p.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadersScreen;