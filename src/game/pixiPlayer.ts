import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { PixiArmatureDisplay, PixiFactory, Armature, Bone } from 'dragonbones-pixijs';
import * as Matter from 'matter-js';
import { Bullet } from "./pixiBullet";
import { Room } from 'colyseus.js';

type ArmatureDisplayType = PixiArmatureDisplay;

type PositionSnapshot = {
    x: number;
    y: number;
    dx: number;
    dy: number;
    timestamp: number;
};

export class Player {
    protected readonly _resources: string[] = [];
    protected _pixiResources: any;
    _armatureDisplay!: ArmatureDisplayType;
    _armature!: Armature;
    viewport: Viewport;
    id: string | undefined;
    x: number;
    y: number;
    positionBuffer: PositionSnapshot[] = [];
    prevPlayerPosition!: { x: number, y: number, mouseX: number, mouseY: number, dx: number, dy: number };
    width: number;
    height: number;
    bottom: number;
    playerName: string = "";
    playerWeaponId: number;
    shootingPointOffsetX: number = 60;
    speed: number;
    gravity: number;
    verticalSpeed: number;
    isAlive: boolean;
    isMoving: boolean = false;
    weaponBone: Bone | null = null;
    forearmBone: Bone | null = null;
    handAngle: number;
    aimAngle: number;
    dx: number;
    dy: number;
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
    parentContainer: PIXI.Container;
    factory: PixiFactory;
    playerMatterBody: Matter.Body;
    psyhicsWorld: Matter.World;

    globalBulletList: Bullet[] = [];
    gameRoom: Room<any>;

    constructor(
        id: string | undefined, 
        x: number, 
        y: number, 
        parentContainer: PIXI.Container, 
        psyhicsWorld: Matter.World, 
        gravity: boolean = false,
        globalBulletList: Bullet[],
        gameRoom: Room<any>,
        viewport: Viewport,
        playerWeaponId: number 
    ) {
        this.isAlive = true;
        this.id = id;
        this.width = 36;
        this.height = 140;
        this.bottom = this.height / 2;
        this.x = x;
        this.y = y - this.bottom; 
        this.prevPlayerPosition = { x: this.x, y: this.y, mouseX: 0, mouseY: 0, dx: 0, dy: 0 };
        // this.playerName = this.id;
        // this.color = 'rgb(255, 0, 0, 0.5)';
        this.speed = 4;
        this.gravity = 0.19;
        this.verticalSpeed = 0;
        this.aimAngle = 0;
        this.handAngle = 0;
        this.dx = 0;
        this.dy = 0;
        this.parentContainer = parentContainer;
        this.psyhicsWorld = psyhicsWorld;
        this.playerWeaponId = playerWeaponId;
        this.globalBulletList = globalBulletList;
        this.gameRoom = gameRoom;
        this.viewport = viewport;
        // this.maxHealth = 100;
        // this.health = this.maxHealth;
        // this.isAlive = true;
        // this.deathAnimation = {
        //     active: false,
        //     progress: 0,
        //     duration: 1000
        // };
        // this.deathTime = 100;
        this.playerMatterBody = Matter.Bodies.rectangle(this.x, this.y, this.width, this.height, {
            label: 'player',
            inertia: Infinity,
            friction: 0.05,
            frictionStatic: 0,
            frictionAir: 0.02,
            restitution: 0,
            mass: 1,
            collisionFilter: {
                category: 0x0002, // kategoria gracza
                mask: 0xFFFF ^ 0x0002 // koliduje ze wszystkimi oprócz graczy
            }
        });
        
        Matter.Composite.add(psyhicsWorld, this.playerMatterBody);

        this.playerMatterBody.ignoreGravity = gravity;
        this.playerContainer = new PIXI.Container();
        this.factory = PixiFactory.factory; 

        
        this.init(this.playerContainer);
        this.drawPlayerName();
        this.parentContainer.addChild(this.playerContainer);
    }

    

    private async init(playerContainer: PIXI.Container) {
        // this.initializeHitboxes();
        await this._loadResources()
        await this.loadTextures();

        this._armatureDisplay = await PixiFactory.factory.buildArmatureDisplay("Armature")!;
        this._armature = await this._armatureDisplay.armature;
        this._armatureDisplay.y = this.bottom;
        this._armatureDisplay.debugDraw = false;
        this._armatureDisplay.scale.set(2);
        this._armatureDisplay.animation.play("idle");

        playerContainer.addChild(this._armatureDisplay);

        this.weaponBone = this._armature.getBone("bone");
        this.forearmBone = this._armature.getBone("forearm");


        await this.setGun(this.playerWeaponId);
    }

    loadTextures() {
        this.factory.parseDragonBonesData(this._pixiResources["player/char_ske.json"])
        this.factory.parseTextureAtlasData(this._pixiResources["player/char_tex.json"], 
        this._pixiResources["player/char_tex.png"]);
    }
    
    protected async _loadResources() {
        this._resources.push(
            "player/char_ske.json",
            "player/char_tex.json",
            "player/char_tex.png"
        )
        await PIXI.Assets.load(this._resources).then((resources) => {
            this._pixiResources = resources;
        });
    }

    updateHandPosition(mouseX: number, mouseY: number, viewport: Viewport): void {
        if (!this._armature || !this._armatureDisplay) return;
        if (!this.forearmBone) return;

        // pobieramy pozycję kości w GLOBAL space
        const boneGlobal = this._armatureDisplay.toGlobal(
            new PIXI.Point(this.forearmBone.global.x, this.forearmBone.global.y)
        );

        // konwertujemy ją do viewport space
        const boneInViewport = viewport.toLocal(boneGlobal);

        // liczymy wektor do myszy (która też jest w viewport space)
        this.dx = mouseX - boneInViewport.x;
        this.dy = mouseY - boneInViewport.y;

        const aimAngle = Math.atan2(this.dy, this.dx);
        this.aimAngle = aimAngle; // nowa zmienna przechowująca kąt do strzału

        // ustawiamy flipX na podstawie kierunku myszy
        this._armatureDisplay.armature.flipX = this.dx < 0;

        this.handAngle = aimAngle;

        // jeśli flip = true, odwracamy kąt
        if (this._armatureDisplay.armature.flipX) {
            this.handAngle = Math.PI - this.aimAngle;
            if (this.handAngle > Math.PI) this.handAngle -= Math.PI * 2;
        }

        // ustawiamy rotację na kości
        this.forearmBone.offset.rotation = this.handAngle;
        this.forearmBone.invalidUpdate();
    }

    updateRemoteHandPositionAngle(): void {
        if (!this._armature || !this._armatureDisplay) return;
        if (!this.forearmBone) return;

        const aimAngle = Math.atan2(this.dy, this.dx);
        this.aimAngle = aimAngle; // nowa zmienna przechowująca kąt do strzału
        // ustawiamy flipX na podstawie kierunku myszy
        this._armatureDisplay.armature.flipX = this.dx < 0;

        this.handAngle = aimAngle;

        // jeśli flip = true, odwracamy kąt
        if (this._armatureDisplay.armature.flipX) {
            this.handAngle = Math.PI - this.aimAngle;
            if (this.handAngle > Math.PI) this.handAngle -= Math.PI * 2;
        }

        // ustawiamy rotację na kości
        this.forearmBone.offset.rotation = this.handAngle;
        this.forearmBone.invalidUpdate();
    }


    async setGun(gunId: number) {
        const slot = this._armature.getSlot('bone')!;

        try {
            const tex: PIXI.Texture = PIXI.Assets.get(`weapon_${gunId}`);
            const newDisplay = new PIXI.Sprite(tex);
            
            newDisplay.anchor.set(0.1, 0.4);
            newDisplay.scale.set(0.3);
            // Teksture musimy opakować w kontener po to żeby działało 
            // skalowanie romiaru broni
            const cont = new PIXI.Container();
            cont.zIndex = -1;
            cont.addChild(newDisplay);

            // Podmieniamy cały display na wrapper
            const list = slot.displayList;
            list[0] = cont;
            slot.displayList = list;
            slot.displayIndex = 0;

            slot.invalidUpdate();

        } catch (error) {
            console.error('Błąd podczas ustawiania tekstury broni:', error);
        }
    }

    shoot(shootSound: HTMLAudioElement) {
        if (!this.isAlive) return;
        if (!this.weaponBone) return;

        const localPos = new PIXI.Point(this.weaponBone.global.x, this.weaponBone.global.y);
        const globalPos = this._armatureDisplay.toGlobal(localPos);
        const startPos = this.viewport.toLocal(globalPos);

        const offset = this.shootingPointOffsetX; // odległość od ręki, z której wychodzi pocisk

        const offsetX = Math.cos(this.aimAngle) * offset;
        const offsetY = Math.sin(this.aimAngle) * offset;

        const collisions = Matter.Query.ray(this.psyhicsWorld.bodies, startPos, {
            x: startPos.x + offsetX,
            y: startPos.y + offsetY
        });

        const filtered = collisions.filter(collision => 
            collision.bodyA !== this.playerMatterBody && collision.bodyB !== this.playerMatterBody
        );

        if (filtered.length > 0) {
            // Jeżeli jest kolizja, nie strzelaj
            return;
        }

        const bullet = new Bullet(
            startPos.x + offsetX,
            startPos.y + offsetY,
            this.aimAngle,
            this.id || "undefined",
            this.parentContainer,
            this.psyhicsWorld
        );

        this.globalBulletList.push(bullet);

        this.gameRoom.send("shoot", { 
            angle: this.aimAngle,
            x: startPos.x + offsetX, 
            y: startPos.y + offsetY,
        });
        
        const shootSoundInstance = new Audio(shootSound.src);
        shootSoundInstance.volume = shootSound.volume;
        shootSoundInstance.play();
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

    drawPlayerName() {
        const nameY = this.bottom - this.height - 15;

        const text = new PIXI.Text({
            text: this.playerName,
            style: {
                fontFamily: 'Arial',
                fontSize: 20,
                fill: 0xFFFFFF
            }
        });
        text.y = nameY;
        text.anchor.set(0.5);
        this.playerContainer.addChild(text);
    }
    destroy() {
        if (this.playerMatterBody && this.psyhicsWorld) {
            Matter.Composite.remove(this.psyhicsWorld, this.playerMatterBody);
        }
        
        if (this.playerContainer && this.playerContainer.parent) {
            this.playerContainer.parent.removeChild(this.playerContainer);
        }
        
        if (this._armatureDisplay) {
            this._armatureDisplay.dispose();
        }
    }

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