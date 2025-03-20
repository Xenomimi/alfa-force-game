const players = {};

export function handleSocketConnection(io, socket) {
    // Stałe wartości początkowe pozycji gracza
    const startX = 850;
    const startY = 300;

    // Dodaj nowego gracza
    players[socket.id] = {
        id: socket.id,
        x: startX,
        y: startY,
        playerName: socket.id,
        handX: 0,
        handY: 0,
        health: 100,
        leftThighAngle: 0,
        rightThighAngle: 0,
        legPhase: 0,
        isAlive: true,
        headHitbox: { x: startX, y: startY },
        torsoHitbox: { x: startX, y: startY + 12 },
        legHitbox: { x: startX, y: startY + 12 + 37 - 12 }
    };

    // Wyślij nowemu graczowi informacje o wszystkich graczach i hoście
    io.emit('current_players', players);

    // Obsługa ruchu gracza
    socket.on('player_move', (data) => {
        if (players[socket.id]) {
            players[socket.id] = {
                ...players[socket.id],
                x: data.x,
                y: data.y,
                leftThighAngle: data.leftThighAngle,
                rightThighAngle: data.rightThighAngle,
                legPhase: data.legPhase,
                headHitbox: { x: data.headHitbox.x, y: data.headHitbox.y },
                torsoHitbox: { x: data.torsoHitbox.x, y: data.torsoHitbox.y },
                legHitbox: { x: data.legHitbox.x, y: data.legHitbox.y }
            };

            socket.broadcast.emit('update_position', players[socket.id]);
        }
    });

    socket.on('player_mouse_move', (data) => {
        if (players[socket.id]) {
            players[socket.id] = {
                ...players[socket.id],
                handX: data.handX,
                handY: data.handY
            };

            socket.broadcast.emit('update_mouse_position', players[socket.id]);
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
    
            // Wyemituj zdarzenie usunięcia pocisku na podstawie bulletPlayerId
            io.emit('bullet_removed', { playerId: bulletPlayerId });
        }
    });

    socket.on('health_update', (data) => {
        if (players[data.playerId]) {
            players[data.playerId].health = data.health;
            
            // Przekaż aktualizację do wszystkich graczy
            io.emit('player_health_update', {
                playerId: data.playerId,
                health: data.health
            });
        }
    });

    socket.on('player_respawn', (data) => {
        if (players[data.playerId]) {
            players[data.playerId].health = 100;
            players[data.playerId].isAlive = true;
            players[data.playerId].x = data.x;
            players[data.playerId].y = data.y;
            players[data.playerId].leftThighAngle = 0;
            players[data.playerId].rightThighAngle = 0;
            players[data.playerId].legPhase = 0;
            players[data.playerId].headHitbox = { x: data.x, y: data.y };    
            players[data.playerId].torsoHitbox = { x: data.x, y: data.y + 12 };    
            players[data.playerId].legHitbox = { x: data.x, y: data.y + 12 + 37 - 12 };

            io.emit('player_respawned', {
                playerId: data.playerId,
                x: data.x,
                y: data.y,
                health: 100,
                isAlive: true,
                leftThighAngle: 0,
                rightThighAngle: 0,
                legPhase: 0,
                headHitbox: { x: data.x, y: data.y },
                torsoHitbox: { x: data.x, y: data.y + 12 },
                legHitbox: { x: data.x, y: data.y + 12 + 37 - 12 }
            });
        }
    });

    socket.on('player_death', (data) => {
        const { playerId, killerId, deathTime } = data;
        if (players[playerId]) {
            players[playerId].isAlive = false;
            players[playerId].health = 0;
            // Rozesłanie zdarzenia śmierci do wszystkich graczy
            io.emit('player_died', {
                playerId: playerId,
                killerId: killerId,
                deathTime: deathTime
            });
        }
    });

    // Obsługa rozłączenia gracza
    socket.on('disconnect', () => {
        console.log(`Player ${socket.id} disconnected`);
        delete players[socket.id];
        io.emit('player_disconnected', { id: socket.id });
    });
}
