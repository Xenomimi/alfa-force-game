import { Player } from "./pixiPlayer";

export class Camera {
    xView: number;
    yView: number;
    viewportWidth: number;
    viewportHeight: number;
    worldWidth: number;
    worldHeight: number;
    followed?: Player;
    xDeadZone: number;
    yDeadZone: number;
    maxOffsetX: number;
    maxOffsetY: number;

    constructor(viewportWidth: number, viewportHeight: number, worldWidth: number, worldHeight: number) {
        this.xView = 0;
        this.yView = 0;
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.xDeadZone = viewportWidth / 2;
        this.yDeadZone = viewportHeight / 2;
        this.maxOffsetX = 1000;
        this.maxOffsetY = 1000;

    }

    follow(player: Player) {
        this.followed = player;
    }

    lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    update(mousePosition: { x: number, y: number }, lerpFactor: number = 0.05) {
        if (this.followed) {
            const mouseWorldX = this.xView + mousePosition.x;
            const mouseWorldY = this.yView + mousePosition.y;

            let offsetX = (mouseWorldX - this.followed.x) * 0.5;
            let offsetY = (mouseWorldY - this.followed.y) * 0.7;

            offsetX = Math.max(-this.maxOffsetX, Math.min(this.maxOffsetX, offsetX));
            offsetY = Math.max(-this.maxOffsetY, Math.min(this.maxOffsetY, offsetY));

            const targetX = this.followed.x - this.xDeadZone + offsetX;
            const targetY = this.followed.y - this.yDeadZone + offsetY;

            this.xView = this.lerp(this.xView, targetX, lerpFactor);
            this.yView = this.lerp(this.yView, targetY, lerpFactor);

            this.xView = Math.max(0, Math.min(this.xView, this.worldWidth - this.viewportWidth));
            this.yView = Math.max(0, Math.min(this.worldHeight - this.viewportHeight));
        }
    }
}