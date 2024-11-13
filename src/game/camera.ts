import { Player } from "./player";

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

    constructor(viewportWidth: number, viewportHeight: number, worldWidth: number, worldHeight: number) {
        this.xView = 0;
        this.yView = 0;
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.xDeadZone = viewportWidth / 2;
        this.yDeadZone = viewportHeight / 2;
    }

    follow(player: Player) {
        this.followed = player;
    }

    lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    update(mousePosition: { x: number, y: number }, lerpFactor: number = 0.05) {
        if (this.followed) {
            // Cel kamery pomiędzy pozycją gracza a pozycją myszy
            const targetX = this.followed.x - this.xDeadZone + (mousePosition.x - (this.followed.x - this.xDeadZone)) * 0.3;
            const targetY = this.followed.y - this.yDeadZone + (mousePosition.y - (this.followed.y - this.yDeadZone)) * 0.3;

            // Aktualizacja pozycji kamery przy użyciu interpolacji
            this.xView = this.lerp(this.xView, targetX, lerpFactor);
            this.yView = this.lerp(this.yView, targetY, lerpFactor);

            // Ograniczenia kamery
            if (this.xView < 0) {
                this.xView = 0;
            } else if (this.xView > this.worldWidth - this.viewportWidth) {
                this.xView = this.worldWidth - this.viewportWidth;
            }

            if (this.yView < 0) {
                this.yView = 0;
            } else if (this.yView > this.worldHeight - this.viewportHeight) {
                this.yView = this.worldHeight - this.viewportHeight;
            }
        }
    }
}
