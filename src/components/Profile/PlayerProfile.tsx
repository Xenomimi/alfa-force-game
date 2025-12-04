import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Save,
  Shield, PackageCheck, Swords, Gem, Coins, DollarSign,
  Baseline
} from 'lucide-react';
import './css/PlayerProfile.css';
import { UserData } from '../App.tsx';
import { info } from 'console';

type Tab = 'bronie' | 'artefakty';
type WeaponStats   = { min_damage: number; max_damage: number; amunition: number; reloadTime: number; fireInterval: number, accuracy: number};
type ArtifactStats = { bonusType: string; bonusValue: number };
type UserStats = { health: number; armor: number; strength: number; agility: number; intelligence: number; accuracy: number };

type Item<T = WeaponStats | ArtifactStats> = {
  id: number;
  name: string;
  description?: string;
  stats: T;
  priceCoins: number;
  priceCash: number;
  category: string;
}

interface PlayerProfileProps {
  userData: UserData | null;
}

interface PlayerInfo {
  username: string;
  profile: {
    id: number;
    userId: number;
    level: number;
    experience: number;
    coins: number;
    cash: number;
    totalKills: number;
    totalDeaths: number;
    createdAt: string;
    lastLogin?: number;
  }
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ userData }) => {
  const [tab, setTab] = useState<Tab>('bronie');
  const [weapons, setWeapons] = useState<Item<WeaponStats>[]>([]);
  const [artifacts, setArtifacts] = useState<Item<ArtifactStats>[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ health: -1, armor: -1, strength: -1, agility: -1, intelligence: -1, accuracy: -1 });
  const [userInfo, setUserInfo] = useState<PlayerInfo>({ username: '', profile: { id: -1, userId: -1, level: -1, experience: -1, coins: -1, cash: -1, totalKills: -1, totalDeaths: -1, createdAt: '', lastLogin: -1 } });
  // const userStats: UserStats = {}; 
  if (!userData) {
    return <div>Ładowanie profilu...</div>;
  }

  useEffect(() => {
    const populateData = async () => {
        try {
            const [weaponsRes, artifactsRes, statsRes, infoRes] = await Promise.all([
              fetch("http://localhost:4000/shop/weapons", { credentials: "include" }),
              fetch("http://localhost:4000/shop/artifacts", { credentials: "include" }),
              fetch("http://localhost:4000/user/playerstats", { credentials: "include" }),
              fetch("http://localhost:4000/user/playerinfo", { credentials: "include" })
            ]);
            if (!weaponsRes.ok || !artifactsRes.ok || !statsRes.ok || !infoRes.ok) {
              throw new Error("Błąd przy pobieraniu danych");
            }
            const [weaponsData, artifactsData, statsData, infoData] = await Promise.all([
              weaponsRes.json(),
              artifactsRes.json(),
              statsRes.json(),
              infoRes.json()
            ]);

            setWeapons(weaponsData);
            setArtifacts(artifactsData);
            setUserStats(statsData);
            setUserInfo(infoData);

            console.dir(infoData);
        } catch (err) {
            console.error("Błąd przy pobieraniu danych w PlayerProfile", err);
        }
    };

    populateData();
  }, []);

  const renderPlayerStats = (it: UserStats) =>{
    const s = it;
    return(
        <>
          <span>Health:</span><span>{s.health}</span>
          <span>Armor:</span><span>{s.armor}</span>
          <span>Strength:</span><span>{s.strength}</span>
          <span>Agility:</span><span>{s.agility}</span>
          <span>Intelligence:</span><span>{s.intelligence}</span>
          <span>Accuracy:</span><span>{s.accuracy}</span>
        </>
    );
  }; 

  const list = tab==='bronie' ? weapons : artifacts;
  const renderWeaponStats = (it:Item) =>{
    if(tab==='bronie'){
      const s = it.stats as WeaponStats;
      return(
          <>
            <span>Min DMG:</span><span>{s.min_damage}</span>
            <span>Max DMG:</span><span>{s.max_damage}</span>
            <span>Amunicja:</span><span>{s.amunition}</span>
            <span>Przeładowanie:</span><span>{s.reloadTime}s</span>
            <span>Interwał:</span><span>{s.fireInterval}s</span>
            <span>Celność:</span><span>{s.accuracy}s</span>
          </>
      );
    }
    const st = it.stats as ArtifactStats;
    return(
      <>
        <span>{it.name}:</span><span>{st.bonusValue}</span>
      </> 
    );
  };  
  
  return (
    <div className="profile-root">
      <aside className="profile-left">
        <section className="card player-card">
          <div className="avatar">
            <img src="https://dummyimage.com/100x100/000/fff" alt="Avatar gracza"/>
          </div>
          <h1 className="player-name">  
            {userData.user.username}
                        <div>
              <span style={{fontSize: '13px', color: '#fff', background: '#2C2F33', padding: '2px 6px', borderRadius: 4}}>
                KDR: {userInfo.profile.totalDeaths > 0 ? (userInfo.profile.totalKills / userInfo.profile.totalDeaths).toFixed(2) : userInfo.profile.totalKills.toFixed(2)}
              </span>
            </div>
          </h1>
          <div className="stats-mini">
            <div><span>Poziom</span><strong>{userData?.user.profile.level}</strong></div>
            <div><span>Osiągnięcia</span><strong>{userData?.user.profile.experience}</strong></div>
          </div>

          <div className="big-placeholder">
              <div className="item-stats">
                <div className="stats-grid">{renderPlayerStats(userStats)}</div>
              </div>
          </div>
          <div className="">
            <h4>Statystyki postaci</h4>
          </div>
          <div className="big-placeholder">
              <div className="stats-grid">
                <span>Total kills:</span><span>{userInfo.profile.totalKills}</span>
                <span>Total deaths:</span><span>{userInfo.profile.totalKills}</span>
              </div>
          </div>
        </section>

        <section className="card equip-card">
            <h4>Ekwipunek postaci</h4>
            <div className="equip-grid">
                {/* ★ lewa kolumna artefaktów */}
                {['Art1','Art2','Art3','Art4','Art5','Art6'].map((txt,i)=>(
                <button
                    key={txt}
                    data-slot={`art${i+1}`}          // ★  ← NEW
                    className="art-slot">
                    {txt}
                </button>
                ))}

                {/* ★ podgląd postaci */}
                <div className="character-preview">
                  <div id="preview-box">
                      <img width={150} src="player.png" alt="Podgląd postaci"/>
                  </div>
                  
                </div>
            </div>
            <div className="equip-controls">
                <button className="icon-sq"><ChevronLeft size={16} /></button>
                <button className="save-btn"><Save size={16} /> Zapisz</button>
                <button className="icon-sq"><ChevronRight size={16} /></button>
            </div>
        </section>
      </aside>

      <section className="profile-right card">
        <div className="tabs">
          <button
            className={tab === 'bronie' ? 'tab active' : 'tab'}
            onClick={() => setTab('bronie')}
          >
            <Swords size={14}/>  Bronie
          </button>
          <button
            className={tab === 'artefakty' ? 'tab active' : 'tab'}
            onClick={() => setTab('artefakty')}
          >
            <Gem size={14}/>  Artefakty
          </button>
        </div>

        <div className="item-list">
          {list.map(it => (
            <div key={it.id} className="item-card">
              {/* miniatura */}
              <div className="item-thumb">
                <img src={`/weapons/${it.id}.png`} alt="Zdjęcie"/>
              </div>

              {/* ▶ STATYSTYKI */}
              <div className="item-stats">
                <div className="stats-grid">
                    {renderWeaponStats(it)}
                </div>
              </div>

              {/* cena + przycisk */}
              <div className="item-price">
                <span className="price-label">Wartość</span>
                <div className="price-value">
                  <Coins size={14} color="#f79824" /> {it.priceCoins}
                  <DollarSign size={14} color="#39FF14"/> {it.priceCash}
                </div>
                <button className="sell-btn">
                  <PackageCheck size={14} /> Sprzedaj
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PlayerProfile;
