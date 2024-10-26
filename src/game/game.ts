import { io } from "socket.io-client";
import { Player } from "./player";
import { Bullet } from "./bullet";

const socket = io('http://localhost:3000');
const keysPressed: { [key: string]: boolean } = {};
const otherPlayers: { [id: string]: Player } = {};  // Przechowuj pozostałych graczy

export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    player: Player;
    prevPlayerPosition: { x: number, y: number, mouseX: number, mouseY: number};
    prevMousePosition: { x: number, y: number };
    mouseX: number;
    mouseY: number;
    bullets: Bullet[];
    isHost: boolean = false;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.player = new Player(socket.id as string, 400, 300);
        this.prevPlayerPosition = { x: this.player.x, y: this.player.y, mouseX: this.player.mouseX, mouseY: this.player.mouseY};  // Początkowa pozycja gracza
        this.mouseX = 0;
        this.mouseY = 0;
        this.bullets = [];
        this.prevMousePosition = { x: this.mouseX, y: this.mouseY }; // Początkowa pozycja myszy
        this.canvas.height = 1080;
        this.canvas.width = 1920;
    
        socket.on('current_players', (players) => {
            for (let id in players) {
                if (id === socket.id) {
                    this.player = new Player(id, players[id].x, players[id].y);
                    this.player.mouseX = players[id].handX;
                    this.player.mouseY = players[id].handY;
                } else {
                    otherPlayers[id] = new Player(id, players[id].x, players[id].y);
                    otherPlayers[id].mouseX = players[id].handX;
                    otherPlayers[id].mouseY = players[id].handY;
                }
            }
        });

        socket.on('new_player', (data: { id: string, x: number, y: number, handX: number, handY: number }) => {
            if (data.id !== socket.id) {
                otherPlayers[data.id] = new Player(data.id, data.x, data.y);
            }
        });

        socket.on('update_position', (data: { id: string, x: number, y: number, handX: number, handY: number }) => {
            if (data.id !== socket.id && otherPlayers[data.id]) {
                otherPlayers[data.id].x = data.x;
                otherPlayers[data.id].y = data.y;
                otherPlayers[data.id].mouseX = data.handX;
                otherPlayers[data.id].mouseY = data.handY;
            }
        });

        socket.on('new_bullet', (data: {
            x: number,
            y: number,
            targetX: number,
            targetY: number,
            playerId: string
        }) => {
            const bullet = new Bullet(
                data.x,
                data.y,
                data.targetX,
                data.targetY,
                data.playerId
            );
            this.bullets.push(bullet);
        });

        socket.on('bullet_removed', (data: { index: number, playerId: string }) => {
            // Usuń odpowiedni pocisk, jeśli istnieje
            this.bullets = this.bullets.filter(bullet => 
                !(bullet.playerId === data.playerId && 
                  bullet.isOffscreen(this.canvas.width, this.canvas.height))
            );
        });

        socket.on('player_disconnected', (data: { id: string }) => {
            delete otherPlayers[data.id];
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            keysPressed[event.key] = true;

            if (event.key === 'w') {
                this.player.jump();
            }
        });

        document.addEventListener('keyup', (event) => {
            keysPressed[event.key] = false;
        });

        document.addEventListener('mousemove', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            
            this.mouseX = event.clientX - rect.left;
            this.mouseY = event.clientY - rect.top;

            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            this.mouseX *= scaleX;
            this.mouseY *= scaleY;

            // Aktualizuj tylko pozycję ręki aktualnego gracza
            this.player.mouseX = this.mouseX;
            this.player.mouseY = this.mouseY;
        });

        // Zaktualizuj również obsługę mousedown
        let shootingInterval: NodeJS.Timeout | null = null;
        
        document.addEventListener('mousedown', () => {

            const bullet = new Bullet(
                this.player.handEndXY.x,
                this.player.handEndXY.y,
                Math.round(this.mouseX),
                Math.round(this.mouseY),
                this.player.id
            );
            this.bullets.push(bullet); // Dodaj pocisk do tablicy

            socket.emit('player_shoot', {
                x: this.player.handEndXY.x,
                y: this.player.handEndXY.y,
                targetX: Math.round(this.mouseX),
                targetY: Math.round(this.mouseY),
                playerId: this.player.id
            });

            if (!shootingInterval) {
                shootingInterval = setInterval(() => {
                    const bullet = new Bullet(
                        this.player.handEndXY.x,
                        this.player.handEndXY.y,
                        Math.round(this.mouseX),
                        Math.round(this.mouseY),
                        this.player.id
                    );
    
                    this.bullets.push(bullet); // Dodaj pocisk do tablicy

                    socket.emit('player_shoot', {
                        x: this.player.handEndXY.x,
                        y: this.player.handEndXY.y,
                        targetX: Math.round(this.mouseX),
                        targetY: Math.round(this.mouseY),
                        playerId: this.player.id
                    });
                }, 50);
            }
        });

        // Zatrzymanie strzelania
        document.addEventListener('mouseup', () => {
            if (shootingInterval) {
                clearInterval(shootingInterval); // Zatrzymaj interwał
                shootingInterval = null; // Zresetuj zmienną
            }
        });
    }

    // Sprawdź, czy pozycja gracza się zmieniła i wyślij tylko wtedy
    checkAndEmitPosition() {
        if (this.player.x !== this.prevPlayerPosition.x || 
            this.player.y !== this.prevPlayerPosition.y || 
            this.player.mouseX !== this.prevPlayerPosition.mouseX ||
            this.player.mouseY !== this.prevPlayerPosition.mouseY ) {

            socket.emit('player_move', { 
                x: this.player.x, 
                y: this.player.y,
                handX: this.mouseX,
                handY: this.mouseY
            });
            this.prevPlayerPosition = { 
                x: this.player.x, 
                y: this.player.y,
                mouseX: this.player.mouseX,
                mouseY: this.player.mouseY
            };  // Zaktualizuj poprzednią pozycję
        }
    }

    start() {
        this.update();
    }

    drawBackground() {
        this.ctx.fillStyle = '#5a6170';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGround() {
        this.ctx.fillStyle = '#182224';
        this.ctx.fillRect(0, 600, 1920, 50);
    }

    // Zaktualizuj pociski
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
    
            // Sprawdź kolizje tylko dla żywych graczy
            if (this.player.isAlive && bullet.checkCollision(this.player)) {
                this.handlePlayerHit(bullet.playerId);
                this.bullets.splice(i, 1);
                continue;
            }
    
            // Sprawdź kolizje z innymi graczami
            for (let id in otherPlayers) {
                const otherPlayer = otherPlayers[id];
                if (otherPlayer.isAlive && bullet.checkCollision(otherPlayer)) {
                    socket.emit('player_hit', {
                        hitPlayerId: otherPlayer.id,
                        bulletPlayerId: bullet.playerId
                    });
                    this.bullets.splice(i, 1);
                    break;
                }
            }
            if (bullet.isOffscreen(this.canvas.width, this.canvas.height)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    handlePlayerHit(shooterId: string, damage: number = 10) {
        if (!this.player.isAlive) return;
    
        // Próba zadania obrażeń z uwzględnieniem czasu niewrażliwości
        if (this.player.takeDamage(damage)) {
            // Wyślij aktualizację stanu zdrowia do innych graczy
            socket.emit('health_update', {
                playerId: this.player.id,
                health: this.player.health,
                isAlive: this.player.isAlive
            });
    
            // Jeśli gracz zmarł
            if (!this.player.isAlive) {
                this.handlePlayerDeath(shooterId);
            }
        }
    }

    handlePlayerDeath(killerId: string) {
        // Wyślij informację o śmierci
        socket.emit('player_death', {
            playerId: this.player.id,
            killerId: killerId
        });
    
        // Rozpocznij odliczanie do respawnu
        setTimeout(() => {
            const respawnX = Math.random() * (this.canvas.width - this.player.width);
            const respawnY = 300;
            
            this.player.respawn(respawnX, respawnY);
            
            // Poinformuj innych o respawnie
            socket.emit('player_respawn', {
                playerId: this.player.id,
                x: respawnX,
                y: respawnY
            });
        }, 3000); // 3 sekundy do respawnu
    }

    update() {
        this.player.move(keysPressed);
        this.drawBackground();
        // Apply semi-transparent layer instead of clearing
        this.ctx.fillStyle = 'rgba(135, 206, 235, 0.3)'; // skyblue with alpha
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawGround();
        
        // Update and draw bullets
        this.updateBullets();
        for (const bullet of this.bullets) {
            bullet.draw(this.ctx);
        }
        
        // Draw players
        this.player.draw(this.ctx);
        this.player.drawHand(this.ctx, this.player.mouseX, this.player.mouseY);

        for (let id in otherPlayers) {
            otherPlayers[id].draw(this.ctx);
            otherPlayers[id].drawHand(this.ctx, otherPlayers[id].mouseX, otherPlayers[id].mouseY);
        }

        this.checkAndEmitPosition();
        requestAnimationFrame(() => this.update());
    }
}
