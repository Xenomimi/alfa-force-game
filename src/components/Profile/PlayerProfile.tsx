import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Save,
  PackageCheck, Swords, Gem, Coins, DollarSign
} from 'lucide-react';
import './css/PlayerProfile.css';
import { UserData } from '../App.tsx';

// --- TYPY DANYCH ---
type WeaponStats = { min_damage: number; max_damage: number; amunition: number; reloadTime: number; fireInterval: number, accuracy: number };
type ArtifactStats = { bonusType: string; bonusValue: number };
type UserStats = { health: number; armor: number; strength: number; agility: number; intelligence: number; accuracy: number };

// Typ przedmiotu zgodny z tym co zwraca nowy endpoint /user/inventory
type Item<T = WeaponStats | ArtifactStats> = {
  id: number;          // ID broni
  name: string;
  description?: string;
  stats: T;
  priceCoins: number;
  priceCash: number;
  category: string;
}

export interface PlayerProfileProps {
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
  }
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ userData }) => {
  const [tab, setTab] = useState<'bronie' | 'artefakty'>('bronie');
  
  // Dane pobierane z serwera
  const [inventoryWeapons, setInventoryWeapons] = useState<Item<WeaponStats>[]>([]);
  const [artifacts, setArtifacts] = useState<Item<ArtifactStats>[]>([]); // Placeholder na przyszłość
  const [userStats, setUserStats] = useState<UserStats>({ health: 0, armor: 0, strength: 0, agility: 0, intelligence: 0, accuracy: 0 });
  const [userInfo, setUserInfo] = useState<PlayerInfo | null>(null);

  // Stan modala sprzedaży
  const [sellItem, setSellItem] = useState<Item | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- POBIERANIE DANYCH ---
  const refreshProfileData = useCallback(async () => {
    try {
        const [invRes, statsRes, infoRes] = await Promise.all([
            fetch("http://localhost:4000/user/inventory", { credentials: "include" }),
            fetch("http://localhost:4000/user/playerstats", { credentials: "include" }),
            fetch("http://localhost:4000/user/playerinfo", { credentials: "include" })
        ]);

        if (invRes.ok) {
            const items: Item<WeaponStats>[] = await invRes.json();
            setInventoryWeapons(items);
        }
        if (statsRes.ok) setUserStats(await statsRes.json());
        if (infoRes.ok) setUserInfo(await infoRes.json());

    } catch (err) {
        console.error("Błąd odświeżania danych profilu:", err);
    }
  }, []);

  // Pobierz dane przy montowaniu komponentu
  useEffect(() => {
    refreshProfileData();
  }, [refreshProfileData]);


  // --- LOGIKA SPRZEDAŻY ---
  const handleSellClick = (item: Item) => {
    setSellItem(item);
  };

  const confirmSell = async () => {
    if (!sellItem || !userInfo || isProcessing) return;
    setIsProcessing(true);

    try {
      const res = await fetch("http://localhost:4000/shop/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: userInfo.profile.userId, // Używamy ID z pobranego profilu
          itemId: sellItem.id              // ID broni
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Błąd sprzedaży");

      if (data.success) {
        alert(`Sukces! Sprzedano: ${sellItem.name}`);
        setSellItem(null);
        // KLUCZOWE: Odświeżamy dane (ekwipunek i stan konta) po sprzedaży
        await refreshProfileData();
        
        // Opcjonalnie: wymuszenie przeładowania całej strony, aby zaktualizować LobbyHeader (pieniądze na górze)
        // window.location.reload(); 
      }
    } catch (err: any) {
      alert("Wystąpił błąd: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- POMOCNICZE ---
  const renderWeaponStats = (item: Item) => {
    const s = item.stats as WeaponStats;
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
  };

  const renderPlayerStats = (it: UserStats) => (
    <>
      <span>Zdrowie:</span><span>{it.health}</span>
      <span>Pancerz:</span><span>{it.armor}</span>
      <span>Siła:</span><span>{it.strength}</span>
      <span>Zręczność:</span><span>{it.agility}</span>
      <span>Inteligencja:</span><span>{it.intelligence}</span>
      <span>Celność:</span><span>{it.accuracy}</span>
    </>
  );

  // Lista do wyświetlenia w zależności od taba
  const currentList = tab === 'bronie' ? inventoryWeapons : artifacts;

  if (!userInfo) return <div className="loading">Ładowanie profilu...</div>;

  return (
    <div className="profile-root">
      
      {/* LEWA STRONA: STATYSTYKI GRACZA */}
      <aside className="profile-left">
        <section className="card player-card">
          <div className="avatar">
            <img 
              src={`https://placehold.co/100x100/2C2F33/FFFFFF/png?text=${userInfo.username.substring(0,2).toUpperCase()}`} 
              alt="Avatar"
            />
          </div>
          <h1 className="player-name">
            {userInfo.username}
            <div>
              <span style={{ fontSize: '13px', color: '#fff', background: '#2C2F33', padding: '2px 6px', borderRadius: 4 }}>
                KDR: {userInfo.profile.totalDeaths > 0 ? (userInfo.profile.totalKills / userInfo.profile.totalDeaths).toFixed(2) : userInfo.profile.totalKills}
              </span>
            </div>
          </h1>
          
          <div className="stats-mini">
            <div><span>Poziom</span><strong>{userInfo.profile.level}</strong></div>
            <div><span>EXP</span><strong>{userInfo.profile.experience}</strong></div>
          </div>

          <div className="big-placeholder">
            <div className="item-stats">
              <div className="stats-grid">{renderPlayerStats(userStats)}</div>
            </div>
          </div>
          
          <div style={{marginTop: 20}}>
            <h4>Statystyki ogólne</h4>
          </div>
          <div className="big-placeholder">
            <div className="stats-grid">
              <span>Zabójstwa:</span><span>{userInfo.profile.totalKills}</span>
              <span>Zgony:</span><span>{userInfo.profile.totalDeaths}</span>
            </div>
          </div>
        </section>

        {/* MIEJSCE NA LOGIKĘ ZAKŁADANIA PRZEDMIOTÓW (PLACEHOLDER) */}
        <section className="card equip-card">
          <h4>Wyposażenie (Wkrótce)</h4>
          <div className="equip-grid">
             {['Art1', 'Art2', 'Art3', 'Art4', 'Art5', 'Art6'].map((txt, i) => (
              <button key={txt} className="art-slot">{txt}</button>
             ))}
             <div className="character-preview">
                <img width={120} src="/player.png" alt="Preview"/>
             </div>
          </div>
        </section>
      </aside>

      {/* PRAWA STRONA: LISTA PRZEDMIOTÓW (EKWIPUNEK) */}
      <section className="profile-right card">
        <div className="tabs">
          <button className={`tab ${tab === 'bronie' ? 'active' : ''}`} onClick={() => setTab('bronie')}>
            <Swords size={14}/> Twoje Bronie
          </button>
          <button className={`tab ${tab === 'artefakty' ? 'active' : ''}`} onClick={() => setTab('artefakty')}>
            <Gem size={14}/> Twoje Artefakty
          </button>
        </div>

        <div className="item-list">
          {currentList.length === 0 && <div style={{padding: 20, color: '#aaa', textAlign:'center'}}>Pusty ekwipunek.</div>}
          
          {currentList.map((item, index) => (
            // Klucz: id (weaponId) + index, bo mogą być duplikaty tej samej broni
            <div key={`${item.id}-${index}`} className="item-card">
              <div className="item-thumb">
                <img 
                  src={`/weapons/${item.id}.png`} 
                  alt={item.name} 
                  onError={(e)=>e.currentTarget.src='https://placehold.co/100x50?text=No+Img'}
                />
              </div>

              <div className="item-stats">
                <div className="stats-grid">
                  {tab === 'bronie' ? renderWeaponStats(item) : <span>Artefakt</span>}
                </div>
              </div>

              <div className="item-price">
                <span className="price-label">Wartość sprzedaży</span>
                <div className="price-value">
                  <Coins size={14} color="#f79824" /> {Math.floor(item.priceCoins * 0.5)}
                  <DollarSign size={14} color="#39FF14"/> {Math.floor(item.priceCash * 0.5)}
                </div>
                
                {tab === 'bronie' && (
                  <button className="sell-btn" onClick={() => handleSellClick(item)}>
                    <PackageCheck size={14} /> Sprzedaj
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ▬▬▬▬▬ MODAL POTWIERDZENIA SPRZEDAŻY ▬▬▬▬▬ */}
      {sellItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Potwierdź sprzedaż</h3>
            <div className="item-thumb" style={{ background: 'var(--bg-dark-tertiary)', marginTop: 10 }}>
              <img src={`/weapons/${sellItem.id}.png`} alt="" style={{ height: 80, objectFit: 'contain' }} />
            </div>
            <div className="modal-item-name">{sellItem.name}</div>

            <div className="modal-cost">
              <span>Otrzymasz (50% ceny zakupu):</span>
              <div className="sell-price-row" style={{display: 'flex', justifyContent: 'center', gap: 10, color: '#39FF14', fontWeight: 'bold', fontSize: 18, marginTop: 5}}>
                <div style={{display:'flex', alignItems:'center'}}><Coins size={18} color="#f79824" /> +{Math.floor(sellItem.priceCoins * 0.5)}</div>
                <div style={{display:'flex', alignItems:'center'}}><DollarSign size={18} color="#39FF14" /> +{Math.floor(sellItem.priceCash * 0.5)}</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#aaa', marginTop: 15 }}>Tej operacji nie można cofnąć.</p>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setSellItem(null)}>Anuluj</button>
              <button className="btn-confirm" onClick={confirmSell} disabled={isProcessing}>
                {isProcessing ? "Przetwarzanie..." : "Potwierdź"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerProfile;