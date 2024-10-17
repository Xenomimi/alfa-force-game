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

            if (event.key === 'ArrowUp') {
                this.player.jump();
            }

            // Emituj pozycję gracza do serwera
            socket.emit('player_move', { x: this.player.x, y: this.player.y });
        });

        document.addEventListener('keyup', (event) => {
            keysPressed[event.key] = false;
        });

        document.addEventListener('mousemove', (event) => {
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
        })

        document.addEventListener('mousedown', (event) => {
            console.log(`klik X: ${event.pageX} Y: ${event.pageY}`);
        })

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

    drawHand() {
        const handLength = 50;
        const handWidth = 15;
    
        const dx = this.mouseX - this.player.x;
        const dy = this.mouseY - this.player.y;
    
        const angle = Math.atan2(dy, dx);
        this.angle = angle;
    
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
    
        this.ctx.rotate(angle);
    
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(-handLength/2, -handWidth/2, handLength, handWidth);  // Center the rectangle vertically
    
        this.ctx.restore();
    }

    drawStats() {
        this.ctx.font = "36px serif";
        this.ctx.fillText(`Mouse X: ${this.mouseX} Y: ${this.mouseY}`, 10, 50);
        this.ctx.fillText(`Angle: ${this.angle}`, 10, 100);
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

        this.drawHand();

        // Sprawdzaj pozycję przy każdej aktualizacji
        this.checkAndEmitPosition();

        this.drawStats();

        requestAnimationFrame(() => this.update());
    }
}
