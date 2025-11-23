import * as PIXI from 'pixi.js';
import { initDevtools } from '@pixi/devtools';
import { Viewport } from 'pixi-viewport';
import * as Matter from 'matter-js';
import { Room, getStateCallbacks } from 'colyseus.js';
import { Player } from "./pixiPlayer";
import { Bullet } from "./pixiBullet";
import { CameraController } from "./CameraController";
import mapData from "../assets/map_data.json";
import { Weapon } from "../server/game/weapons";
import { HudState } from '../components/Game/GameComponent';
import { MapSchema } from '@colyseus/schema';

const keysPressed: { [key: string]: boolean } = {};
const otherPlayers: { [id: string]: Player } = {};
const collisionLayer = mapData.layers.find((layer: any) => layer.name === "Warstwa Obiektu 1")!;
const collisionObjects = collisionLayer.objects!;

type Point = {
    x: number;
    y: number;
};

type PlayerInputSchema = {
    left: boolean;
    right: boolean;
    jump: boolean;
};

type PlayerSchema = {
    id: string;
    name: string;
    health: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    lastInputTick: number;
    currentWeaponId: number;
    ammo: number;
    maxAmmo: number;
    reloadingWeapons: MapSchema<boolean>;
    input: PlayerInputSchema;
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
    bullets: Bullet[] = [];
    room: Room<any>;
    roomCallBacks: any;
    accumulator: number = 0;
    fixedDelta: number = 1000 / 60; // 16.67ms
    allWeapons: Record<number, Weapon> = {};
    userWeapons: number[] = [];
    isSwitchingWeapon: boolean = false;
    private lastPlayerPos: Point = { x: 800, y: 300 }
    private shootSound!: HTMLAudioElement;
    private boundHandleKeyDown: (event: KeyboardEvent) => void;
    private boundHandleKeyUp: (event: KeyboardEvent) => void;
    private shootingInterval: NodeJS.Timeout | null = null;
    private fireRate: number = 1000; // domyślny czas między strzałami
    private inputSequence: number = 0;
    private pendingInputs: Array<{
        tick: number;
        input: {left: boolean, right: boolean, jump: boolean};
    }> = [];
    private currentWeaponIndex: number = 0;
    private serverPosition: any = { x: 800, y: 300, dx: 0, dy: 0 };
    private serverTick: number = 0;
    private onHudUpdate?: (data: Partial<HudState>) => void;

    constructor(containerElement: HTMLDivElement, room: Room<any>, onHudUpdate?: (data: Partial<HudState>) => void) {
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.room = room;
        this.onHudUpdate = onHudUpdate;
        this.room.onMessage("all_available_weapons", (weapons: Record<number, Weapon>) => {
            this.allWeapons = weapons;
            console.log("all_available_weapons received", this.allWeapons);
        });
        this.room.onMessage("available_weapons", (userWeapons: number[]) => {
            this.userWeapons = userWeapons;
            if (this.userWeapons.length > 0 && this.onHudUpdate) {
                 this.onHudUpdate({ weaponId: this.userWeapons[0] });// tymczasowe wartości amunicji
                 this.fireRate = this.allWeapons[this.userWeapons[0]].fireInterval;
            }
            console.log("user_weapons received", this.userWeapons);
        });

        this.room.onMessage("weapon_switched", (newWeaponId: number) => {
            this.player.setGun(newWeaponId);
            this.player.playerWeaponId = newWeaponId; 
            this.currentWeaponIndex = this.userWeapons.indexOf(newWeaponId);
            this.fireRate = this.allWeapons[newWeaponId]?.fireInterval;
            if (this.onHudUpdate) {
                this.onHudUpdate({ weaponId: newWeaponId });
            }
        });
        this.roomCallBacks = getStateCallbacks(this.room!);

        (async () => {
            this.app = new PIXI.Application();
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
            await this.loadAssets(this.allWeapons);
            this.setupContainers();
            this.addPsyhics();
            this.drawMap();
            this.addPlayer();
            this.addRoomEventHandlers();
            this.updateOtherPlayers()
            this.addCamera();
            this.setupEventListeners();
            this.createPointer(this.gameContainer);
            this.drawDebugBodies();
            this.setupFPSCounter();
        })();
    }

    private addPlayer() {
        this.player = new Player(this.room?.sessionId, 800, 300, this.gameContainer, this.world, false, this.bullets, this.room, this.viewport, this.userWeapons[0]);
        const speedX = 15;
        const jumpVelocity = -20;

        this.app.ticker.add(() => {
            if (!this.player._armatureDisplay) return;
            // 1. Input
            const input = {
                left: keysPressed['a'] || false,
                right: keysPressed['d'] || false,
                jump: keysPressed['w'] || false
            };
            // 2. Wyślij do serwera
            this.inputSequence++;
            this.room?.send("input", {
                ...input,
                tick: this.inputSequence,
                dx: this.player.dx,
                dy: this.player.dy
            });
            // 3. Zapisz do bufora
            this.pendingInputs.push({
                tick: this.inputSequence,
                input: {...input}
            });
            // Ogranicz rozmiar bufora
            if (this.pendingInputs.length > 20) {
                this.pendingInputs.shift();
            }
            // 4. Zastosuj input do fizyki (predykcja lokalna) – przenieś do fixed loopa, jeśli możesz
            this.applyInput(
                this.player.playerMatterBody,
                input,
                speedX,
                jumpVelocity
            );
            // 5. Interpolacja wizualna PIXI -> MATTER  
            const currentPos = this.player.playerMatterBody.position;
            const alpha = Math.min(this.accumulator / this.fixedDelta, 1);
            this.player.playerContainer.x = this.player.x = this.lastPlayerPos.x + (currentPos.x - this.lastPlayerPos.x) * alpha;
            this.player.playerContainer.y = this.player.y = this.lastPlayerPos.y + (currentPos.y - this.lastPlayerPos.y) * alpha;

            // 6. Animacje
            const moving = input.left || input.right;
            if (moving && this.player._armatureDisplay.animation.lastAnimationName !== "run") {
                this.player._armatureDisplay.animation.fadeIn("run", -1, -1, 0)!.resetToPose = true;
            } else if (!moving && this.player._armatureDisplay.animation.lastAnimationName !== "idle") {
                this.player._armatureDisplay.animation.fadeIn("idle", -1, -1, 0)!.resetToPose = true;
            }
            // 7. Kamera i reszta
            this.player.updateHandPosition(this.mouseX, this.mouseY, this.viewport);
            this.camera.setMouse(this.mouseX, this.mouseY);
            this.camera.update(this.app.ticker.deltaMS / 1000);
            this.updateBullets();
        });
    }

    private addRoomEventHandlers() {
        this.roomCallBacks(this.room!.state).playerEntities.onAdd((player: PlayerSchema, sessionId: string) => {
            const entity = new PIXI.Graphics().rect(0, 0, 36, 140).fill({color: 0x0000ff });
            entity.pivot.set(18, 70);
            this.testContainer.addChild(entity);
            console.log("Player added:", sessionId, this.room!.sessionId);
            if (sessionId === this.room!.sessionId) {
                this.roomCallBacks(player).onChange(() => {
                    if (this.onHudUpdate) {
                        const updates: Partial<HudState> = {};
                        if (player.ammo !== undefined) updates.ammo = player.ammo;
                        
                        if (player.currentWeaponId !== undefined) {
                            updates.weaponId = player.currentWeaponId;
                            const weaponStats = this.allWeapons[player.currentWeaponId];
                            if (weaponStats) {
                                updates.maxAmmo = weaponStats.amunition;
                            }
                        }

                        if (player.ammo !== undefined) this.player.ammo = player.ammo;
                        if (player.reloadingWeapons !== undefined) this.player.reloadingWeapons = player.reloadingWeapons;
                        if (player.health !== undefined) updates.health = player.health;

                        if (Object.keys(updates).length > 0) {
                            this.onHudUpdate(updates);
                        }
                    }
                    this.serverPosition = { x: player.x, y: player.y, dx: player.dx, dy: player.dy };
                    this.serverTick = player.lastInputTick || 0;

                });
                console.log("YOU joined:", sessionId);
            } else {
                // Tworzymy nowego gracza z pozycją z serwera
                const newPlayer = new Player(sessionId, player.x || 800, player.y || 300, this.gameContainer, this.world, true, this.bullets, this.room, this.viewport, player.currentWeaponId);
                otherPlayers[sessionId] = newPlayer;
                
                newPlayer.positionBuffer = [];
                // Synchronizuj jego pozycję z serwera
                this.roomCallBacks(player).onChange(() => {
                    const other = otherPlayers[sessionId];

                    if (player.currentWeaponId !== undefined && other.playerWeaponId !== player.currentWeaponId) {
                        console.log(`Gracz ${sessionId} zmienia broń na: ${player.currentWeaponId}`);
                        other.playerWeaponId = player.currentWeaponId;
                        other.setGun(player.currentWeaponId);
                    }

                    if (other && other.playerMatterBody) {
                        // Aktualizuj pozycję ciała fizycznego Matter.js
                        other.dx = player.dx;
                        other.dy = player.dy;
                        other.isMoving = player.input.left || player.input.right;
                        other.positionBuffer.push({
                                                x: player.x,
                                                y: player.y,
                                                dx: player.dx || 0,
                                                dy: player.dy || 0,
                                                timestamp: Date.now()
                                            });
                        
                        if (other.positionBuffer.length > 20) other.positionBuffer.shift();
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
        const renderTime = Date.now() - 20; // 100ms opóźnienie dla płynności

        this.app.ticker.add(() => {
            for (let id in otherPlayers) {
                const player = otherPlayers[id];
                if (!player || !player.positionBuffer) continue;

                // Znajdź dwie pozycje do interpolacji
                let pos0 = null;
                let pos1 = null;

                for (let i = 0; i < player.positionBuffer.length - 1; i++) {
                    if (player.positionBuffer[i].timestamp <= renderTime &&
                        player.positionBuffer[i + 1].timestamp >= renderTime) {
                        pos0 = player.positionBuffer[i];
                        pos1 = player.positionBuffer[i + 1];
                        break;
                    }
                }

                if (pos0 && pos1) {
                    // Interpolacja liniowa
                    const total = pos1.timestamp - pos0.timestamp;
                    const portion = (renderTime - pos0.timestamp) / total;

                    const interpolatedX = pos0.x + (pos1.x - pos0.x) * portion;
                    const interpolatedY = pos0.y + (pos1.y - pos0.y) * portion;

                    Matter.Body.setPosition(player.playerMatterBody, {
                        x: interpolatedX,
                        y: interpolatedY
                    });

                } else if (player.positionBuffer.length > 0) {
                    // Brak danych do interpolacji - użyj najnowszej pozycji
                    const latest = player.positionBuffer[player.positionBuffer.length - 1];
                    Matter.Body.setPosition(player.playerMatterBody, {
                        x: latest.x,
                        y: latest.y
                    });
                }

                // Synchronizuj PIXI z Matter.js
                player.playerContainer.x = player.x = player.playerMatterBody.position.x;
                player.playerContainer.y = player.y = player.playerMatterBody.position.y;
                player.updateRemoteHandPositionAngle();

                // Animacje
                if (!player._armatureDisplay || !player._armatureDisplay.animation) continue;
                
                if (player.isMoving && player._armatureDisplay.animation.lastAnimationName !== "run") {
                    player._armatureDisplay.animation.fadeIn("run", -1, -1, 0)!.resetToPose = true;
                } else if (!player.isMoving && player._armatureDisplay.animation.lastAnimationName !== "idle") {
                    player._armatureDisplay.animation.fadeIn("idle", -1, -1, 0)!.resetToPose = true;
                }
            }
        });
    }

    // Funkcja pomocnicza do aplikowania inputu
    private applyInput(
        body: Matter.Body,
        input: {left: boolean, right: boolean, jump: boolean},
        speedX: number,
        jumpVelocity: number
    ) {
        let velocity = { x: body.velocity.x, y: body.velocity.y };
        if (input.left) {
            velocity.x = -speedX;
        } else if (input.right) {
            velocity.x = speedX;
        } else {
            velocity.x = 0; // damping tylko bez ruchu
        }
        if (input.jump) {
            velocity.y = jumpVelocity;
        }
        Matter.Body.setVelocity(body, velocity);
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

        this.engine = Matter.Engine.create({gravity: { x: 0, y: 2.5 }});

        this.world = this.engine.world;

        this.app.ticker.add((ticker) => {
            this.accumulator += ticker.deltaMS;
            while (this.accumulator >= this.fixedDelta) {
                this.lastPlayerPos.x = this.player.playerMatterBody.position.x;
                this.lastPlayerPos.y = this.player.playerMatterBody.position.y;
                
                if (this.pendingInputs.length) {
                    this.pendingInputs.forEach(p => {
                        this.applyInput(this.player.playerMatterBody, p.input, 15, -20);
                    });
                }

                Matter.Engine.update(this.engine, this.fixedDelta);
                this.pendingInputs = this.pendingInputs.filter(p => p.tick > this.serverTick);

                if (this.serverPosition) {
                    const localPos = this.player.playerMatterBody.position;
                    const lerpFactor = 0.2;
                    const newX = localPos.x + (this.serverPosition.x - localPos.x) * lerpFactor;
                    const newY = localPos.y + (this.serverPosition.y - localPos.y) * lerpFactor;
                    Matter.Body.setPosition(this.player.playerMatterBody, { x: newX, y: newY });
                }
                this.accumulator -= this.fixedDelta;
            }
        });

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
        // this.backgroundContainer.cacheAsTexture(true);
        this.foregroundContainer.addChild(this.foregroundSprite);
        // this.foregroundContainer.cacheAsTexture(true);

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

    private async loadAssets(weapons: Record<number, Weapon>) {
        const baseAssets = [
            { alias: "background", src: "./map.jpg" },
            { alias: "foreground", src: "./foreground.png" },
        ];

        const weaponAssets = Object.values(weapons).map(weapon => {
            return {
                alias: `weapon_${weapon.id}`,
                src: `/weapons/${weapon.id}.png`
            };
        });

        const allAssets = [...baseAssets, ...weaponAssets];

        console.log("Loading assets:", allAssets);

        await PIXI.Assets.load(allAssets);

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
        const canShoot = () => {
             const currentWeaponIdStr = this.player.playerWeaponId.toString();
             const isReloading = this.player.reloadingWeapons?.get(currentWeaponIdStr);
             if (isReloading || this.player.ammo <= 0) {
                 return false;
             }
             return true;
        };

        if (!canShoot()) {
            console.log("Cannot shoot: reloading or empty.");
            return;
        }
        
        this.player.shoot(this.shootSound);

        if (!this.shootingInterval) { 
            this.shootingInterval = setInterval(() => {
                if (!canShoot()) {
                    return; 
                }
                this.player.shoot(this.shootSound);
            }, this.fireRate);
        }
    }

    private handleMouseUp() {
        if (this.shootingInterval) {
            clearInterval(this.shootingInterval);
            this.shootingInterval = null;
        }
    }

    private handleMouseWheel(event: WheelEvent) {
        if (this.isSwitchingWeapon || !this.userWeapons || this.userWeapons.length === 0) {
            return;
        }

        let direction: string | null = null;

        if (event.deltaY < 0) {
            direction = "next";
        } else if (event.deltaY > 0) {
            direction = "previous";
        }

        if (direction) {
            this.room.send("switch_weapon", { direction });
            this.isSwitchingWeapon = true;

            setTimeout(() => {
                this.isSwitchingWeapon = false;
            }, 50);
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.boundHandleKeyDown);
        document.addEventListener('keyup', this.boundHandleKeyUp);
        document.addEventListener('pointerdown', this.handleMouseDown.bind(this));
        document.addEventListener('pointerup', this.handleMouseUp.bind(this));
        document.addEventListener('wheel', this.handleMouseWheel.bind(this));
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
        document.removeEventListener('pointerdown', this.handleMouseDown.bind(this));
        document.removeEventListener('pointerup', this.handleMouseUp.bind(this));
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