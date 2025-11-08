import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Save,
  Shield, PackageCheck, Swords, Gem, Coins, DollarSign
} from 'lucide-react';
import './css/PlayerProfile.css';
import { UserData } from '../App.tsx';

type Tab = 'bronie' | 'artefakty';
type WeaponStats   = { min_damage: number; max_damage: number; amunition: number; reloadTime: number; fireInterval: number, accuracy: number};
type ArtifactStats = { hp: number; armor: number; cooldown:number };

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

const PlayerProfile: React.FC<PlayerProfileProps> = ({ userData }) => {
    const [tab, setTab] = useState<Tab>('bronie');
    const [weapons, setWeapons] = useState<Item<WeaponStats>[]>([]);
    const [artifacts, setArtifacts] = useState<Item<ArtifactStats>[]>([]);
    // const userStats: UserStats = {}; 

    useEffect(() => {
      const populateUserWeapons = async () => {
          try {
              const res = await fetch("http://localhost:4000/shop/weapons", {
                  credentials: "include"
              });
              if (!res.ok) {
                  if (res.status === 401) {
                      return;
                  }
                  throw new Error(`HTTP ${res.status}`);
              }
              const data = await res.json();
              setWeapons(data);
          } catch (err) {
              console.error("Błąd przy sprawdzaniu sesji:", err);
          }
      };

      populateUserWeapons();
    }, []);

    const list = tab==='bronie' ? weapons : artifacts;
  
    const renderStats = (it:Item) =>{
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
        <span>+HP:</span><span>{st.hp}</span>
        <span>Pancerz:</span><span>{st.armor}</span>
        <span>CD:</span><span>{st.cooldown}s</span>
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
          <h3 className="player-name">{userData?.user.username}</h3>

          <div className="stats-mini">
            <div><span>Poziom</span><strong>{userData?.user.profile.level}</strong></div>
            <div><span>Osiągnięcia</span><strong>{userData?.user.profile.experience}</strong></div>
          </div>

          <div className="big-placeholder">
              <div className="item-stats">
                {list.map(it => (
                <div className="stats-grid">{renderStats(it)}</div>
                ))}
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
                <div className="character-preview">Postać z gry</div>
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
                <img src="https://dummyimage.com/600x400/000/fff" alt="Zdjęcie"/>
              </div>

              {/* ▶ STATYSTYKI */}
              <div className="item-stats">
                <div className="stats-grid">
                    {renderStats(it)}
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
