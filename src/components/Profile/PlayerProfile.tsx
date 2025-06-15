import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Save,
  Shield, PackageCheck, Swords, Gem, Coins, DollarSign
} from 'lucide-react';
import './css/PlayerProfile.css';

type Tab = 'bronie' | 'artefakty';

type WeaponStats = {
  min: number;
  max: number;
  ammo: number;
  reload: number;
  fireInt: number;
};

type ArtifactStats = {
  hp: number;
  armor: number;
  cooldown: number; // s
};

interface Item<T = unknown>{
  id:   number;
  name: string;
  stats: T;
  cena: number;
}

const PlayerProfile: React.FC = () => {
  
    const [tab, setTab] = useState<Tab>('bronie');

    const weapons: Item<WeaponStats>[] = Array.from({length:22}).map((_,i)=>{
        const dmgBase = 20+i*2;
        return{
        id:i,
        name:`Pistolet #${i+1}`,
        stats:{
            min:dmgBase,
            max:dmgBase+20,
            ammo:15+i,
            reload:+(0.4+i*0.05).toFixed(1),
            fireInt:+(0.18+i*0.01).toFixed(2)
        },
        cena:300+i*60
        };
    });

    const artifacts: Item<ArtifactStats>[] = Array.from({length:2}).map((_,i)=>({
        id:i,
        name:`Artefakt #${i+1}`,
        stats:{
        hp:50+i*10,
        armor:5+i*2,
        cooldown:+(3.0-i*0.2).toFixed(1)
        },
        cena:500+i*120
    }));

    const list = tab==='bronie' ? weapons : artifacts;
  
    const renderStats = (it:Item) =>{
        if(tab==='bronie'){
        const st = it.stats as WeaponStats;
        return(
            <>
            <span>Min DMG:</span><span>{st.min}</span>
            <span>Max DMG:</span><span>{st.max}</span>
            <span>Amunicja:</span><span>{st.ammo}</span>
            <span>Przeład.:</span><span>{st.reload}s</span>
            <span>Interw.:</span><span>{st.fireInt}s</span>
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
          <h3 className="player-name">Nazwa gracza</h3>

          <div className="stats-mini">
            <div><span>Poziom</span><strong>24</strong></div>
            <div><span>Osiągnięcia</span><strong>24</strong></div>
          </div>

          <div className="big-placeholder">Statystyki gracza</div>
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
                  <Coins size={14} color="#f79824" /> {it.cena}
                  <DollarSign size={14} color="#39FF14"/> {it.cena}
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
