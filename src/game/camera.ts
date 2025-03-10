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
    maxOffsetX: number; // Nowy limit dla osi X
    maxOffsetY: number; // Nowy limit dla osi Y

    constructor(viewportWidth: number, viewportHeight: number, worldWidth: number, worldHeight: number) {
        this.xView = 0;
        this.yView = 0;
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.xDeadZone = viewportWidth / 2;
        this.yDeadZone = viewportHeight / 2;
        this.maxOffsetX = 1000; // Maksymalne przesunięcie w osi X (np. 400 pikseli)
        this.maxOffsetY = 1000; // Maksymalne przesunięcie w osi Y (np. 300 pikseli)
    }

    follow(player: Player) {
        this.followed = player;
    }

    lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    update(mousePosition: { x: number, y: number }, lerpFactor: number = 0.05) {
        if (this.followed) {
            // Przelicz pozycję myszy z viewportu na współrzędne świata
            const mouseWorldX = this.xView + mousePosition.x;
            const mouseWorldY = this.yView + mousePosition.y;
    
            // Oblicz przesunięcie kamery na podstawie pozycji myszy
            let offsetX = (mouseWorldX - this.followed.x) * 0.5;
            let offsetY = (mouseWorldY - this.followed.y) * 0.7;
    
            // Ogranicz przesunięcie do maksymalnych wartości
            offsetX = Math.max(-this.maxOffsetX, Math.min(this.maxOffsetX, offsetX));
            offsetY = Math.max(-this.maxOffsetY, Math.min(this.maxOffsetY, offsetY));
    
            // Cel kamery: pozycja gracza + ograniczone przesunięcie
            const targetX = this.followed.x - this.xDeadZone + offsetX;
            const targetY = this.followed.y - this.yDeadZone + offsetY;
    
            // Interpolacja pozycji kamery
            this.xView = this.lerp(this.xView, targetX, lerpFactor);
            this.yView = this.lerp(this.yView, targetY, lerpFactor);
    
            // Ograniczenia kamery do granic świata
            this.xView = Math.max(0, Math.min(this.xView, this.worldWidth - this.viewportWidth));
            this.yView = Math.max(0, Math.min(this.yView, this.worldHeight - this.viewportHeight));
        }
    }

}