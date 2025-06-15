import React, { useState } from 'react';
import './css/Settings.css';
import { Save, RotateCw } from 'lucide-react';

const Settings: React.FC = () => {
  /* ↓ tylko podglądowe stany – prawdziwą logikę podłączysz później */
  const [nick,        setNick]        = useState('NazwaGracza');
  const [email,       setEmail]       = useState('user@mail.com');
  const [soundVol,    setSoundVol]    = useState(60);
  const [musicVol,    setMusicVol]    = useState(50);
  const [crosshair,   setCrosshair]   = useState('#ffffff');
  const [controls,    setControls]    = useState({
    left:  'A',   right: 'D',   jump: 'Space',
    crouch:'Ctrl',crawl: 'C',   reload:'R',   nade:'G',
  });

  /* ─ helpers ─────────────────────────────────────────── */
  const handleKeyChange = (key: keyof typeof controls, value:string) =>
    setControls(prev => ({ ...prev, [key]: value.toUpperCase() }));

  const resetDefaults = () => {
    setSoundVol(60); setMusicVol(50);
    setCrosshair('#ffffff');
    setControls({ left:'A', right:'D', jump:'Space',
                  crouch:'Ctrl', crawl:'C', reload:'R', nade:'G' });
  };

  /* ─ JSX ─────────────────────────────────────────────── */
  return (
    <div className="settings-root">
      {/* ◄◄ Ustawienia konta */}
      <section className="settings-card account-box">
        <h3>Ustawienia konta</h3>

        <label>Nick
          <input value={nick} onChange={e=>setNick(e.target.value)} />
        </label>

        <label>E-mail
          <input type="email"
                 value={email}
                 onChange={e=>setEmail(e.target.value)} />
        </label>

        <label>Aktualne hasło
          <input type="password" placeholder="••••••••" />
        </label>

        <label>Nowe hasło
          <input type="password" />
        </label>

        <label>Powtórz hasło
          <input type="password" />
        </label>
      </section>

      {/* ◄◄ Audio & celownik */}
      <section className="settings-card audio-box">
        <h3>Ustawienia dźwięku</h3>

        <div className="slider-row">
          <span>Efekty</span>
          <input type="range" min={0} max={100}
                 value={soundVol}
                 onChange={e=>setSoundVol(+e.target.value)} />
          <span>{soundVol}%</span>
        </div>

        <div className="slider-row">
          <span>Muzyka</span>
          <input type="range" min={0} max={100}
                 value={musicVol}
                 onChange={e=>setMusicVol(+e.target.value)} />
          <span>{musicVol}%</span>
        </div>

        <div className="crosshair-row">
          <span>Celownik</span>
          <input type="color" value={crosshair}
                 onChange={e=>setCrosshair(e.target.value)} />
        </div>
      </section>

      {/* ◄◄ Sterowanie */}
      <section className="settings-card controls-box">
        <h3>Ustawienia sterowania</h3>

        {Object.entries(controls).map(([key,val])=>(
          <div key={key} className="control-row">
            <span>{{
              left:'Lewo', right:'Prawo', jump:'Skok',
              crouch:'Kucnięcie', crawl:'Czołganie',
              reload:'Przeładowanie', nade:'Rzut granatem'
            }[key as keyof typeof controls]}</span>

            <input value={val}
                   onChange={e=>handleKeyChange(key as any, e.target.value)}
                   maxLength={10}/>
          </div>
        ))}

        <div className="controls-buttons">
          <button className="settings-btn save">
            <Save size={16}/> Zapisz
          </button>
          <button className="settings-btn reset"
                  onClick={resetDefaults}>
            <RotateCw size={16}/> Reset
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
