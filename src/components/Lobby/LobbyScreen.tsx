import React, { useState } from 'react';
import './css/LobbyScreen.css';
import LobbyHeader from './LobbyHeader';
import { CirclePlay } from 'lucide-react';
import LobbyNav from './LobbyNav';

interface LobbyScreenProps {
  onStartGame: () => void;
  onLogout: () => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ onStartGame, onLogout }) => {
  const [activeSection, setActiveSection] = useState<'rozgrywki' | 'profil' | 'sklep' | 'liderzy' | 'ustawienia'>('rozgrywki');

  const handleNavigate = (section: string) => {
    // Można tu w przyszłości przełączać widoki
    setActiveSection(section as any);
    console.log('Nawigacja do:', section);
  };

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
      <main className="lobby-main">
        <aside className="left-sidebar">
          <section className="sidebar-section">
            <h2>SZYBKIE AKCJE</h2>
            <button className="action-btn quick-play" onClick={onStartGame}>▷ SZYBKA GRA</button>
            <button className="action-btn create-room">+ STWÓRZ POKÓJ</button>
            <button className="action-btn join-room">DOŁĄCZ DO GRY</button>
          </section>

          <section className="sidebar-section">
            <h2>TRYBY GRY</h2>
            <ul className="game-modes">
              <li className="active">Deathmatch</li>
              <li>Team Deathmatch</li>
              <li>King of the Hill</li>
            </ul>
          </section>

          <section className="sidebar-section">
            <h2>OSTATNIA AKTYWNOŚĆ</h2>
            <ul className="activity-feed">
              {recentActivities.map((activity, index) => (
                <li key={index}>
                  <span className="activity-icon">{activity.icon}</span>
                  {activity.text}
                </li>
              ))}
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
              <span>Zdjęcie mapy</span>
            </div>
            <button className="change-map-btn">Zmień mapę</button>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default LobbyScreen;
