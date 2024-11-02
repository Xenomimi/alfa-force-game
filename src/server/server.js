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

    // Stałe wartości początkowe pozycji gracza
    const startX = 400;
    const startY = 300;

    // Dodaj nowego gracza
    players[socket.id] = {
        id: socket.id,
        x: startX,
        y: startY,
        handX: 0,
        handY: 0,
        health: 100,
        isAlive: true,
        legSwingDirection: 1,
        thighSwingAngle: 0,
        calfSwingAngle: 0,
        headHitbox: { x: startX, y: startY },
        torsoHitbox: { x: startX, y: startY + 12 },
        legHitbox: { x: startX, y: startY + 12 + 37 - 12 }
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
        isAlive: players[socket.id].isAlive,
        legSwingDirection: players[socket.id].legSwingDirection,
        thighSwingAngle: players[socket.id].thighSwingAngle,
        calfSwingAngle: players[socket.id].calfSwingAngle,
        headHitbox: players[socket.id].headHitbox,
        torsoHitbox: players[socket.id].torsoHitbox,
        legHitbox: players[socket.id].legHitbox
    });

    // Obsługa ruchu gracza
    socket.on('player_move', (data) => {
        if (players[socket.id]) {
            players[socket.id] = {
                ...players[socket.id],
                x: data.x,
                y: data.y,
                handX: data.handX,
                handY: data.handY,
                legSwingDirection: data.legSwingDirection,
                thighSwingAngle: data.thighSwingAngle,
                calfSwingAngle: data.calfSwingAngle,
                headHitbox: { x: data.headHitbox.x, y: data.headHitbox.y },
                torsoHitbox: { x: data.torsoHitbox.x, y: data.torsoHitbox.y },
                legHitbox: { x: data.legHitbox.x, y: data.legHitbox.y }
            };
    
            socket.broadcast.emit('update_position', players[socket.id]);
        }
    });

    socket.on('player_shoot', (data) => {
        socket.broadcast.emit('new_bullet', data);
    });

    socket.on('bullet_removed', (data) => {
        // Roześlij informację o usuniętym pocisku do innych graczy
        socket.broadcast.emit('bullet_removed', data);
    });

    socket.on('player_hit', (data) => {
        const { hitPlayerId, bulletPlayerId } = data;
        const hitPlayer = players[hitPlayerId];
        
        if (hitPlayer && hitPlayer.isAlive) {
            hitPlayer.health -= 10; // Przykładowa wartość obrażeń
            if (hitPlayer.health <= 0) {
                hitPlayer.health = 0;
                hitPlayer.isAlive = false;
            }
            
            io.emit('player_health_update', {
                playerId: hitPlayerId,
                health: hitPlayer.health,
                isAlive: hitPlayer.isAlive
            });
        }
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
            players[data.playerId].legSwingDirection = data.legSwingDirection;
            players[data.playerId].thighSwingAngle = data.thighSwingAngle;
            players[data.playerId].calfSwingAngle = data.calfSwingAngle;

            // Aktualizacja hitboxów przy respawnie
            players[data.playerId].headHitbox = { x: data.x, y: data.y };    
            players[data.playerId].torsoHitbox = { x: data.x, y: data.y + 12 };    
            players[data.playerId].legHitbox = { x: data.x, y: data.y + 12 + 37 - 12 };

            io.emit('player_respawned', {
                playerId: data.playerId,
                x: data.x,
                y: data.y,
                health: 100,
                isAlive: true,
                legSwingDirection: 1,
                thighSwingAngle: 0,
                calfSwingAngle: 0,
                headHitbox: { x: data.x, y: data.y },
                torsoHitbox: { x: data.x, y: data.y + 12 },
                legHitbox: { x: data.x, y: data.y + 12 + 37 - 12 }
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
