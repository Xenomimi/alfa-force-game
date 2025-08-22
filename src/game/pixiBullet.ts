import * as PIXI from 'pixi.js';

type Point = { x: number; y: number };
type Polygon = Point[];

export class Bullet {
    x: number;
    y: number;
    speed: number;
    radius: number;
    playerId: string;
    trail: Array<{ x: number; y: number; alpha: number }>;
    angle: number;
    lastX: number;
    lastY: number;
    private hasCollided: boolean;
    private graphics: PIXI.Graphics;
    private parentContainer: PIXI.Container;

    constructor(
        x: number,
        y: number,
        angle: number,
        playerId: string,
        parentContainer: PIXI.Container
    ) {
        this.x = x;
        this.y = y;
        this.lastX = x;
        this.lastY = y;
        this.speed = 10;
        this.radius = 4;
        this.playerId = playerId;
        this.trail = [];
        this.hasCollided = false;
        this.parentContainer = parentContainer;

        this.angle = angle;

        this.graphics = new PIXI.Graphics();
        this.graphics.beginFill(0xff0000);
        this.graphics.drawCircle(0, 0, this.radius);
        this.graphics.endFill();
        this.graphics.x = this.x;
        this.graphics.y = this.y;
        this.parentContainer.addChild(this.graphics);
    }

    update(deltaTime: number) {
        if (this.hasCollided) return;

        this.lastX = this.x;
        this.lastY = this.y;
        this.x += Math.cos(this.angle) * this.speed * deltaTime;
        this.y += Math.sin(this.angle) * this.speed * deltaTime;
        this.graphics.x = this.x;
        this.graphics.y = this.y;

        // if (this.checkMapCollision()) {
        //     this.hasCollided = true;
        //     return;
        // }

        // const steps = Math.ceil(this.speed / 2);
        // for (let i = 0; i < steps; i++) {
        //     const ratio = i / steps;
        //     const interpolatedX = this.lastX + (this.x - this.lastX) * ratio;
        //     const interpolatedY = this.lastY + (this.y - this.lastY) * ratio;
        //     this.trail.unshift({
        //         x: interpolatedX,
        //         y: interpolatedY,
        //         alpha: 1
        //     });
        // }

    //     const maxTrailLength = 30;
    //     if (this.trail.length > maxTrailLength) {
    //         this.trail = this.trail.slice(0, maxTrailLength);
    //     }

    //     this.trail.forEach((point, index) => {
    //         point.alpha = Math.max(0, 1 - (index / maxTrailLength) ** 1.5);
    //     });
    }

    // draw() {
    //     this.graphics.clear();
    //     this.trail.forEach((point, index) => {
    //         const size = this.radius * (1 - (index / this.trail.length) * 0.7);
    //         this.graphics.beginFill(0x00FF00, point.alpha * 0.5);
    //         this.graphics.drawCircle(point.x - this.x, point.y - this.y, size);
    //         this.graphics.endFill();
    //     });
    //     this.container.x = this.x;
    //     this.container.y = this.y;
    // }

    // isOffscreen(canvasWidth: number, canvasHeight: number): boolean {
    //     return this.x < 0 || this.x > canvasWidth || this.y < 0 || this.y > canvasHeight;
    // }

    // checkCollision(player: Player): boolean {
    //     const playerLeft = player.x;
    //     const playerRight = player.x + player.width;
    //     const playerTop = player.y;
    //     const playerBottom = player.y + player.height;

    //     const steps = Math.ceil(this.speed / this.radius);
    //     for (let i = 0; i <= steps; i++) {
    //         const ratio = i / steps;
    //         const interpolatedX = this.lastX + (this.x - this.lastX) * ratio;
    //         const interpolatedY = this.lastY + (this.y - this.lastY) * ratio;
    //         if (
    //             interpolatedX >= playerLeft &&
    //             interpolatedX <= playerRight &&
    //             interpolatedY >= playerTop &&
    //             interpolatedY <= playerBottom
    //         ) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    // checkMapCollision(): boolean {
    //     const bulletPath: Polygon = [
    //         { x: this.lastX, y: this.lastY },
    //         { x: this.x, y: this.y }
    //     ];
    //     return this.collisionChecker.checkPlayerCollision(bulletPath);
    // }

    // shouldRemove(canvasWidth: number, canvasHeight: number): boolean {
    //     return this.isOffscreen(canvasWidth, canvasHeight) || this.hasCollided;
    // }

    // destroy() {
    //     this.container.destroy({ children: true });
    // }
}