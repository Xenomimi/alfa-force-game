import React, { useEffect, useState } from 'react';
import './css/LeadersScreen.css';
import { Crown, Skull, Crosshair } from 'lucide-react';
import { UserData } from '../App.tsx';

interface LeaderboardEntry {
  id: number;
  name: string;
  level: number;
  experience: number;
  kills: number;
  deaths: number;
  kdr: number;
}

// Funkcja pomocnicza do tworzenia awatara z inicjałami
const getAvatarUrl = (name: string, color: string = 'FFFFFF', bg: string = '2C2F33') => {
  const names = name.split(/(?=[A-Z])/);
  let initials = name.substring(0, 2).toUpperCase();
  if (names.length > 1) {
    initials = `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return `https://placehold.co/140x140/${bg}/${color}/png?text=${initials}`;
};

interface LeadersScreenProps {
  userData: UserData | null;
}

const LeadersScreen: React.FC<LeadersScreenProps> = ({ userData }) => {
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Pobieranie danych z serwera
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("http://localhost:4000/user/leaderboard", {
            credentials: "include"
        });
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        
        let data: LeaderboardEntry[] = await res.json();

        // Dodatkowe sortowanie na frontendzie dla pewności
        // 1. Doświadczenie (EXP)
        // 2. KDR (jako tie-breaker)
        data.sort((a, b) => {
            if (b.experience !== a.experience) {
                return b.experience - a.experience;
            }
            return b.kdr - a.kdr;
        });

        setPlayers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
      return <div className="leaders-root card" style={{alignItems: 'center', justifyContent: 'center'}}>Ładowanie rankingu...</div>;
  }

  const podium = players.slice(0, 3);
  
  return (
    <div className="leaders-root card">
      {/* ▬▬▬▬▬ PODIUM (TOP 3) ▬▬▬▬▬ */}
      {podium.length > 0 && (
        <div className="podium">
            {/* Miejsce 2 (lewa strona) */}
            {podium[1] && (
                <div className="podium-slot place-2">
                    <div className="avatar-wrap">
                        <img src={getAvatarUrl(podium[1].name, 'c0c0c0')} alt={podium[1].name} />
                        <div className="podium-place">2</div>
                    </div>
                    <span className="podium-name">{podium[1].name}</span>
                    <span className="podium-reward" style={{color: '#c0c0c0'}}>KD: {podium[1].kdr}</span>
                    <span className="podium-points">{podium[1].experience} XP</span>
                </div>
            )}

            {/* Miejsce 1 (środek) */}
            {podium[0] && (
                <div className="podium-slot place-1">
                    <div className="podium-crown">
                        <Crown size={32} strokeWidth={2.5}/>
                    </div>
                    <div className="avatar-wrap">
                        <img src={getAvatarUrl(podium[0].name, 'ffd700')} alt={podium[0].name} />
                        <div className="podium-place">1</div>
                    </div>
                    <span className="podium-name">{podium[0].name}</span>
                    <span className="podium-reward">KD: {podium[0].kdr}</span>
                    <span className="podium-points">{podium[0].experience} XP</span>
                </div>
            )}

            {/* Miejsce 3 (prawa strona) */}
            {podium[2] && (
                <div className="podium-slot place-3">
                    <div className="avatar-wrap">
                        <img src={getAvatarUrl(podium[2].name, 'cd7f32')} alt={podium[2].name} />
                        <div className="podium-place">3</div>
                    </div>
                    <span className="podium-name">{podium[2].name}</span>
                    <span className="podium-reward" style={{color: '#cd7f32'}}>KD: {podium[2].kdr}</span>
                    <span className="podium-points">{podium[2].experience} XP</span>
                </div>
            )}
        </div>
      )}

      {/* ▬▬▬▬▬ TABELA (RESZTA) ▬▬▬▬▬ */}
      <div className="table-wrapper">
        <table className="leader-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Gracz</th>
              <th>Statystyki (K / D | KDR)</th>
              <th>Doświadczenie</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr 
                key={p.id} 
                className={`${i < 3 ? 'top-row' : ''} ${userData?.user.id === p.id ? 'current-user-row' : ''}`}
              >
                <td className="cell-rank">{i + 1}</td>
                <td className="cell-player">
                  <img 
                    className={`${i === 0 ? 'img-first' : ''}`} 
                    src={getAvatarUrl(p.name)} 
                    alt={p.name} 
                  /> 
                  <div style={{display:'flex', flexDirection:'column', lineHeight: '1.2'}}>
                    <span>{p.name}</span>
                    <span style={{fontSize: 11, color: '#666'}}>Lvl {p.level}</span>
                  </div>
                </td>
                
                {/* Zamiast "Nagrody" wyświetlamy statystyki bojowe */}
                <td className="cell-reward" style={{ color: '#b0b0b0', fontWeight: 400 }}>
                    <span style={{color: '#39FF14', fontWeight: 'bold'}}>{p.kills}</span> 
                    <span style={{margin: '0 4px'}}>/</span> 
                    <span style={{color: '#E94560', fontWeight: 'bold'}}>{p.deaths}</span>
                    <span style={{marginLeft: '12px', fontSize: '13px', color: '#fff', background: '#2C2F33', padding: '2px 6px', borderRadius: 4}}>
                        KDR: {p.kdr}
                    </span>
                </td>

                <td className="cell-points">{p.experience} XP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadersScreen;