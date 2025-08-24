import { Viewport } from "pixi-viewport";
import * as Matter from "matter-js";

export class CameraController {
    private viewport: Viewport;
    private playerBody: Matter.Body;
    private mouseX: number = 0;
    private mouseY: number = 0;

    private maxOffsetX = 1000;
    private maxOffsetY = 1000;
    private lerpFactor = 0.05;

    constructor(viewport: Viewport, playerBody: Matter.Body) {
        this.viewport = viewport;
        this.playerBody = playerBody;
    }

    setMouse(x: number, y: number) {
        this.mouseX = x;
        this.mouseY = y;
    }

    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    update() {
        const playerX = this.playerBody.position.x;
        const playerY = this.playerBody.position.y;

        const mouseWorldX = this.mouseX;
        const mouseWorldY = this.mouseY;

        // policz offset gracza względem myszy
        let offsetX = (mouseWorldX - playerX) * 0.5;
        let offsetY = (mouseWorldY - playerY) * 0.7;

        // ograniczenia offsetu
        offsetX = Math.max(-this.maxOffsetX, Math.min(this.maxOffsetX, offsetX));
        offsetY = Math.max(-this.maxOffsetY, Math.min(this.maxOffsetY, offsetY));

        const targetX = playerX + offsetX;
        const targetY = playerY + offsetY;

        const newX = this.lerp(this.viewport.center.x, targetX, this.lerpFactor);
        const newY = this.lerp(this.viewport.center.y, targetY, this.lerpFactor);

        this.viewport.moveCenter(newX, newY);
    }
}
