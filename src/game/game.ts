import { io } from "socket.io-client";
import { Player } from "./player";

const socket = io('http://localhost:3000');
const keysPressed: { [key: string]: boolean } = {};
const otherPlayers: { [id: string]: Player } = {};  // Przechowuj pozostałych graczy

export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    player: Player;
    prevPlayerPosition: { x: number, y: number };
    mouseX: number;
    mouseY: number;
    angle: number;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.player = new Player(400, 300);
        this.prevPlayerPosition = { x: this.player.x, y: this.player.y };  // Początkowa pozycja
        this.mouseX = 0;
        this.mouseY = 0;
        this.angle = 0;
        this.canvas.height = 1080;
        this.canvas.width = 1920;

        document.addEventListener('keydown', (event) => {
            keysPressed[event.key] = true;

            if (event.key === 'w') {
                this.player.jump();
            }

            // Emituj pozycję gracza do serwera
            socket.emit('player_move', { x: this.player.x, y: this.player.y });
        });

        document.addEventListener('keyup', (event) => {
            keysPressed[event.key] = false;
        });

        document.addEventListener('mousemove', (event) => {
            // Pobierz pozycję i wymiary canvasu względem viewportu
            const rect = this.canvas.getBoundingClientRect();
            
            // Przelicz pozycję myszy względem canvasu
            this.mouseX = event.clientX - rect.left;
            this.mouseY = event.clientY - rect.top;

            // Uwzględnij skalowanie canvasu, jeśli występuje
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            this.mouseX *= scaleX;
            this.mouseY *= scaleY;
        });

        // Zaktualizuj również obsługę mousedown
        document.addEventListener('mousedown', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const clickX = (event.clientX - rect.left) * (this.canvas.width / rect.width);
            const clickY = (event.clientY - rect.top) * (this.canvas.height / rect.height);
            console.log(`klik X: ${Math.round(clickX)} Y: ${Math.round(clickY)}`);
        });

        // Obsługuj aktualizacje stanu gry od serwera

        // Otrzymaj pozycje wszystkich istniejących graczy
        socket.on('current_players', (players: { [id: string]: { x: number, y: number } }) => {
            for (let id in players) {
                if (id !== socket.id) {
                    otherPlayers[id] = new Player(players[id].x, players[id].y);
                }
            }
        });

        // Dodaj nowego gracza do gry
        socket.on('new_player', (data: { id: string, x: number, y: number }) => {
            otherPlayers[data.id] = new Player(data.x, data.y);
        });

        // Aktualizuj pozycje innych graczy
        socket.on('update_position', (data: { id: string, x: number, y: number }) => {
            if (data.id !== socket.id && otherPlayers[data.id]) {
                otherPlayers[data.id].x = data.x;
                otherPlayers[data.id].y = data.y;
            }
        });

        // Usuń gracza, który się rozłączył
        socket.on('player_disconnected', (data: { id: string }) => {
            delete otherPlayers[data.id];
        });
    }

    // Sprawdź, czy pozycja gracza się zmieniła i wyślij tylko wtedy
    checkAndEmitPosition() {
        if (this.player.x !== this.prevPlayerPosition.x || this.player.y !== this.prevPlayerPosition.y) {
            socket.emit('player_move', { x: this.player.x, y: this.player.y });
            this.prevPlayerPosition = { x: this.player.x, y: this.player.y };  // Zaktualizuj poprzednią pozycję
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

    drawStats() {
        this.ctx.font = "36px serif";
        this.ctx.fillText(`Mouse X: ${this.mouseX} Y: ${this.mouseY}`, 10, 50);
    }

    update() {
        this.player.move(keysPressed);
        this.drawBackground();
        this.drawGround();
    
        this.player.draw(this.ctx);
    
        // Rysuj innych graczy
        for (let id in otherPlayers) {
            otherPlayers[id].draw(this.ctx);
        }
    
        // Rysuj rękę gracza z aktualną pozycją myszy
        this.player.drawHand(this.ctx, this.mouseX, this.mouseY);
    
        // Sprawdzaj pozycję przy każdej aktualizacji
        this.checkAndEmitPosition();
    
        this.drawStats();
    
        requestAnimationFrame(() => this.update());
    }
}
