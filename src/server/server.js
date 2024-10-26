import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
}));

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const players = {};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Dodaj nowego gracza
    players[socket.id] = { 
        id: socket.id,
        x: 400, 
        y: 300,
        handX: 0,
        handY: 0,
        health: 100,
        isAlive: true
    };

    // Wyślij nowemu graczowi informacje o wszystkich graczach i hoście
    socket.emit('current_players', players);

    // Poinformuj pozostałych graczy o nowym graczu
    socket.broadcast.emit('new_player', { 
        id: socket.id, 
        x: players[socket.id].x, 
        y: players[socket.id].y,
        handX: players[socket.id].handX,
        handY: players[socket.id].handY,
        health: players[socket.id].health,
        isAlive: players[socket.id].isAlive
    });

    // Obsługa ruchu gracza
    socket.on('player_move', (data) => {
        if (players[socket.id]) {
            players[socket.id] = {
                ...players[socket.id],
                x: data.x, 
                y: data.y,
                handX: data.handX,
                handY: data.handY 
            };
            
            socket.broadcast.emit('update_position', { 
                id: socket.id, 
                x: data.x, 
                y: data.y,
                handX: data.handX,
                handY: data.handY 
            });
        }
    });

    socket.on('player_shoot', (data) => {
        // Roześlij informację o nowym pocisku do wszystkich innych graczy
        socket.broadcast.emit('new_bullet', {
            x: data.x,
            y: data.y,
            targetX: data.targetX,
            targetY: data.targetY,
            playerId: data.playerId
        });
    });

    socket.on('bullet_removed', (data) => {
        // Roześlij informację o usuniętym pocisku do innych graczy
        socket.broadcast.emit('bullet_removed', data);
    });

    socket.on('health_update', (data) => {
        if (players[data.playerId]) {
            players[data.playerId].health = data.health;
            players[data.playerId].isAlive = data.isAlive;
            
            // Przekaż aktualizację do wszystkich graczy
            io.emit('player_health_update', {
                playerId: data.playerId,
                health: data.health,
                isAlive: data.isAlive
            });
        }
    });

    socket.on('player_respawn', (data) => {
        if (players[data.playerId]) {
            players[data.playerId].health = 100;
            players[data.playerId].isAlive = true;
            players[data.playerId].x = data.x;
            players[data.playerId].y = data.y;

            io.emit('player_respawned', {
                playerId: data.playerId,
                x: data.x,
                y: data.y,
                health: 100,
                isAlive: true
            });
        }
    });

    // Obsługa rozłączenia gracza
    socket.on('disconnect', () => {
        console.log(`Player ${socket.id} disconnected`);
        delete players[socket.id];
        io.emit('player_disconnected', { id: socket.id });
    });
});

server.listen(3000, () => {
    console.log('Listening on *:3000');
});