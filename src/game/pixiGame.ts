import * as PIXI from 'pixi.js';
import { io, Socket } from "socket.io-client";
import { Player } from "./pixiPlayer";
import { Bullet } from "./pixiBullet";
import { CameraController } from "./CameraController";
import mapData from "../assets/map_data.json";
import { initDevtools } from '@pixi/devtools';

import { Viewport } from 'pixi-viewport';
import * as Matter from 'matter-js';

const socket: Socket = io('http://localhost:3000');
const keysPressed: { [key: string]: boolean } = {};
const otherPlayers: { [id: string]: Player } = {};
const collisionLayer = mapData.layers.find((layer: any) => layer.name === "Warstwa Obiektu 1")!;
const collisionObjects = collisionLayer.objects!;

type Point = {
    x: number;
    y: number;
};

export class Game {
    app!: PIXI.Application;
    engine!: Matter.Engine;
    world!: Matter.World;
    backgroundContainer!: PIXI.Container;
    gameContainer!: PIXI.Container;
    foregroundContainer!: PIXI.Container;
    testContainer!: PIXI.Container;
    viewport!: Viewport;
    backgroundSprite!: PIXI.Sprite;
    foregroundSprite!: PIXI.Sprite;
    camera!: CameraController;
    player!: Player;
    playerBody!: Matter.Body;
    prevPlayerPosition!: { x: number, y: number, mouseX: number, mouseY: number, leftThighAngle: number, rightThighAngle: number, legPhase: number };
    mouseX!: number;
    mouseY!: number;
    bullets!: Bullet[];
    private isRunning: boolean = false;
    private shootSound!: HTMLAudioElement;

    private boundHandleMouseDown: (event: MouseEvent) => void;
    private boundHandleMouseUp: (event: MouseEvent) => void;
    private boundHandleKeyDown: (event: KeyboardEvent) => void;
    private boundHandleKeyUp: (event: KeyboardEvent) => void;
    private shootingInterval: NodeJS.Timeout | null = null;

    constructor(containerElement: HTMLDivElement) {
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        (async () => {
            this.app = new PIXI.Application(); // ← pierwszy krok
            await this.app.init({
                width: 1920,
                height: 1080,
                resolution: window.devicePixelRatio || 1,
                autoStart: true,
                antialias: true
            });

            initDevtools({ app: this.app });
            containerElement.appendChild(this.app.canvas);
            this.setupCoreSystems();
            this.setupContainers();
            await this.loadAssets();
            this.addPsyhics();
            this.drawMap();
            this.addPlayer();
            this.addCamera();
            this.setupEventListeners();
            this.createPointer(this.gameContainer);
            this.drawDebugBodies();
            this.setupFPSCounter();
        })();
    }

    private addPlayer() {
        const playerHeight = 140;
        const playerWidth = 36;
        const playerBottom = playerHeight / 2 ;
        const speedX = 15;
        const jumpVelocity = -20;

        this.playerBody = Matter.Bodies.rectangle(820, 300, playerWidth, playerHeight, {
            label: 'player',
            inertia: Infinity,
            friction: 0.05,
            frictionStatic: 0,
            frictionAir: 0.02,
            restitution: 0,
            mass: 1
        });
        
        
        // const playerBodyGraphics = new PIXI.Graphics().rect(-25, -75, playerWidth, playerHeight).fill({ r: 0, g: 255, b: 0, a: 0.5 });

        this.player = new Player(socket, 0, playerBottom, this.gameContainer);

        Matter.Composite.add(this.world, this.playerBody);

        // this.testContainer.addChild(playerBodyGraphics);

        // Aktualizacje gracza
        this.app.ticker.add(() => {
            if (!this.player._armatureDisplay) return;
            let moving = false;
            this.player.playerContainer.x = this.playerBody.position.x;
            this.player.playerContainer.y = this.playerBody.position.y;
            // playerBodyGraphics.x = this.playerBody.position.x;
            // playerBodyGraphics.y = this.playerBody.position.y;
            // playerBodyGraphics.rotation = this.playerBody.angle;

            let velocity = { x: this.playerBody.velocity.x, y: this.playerBody.velocity.y };
            if (keysPressed['a']) {
                velocity.x = -speedX;
                moving = true;
            }
                
            if (keysPressed['d']) {
                velocity.x = speedX;
                moving = true;
            }
            if (keysPressed['w']) {
                velocity.y = jumpVelocity; 
            }
            
            if (!moving) {
                velocity.x *= 0.9;
                if (this.player._armatureDisplay.animation.lastAnimationName !== "idle") {
                    this.player._armatureDisplay.animation.fadeIn("idle", -1, -1, 0)!.resetToPose = true;
                }
            } else {
                if (this.player._armatureDisplay.animation.lastAnimationName !== "run") {
                    this.player._armatureDisplay.animation.fadeIn("run", -1, -1, 0)!.resetToPose = true;
                }
            }

            this.player.updateHandPosition(this.mouseX, this.mouseY, this.viewport);
            this.camera.setMouse(this.mouseX, this.mouseY);
            this.camera.update(this.app.ticker.deltaMS / 1000);
            this.updateBullets();
            Matter.Body.setVelocity(this.playerBody, velocity);
        });
    }

    private drawDebugBodies() {
        this.app.stage.sortableChildren = true;

        const debugGraphics = new PIXI.Graphics();
        debugGraphics.zIndex = 1000;

        const drawContainer: PIXI.Container = this.testContainer;
        drawContainer.addChild(debugGraphics);

        console.log('DEBUG: debugGraphics dodane do testContainer');

        this.app.ticker.add(() => {
            debugGraphics.clear();

            const bodies = Matter.Composite.allBodies(this.world);
            if (!bodies || bodies.length === 0) {
                console.log('DEBUG: brak ciał w matter world');
                return;
            }

            for (const body of bodies) {
                console.log('DEBUG: Drawing body:', body.label, 'position:', body.position, 'circleRadius:', (body as any).circleRadius);

                // Wypełnienie
                debugGraphics.beginFill(0x00ff00, 0.4);

                if ((body as any).circleRadius && (body as any).circleRadius > 0) {
                    // Dla okręgów (np. pociski)
                    debugGraphics.drawCircle(body.position.x, body.position.y, (body as any).circleRadius);
                } else {
                    // Dla wielokątów (np. gracz)
                    const part = body.parts[0];
                    if (part && part.vertices && part.vertices.length > 0) {
                        const v = part.vertices;
                        debugGraphics.moveTo(v[0].x, v[0].y);
                        for (let i = 1; i < v.length; i++) {
                            debugGraphics.lineTo(v[i].x, v[i].y);
                        }
                        debugGraphics.lineTo(v[0].x, v[0].y);
                        debugGraphics.closePath();
                    }
                }
                debugGraphics.endFill();

                // Czerwone obramowanie
                debugGraphics.lineStyle(2, 0xff0000, 1);
                debugGraphics.beginFill(0, 0);
                if ((body as any).circleRadius && (body as any).circleRadius > 0) {
                    debugGraphics.drawCircle(body.position.x, body.position.y, (body as any).circleRadius);
                } else {
                    const part = body.parts[0];
                    if (part && part.vertices && part.vertices.length > 0) {
                        const v = part.vertices;
                        debugGraphics.moveTo(v[0].x, v[0].y);
                        for (let i = 1; i < v.length; i++) {
                            debugGraphics.lineTo(v[i].x, v[i].y);
                        }
                        debugGraphics.lineTo(v[0].x, v[0].y);
                    }
                }
                debugGraphics.endFill();

                // Srodek cięzkosci
                debugGraphics.lineStyle(2);
                debugGraphics.beginFill(0x0000ff, 0.8);
                debugGraphics.drawCircle(body.position.x, body.position.y, 3);
                debugGraphics.endFill();
            }
        }, undefined, PIXI.UPDATE_PRIORITY.HIGH);
    }

    private addPsyhics() {

        // Nowa flaga ignoreGravity dla ciał w Matter.js
        Matter.Engine._bodiesApplyGravity = function(bodies, gravity) {
            var gravityScale = typeof gravity.scale !== 'undefined' ? gravity.scale : 0.001,
                bodiesLength = bodies.length;

            if ((gravity.x === 0 && gravity.y === 0) || gravityScale === 0) {
                return;
            }
            
            for (var i = 0; i < bodiesLength; i++) {
                var body = bodies[i];

                if (body.isStatic || body.isSleeping || body.ignoreGravity)
                    continue;

                // add the resultant force of gravity
                body.force.y += body.mass * gravity.y * gravityScale;
                body.force.x += body.mass * gravity.x * gravityScale;
            }
        };

        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 2.5 },
            positionIterations: 6,
            velocityIterations: 4,
            constraintIterations: 2
        });


        this.world = this.engine.world;
        console.log("TICKER DELTA", this.app.ticker.deltaMS);
        Matter.Runner.run(this.engine);
        this.app.ticker.add(() => {
            Matter.Engine.update(this.engine, this.app.ticker.deltaMS);
        }, undefined, PIXI.UPDATE_PRIORITY.HIGH);


        // Zdarzenia kolizji
        Matter.Events.on(this.engine, "collisionStart", (event) => {
            for (const pair of event.pairs) {
                const a = pair.bodyA;
                const b = pair.bodyB;

                if (a.label === "bullet" && b.label === "wall") {
                    (a as any).bulletRef.hasCollided = true;
                }
                if (b.label === "bullet" && a.label === "wall") {
                    (b as any).bulletRef.hasCollided = true;
                }

                if (a.label === "bullet" && b.label === "player") {
                    console.log("Hit player", b.id);
                    (a as any).bulletRef.hasCollided = true;
                }
                if (b.label === "bullet" && a.label === "player") {
                    console.log("Hit player", a.id);
                    (b as any).bulletRef.hasCollided = true;
                }
            }
        });
    }

    private setupContainers() {
        // Tworzenie kontenerów dla różnych warstw gry
        this.backgroundContainer = new PIXI.Container({label : 'backgroundContainer'});
        this.gameContainer = new PIXI.Container({label : 'gameContainer'});
        this.foregroundContainer = new PIXI.Container({label : 'foregroundContainer'});
        this.testContainer = new PIXI.Container({label: "TEST CONTAINER"});

        // Inicjalizacja sprite'ów dla tła i pierwszego planu
        this.backgroundSprite = new PIXI.Sprite();
        this.foregroundSprite = new PIXI.Sprite();

        // Dodanie sprite'ów do odpowiednich kontenerów
        this.backgroundContainer.addChild(this.backgroundSprite);
        this.foregroundContainer.addChild(this.foregroundSprite);

        this.viewport = new Viewport({
            screenWidth: this.app.canvas.width,
            screenHeight: this.app.canvas.height,
            worldWidth: 3360,
            worldHeight: 2538,
            ticker: this.app.ticker,
            events: this.app.renderer.events
        });

        this.app.stage.addChild(this.viewport);
        this.viewport.addChild(this.backgroundContainer);
        this.viewport.addChild(this.gameContainer);
        this.viewport.addChild(this.foregroundContainer);
        this.viewport.addChild(this.testContainer);

        this.viewport
            // .drag()
            // .pinch()
            // .decelerate()
            .wheel()
            .clamp({ direction: 'all' })
            .clampZoom({ minWidth: 1920, minHeight: 1080, maxWidth: 3360, maxHeight: 2538 });
    }

    private addCamera() {
        this.camera = new CameraController(this.viewport, this.playerBody);
    }

    private setupFPSCounter() {
        const fpsCounter = new PIXI.Text({
            style: {
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xff1010,
                align: 'center',
            }
        });
        fpsCounter.position.set(200, 200);

        this.app.stage.addChild(fpsCounter);

        let elapsed = 0;
        const updateInterval = 0.1; // w sekundach

        this.app.ticker.add((ticker: PIXI.Ticker) => {
            // delta w sekundach od ostatniej klatki
            const deltaSec = ticker.deltaMS / 1000;
            elapsed += deltaSec;

            if (elapsed >= updateInterval) {
                const fps = Math.round(ticker.FPS);
                fpsCounter.text = `FPS: ${fps}`;
                elapsed = 0;
            }
        });
    }

    private setupCoreSystems() {
        this.app.stage.eventMode = 'dynamic';

        // this.prevPlayerPosition = {
        //     x: this.player.x,
        //     y: this.player.y,
        //     mouseX: this.player.mouseX,
        //     mouseY: this.player.mouseY,
        //     leftThighAngle: this.player.leftThighAngle,
        //     rightThighAngle: this.player.rightThighAngle,
        //     legPhase: this.player.legPhase
        // };
        this.mouseX = 0;
        this.mouseY = 0;
        this.bullets = [];
        this.shootSound = new Audio('/snd_weapon_64.mp3');
        this.shootSound.volume = 0.05;

        // this.setupSocketListeners();
        this.setupEventListeners();
    }

    private async loadAssets() {
        await PIXI.Assets.load([
            { alias: 'background', src: './map.jpg' },
            { alias: 'foreground', src: './foreground.png' },
            { alias: 'gun', src: '/1654.png' }
        ]);

        this.backgroundSprite.texture = PIXI.Texture.from('background');
        this.foregroundSprite.texture = PIXI.Texture.from('foreground');
        this.backgroundSprite.width = 3360;
        this.backgroundSprite.height = 2538;
        this.foregroundSprite.width = 3360;
        this.foregroundSprite.height = 2538;

        // this.player.loadTextures();
        // for (let id in otherPlayers) {
        //     otherPlayers[id].loadTextures();
        // }
    }

    private createPointer(container: PIXI.Container) {
        const circle = new PIXI.Graphics().circle(0, 0, 8).fill({ color: 0xffffff }).stroke({ color: 0x111111, alpha: 0.87, width: 1 })
        container.addChild(circle);
        circle.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
        this.app.stage.hitArea = this.app.screen;
        this.app.ticker.add(() => {
            const global = this.app.renderer.events.pointer.global;
            let mousePosition = this.viewport.toLocal(global);
            this.mouseX = mousePosition.x;
            this.mouseY = mousePosition.y;
            circle.position.copyFrom(mousePosition);
        });
    }

    private handleMouseDown() {
        if (!this.player.isAlive) return;
        const armatureDisplay = this.player._armatureDisplay;
        const bone = this.player._armature.getBone("bone");
        if (!bone) return;

        const localPos = new PIXI.Point(bone.global.x, bone.global.y);
        const globalPos = armatureDisplay.toGlobal(localPos);
        const startPos = this.viewport.toLocal(globalPos);

        const offset = this.player.shootingPointOffsetX; // odległość od ręki, z której wychodzi pocisk

        const offsetX = Math.cos(this.player.aimAngle) * offset;
        const offsetY = Math.sin(this.player.aimAngle) * offset;


        const bullet = new Bullet(
            startPos.x + offsetX,
            startPos.y + offsetY,
            this.player.aimAngle,
            this.player.id,
            this.gameContainer,
            this.world
        );

        this.bullets.push(bullet);

        // socket.emit('player_shoot', {
        //     x: handPos.x,
        //     y: handPos.y,
        //     targetX: targetX,
        //     targetY: targetY,
        //     playerId: this.player.id
        // });

        const shootSoundInstance = new Audio(this.shootSound.src);
        shootSoundInstance.volume = this.shootSound.volume;
        shootSoundInstance.play();

        if (!this.shootingInterval) {
            this.shootingInterval = setInterval(() => {
                const localPos = new PIXI.Point(bone.global.x, bone.global.y);
                const globalPos = armatureDisplay.toGlobal(localPos);
                const startPos = this.viewport.toLocal(globalPos);

                const offset = this.player.shootingPointOffsetX; // odległość od ręki, z której wychodzi pocisk

                const offsetX = Math.cos(this.player.aimAngle) * offset;
                const offsetY = Math.sin(this.player.aimAngle) * offset;


                const bullet = new Bullet(
                    startPos.x + offsetX,
                    startPos.y + offsetY,
                    this.player.aimAngle,
                    this.player.id,
                    this.gameContainer,
                    this.world
                );

                this.bullets.push(bullet);
                // socket.emit('player_shoot', {
                //     x: handPos.x,
                //     y: handPos.y,
                //     targetX: targetX,
                //     targetY: targetY,
                //     playerId: this.player.id
                // });

                const shootSoundInstance = new Audio(this.shootSound.src);
                shootSoundInstance.volume = this.shootSound.volume;
                shootSoundInstance.play();
            }, 100);
        }
    }

    private handleMouseUp() {
        if (this.shootingInterval) {
            clearInterval(this.shootingInterval);
            this.shootingInterval = null;
        }
    }

    // setupSocketListeners() {
    //     socket.on('player_health_update', (data: { playerId: string, health: number }) => {
    //         if (data.playerId === this.player.id) {
    //             this.player.health = data.health;
    //         } else if (otherPlayers[data.playerId]) {
    //             otherPlayers[data.playerId].health = data.health;
    //         }
    //     });

    //     socket.on('player_move', (data) => {
    //         if (otherPlayers[data.id]) {
    //             otherPlayers[data.id].x = data.x;
    //             otherPlayers[data.id].y = data.y;
    //         }
    //     });

    //     socket.on('player_mouse_move', (data) => {
    //         if (otherPlayers[data.id]) {
    //             otherPlayers[data.id].mouseX = data.handX;
    //             otherPlayers[data.id].mouseY = data.handY;
    //         }
    //     });

    //     socket.on('player_respawned', (data) => {
    //         if (data.playerId === this.player.id) {
    //             this.player.health = data.health;
    //             this.player.isAlive = data.isAlive;
    //             this.player.x = data.x;
    //             this.player.y = data.y;
    //             this.player.leftThighAngle = data.leftThighAngle;
    //             this.player.rightThighAngle = data.rightThighAngle;
    //             this.player.legPhase = data.legPhase;
    //             this.player.headHitbox = data.headHitbox;
    //             this.player.torsoHitbox = data.torsoHitbox;
    //             this.player.legHitbox = data.legHitbox;
    //         } else if (otherPlayers[data.playerId]) {
    //             otherPlayers[data.playerId].health = data.health;
    //             otherPlayers[data.playerId].isAlive = data.isAlive;
    //             otherPlayers[data.playerId].x = data.x;
    //             otherPlayers[data.playerId].y = data.y;
    //             otherPlayers[data.playerId].leftThighAngle = data.leftThighAngle;
    //             otherPlayers[data.playerId].rightThighAngle = data.rightThighAngle;
    //             otherPlayers[data.playerId].legPhase = data.legPhase;
    //             otherPlayers[data.playerId].headHitbox = data.headHitbox;
    //             otherPlayers[data.playerId].torsoHitbox = data.torsoHitbox;
    //             otherPlayers[data.playerId].legHitbox = data.legHitbox;
    //         }
    //     });

    //     socket.on('current_players', (players) => {
    //         for (let id in players) {
    //             if (id === socket.id) {
    //                 this.player.id = id;
    //                 this.player.playerName = players[id].playerName;
    //                 this.player.x = players[id].x;
    //                 this.player.y = players[id].y;
    //                 this.player.mouseX = players[id].handX;
    //                 this.player.mouseY = players[id].handY;
    //                 this.player.headHitbox = players[id].headHitbox;
    //                 this.player.torsoHitbox = players[id].torsoHitbox;
    //                 this.player.legHitbox = players[id].legHitbox;
    //                 this.camera.follow(this.player);
    //             } else {
    //                 if (!otherPlayers[id]) {
    //                     otherPlayers[id] = new Player(socket, players[id].x, players[id].y, this.camera, this.container);
    //                     otherPlayers[id].loadTextures();
    //                 }
    //                 otherPlayers[id].id = id;
    //                 otherPlayers[id].playerName = players[id].playerName;
    //                 otherPlayers[id].x = players[id].x;
    //                 otherPlayers[id].y = players[id].y;
    //                 otherPlayers[id].mouseX = players[id].handX;
    //                 otherPlayers[id].mouseY = players[id].handY;
    //                 otherPlayers[id].headHitbox = players[id].headHitbox;
    //                 otherPlayers[id].torsoHitbox = players[id].torsoHitbox;
    //                 otherPlayers[id].legHitbox = players[id].legHitbox;
    //             }
    //         }
    //     });

    //     socket.on('update_position', (data) => {
    //         if (data.id !== socket.id && otherPlayers[data.id]) {
    //             const player = otherPlayers[data.id];
    //             player.x = data.x;
    //             player.y = data.y;
    //             player.leftThighAngle = data.leftThighAngle;
    //             player.rightThighAngle = data.rightThighAngle;
    //             player.legPhase = data.legPhase;
    //             player.headHitbox.x = data.headHitbox.x;
    //             player.headHitbox.y = data.headHitbox.y;
    //             player.torsoHitbox.x = data.torsoHitbox.x;
    //             player.torsoHitbox.y = data.torsoHitbox.y;
    //             player.legHitbox.x = data.legHitbox.x;
    //             player.legHitbox.y = data.legHitbox.y;
    //         }
    //     });

    //     socket.on('update_mouse_position', (data) => {
    //         if (data.id !== socket.id && otherPlayers[data.id]) {
    //             otherPlayers[data.id].mouseX = data.handX;
    //             otherPlayers[data.id].mouseY = data.handY;
    //         }
    //     });

    //     socket.on('new_bullet', (data: { x: number, y: number, targetX: number, targetY: number, playerId: string }) => {
    //         const bullet = new Bullet(
    //             data.x,
    //             data.y,
    //             data.targetX,
    //             data.targetY,
    //             data.playerId,
    //             collisionChecker,
    //             this.container
    //         );
    //         this.bullets.push(bullet);
    //     });

    //     socket.on('bullet_removed', (data: { index: number, playerId: string }) => {
    //         this.bullets = this.bullets.filter(bullet => 
    //             !(bullet.playerId === data.playerId && 
    //               bullet.isOffscreen(3360, 2538))
    //         );
    //     });

    //     socket.on('player_died', (data) => {
    //         const { playerId, killerId, deathTime } = data;
    //         if (playerId === this.player.id) {
    //             this.player.isAlive = false;
    //             this.player.deathTime = deathTime;
    //             this.player.killerId = killerId;
    //             this.player.deathAnimation.active = true;
    //             this.player.deathAnimation.progress = 0;
    //         } else if (otherPlayers[playerId]) {
    //             const deadPlayer = otherPlayers[playerId];
    //             deadPlayer.isAlive = false;
    //             deadPlayer.deathTime = deathTime;
    //             deadPlayer.killerId = killerId;
    //             deadPlayer.deathAnimation.active = true;
    //             deadPlayer.deathAnimation.progress = 0;
    //         }
    //     });

    //     socket.on('player_disconnected', (data: { id: string }) => {
    //         if (otherPlayers[data.id]) {
    //             otherPlayers[data.id].destroy();
    //             delete otherPlayers[data.id];
    //         }
    //     });
    // }

    setupEventListeners() {
        document.addEventListener('keydown', this.boundHandleKeyDown);
        document.addEventListener('keyup', this.boundHandleKeyUp);
        document.addEventListener('pointerdown', this.boundHandleMouseDown);
        document.addEventListener('pointerup', this.boundHandleMouseUp);
    }

    private handleKeyDown(event: KeyboardEvent) {
        keysPressed[event.key] = true;
    }

    private handleKeyUp(event: KeyboardEvent) {
        keysPressed[event.key] = false;
    }

    private isPlayerOnGround(): boolean {
        const startPoint = this.playerBody.position;
        const endPoint = {
            x: startPoint.x,
            y: startPoint.y + this.playerBody.bounds.max.y - this.playerBody.bounds.min.y // dodajemy trochę, żeby sprawdzić czy jest na ziemi
        };

        const collisions = Matter.Query.ray(
            this.world.bodies,
            startPoint,
            endPoint
        );

        return collisions.some(c => c.bodyA.label === 'ground');
    }

    removeEventListeners() {
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        document.removeEventListener('keyup', this.boundHandleKeyUp);
        document.removeEventListener('pointerdown', this.boundHandleMouseDown);
        document.removeEventListener('pointerup', this.boundHandleMouseUp);
        if (this.shootingInterval) {
            clearInterval(this.shootingInterval);
            this.shootingInterval = null;
        }
    }

    // checkAndEmitPosition() {
    //     if (!this.player.isAlive) return;

    //     const positionChanged = this.player.x !== this.prevPlayerPosition.x || 
    //                             this.player.y !== this.prevPlayerPosition.y;
    //     const legsChanged = this.player.leftThighAngle !== this.prevPlayerPosition.leftThighAngle || 
    //                         this.player.rightThighAngle !== this.prevPlayerPosition.rightThighAngle || 
    //                         this.player.legPhase !== this.prevPlayerPosition.legPhase;

    //     if (positionChanged || legsChanged) {
    //         socket.emit('player_move', {
    //             x: this.player.x, 
    //             y: this.player.y,
    //             leftThighAngle: this.player.leftThighAngle,
    //             rightThighAngle: this.player.rightThighAngle,
    //             legPhase: this.player.legPhase,
    //             headHitbox: { x: this.player.headHitbox.x, y: this.player.headHitbox.y },
    //             torsoHitbox: { x: this.player.torsoHitbox.x, y: this.player.torsoHitbox.y },
    //             legHitbox: { x: this.player.legHitbox.x, y: this.player.legHitbox.y }
    //         });

    //         this.prevPlayerPosition.x = this.player.x;
    //         this.prevPlayerPosition.y = this.player.y;
    //         this.prevPlayerPosition.leftThighAngle = this.player.leftThighAngle;
    //         this.prevPlayerPosition.rightThighAngle = this.player.rightThighAngle;
    //         this.prevPlayerPosition.legPhase = this.player.legPhase;
    //     }

    //     if (this.player.mouseX !== this.prevPlayerPosition.mouseX ||
    //         this.player.mouseY !== this.prevPlayerPosition.mouseY) {
    //         const worldMouseX = this.player.mouseX + this.camera.xView;
    //         const worldMouseY = this.player.mouseY + this.camera.yView;
    //         socket.emit('player_mouse_move', {
    //             handX: worldMouseX,
    //             handY: worldMouseY    
    //         });
    //         this.prevPlayerPosition.mouseX = this.player.mouseX;
    //         this.prevPlayerPosition.mouseY = this.player.mouseY;
    //     }
    // }

    start() {
        this.isRunning = true;
    }

    async stop() {
        this.isRunning = false;
        this.app.ticker.stop();
        this.removeEventListeners();
        socket.disconnect();
        this.app.stop();
        this.app.destroy(true);
    }


    drawMap() {
        const graphics = new PIXI.Graphics();
        const scaleFactor = 3;

        collisionObjects?.forEach((obj: any) => {
            if (obj.polygon) {

                // MATTER
                const matterPoints: Point[] = obj.polygon.map((point: Point) => ({
                    x: (obj.x + point.x) * scaleFactor,
                    y: (obj.y + point.y) * scaleFactor
                }));

                // Obliczanie środka wielokąta
                const vertices = matterPoints.map(p => ({ x: p.x, y: p.y }));
                const center = Matter.Vertices.centre(vertices);

                const mapElementBody = Matter.Bodies.fromVertices(
                    center.x,
                    center.y,   
                    [matterPoints],
                    { isStatic: true, label: 'wall' },
                );
                Matter.Composite.add(this.world, mapElementBody);
                
                // PIXI
                const pixiPoints: Point[] = obj.polygon.map((point: Point) => ({
                    x: (obj.x + point.x) * scaleFactor,
                    y: (obj.y + point.y) * scaleFactor
                }));
                graphics.poly(pixiPoints.flatMap(p => [p.x, p.y]), true).stroke({ width: 2, color: 0x0000ff, join: 'round' });

            } else {
                graphics.rect(obj.x * scaleFactor, obj.y * scaleFactor, obj.width * scaleFactor, obj.height * scaleFactor)
                const mapElementBody = Matter.Bodies.rectangle(
                    (obj.x + obj.width / 2) * scaleFactor,
                    (obj.y + obj.height / 2) * scaleFactor,
                    obj.width * scaleFactor,
                    obj.height * scaleFactor,
                    { isStatic: true, label: 'wall' }
                );
                Matter.Composite.add(this.world, mapElementBody);
            }
        });
        this.testContainer.addChild(graphics);
    }


    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();

            // if (this.player.isAlive && bullet.checkCollision(this.player) && this.player.id !== bullet.playerId) {
            //     this.handlePlayerHit(bullet.playerId);
            //     bullet.destroy();
            //     this.bullets.splice(i, 1);
            //     continue;
            // }

            // for (let id in otherPlayers) {
            //     const otherPlayer = otherPlayers[id];
            //     if (otherPlayer.isAlive && bullet.checkCollision(otherPlayer)) {
            //         socket.emit('player_hit', {
            //             hitPlayerId: otherPlayer.id,
            //             bulletPlayerId: bullet.playerId
            //         });
            //         bullet.destroy();
            //         this.bullets.splice(i, 1);
            //         break;
            //     }
            // }

            // if (bullet.shouldRemove(3360, 2538)) {
            //     bullet.destroy();
            //     this.bullets.splice(i, 1);
            // }
        }
    }

    // handlePlayerHit(shooterId: string, damage: number = 10) {
    //     if (!this.player.isAlive) return;

    //     if (this.player.takeDamage(damage)) {
    //         socket.emit('health_update', {
    //             playerId: this.player.id,
    //             health: this.player.health
    //         });

    //         if (!this.player.isAlive) {
    //             this.handlePlayerDeath(shooterId);
    //         }
    //     }
    // }

    // handlePlayerDeath(killerId: string) {
    //     this.player.deathTime = Date.now();
    //     this.player.killerId = killerId;

    //     socket.emit('player_death', {
    //         playerId: this.player.id,
    //         killerId: killerId,
    //         deathTime: this.player.deathTime
    //     });

    //     setTimeout(() => {
    //         const safePosition = this.findSafeRespawnPosition();
    //         const respawnX = safePosition.x;
    //         const respawnY = safePosition.y;

    //         this.player.respawn(respawnX, respawnY);

    //         socket.emit('player_respawn', {
    //             playerId: this.player.id,
    //             x: respawnX,
    //             y: respawnY,
    //             leftThighAngle: 0,
    //             rightThighAngle: 0,
    //             legPhase: 0,
    //             headHitbox: { x: respawnX, y: respawnY },
    //             torsoHitbox: { x: respawnX, y: respawnY + 12 },
    //             legHitbox: { x: respawnX, y: respawnY + 12 + 37 - 12 }
    //         });
    //     }, 5000);
    // }

    // findSafeRespawnPosition(): Point {
    //     const maxAttempts = 100;
    //     let attempts = 0;
    //     let respawnX, respawnY;

    //     do {
    //         respawnX = Math.random() * (3360 - this.player.width);
    //         respawnY = Math.random() * (2538 - this.player.height);

    //         const playerPolygon: Polygon = [
    //             { x: respawnX, y: respawnY },
    //             { x: respawnX + this.player.width, y: respawnY },
    //             { x: respawnX + this.player.width, y: respawnY + this.player.height },
    //             { x: respawnX, y: respawnY + this.player.height }
    //         ];

    //         attempts++;
    //         if (!collisionChecker.checkPlayerCollision(playerPolygon)) {
    //             return { x: respawnX, y: respawnY };
    //         }
    //     } while (attempts < maxAttempts);

    //     return { x: 850, y: 300 };
    // }
}