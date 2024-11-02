import { Player } from "./player";

export class Bullet {
    x: number;
    y: number;
    speed: number;
    directionX: number;
    directionY: number;
    radius: number;
    playerId: string;
    trail: Array<{x: number; y: number; alpha: number}>;
    angle: number;
    lastX: number;
    lastY: number;

    constructor(x: number, y: number, targetX: number, targetY: number, playerId: string) {
        this.x = x;
        this.y = y;
        this.lastX = x;
        this.lastY = y;
        this.speed = 30; // Zwiększona prędkość
        this.radius = 4;
        this.playerId = playerId;
        this.trail = [];
    
        // Oblicz wektor kierunku
        const dx = targetX - x;
        const dy = targetY - y;
        const length = Math.sqrt(dx * dx + dy * dy);
    
        // Sprawdź, czy długość nie jest zerowa, aby uniknąć dzielenia przez zero
        if (length !== 0) {
            this.directionX = dx / length;
            this.directionY = dy / length;
        } else {
            this.directionX = 0;
            this.directionY = 0;
        }
    
        // Oblicz kąt do rotacji (jeśli potrzebne)
        this.angle = Math.atan2(this.directionY, this.directionX);
    }

    update() {
        // Zapisz poprzednią pozycję
        this.lastX = this.x;
        this.lastY = this.y;

        // Update position
        this.x += this.directionX * this.speed;
        this.y += this.directionY * this.speed;

        // Oblicz punkty pośrednie między ostatnią a obecną pozycją
        const steps = Math.ceil(this.speed / 2); // Liczba punktów pośrednich zależy od prędkości
        for (let i = 0; i < steps; i++) {
            const ratio = i / steps;
            const interpolatedX = this.lastX + (this.x - this.lastX) * ratio;
            const interpolatedY = this.lastY + (this.y - this.lastY) * ratio;
            
            this.trail.unshift({
                x: interpolatedX,
                y: interpolatedY,
                alpha: 1
            });
        }

        // Limit trail length - zwiększona długość dla lepszego efektu
        const maxTrailLength = 30;
        if (this.trail.length > maxTrailLength) {
            this.trail = this.trail.slice(0, maxTrailLength);
        }

        // Update trail alphas with smoother gradient
        this.trail.forEach((point, index) => {
            point.alpha = Math.max(0, 1 - (index / maxTrailLength) ** 1.5);
        });
    }

    draw(ctx: CanvasRenderingContext2D) {
        // Draw trail
        this.trail.forEach((point, index) => {
            const size = this.radius * (1 - (index / this.trail.length) * 0.7); // Wolniejsze zmniejszanie rozmiaru
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(187, 188, 189, ${point.alpha * 0.5})`; // Zwiększona podstawowa przezroczystość
            ctx.fill();
        });

        // Save context state
        ctx.save();
        
        // Translate to bullet position and rotate
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Restore context state
        ctx.restore();
    }

    isOffscreen(canvasWidth: number, canvasHeight: number): boolean {
        return this.x < 0 || this.x > canvasWidth || 
               this.y < 0 || this.y > canvasHeight;
    }

    // Sprawdź kolizję z graczem
    checkCollision(player: Player): boolean {
        if (this.playerId === player.id) {
            return false;
        }

        return this.checkRectCollision(this.x, this.y, player.headHitbox) ||
               this.checkRectCollision(this.x, this.y, player.torsoHitbox) ||
               this.checkRectCollision(this.x, this.y, player.legHitbox);
    }

    private checkRectCollision(x: number, y: number, rect: { x: number, y: number, width: number, height: number }): boolean {
        return (x >= rect.x && x <= rect.x + rect.width &&
                y >= rect.y && y <= rect.y + rect.height);
    }
}