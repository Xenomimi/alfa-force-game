import React, { useEffect, useState } from 'react';
import './css/Settings.css';
import { Save, RotateCw } from 'lucide-react';
import { UserData } from '../App.tsx';

interface SettingsProps {
  userData: UserData | null;
  onUserDataRefresh?: () => Promise<void> | void;
}

type ControlsState = {
  left: string;
  right: string;
  jump: string;
  crouch: string;
  crawl: string;
  reload: string;
  nade: string;
};

const DEFAULT_CONTROLS: ControlsState = {
  left: 'A',
  right: 'D',
  jump: 'SPACE',
  crouch: 'CTRL',
  crawl: 'C',
  reload: 'R',
  nade: 'G',
};

const CONTROL_STORAGE_KEY = 'controls';
const SOUND_VOLUME_KEY = 'soundVolume';
const MUSIC_VOLUME_KEY = 'musicVolume';

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const normalizeKeyLabel = (value: string) => {
  if (value === ' ') return 'SPACE';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();

  if (upper === 'SPACE' || upper === 'SPACEBAR') return 'SPACE';
  if (upper === 'CTRL' || upper === 'CONTROL') return 'CTRL';
  if (upper === 'SHIFT') return 'SHIFT';
  if (upper === 'ALT') return 'ALT';
  if (upper === 'ARROWLEFT' || upper === 'LEFT') return 'LEFT';
  if (upper === 'ARROWRIGHT' || upper === 'RIGHT') return 'RIGHT';
  if (upper === 'ARROWUP' || upper === 'UP') return 'UP';
  if (upper === 'ARROWDOWN' || upper === 'DOWN') return 'DOWN';
  if (upper === 'ESCAPE' || upper === 'ESC') return 'ESC';
  if (upper === 'ENTER' || upper === 'RETURN') return 'ENTER';
  if (upper === 'TAB') return 'TAB';
  if (upper === 'BACKSPACE') return 'BACKSPACE';
  if (upper === 'DELETE' || upper === 'DEL') return 'DELETE';

  if (upper.length === 1) return upper;
  return upper;
};

const normalizeControls = (input: Partial<ControlsState>): ControlsState => {
  const next = { ...DEFAULT_CONTROLS };
  (Object.keys(DEFAULT_CONTROLS) as Array<keyof ControlsState>).forEach((key) => {
    const value = input[key];
    if (typeof value === 'string') {
      const normalized = normalizeKeyLabel(value);
      if (normalized) {
        next[key] = normalized;
      }
    }
  });
  return next;
};

const loadStoredControls = () => {
  if (typeof window === 'undefined') return { ...DEFAULT_CONTROLS };
  try {
    const stored = localStorage.getItem(CONTROL_STORAGE_KEY);
    if (!stored) return { ...DEFAULT_CONTROLS };
    const parsed = JSON.parse(stored) as Partial<ControlsState>;
    return normalizeControls(parsed);
  } catch (err) {
    return { ...DEFAULT_CONTROLS };
  }
};

const loadStoredPercent = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  const value = raw ? Number(raw) : NaN;
  if (!Number.isFinite(value)) return fallback;
  return clampPercent(value);
};

const Settings: React.FC<SettingsProps> = ({ userData, onUserDataRefresh }) => {
  const [nick,        setNick]        = useState('');
  const [email,       setEmail]       = useState('');
  const [soundVol,    setSoundVol]    = useState(() => loadStoredPercent(SOUND_VOLUME_KEY, 60));
  const [musicVol,    setMusicVol]    = useState(() => loadStoredPercent(MUSIC_VOLUME_KEY, 50));
  const [crosshair,   setCrosshair]   = useState(() => {
    if (typeof window === 'undefined') return '#ffffff';
    return localStorage.getItem('crosshairColor') || '#ffffff';
  });
  const [controls,    setControls]    = useState<ControlsState>(() => loadStoredControls());
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.user) return;
    setNick(userData.user.username || '');
    setEmail(userData.user.email || '');
  }, [userData?.user?.username, userData?.user?.email]);

  /* ─ helpers ─────────────────────────────────────────── */
  const handleKeyChange = (key: keyof ControlsState, value: string) => {
    const normalized = normalizeKeyLabel(value);
    setControls(prev => ({ ...prev, [key]: normalized }));
  };

  const setCrosshairValue = (value: string) => {
    setCrosshair(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crosshairColor', value);
      window.dispatchEvent(new CustomEvent('crosshair-color-changed', { detail: value }));
    }
  };

  const resetDefaults = () => {
    const nextControls = { ...DEFAULT_CONTROLS };
    setSoundVol(60);
    setMusicVol(50);
    setCrosshairValue('#ffffff');
    setControls(nextControls);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONTROL_STORAGE_KEY, JSON.stringify(nextControls));
      localStorage.setItem(SOUND_VOLUME_KEY, String(60));
      localStorage.setItem(MUSIC_VOLUME_KEY, String(50));
      window.dispatchEvent(new CustomEvent('controls-changed', { detail: nextControls }));
      window.dispatchEvent(new CustomEvent('audio-settings-changed', { detail: { sound: 60, music: 50 } }));
    }
    setSaveError(null);
    setSaveSuccess('Ustawienia przywrocone.');
  };

  const persistLocalSettings = () => {
    const normalizedControls = normalizeControls(controls);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONTROL_STORAGE_KEY, JSON.stringify(normalizedControls));
      localStorage.setItem(SOUND_VOLUME_KEY, String(soundVol));
      localStorage.setItem(MUSIC_VOLUME_KEY, String(musicVol));
      window.dispatchEvent(new CustomEvent('controls-changed', { detail: normalizedControls }));
      window.dispatchEvent(new CustomEvent('audio-settings-changed', { detail: { sound: soundVol, music: musicVol } }));
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setSaveError(null);
    setSaveSuccess(null);

    persistLocalSettings();

    if (!userData?.user) {
      setSaveSuccess('Ustawienia zapisane.');
      return;
    }

    const trimmedNick = nick.trim();
    const trimmedEmail = email.trim();
    const wantsPasswordChange = newPassword.trim().length > 0 || repeatPassword.trim().length > 0;
    const hasNameChange = trimmedNick.length > 0 && trimmedNick !== userData.user.username;
    const hasEmailChange = trimmedEmail.length > 0 && trimmedEmail !== userData.user.email;

    if (trimmedNick.length === 0) {
      setSaveError('Nick jest wymagany.');
      return;
    }
    if (trimmedEmail.length === 0) {
      setSaveError('Email jest wymagany.');
      return;
    }

    if (wantsPasswordChange) {
      if (!currentPassword) {
        setSaveError('Aktualne haslo jest wymagane.');
        return;
      }
      if (newPassword !== repeatPassword) {
        setSaveError('Hasla nie sa takie same.');
        return;
      }
    }

    if (hasNameChange) {
      const cash = userData.user.profile?.cash ?? 0;
      if (cash < 5) {
        setSaveError('Za malo cashu na zmiane nazwy (5 wymagane).');
        return;
      }
    }

    if (!hasNameChange && !hasEmailChange && !wantsPasswordChange) {
      setSaveSuccess('Ustawienia zapisane.');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('http://localhost:4000/user/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: trimmedNick,
          email: trimmedEmail,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nie udalo sie zapisac ustawien konta.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
      setSaveSuccess('Ustawienia konta zapisane.');
      if (onUserDataRefresh) {
        await onUserDataRefresh();
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Nie udalo sie zapisac ustawien konta.');
    } finally {
      setIsSaving(false);
    }
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
          <input
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
          />
        </label>

        <label>Nowe hasło
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
        </label>

        <label>Powtórz hasło
          <input
            type="password"
            value={repeatPassword}
            onChange={e => setRepeatPassword(e.target.value)}
          />
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
                 onChange={e=>setCrosshairValue(e.target.value)} />
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
            }[key as keyof ControlsState]}</span>

            <input value={val}
                   onChange={e=>handleKeyChange(key as keyof ControlsState, e.target.value)}
                   maxLength={10}/>
          </div>
        ))}

        {(saveError || saveSuccess) && (
          <div className={`settings-status ${saveError ? 'error' : 'success'}`}>
            {saveError ?? saveSuccess}
          </div>
        )}

        <div className="controls-buttons">
          <button className="settings-btn save" onClick={handleSave} disabled={isSaving}>
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
