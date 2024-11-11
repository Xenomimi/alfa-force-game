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

    update() {
        if (this.followed) {
            // Oblicz pozycję kamery względem gracza
            this.xView = this.followed.x - this.xDeadZone;
            this.yView = this.followed.y - this.yDeadZone;
    
            // Ograniczenia kamery, aby nie wychodziła poza granice tła
            
            // Ograniczenie po lewej i prawej stronie
            if (this.xView < 0) {
                this.xView = 0;
            } else if (this.xView > this.worldWidth - this.viewportWidth) {
                this.xView = this.worldWidth - this.viewportWidth;
            }
            
            // Ograniczenie po górze i dole
            if (this.yView < 0) {
                this.yView = 0;
            } else if (this.yView > this.worldHeight - this.viewportHeight) {
                this.yView = this.worldHeight - this.viewportHeight;
            }
        }
    }
}
