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

        this.player = new Player(socket.id as string, 400, 300);
        this.prevPlayerPosition = { x: this.player.x, y: this.player.y, mouseX: this.player.mouseX, mouseY: this.player.mouseY};  // Początkowa pozycja gracza
        this.mouseX = 0;
        this.mouseY = 0;
        this.bullets = [];
        this.prevMousePosition = { x: this.mouseX, y: this.mouseY }; // Początkowa pozycja myszy
        this.canvas.height = 1080;
        this.canvas.width = 1920;

        this.setupEventListeners();

        // Obsługuj aktualizacje stanu gry od serwera

        // Aktualizacja obsługi ruchu ręki innych graczy
        socket.on('update_hand', (data: { id: string, handX: number, handY: number }) => {
            if (data.id !== socket.id && otherPlayers[data.id]) {
                // Aktualizuj pozycję ręki tylko dla innych graczy
                otherPlayers[data.id].mouseX = data.handX;
                otherPlayers[data.id].mouseY = data.handY;
            }
        });

        // Dodaj obsługę aktualizacji pozycji ręki innych graczy
        socket.on('update_hand', (data: { id: string, handX: number, handY: number }) => {
            if (data.id !== socket.id && otherPlayers[data.id]) {
                // Aktualizuj pozycję ręki tylko dla innych graczy
                otherPlayers[data.id].mouseX = data.handX;
                otherPlayers[data.id].mouseY = data.handY;
            }
        });

        socket.on('current_players', (players: { [id: string]: { x: number, y: number, handX: number, handY: number }}) => {
            for (let id in players) {
                if (id !== socket.id) {
                    otherPlayers[id] = new Player(id, players[id].x, players[id].y);
                    otherPlayers[id].mouseX = players[id].handX;
                    otherPlayers[id].mouseY = players[id].handY;
                }
            }
        });

        socket.on('new_player', (data: { id: string, x: number, y: number, handX: number, handY: number }) => {
            if (data.id !== socket.id) {
                otherPlayers[data.id] = new Player(data.id, data.x, data.y);
                otherPlayers[data.id].mouseX = data.handX;
                otherPlayers[data.id].mouseY = data.handY;
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

        socket.on('player_disconnected', (data: { id: string }) => {
            delete otherPlayers[data.id];
        });
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            keysPressed[event.key] = true;

            if (event.key === 'w') {
                this.player.jump();
            }

            socket.emit('player_move', { 
                x: this.player.x, 
                y: this.player.y,
                handX: this.mouseX,
                handY: this.mouseY 
            });
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

            // Wyślij aktualizację pozycji ręki na serwer
            socket.emit('hand_move', {
                handX: this.mouseX,
                handY: this.mouseY
            });
        });

        // Zaktualizuj również obsługę mousedown
        document.addEventListener('mousedown', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const clickX = (event.clientX - rect.left) * (this.canvas.width / rect.width);
            const clickY = (event.clientY - rect.top) * (this.canvas.height / rect.height);
            console.log(`klik X: ${Math.round(clickX)} Y: ${Math.round(clickY)}`);
        
            // Logika strzelania
            const bullet = new Bullet(
                this.player.handEndXY.x,
                this.player.handEndXY.y,
                Math.round(clickX),
                Math.round(clickY),
                this.player.id
            );
        
            this.bullets.push(bullet); // Dodaj pocisk do tablicy
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
        this.ctx.fillStyle = 'skyblue';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGround() {
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(0, 600, 1920, 50);
    }

    // Zaktualizuj pociski
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();

            // Jeśli pocisk jest poza ekranem, usuń go
            if (bullet.isOffscreen(this.canvas.width, this.canvas.height)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    update() {
        this.player.move(keysPressed);
        this.drawBackground();
        this.drawGround();
        
        // Rysuj aktualnego gracza
        this.player.draw(this.ctx);
        this.player.drawHand(this.ctx, this.player.mouseX, this.player.mouseY);

        // Zaktualizuj i rysuj pociski
        this.updateBullets();
        for (const bullet of this.bullets) {
            bullet.draw(this.ctx);
        }

        // Rysuj innych graczy
        for (let id in otherPlayers) {
            otherPlayers[id].draw(this.ctx);
            otherPlayers[id].drawHand(this.ctx, otherPlayers[id].mouseX, otherPlayers[id].mouseY);
        }

        this.checkAndEmitPosition();
        requestAnimationFrame(() => this.update());
    }
}
