import * as PIXI from 'pixi.js';
import { Socket } from "socket.io-client";
import { Viewport } from 'pixi-viewport';
import { PixiArmatureDisplay, PixiFactory, Armature } from 'dragonbones-pixijs';

type ArmatureDisplayType = PixiArmatureDisplay;

export class Player {
    protected readonly _resources: string[] = [];
    protected _pixiResources: any;
    private _armatureDisplay!: ArmatureDisplayType;
    private _armature!: Armature;
    viewport!: Viewport;
    id: string;
    socket: Socket;
    x: number;
    y: number;
    width: number;
    height: number;
    playerName: string;

    speed: number;
    gravity: number;
    verticalSpeed: number;
    // isAlive: boolean;
    // health: number;
    // maxHealth: number;
    // deathAnimation: {
    //     active: boolean;
    //     progress: number;
    //     duration: number;
    // };
    killerId?: string;
    deathTime?: number;
    imagesLoaded: boolean = false;
    playerContainer: PIXI.Container;
    factory: PixiFactory;

    constructor(socket: Socket, x: number, y: number, parentContainer: PIXI.Container) {
        this.socket = socket;
        this.id = socket.id ?? "PlayerName";
        this.x = x;
        this.y = y;
        this.playerName = this.id;
        // this.color = 'rgb(255, 0, 0, 0.5)';
        this.speed = 4;
        this.gravity = 0.19;
        this.verticalSpeed = 0;
        // this.maxHealth = 100;
        // this.health = this.maxHealth;
        // this.isAlive = true;
        // this.deathAnimation = {
        //     active: false,
        //     progress: 0,
        //     duration: 1000
        // };
        // this.deathTime = 100;

        this.playerContainer = new PIXI.Container();
        parentContainer.addChild(this.playerContainer);
        this.factory = PixiFactory.factory; 

        
        this._resources.push(
            "player/char_ske.json",
            "player/char_tex.json",
            "player/char_tex.png"
        )

        this.width = 30;
        this.height = 60;



        this.init(this.playerContainer);
    }

    private async init(playerContainer: PIXI.Container) {
        // this.initializeHitboxes();
        await this._loadResources()
        await this.loadTextures();

        this._armatureDisplay = await PixiFactory.factory.buildArmatureDisplay("Armature")!;
        this._armature = await this._armatureDisplay.armature;
        this._armatureDisplay.x = this.x;
        this._armatureDisplay.y = this.y;
        this._armatureDisplay.debugDraw = true;
        this._armatureDisplay.scale.set(2.5);
        this._armatureDisplay.animation.play("animtion0");

        playerContainer.addChild(this._armatureDisplay);
    }

    loadTextures() {
        this.factory.parseDragonBonesData(this._pixiResources["player/char_ske.json"])
        this.factory.parseTextureAtlasData(this._pixiResources["player/char_tex.json"], 
        this._pixiResources["player/char_tex.png"]);
    }
    
    protected async _loadResources() {
        await PIXI.Assets.load(this._resources).then((resources) => {
            this._pixiResources = resources;
        });
    }

    updateHandPosition(mouseX: number, mouseY: number, viewport: Viewport): void {
        if (!this._armature || !this._armatureDisplay) return;
        const bone = this._armature.getBone("forearm");
        if (!bone) return;

        // pobieramy pozycję kości w GLOBAL space
        const boneGlobal = this._armatureDisplay.toGlobal(
            new PIXI.Point(bone.global.x, bone.global.y)
        );

        // konwertujemy ją do viewport space
        const boneInViewport = viewport.toLocal(boneGlobal);

        // liczymy wektor do myszy (która też jest w viewport space)
        const dx = mouseX - boneInViewport.x;
        const dy = mouseY - boneInViewport.y;

        console.log("dx: ", dx, "dy: ", dy);

        // ustawiamy flipX na podstawie kierunku myszy
        this._armatureDisplay.armature.flipX = dx < 0;

        let angle = Math.atan2(dy, dx);

        // jeśli flip = true, odwracamy kąt
        if (this._armatureDisplay.armature.flipX) {
            angle = Math.PI - angle;
            if (angle > Math.PI) angle -= Math.PI * 2;
        }

        // ustawiamy rotację na kości
        bone.offset.rotation = angle;
        bone.invalidUpdate();
    }

// drawDeathAnimation() {
//         if (!this.deathTime) return;

//         const progress = (Date.now() - this.deathTime) / this.deathAnimation.duration;

//         if (progress >= 1) {
//             this.deathAnimation.active = false;
//             return;
//         }

//         this.graphics.clear();
//         this.graphics.beginFill(PIXI.Color.shared.setValue(this.color).toNumber());
//         const particles = 100;
//         const particleSize = 20;

//         for (let i = 0; i < particles; i++) {
//             const angle = (i / particles) * Math.PI * 2;
//             const distance = progress * 50;
//             const particleX = this.x + this.width / 2 + Math.cos(angle) * distance - this.x;
//             const particleY = this.y + this.height / 2 + Math.sin(angle) * distance - this.y;

//             this.graphics.alpha = 1 - progress;
//             this.graphics.drawRect(particleX - particleSize / 2, particleY - particleSize / 2, particleSize, particleSize);
//         }
//         this.graphics.alpha = 1;
//     }

//     drawDeathScreen(parentContainer: PIXI.Container) {
//         if (!this.isAlive && this.deathTime) {
//             const deathScreen = new PIXI.Graphics();
//             deathScreen.beginFill(0x000000, 0.7);
//             deathScreen.drawRect(0, 0, this.camera.viewportWidth, this.camera.viewportHeight);
//             deathScreen.endFill();

//             const deathText = new PIXI.Text('You Died!', {
//                 fontFamily: 'Arial',
//                 fontSize: 48,
//                 fill: 0xFFFFFF,
//                 align: 'center'
//             });
//             deathText.x = this.camera.viewportWidth / 2;
//             deathText.y = this.camera.viewportHeight / 2 - 50;
//             deathText.anchor.set(0.5);

//             const timeLeft = Math.max(0, Math.ceil((this.deathTime + 5000 - Date.now()) / 1000));
//             const respawnText = new PIXI.Text(`Respawning in ${timeLeft} seconds...`, {
//                 fontFamily: 'Arial',
//                 fontSize: 24,
//                 fill: 0xFFFFFF,
//                 align: 'center'
//             });
//             respawnText.x = this.camera.viewportWidth / 2;
//             respawnText.y = this.camera.viewportHeight / 2 + 20;
//             respawnText.anchor.set(0.5);

//             const killerText = new PIXI.Text(this.killerId ? `Killed by: Player ${this.killerId}` : '', {
//                 fontFamily: 'Arial',
//                 fontSize: 20,
//                 fill: 0xFFFFFF,
//                 align: 'center'
//             });
//             killerText.x = this.camera.viewportWidth / 2;
//             killerText.y = this.camera.viewportHeight / 2 + 60;
//             killerText.anchor.set(0.5);

//             parentContainer.addChild(deathScreen, deathText, respawnText, killerText);
//         }
//     }

//     takeDamage(damage: number): boolean {
//         this.health = Math.max(0, this.health - damage);

//         if (this.health <= 0 && this.isAlive) {
//             this.die();
//         }

//         return true;
//     }

//     die(killerId?: string) {
//         this.isAlive = false;
//         this.killerId = killerId;
//         this.deathTime = Date.now();
//         this.deathAnimation.active = true;
//         this.deathAnimation.progress = 0;
//     }

//     respawn(x: number, y: number) {
//         this.health = this.maxHealth;
//         this.isAlive = true;
//         this.x = x;
//         this.y = y;
//         this.verticalSpeed = 0;
//     }

//     drawPlayerName() {
//         const nameWidth = this.width + 50;
//         const nameX = this.width / 2 - nameWidth / 2;
//         const nameY = -50;

//         const text = new PIXI.Text(`${this.playerName}`, {
//             fontFamily: 'Arial',
//             fontSize: 12,
//             fill: 0xFF00DD
//         });
//         text.x = nameX + nameWidth / 2;
//         text.y = nameY + 10;
//         text.anchor.set(0.5);
//         this.container.addChild(text);
//     }

//     drawHealthBar() {
// const barWidth = this.width + 30;
//         const barHeight = 6;
//         const barX = this.width / 2 - barWidth / 2;
//         const barY = -20;
//         const healthPercent = this.health / this.maxHealth;
//         const green = Math.floor(255 * healthPercent);
//         const red = 255 - green;
//         const healthColor = PIXI.Color.shared.setValue([red / 255, green / 255, 0]).toNumber();
//         this.graphics.beginFill(healthColor);

//         this.graphics.beginFill(0x000000, 0.5);
//         this.graphics.drawRect(barX, barY, barWidth, barHeight);
//         this.graphics.beginFill(healthColor);
//         this.graphics.drawRect(barX, barY, barWidth * healthPercent, barHeight);
//         this.graphics.lineStyle(1, 0x000000);
//         this.graphics.drawRect(barX, barY, barWidth, barHeight);

//         const text = new PIXI.Text(`${Math.ceil(this.health)} / ${this.maxHealth}`, {
//             fontFamily: 'Arial',
//             fontSize: 12,
//             fill: 0xFFFFFF
//         });
//         text.x = barX + barWidth / 2;
//         text.y = barY - 2;
//         text.anchor.set(0.5);
//         this.container.addChild(text);
//     }
}