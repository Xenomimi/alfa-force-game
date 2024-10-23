// import { createContext, useEffect, useContext, useState, ReactNode } from "react";
// import { io } from "socket.io-client";

// // Tworzenie kontekstu gry
// const GameContext = createContext<any>(null);

// export const useGame = () => useContext(GameContext);

// // Typ propsów dla komponentu GameProvider
// interface GameProviderProps {
//     children: ReactNode; // Definiujemy typ dla children
// }

// export const StatsProvider: React.FC<GameProviderProps> = ({ children }) => {
//     const [gameData, setGameData] = useState({
//         playerPosition: { x: 400, y: 300 },
//         otherPlayers: {}, // Możesz przechowywać dane o innych graczach
//         mousePosition: { x: 0, y: 0 }
//     });

//     // Możesz tutaj dodać aktualizację stanu na podstawie danych z socketów
//     useEffect(() => {
//         // Załaduj dane z gry, np. przez sockety
//         const socket = io('http://localhost:3000');
//         socket.on('update_position', (data) => {
//             setGameData(prevData => ({
//                 ...prevData,
//                 playerPosition: { x: data.x, y: data.y }
//             }));
//         });

//         socket.on('update_hand', (data) => {
//             setGameData(prevData => ({
//                 ...prevData,
//                 mousePosition: { x: data.handX, y: data.handY }
//             }));
//         });
//     }, []);

//     return (
//         <GameContext.Provider value={gameData}>
//             {children}
//         </GameContext.Provider>
//     );
// };