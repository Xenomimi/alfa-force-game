import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';  // Dodaj CORS

const app = express();
const server = createServer(app);

// Skonfiguruj CORS, aby zezwalać na żądania z frontendowego portu
app.use(cors({
    origin: 'http://localhost:5173',  // Zdefiniuj dozwolony frontend
    methods: ['GET', 'POST'],         // Dozwolone metody
    credentials: true                 // Pozwól na przesyłanie ciasteczek, jeśli potrzebujesz
}));

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",  // Zdefiniuj dozwolony frontend dla Socket.IO
        methods: ["GET", "POST"]
    }
});

const players = {};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Dodaj nowego gracza
    players[socket.id] = { x: 400, y: 300 };

    // Wyślij nowemu graczowi pozycje wszystkich innych graczy
    socket.emit('current_players', players);

    // Poinformuj pozostałych graczy o nowym graczu
    socket.broadcast.emit('new_player', { id: socket.id, x: players[socket.id].x, y: players[socket.id].y });

    // Kiedy gracz się porusza, zaktualizuj jego pozycję i powiadom innych
    socket.on('player_move', (data) => {
        players[socket.id] = { x: data.x, y: data.y };
        io.emit('update_position', { id: socket.id, x: data.x, y: data.y });
    });

    // Kiedy gracz się rozłącza, usuń go z listy i powiadom innych
    socket.on('disconnect', () => {
        console.log(`Player ${socket.id} disconnected`);
        delete players[socket.id];
        io.emit('player_disconnected', { id: socket.id });
    });
});

server.listen(3000, () => {
    console.log('Listening on *:3000');
});
