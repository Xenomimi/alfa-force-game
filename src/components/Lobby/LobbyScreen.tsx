import React, { useState } from 'react';
import './css/LobbyScreen.css';
import LobbyHeader from './LobbyHeader';
import { CirclePlay, Play, Plus, Users
  , Crosshair, Flag, Crown, Clock, Coins, Skull
 } from 'lucide-react';
import LobbyNav from './LobbyNav';
import PlayerProfile  from '../Profile/PlayerProfile';
import ShopScreen from '../Shop/ShopScreen';
import LeadersScreen from '../Ranking/LeadersScreen';
import Settings from '../Settings/Settings';

export type Section = 'rozgrywki' | 'profil' | 'sklep' | 'liderzy' | 'ustawienia';

interface LobbyScreenProps {
  onStartGame: () => void;
  onLogout: () => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ onStartGame, onLogout }) => {
  const [activeSection, setActiveSection] = useState('rozgrywki');

  const handleNavigate = (s: Section) => {
    setActiveSection(s);
    console.log(`Nawigacja do sekcji: ${s}`);
  }

  const activeGames = [
    { name: 'Industrial Zone', mode: 'Deathmatch', players: '8/12', ping: '45ms' },
    { name: 'Desert Storm', mode: 'Deathmatch', players: '6/10', ping: '67ms' },
    { name: 'Urban Warfare', mode: 'Deathmatch', players: '10/12', ping: '89ms' },
    { name: 'Sniper Valley', mode: 'Deathmatch', players: '3/8', ping: '23ms' },
    { name: 'City Ruins', mode: 'Deathmatch', players: '4/10', ping: '155ms' },
  ];

  const recentActivities = [
    { icon: '🏆', text: 'Awans na poziom 11' },
    { icon: '💰', text: 'Zdobyto 100 monet' },
    { icon: '💀', text: 'Pokonano 5 przeciwników' },
  ];

  return (
    <div className="lobby-container">
      <LobbyHeader onLogout={onLogout}/>
      <LobbyNav active={activeSection} onNavigate={handleNavigate} />

      {activeSection === 'profil' ? (
        <PlayerProfile />
      ) : activeSection === 'sklep' ? (
        <ShopScreen />
      ) : activeSection === 'liderzy' ? (
        <LeadersScreen />
      ) : activeSection === 'ustawienia' ? (
        <Settings />
      ) : (
      

      <main className="lobby-main">
        <aside className="left-sidebar">
          <section className="sidebar-section">
            <h2>SZYBKIE AKCJE</h2>
            <button className="action-btn quick-play" onClick={onStartGame}><Play size={24}/> SZYBKA GRA</button>
            <button className="action-btn create-room"><Plus size={24}/> STWÓRZ POKÓJ</button>
            <button className="action-btn join-room"><Users size={24} color='#39FF14'/> DOŁĄCZ DO GRY</button>
          </section>

          <section className="sidebar-section">
            <h2>TRYBY GRY</h2>

            <ul className="game-modes">
              <li className="active">
                <span className="mode-icon"><Crosshair size={18}/></span>
                <div className="mode-text">
                  <span className="mode-title">Deathmatch</span>
                  <span className="mode-desc">Klasyczna rozgrywka FFA</span>
                </div>
              </li>

              <li>
                <span className="mode-icon"><Flag size={18}/></span>
                <div className="mode-text">
                  <span className="mode-title">Team Deathmatch</span>
                  <span className="mode-desc">Walka drużynowa</span>
                </div>
              </li>

              <li>
                <span className="mode-icon"><Crown size={18}/></span>
                <div className="mode-text">
                  <span className="mode-title">King of the Hill</span>
                  <span className="mode-desc">Kontrola punktu</span>
                </div>
              </li>
            </ul>
          </section>

          <section className="sidebar-section">
            <h2>OSTATNIA AKTYWNOŚĆ</h2>

            <ul className="activity-feed">
              <li className="green">
                <span className="act-icon"><Clock size={16}/></span>
                <div className="act-text">
                  <span className="act-title">Awans na poziom&nbsp;11</span>
                  <span className="act-time">2&nbsp;minuty temu</span>
                </div>
              </li>

              <li className="orange">
                <span className="act-icon"><Coins size={16}/></span>
                <div className="act-text">
                  <span className="act-title">Zdobyto&nbsp;500 monet</span>
                  <span className="act-time">15&nbsp;min temu</span>
                </div>
              </li>

              <li className="red">
                <span className="act-icon"><Skull size={16}/></span>
                <div className="act-text">
                  <span className="act-title">Pokonano 5 przeciwników</span>
                  <span className="act-time">1 godzina temu</span>
                </div>
              </li>
            </ul>
          </section>
        </aside>

        <section className="main-content">
          <div className="recommended-section">
            <div className="section-header">
              <h3>POLECANE</h3>
              <a href="#">Zobacz wszystkie →</a>
            </div>
            <div className="promo-banner">
              <div className="promo-text">
                <p>NOWA MAPA</p>
                <h2>INDUSTRIAL COMPLEX</h2>
              </div>
              <button onClick={onStartGame} className="play-now-btn"> <CirclePlay style={{margin: 6}}/> ZAGRAJ TERAZ</button>
            </div>
          </div>

          <div className="active-games-section">
            <div className="section-header">
              <h2>AKTYWNE GRY</h2>
              <span>Odśwież</span>
            </div>
            <ul className="games-list">
              {activeGames.map((game, index) => (
                <li key={index} className="game-item">
                  <span className="map-name">{game.name}</span>
                  <span className="game-mode">{game.mode}</span>
                  <span className="player-count">{game.players}</span>
                  <span className="ping">{game.ping}</span>
                  <button onClick={onStartGame} className="join-btn">DOŁĄCZ</button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="right-sidebar">
          <div className="map-preview">
            <h3>Nazwa załączonej mapy</h3>
            <div className="map-image-placeholder">
              <img src="https://dummyimage.com/282x182/000/fff" alt="Map Preview" />
            </div>
            <button className="change-map-btn">Zmień mapę</button>
          </div>
        </aside>
      </main>
      )}
    </div>
  );
};

export default LobbyScreen;
