import React, { useState, useMemo } from 'react';
import {
  PackageCheck, Swords, Gem, Boxes,
  Coins, DollarSign
} from 'lucide-react';
import '../Shop/css/ShopScreen.css'; // stylizacja komponentu
import '../Profile/css/PlayerProfile.css'; // wspólne style

/* ------------------------------------------------------------------ */
/*  typy                                                               */
/* ------------------------------------------------------------------ */
type Tab = 'bronie' | 'artefakty';

type WeaponStats   = { min:number; max:number; ammo:number; reload:number; fireInt:number };
type ArtifactStats = { hp:number; armor:number; cooldown:number };

interface Item<T = unknown>{
  id:number;
  name:string;
  stats:T;
  price:number;
  cat:string;
}

const CATEGORIES = [
  { key:'smg',   label:'Pistolety maszynowe', icon:<Swords size={18}/> },
  { key:'rifle', label:'Karabiny',            icon:<Swords size={18}/> },
  { key:'sniper',label:'Karabiny snajp.',     icon:<Swords size={18}/> },
  { key:'melee', label:'Broń biała',          icon:<Swords size={18}/> },
];


const ShopScreen:React.FC = () => {
  const [tab,setTab] = useState<Tab>('bronie');
  const [category,setCategory] = useState('smg');
  const weapons:Item<WeaponStats>[] = Array.from({length:22}).map((_,i)=>({
    id:i,
    name:`Pistolet #${i+1}`,
    cat: CATEGORIES[i% CATEGORIES.length].key,
    stats:{ min:20+i*2, max:40+i*2, ammo:15+i,
            reload:+(0.4+i*0.05).toFixed(1),
            fireInt:+(0.18+i*0.01).toFixed(2) },
    price:300+i*60
  }));

  const artifacts:Item<ArtifactStats>[] = Array.from({length:8}).map((_,i)=>({
    id:i,
    name:`Artefakt #${i+1}`,
    cat:'artefakt',
    stats:{ hp:50+i*10, armor:5+i*2, cooldown:+(3-i*0.1).toFixed(1)},
    price:650+i*120
  }));

  const list = tab==='bronie' ? weapons : artifacts;

  const filtered = useMemo(()=>(
    tab==='bronie'
      ? list.filter(it=>it.cat===category)
      : list
  ),[list,tab,category]);

  const renderStats = (it:Item) =>{
    if(tab==='bronie'){
      const s=it.stats as WeaponStats;
      return (
        <>
          <span>Min DMG:</span><span>{s.min}</span>
          <span>Max DMG:</span><span>{s.max}</span>
          <span>Amunicja:</span><span>{s.ammo}</span>
          <span>Przeład.:</span><span>{s.reload}s</span>
          <span>Interw.:</span><span>{s.fireInt}s</span>
        </>
      );}
    const s=it.stats as ArtifactStats;
    return (
      <>
        <span>HP +</span><span>{s.hp}</span>
        <span>Pancerz +</span><span>{s.armor}</span>
        <span>CD:</span><span>{s.cooldown}s</span>
      </>
    );
  };

  return(
    <div className="profile-root">     
      <aside className="profile-left">

        <section className="card shop-cat-card">
          <h4>Kategorie</h4>

          <ul className="cat-list">
            {CATEGORIES.map(cat=>(
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
          {filtered.map(it=>(
            <div key={it.id} className="item-card">
              <div className="item-thumb">
                <img src="https://dummyimage.com/600x400/000/fff"/>
              </div>

              <div className="item-stats">
                <div className="stats-grid">{renderStats(it)}</div>
              </div>

              <div className="item-price">
                <span className="price-label">Cena</span>
                <div className="price-value">
                  <Coins size={14} color="#f79824" /> {it.price}
                  <DollarSign size={14} color="#39FF14"/> {it.price}
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
