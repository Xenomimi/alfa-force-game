import React, { useEffect, useState, useRef, RefObject } from 'react';
import './css/LobbyScreen.css';
import LobbyHeader from './LobbyHeader';
import {
  CirclePlay, Play, Plus, Users
  , Crosshair, Flag, Crown, Clock, Coins, Skull
} from 'lucide-react';
import LobbyNav from './LobbyNav';
import PlayerProfile from '../Profile/PlayerProfile';
import ShopScreen from '../Shop/ShopScreen';
import LeadersScreen from '../Ranking/LeadersScreen';
import Settings from '../Settings/Settings';
import { Client, Room, RoomAvailable } from 'colyseus.js';
import { UserData } from '../App';

export type Section = 'rozgrywki' | 'profil' | 'sklep' | 'liderzy' | 'ustawienia';

interface LobbyScreenProps {
  userData: UserData | null;
  client: Client | null;
  onStartGame: (room: Room) => void;
  onLogout: () => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ userData, client, onStartGame, onLogout }) => {
  const [activeSection, setActiveSection] = useState('rozgrywki');
  const [rooms, setRooms] = useState<any[]>([]);
  const [connStatus, setConnStatus] = useState('Brak połączenia');
  const lobby = useRef<Room | null>(null);
  const joinedRoom = useRef<Room | null>(null);
  const [numberOfPlayers, setNumberOfPlayers] = useState(null);

  const activeGames = [
    { name: 'Industrial Zone', mode: 'Deathmatch', players: '8/12', ping: '45ms' },
    { name: 'Desert Storm', mode: 'Deathmatch', players: '6/10', ping: '67ms' },
    { name: 'Urban Warfare', mode: 'Deathmatch', players: '10/12', ping: '89ms' },
    { name: 'Sniper Valley', mode: 'Deathmatch', players: '3/8', ping: '23ms' },
    { name: 'City Ruins', mode: 'Deathmatch', players: '4/10', ping: '155ms' },
  ];


  const handleNavigate = (s: Section) => {
    setActiveSection(s);
    console.log(`Nawigacja do sekcji: ${s}`);
  }

  const createRoom = async () => {
    if (!lobby) return;
    try {
      const newRoom = await client!.create("player_room", { map: "Industrial Zone" });
      onStartGame(newRoom);
      
    } catch (err) {
      console.error("Błąd przy tworzeniu pokoju:", err);
    }
  }

  const joinRoom = async (roomId: string) => {
    try {
      joinedRoom.current = await client!.joinById(roomId);
      onStartGame(joinedRoom.current);
    } catch (err) {
      console.error("Błąd przy dołączaniu do pokoju:", err);
    }
  }

  const connect = async () => {
    try {
      // tworzenie lobby
      if (!lobby.current) {
        lobby.current = await client!.joinOrCreate("lobby");
      }
        
      // nasłuchiwanie eventów
      lobby.current!.onMessage("rooms", (rooms: any[]) => {
        setRooms(rooms);
        setConnStatus("Połączono z serwerem");
      });
      lobby.current!.onMessage("+", ([roomId, room]) => {
        setRooms((prev) => {
          const exists = prev.find((r) => r.roomId === roomId);
          if (exists) {
            // update istniejącego pokoju
            return prev.map((r) =>
              r.roomId === roomId ? { roomId, ...room } : r
            );
          } else {
            // dodaj nowy
            return [...prev, { roomId, ...room }];
          }
        });
      });
      lobby.current!.onMessage("-", (roomId) => {
        setRooms((prev) => prev.filter((r) => r.roomId !== roomId))
      });
      lobby.current!.onMessage("numberOfPlayers", (data) => setNumberOfPlayers(data.message));
    } 
    catch (err) {
      console.error("LOBBY SCREEN❌ Błąd przy łączeniu z lobby:", err);
      return;
    }
  }

  useEffect(() => {
      connect();

      return () => {
        lobby.current?.removeAllListeners();
        lobby.current?.leave();
        lobby.current = null;
      };
  }, []);

  return (
    <div className="lobby-container">
      <LobbyHeader userData={userData} onLogout={onLogout}/>
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
              <button className="action-btn quick-play" onClick={createRoom}><Play size={24} /> SZYBKA GRA</button>
              <button className="action-btn create-room"><Plus size={24} /> STWÓRZ POKÓJ</button>
              <button className="action-btn join-room"><Users size={24} color='#39FF14' /> DOŁĄCZ DO GRY</button>
            </section>

            <section className="sidebar-section">
              <h2>TRYBY GRY</h2>

              <ul className="game-modes">
                <li className="active">
                  <span className="mode-icon"><Crosshair size={18} /></span>
                  <div className="mode-text">
                    <span className="mode-title">Deathmatch</span>
                    <span className="mode-desc">Klasyczna rozgrywka FFA</span>
                  </div>
                </li>

                <li>
                  <span className="mode-icon"><Flag size={18} /></span>
                  <div className="mode-text">
                    <span className="mode-title">Team Deathmatch</span>
                    <span className="mode-desc">Walka drużynowa</span>
                  </div>
                </li>

                <li>
                  <span className="mode-icon"><Crown size={18} /></span>
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
                  <span className="act-icon"><Clock size={16} /></span>
                  <div className="act-text">
                    <span className="act-title">Awans na poziom&nbsp;11</span>
                    <span className="act-time">2&nbsp;minuty temu</span>
                  </div>
                </li>

                <li className="orange">
                  <span className="act-icon"><Coins size={16} /></span>
                  <div className="act-text">
                    <span className="act-title">Zdobyto&nbsp;500 monet</span>
                    <span className="act-time">15&nbsp;min temu</span>
                  </div>
                </li>

                <li className="red">
                  <span className="act-icon"><Skull size={16} /></span>
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
                <button onClick={() => createRoom} className="play-now-btn"> <CirclePlay style={{ margin: 6 }} /> ZAGRAJ TERAZ</button>
              </div>
            </div>

            <div className="active-games-section">
              <div className="section-header">
                <h2>AKTYWNE GRY</h2>
                <span>Odśwież</span>
              </div>
                <ul className="games-list">
                  {rooms.length > 0 ? (
                    console.log("ROOMS TO RENDER:", rooms),
                    rooms.map((room, index) => (
                      <li key={index} className="game-item">
                        <span className="map-name">{room.name}</span>
                        <span className="map-name">{room.roomId}</span>
                        {/* <span className="map-name">{Object.keys(room)}</span> */}
                        <button onClick={() => joinRoom(room.roomId)} className="join-btn">DOŁĄCZ</button>
                      </li>
                    ))
                  ) : (
                    activeGames.map((game, index) => (
                      <li key={index} className="game-item">
                        <span className="map-name">{game.name}</span>
                        <span className="game-mode">{game.mode}</span>
                        <span className="player-count">{game.players}</span>
                        <span className="ping">{game.ping}</span>
                        <button onClick={() => console.log("Rozpoczęto grę")} className="join-btn">DOŁĄCZ</button>
                      </li>
                    ))
                  )}
                </ul>
            </div>
          </section>

          <aside className="right-sidebar">
            <div className="map-preview">
              <h3>Status: <p style={{ color: connStatus != 'Brak połączenia' ? 'green': 'red'}}>{connStatus}</p></h3>
            </div>
            <div className="map-preview">
              <h3>Gracze online: 
                <p style={{ color:'green', fontSize: 40}}>
                  {numberOfPlayers + rooms.reduce((sum, room) => sum + (room.clients || 0), 0)}
                </p>
              </h3>
            </div>
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
