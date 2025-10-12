import * as PIXI from 'pixi.js';
import { initDevtools } from '@pixi/devtools';
import { Viewport } from 'pixi-viewport';
import * as Matter from 'matter-js';
import { Room, getStateCallbacks } from 'colyseus.js';

import { Player } from "./pixiPlayer";
import { Bullet } from "./pixiBullet";

import { CameraController } from "./CameraController";
import mapData from "../assets/map_data.json";



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
    mouseX!: number;
    mouseY!: number;
    bullets!: Bullet[];
    room: Room<any> | null;
    roomCallBacks: any;
    private shootSound!: HTMLAudioElement;
    private boundHandleMouseDown: (event: MouseEvent) => void;
    private boundHandleMouseUp: (event: MouseEvent) => void;
    private boundHandleKeyDown: (event: KeyboardEvent) => void;
    private boundHandleKeyUp: (event: KeyboardEvent) => void;
    private shootingInterval: NodeJS.Timeout | null = null;

    constructor(containerElement: HTMLDivElement, room: Room<any> | null) {
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.room = room;
        this.roomCallBacks = getStateCallbacks(this.room!);

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
            await this.loadAssets();
            this.setupContainers();
            this.addPsyhics();
            this.drawMap();
            this.addRoomEventHandlers();
            this.updateOtherPlayers()
            this.addPlayer();
            this.addCamera();
            this.setupEventListeners();
            this.createPointer(this.gameContainer);
            // this.drawDebugBodies();
            this.setupFPSCounter();
        })();
    }

    private addRoomEventHandlers() {
        this.roomCallBacks(this.room!.state).playerEntities.onAdd((player: any, sessionId: string) => {
            
            console.log("Player added:", sessionId, this.room!.sessionId);
            if (sessionId === this.room!.sessionId) {
                // this.roomCallBacks(player).onChange(() => {

                // });
                console.log("YOU joined:", sessionId);
            } else {
                // Tworzymy nowego gracza z pozycją z serwera
                const newPlayer = new Player(sessionId, player.x || 800, player.y || 300, this.gameContainer, this.world, true);
                otherPlayers[sessionId] = newPlayer;

                // Synchronizuj jego pozycję z serwera
                this.roomCallBacks(player).onChange(() => {
                    const other = otherPlayers[sessionId];
                    if (other && other.playerMatterBody) {
                        // Aktualizuj pozycję ciała fizycznego Matter.js
                        Matter.Body.setPosition(other.playerMatterBody, {
                            x: player.x,
                            y: player.y
                        });

                        other.dx = player.dx;
                        other.dy = player.dy;
                    }
                });
                console.log("Other player joined:", sessionId);
            }
        });

        this.roomCallBacks(this.room!.state).playerEntities.onRemove((player: any, sessionId: string) => {
            if (otherPlayers[sessionId]) {
                // Usuń gracza z kontenera i świata fizyki
                otherPlayers[sessionId].destroy();
                delete otherPlayers[sessionId];
            }
            console.log("Player left:", sessionId);
        });

        // Obługa zdarzeń dla pocisków
        this.roomCallBacks(this.room!.state).bulletEntities.onAdd((bullet: any) => {

            // Synchronizacja pozycji pocisków innych graczy
            if (bullet.playerId !== this.player.id) {
                const newBullet = new Bullet(
                    bullet.x,
                    bullet.y,
                    bullet.aimAngle,
                    bullet.playerId,
                    this.gameContainer,
                    this.world
                );
                this.bullets.push(newBullet);
            }
            //  else {
            //     // Synchronizuj jego pozycję z serwera
            //     this.roomCallBacks(player).onChange(() => {
            //         const other = otherPlayers[sessionId];
            //         if (other && other.playerMatterBody) {
            //             // Aktualizuj pozycję ciała fizycznego Matter.js
            //             Matter.Body.setPosition(other.playerMatterBody, {
            //                 x: player.x,
            //                 y: player.y
            //             });

            //             other.dx = player.dx;
            //             other.dy = player.dy;
            //         }
            //     });
            // }
        });

        this.roomCallBacks(this.room!.state).bulletEntities.onRemove((bullet: any, bulletId: string) => {
            console.log("Bullet removed:", bulletId);
        });
    }

    private updateOtherPlayers() {
        this.app.ticker.add(() => {
            for (let id in otherPlayers) {
                const player = otherPlayers[id];
                if (player && player.playerMatterBody && player.playerContainer) {
                    // Synchronizuj pozycję kontenera PIXI z ciałem Matter.js
                    player.playerContainer.x = player.playerMatterBody.position.x;
                    player.playerContainer.y = player.playerMatterBody.position.y;
                    
                    // Aktualizuj wewnętrzne właściwości gracza
                    player.x = player.playerContainer.x;
                    player.y = player.playerContainer.y;
                    player.updateRemoteHandPositionAngle();

                    // Jeśli gracz ma animację, możesz ją też zaktualizować
                    if (player._armatureDisplay) {
                        // Sprawdź czy gracz się porusza na podstawie prędkości
                        const velocity = player.playerMatterBody.velocity;
                        const isMoving = Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1;
                        
                        if (isMoving && player._armatureDisplay.animation.lastAnimationName !== "run") {
                            player._armatureDisplay.animation.fadeIn("run", -1, -1, 0)!.resetToPose = true;
                        } else if (!isMoving && player._armatureDisplay.animation.lastAnimationName !== "idle") {
                            player._armatureDisplay.animation.fadeIn("idle", -1, -1, 0)!.resetToPose = true;
                        }
                    }
                }
            }
        });
    }

    private addPlayer() {   
        this.player = new Player(this.room?.sessionId, 800, 300, this.gameContainer, this.world, false);

        const speedX = 15;
        const jumpVelocity = -20;



        // Aktualizacje gracza
        this.app.ticker.add(() => {
            if (!this.player._armatureDisplay) return;
            let moving = false;
            // Synchronizacja pozycji gracza, kontenera PIXI oraz ciała Matter.js
            this.player.x = this.player.playerContainer.x = Math.round(this.player.playerMatterBody.position.x);
            this.player.y = this.player.playerContainer.y = Math.round(this.player.playerMatterBody.position.y);
            // playerBodyGraphics.x = this.playerBody.position.x;
            // playerBodyGraphics.y = this.playerBody.position.y;
            // playerBodyGraphics.rotation = this.playerBody.angle;

            if (this.player.x !== this.player.prevPlayerPosition.x || 
                this.player.y !== this.player.prevPlayerPosition.y ||
                this.player.dx !== this.player.prevPlayerPosition.dx ||
                this.player.dy !== this.player.prevPlayerPosition.dy) {
                
                this.room?.send("move", { x: this.player.x, y: this.player.y, dx: this.player.dx, dy: this.player.dy });

                this.player.prevPlayerPosition.x = this.player.x;
                this.player.prevPlayerPosition.y = this.player.y;
                this.player.prevPlayerPosition.dx = this.player.dx;
                this.player.prevPlayerPosition.dy = this.player.dy;
            }

            let velocity = { x: this.player.playerMatterBody.velocity.x, y: this.player.playerMatterBody.velocity.y };
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
            Matter.Body.setVelocity(this.player.playerMatterBody, velocity);
        });
    }

    // private addPlayer() {   
    //     this.player = new Player(this.room?.sessionId, 800, 300, this.gameContainer, this.world, false);

    //     const speedX = 15;
    //     const jumpVelocity = -20;

    //     // Obiekt trzymający poprzedni stan inputów, żeby wysyłać tylko zmiany
    //     let prevInput = { left: false, right: false, jump: false };

    //     this.app.ticker.add(() => {
    //         if (!this.player._armatureDisplay) return;

    //         // --- 1. Odczyt inputów ---
    //         const input = {
    //             left: keysPressed['a'] || false,
    //             right: keysPressed['d'] || false,
    //             jump: keysPressed['w'] || false
    //         };

    //         // --- 2. Wysyłanie inputów do serwera tylko jeśli się zmieniły ---
    //         if (input.left !== prevInput.left || input.right !== prevInput.right || input.jump !== prevInput.jump) {
    //             this.room?.send("input", input);
    //             prevInput = { ...input };
    //         }

    //         // --- 3. Predykcja lokalna (client-side prediction) ---
    //         let velocity = { x: this.player.playerMatterBody.velocity.x, y: this.player.playerMatterBody.velocity.y };

    //         if (input.left) velocity.x = -speedX;
    //         else if (input.right) velocity.x = speedX;
    //         else velocity.x *= 0.9; // hamowanie jeśli brak ruchu

    //         if (input.jump) velocity.y = jumpVelocity;

    //         Matter.Body.setVelocity(this.player.playerMatterBody, velocity);

    //         // --- 4. Interpolacja pozycji do stanu z serwera ---
    //         const serverPlayer = this.room?.state.playerEntities.get(this.player.id);
    //         if (serverPlayer) {
    //             const diffX = serverPlayer.x - this.player.playerMatterBody.position.x;
    //             const diffY = serverPlayer.y - this.player.playerMatterBody.position.y;

    //             Matter.Body.setPosition(this.player.playerMatterBody, {
    //                 x: this.player.playerMatterBody.position.x + diffX * 0.2, // interpolacja 20%
    //                 y: this.player.playerMatterBody.position.y + diffY * 0.2
    //             });
    //         }

    //         // --- 5. Aktualizacja Pixi ---
    //         this.player.playerContainer.x = this.player.playerMatterBody.position.x;
    //         this.player.playerContainer.y = this.player.playerMatterBody.position.y;

    //         // Animacje
    //         const moving = input.left || input.right;
    //         if (moving) {
    //             if (this.player._armatureDisplay.animation.lastAnimationName !== "run") {
    //                 this.player._armatureDisplay.animation.fadeIn("run", -1, -1, 0)!.resetToPose = true;
    //             }
    //         } else {
    //             if (this.player._armatureDisplay.animation.lastAnimationName !== "idle") {
    //                 this.player._armatureDisplay.animation.fadeIn("idle", -1, -1, 0)!.resetToPose = true;
    //             }
    //         }

    //         // --- 6. Kamera i ręce ---
    //         this.player.updateHandPosition(this.mouseX, this.mouseY, this.viewport);
    //         this.camera.setMouse(this.mouseX, this.mouseY);
    //         this.camera.update(this.app.ticker.deltaMS / 1000);

    //         // --- 7. Predykcja pocisków ---
    //         this.updateBullets(); 
    //     });
    // }

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
                // console.log('DEBUG: Drawing body:', body.label, 'position:', body.position, 'circleRadius:', (body as any).circleRadius);

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

                body.force.y += body.mass * gravity.y * gravityScale;
                body.force.x += body.mass * gravity.x * gravityScale;
            }
        };

        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 2.5 },
            // positionIterations: 6,
            // velocityIterations: 4,
            // constraintIterations: 2
        });

        this.world = this.engine.world;

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
                if(a.label === "player" && b.label === "player") {
                    console.log("Player bump");
                }
            }
        });
    }

    private setupContainers() {
        this.backgroundSprite = new PIXI.Sprite();
        this.foregroundSprite = new PIXI.Sprite();
        // Tworzenie kontenerów dla różnych warstw gry
        this.backgroundSprite.texture = PIXI.Texture.from('background');
        this.foregroundSprite.texture = PIXI.Texture.from('foreground');
        this.backgroundSprite.width = 3360;
        this.backgroundSprite.height = 2538;
        this.foregroundSprite.width = 3360;
        this.foregroundSprite.height = 2538;

        this.backgroundContainer = new PIXI.Container({label : 'backgroundContainer'});
        this.gameContainer = new PIXI.Container({label : 'gameContainer'});
        this.foregroundContainer = new PIXI.Container({label : 'foregroundContainer'});
        this.testContainer = new PIXI.Container({label: "TEST CONTAINER"});

        // Dodanie sprite'ów do odpowiednich kontenerów
        this.backgroundContainer.addChild(this.backgroundSprite);
        this.backgroundContainer.cacheAsTexture(true);
        this.foregroundContainer.addChild(this.foregroundSprite);
        this.foregroundContainer.cacheAsTexture(true);

        // Kamera
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
        this.camera = new CameraController(this.viewport, this.player.playerMatterBody);
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
        this.mouseX = 0;
        this.mouseY = 0;
        this.bullets = [];
        this.shootSound = new Audio('/snd_weapon_64.mp3');
        this.shootSound.volume = 0.05;
        this.setupEventListeners();
    }

    private async loadAssets() {
        await PIXI.Assets.load([
            { alias: 'background', src: './map.jpg' },
            { alias: 'foreground', src: './foreground.png' },
            { alias: 'gun', src: '/1654.png' }
        ]);

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
            this.player.id || "undefined",
            this.gameContainer,
            this.world
        );

        this.bullets.push(bullet);

        this.room!.send("shoot", { 
            playerId: this.player.id, 
            angle: this.player.aimAngle,
            x: startPos.x + offsetX, 
            y: startPos.y + offsetY,
        });
        
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
                    "1",
                    this.gameContainer,
                    this.world
                );

                this.bullets.push(bullet);

                this.room!.send("shoot", { 
                    playerId: this.player.id, 
                    angle: this.player.aimAngle,
                    x: startPos.x + offsetX, 
                    y: startPos.y + offsetY,
                });

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

    async stop() {
        this.app.ticker.stop();
        this.removeEventListeners();
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
                    { isStatic: true, label: 'wall' }
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
        this.foregroundContainer.addChild(graphics);
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