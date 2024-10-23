// import { Player } from "./player";

export class Bullet {
    x: number;
    y: number;
    speed: number;
    directionX: number;
    directionY: number;
    radius: number;
    playerId: string;

    constructor(x: number, y: number, targetX: number, targetY: number, playerId: string) {
        this.x = x;
        this.y = y;
        this.speed = 15;
        this.radius = 5;
        this.playerId = playerId;

        // Oblicz wektor kierunku
        const dx = targetX - x;
        const dy = targetY - y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Normalizacja wektora kierunku
        this.directionX = dx / length;
        this.directionY = dy / length;
    }

    update() {
        this.x += this.directionX * this.speed;
        this.y += this.directionY * this.speed;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }

    // Sprawdź czy pocisk jest poza ekranem
    isOffscreen(canvasWidth: number, canvasHeight: number): boolean {
        return this.x < 0 || this.x > canvasWidth || 
               this.y < 0 || this.y > canvasHeight;
    }

    // Sprawdź kolizję z graczem
    // checkCollision(player: Player): boolean {
    //     const dx = this.x - player.x;
    //     const dy = this.y - player.y;
    //     const distance = Math.sqrt(dx * dx + dy * dy);
    //     return distance < this.radius + player.radius; // Zakładając, że Player ma właściwość radius
    // }
}