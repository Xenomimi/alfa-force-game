import { Player } from "./player";
import CollisionChecker from "./collisionChecker";

type Point = { x: number; y: number };
type Polygon = Point[];

export class Bullet {
    x: number;
    y: number;
    speed: number;
    directionX: number;
    directionY: number;
    radius: number;
    playerId: string;
    trail: Array<{ x: number; y: number; alpha: number }>;
    angle: number;
    lastX: number;
    lastY: number;
    private collisionChecker: CollisionChecker;
    private hasCollided: boolean;

    constructor(
        x: number,
        y: number,
        targetX: number,
        targetY: number,
        playerId: string,
        collisionChecker?: CollisionChecker // Opcjonalny parametr, bo inne miejsca mogą nie przekazywać
    ) {
        this.x = x;
        this.y = y;
        this.lastX = x;
        this.lastY = y;
        this.speed = 30;
        this.radius = 4;
        this.playerId = playerId;
        this.trail = [];
        this.collisionChecker = collisionChecker || new CollisionChecker([]); // Domyślna pusta instancja, jeśli brak
        this.hasCollided = false;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length !== 0) {
            this.directionX = dx / length;
            this.directionY = dy / length;
        } else {
            this.directionX = 0;
            this.directionY = 0;
        }

        this.angle = Math.atan2(this.directionY, this.directionX);
    }

    update() {
        if (this.hasCollided) return;

        this.lastX = this.x;
        this.lastY = this.y;
        this.x += this.directionX * this.speed;
        this.y += this.directionY * this.speed;

        if (this.checkMapCollision()) {
            this.hasCollided = true;
            return;
        }

        const steps = Math.ceil(this.speed / 2);
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

        const maxTrailLength = 30;
        if (this.trail.length > maxTrailLength) {
            this.trail = this.trail.slice(0, maxTrailLength);
        }

        this.trail.forEach((point, index) => {
            point.alpha = Math.max(0, 1 - (index / maxTrailLength) ** 1.5);
        });
    }

    draw(ctx: CanvasRenderingContext2D) {
        this.trail.forEach((point, index) => {
            const size = this.radius * (1 - (index / this.trail.length) * 0.7);
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 0, ${point.alpha * 0.5})`;
            ctx.fill();
            // 187, 188, 189
        });

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.restore();
    }

    isOffscreen(canvasWidth: number, canvasHeight: number): boolean {
        return this.x < 0 || this.x > canvasWidth || this.y < 0 || this.y > canvasHeight;
    }

    checkCollision(player: Player): boolean {
        const playerLeft = player.x;
        const playerRight = player.x + player.width;
        const playerTop = player.y;
        const playerBottom = player.y + player.height;

        const steps = Math.ceil(this.speed / this.radius);
        for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            const interpolatedX = this.lastX + (this.x - this.lastX) * ratio;
            const interpolatedY = this.lastY + (this.y - this.lastY) * ratio;
            if (
                interpolatedX >= playerLeft &&
                interpolatedX <= playerRight &&
                interpolatedY >= playerTop &&
                interpolatedY <= playerBottom
            ) {
                return true;
            }
        }
        return false;
    }

    checkMapCollision(): boolean {
        const bulletPath: Polygon = [
            { x: this.lastX, y: this.lastY },
            { x: this.x, y: this.y }
        ];
        return this.collisionChecker.checkPlayerCollision(bulletPath);
    }

    shouldRemove(canvasWidth: number, canvasHeight: number): boolean {
        return this.isOffscreen(canvasWidth, canvasHeight) || this.hasCollided;
    }
}