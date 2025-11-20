import React, { useState, useMemo, useEffect } from 'react';
import {
  PackageCheck, Swords, Gem,
  Coins, DollarSign
} from 'lucide-react';
import '../Shop/css/ShopScreen.css';
import '../Profile/css/PlayerProfile.css';

type Tab = 'bronie' | 'artefakty';
type WeaponStats   = { min_damage: number; max_damage: number; amunition: number; reloadTime: number; fireInterval: number, accuracy: number};
type ArtifactStats = { bonusType: string; bonusValue: number };

interface Item<T = WeaponStats | ArtifactStats> {
  id: number;
  name: string;
  description?: string;
  stats: T;
  priceCoins: number;
  priceCash: number;
  category?: string;
}

const CATEGORIES = [
  { key:'smg',   label:'Pistolety maszynowe', icon:<Swords size={18}/> },
  { key:'rifle', label:'Karabiny',            icon:<Swords size={18}/> },
  { key:'sniper',label:'Karabiny snajp.',     icon:<Swords size={18}/> },
  { key:'melee', label:'Broń biała',          icon:<Swords size={18}/> },
];

const ShopScreen: React.FC = () => {
  const [tab,setTab] = useState<Tab>('bronie');
  const [category,setCategory] = useState('smg');
  const [weapons, setWeapons] = useState<Item<WeaponStats>[]>([]);
  const [artifacts, setArtifacts] = useState<Item<ArtifactStats>[]>([]);
 
  useEffect(() => {
    const populateShop = async () => {
        try {
            const [weaponsRes, artifactsRes] = await Promise.all([
              fetch("http://localhost:4000/shop/weapons", { credentials: "include" }),
              fetch("http://localhost:4000/shop/artifacts", { credentials: "include" })
            ]);
            if (!weaponsRes.ok || !artifactsRes.ok) {
              throw new Error("Błąd przy pobieraniu danych");
            }
            const [weaponsData, artifactsData] = await Promise.all([
              weaponsRes.json(),
              artifactsRes.json()
            ]);

            setWeapons(weaponsData);
            setArtifacts(artifactsData);
            console.log("Pobrane bronie:", weaponsData);
            console.log("Pobrane artefakty:", artifactsData);
        } catch (err) {
            console.error("Błąd przy pobieraniu danych w PlayerProfile", err);
        }
    };

    populateShop();
  }, []);
  
  const list = tab === 'bronie' ? weapons : artifacts;

  const filtered = useMemo(() => (
    tab === 'bronie' ? list.filter(it => it.category === category) : list
  ), [list, tab, category]);


  const renderStats = (it: Item) => {
    if(tab === 'bronie') {
      const s = it.stats as WeaponStats;
      return (
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
    const s = it.stats as ArtifactStats;
    if (!s) return <span>Brak danych</span>;
    
    return (
      <>
        <span>{it.name}</span><span>+{s.bonusValue}</span>
      </>
    );
  };

  return(
    <div className="profile-root">     
      <aside className="profile-left">
        <section className="card shop-cat-card">
          <h4>Kategorie</h4>
          <ul className="cat-list">
            {CATEGORIES.map(cat => (
              <li key={cat.key}>
                <button
                  className={cat.key===category?'cat-btn active':'cat-btn'}
                  onClick={()=>setCategory(cat.key)}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </aside>
      <section className="profile-right card">
        <div className="tabs">
          <button
            className={tab==='bronie'?'tab active':'tab'}
            onClick={()=>setTab('bronie')}
          ><Swords size={14}/> Bronie</button>

          <button
            className={tab==='artefakty'?'tab active':'tab'}
            onClick={()=>setTab('artefakty')}
          ><Gem size={14}/> Artefakty</button>
        </div>
        <div className="item-list">
          {filtered.map(it => (
            <div key={ it.id } className="item-card">
              <div className="item-thumb">
                <img src={`/weapons/${it.id}.png`} alt="Zdjęcie"/>
              </div>

              <div className="item-stats">
                <div className="stats-grid">{renderStats(it)}</div>
              </div>

              <div className="item-price">
                <span className="price-label">Cena</span>
                <div className="price-value">
                  <Coins size={14} color="#f79824" /> {it.priceCoins}
                  <DollarSign size={14} color="#39FF14"/> {it.priceCash}
                </div>
                <button className="buy-btn">
                  <PackageCheck size={14}/> Kup
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ShopScreen;
