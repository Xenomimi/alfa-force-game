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
            this.xView = this.followed.x - this.xDeadZone;
            this.yView = this.followed.y - this.yDeadZone;

            // Boundaries to keep the camera within the world limits
            this.xView = Math.max(0, Math.min(this.xView, this.worldWidth - this.viewportWidth));
            this.yView = Math.max(0, Math.min(this.yView, this.worldHeight - this.viewportHeight));


            console.log(this.xView, this.yView)
        }
    }
}
