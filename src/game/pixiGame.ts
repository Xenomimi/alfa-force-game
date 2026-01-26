import * as PIXI from 'pixi.js';
import { initDevtools } from '@pixi/devtools';
import { Viewport } from 'pixi-viewport';
import * as Matter from 'matter-js';
import { Room, getStateCallbacks } from 'colyseus.js';
import { Player } from "./pixiPlayer";
import { Bullet } from "./pixiBullet";
import { CameraController } from "./CameraController";
import mapData from "../assets/map3_data.json";
import { Weapon } from "../server/game/weapons";
import { HudState } from '../components/Game/GameComponent';
import { MapSchema } from '@colyseus/schema';
import { ScoreboardEntry } from '../components/Hud/GameHUD';
import { LevelSystem } from "../server/game/levelSystem";

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

type ControlBindings = {
    left: string;
    right: string;
    jump: string;
    crouch: string;
    crawl: string;
    reload: string;
    nade: string;
};

const DEFAULT_CONTROLS: ControlBindings = {
    left: "A",
    right: "D",
    jump: "SPACE",
    crouch: "CTRL",
    crawl: "C",
    reload: "R",
    nade: "G"
};

const CONTROL_STORAGE_KEY = "controls";
const SOUND_VOLUME_KEY = "soundVolume";

type PlayerSchema = {
    id: string;
    name: string;
    health: number;
    maxHealth: number;
    isAlive: boolean;
    deaths: number;
    kills: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    lastInputTick: number;
    currentWeaponId: number;
    ammo: number;
    jetpackEnergy: number;
    maxJetpackEnergy: number;
    accuracy: number;
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
    fixedDelta: number = 1000 / 144; // 16.67ms
    allWeapons: Record<number, Weapon> = {};
    userWeapons: number[] = [];
    isSwitchingWeapon: boolean = false;
    private lastPlayerPos: Point = { x: 1000, y: 300 }
    private shootSound!: HTMLAudioElement;
    private boundHandleKeyDown: (event: KeyboardEvent) => void;
    private boundHandleKeyUp: (event: KeyboardEvent) => void;
    private boundHandleMouseDown: (event: PointerEvent) => void;
    private boundHandleMouseUp: (event: PointerEvent) => void;
    private boundHandleMouseWheel: (event: WheelEvent) => void;
    private boundHandleCrosshairColorChange: (event: Event) => void;
    private boundHandleControlsChange: (event: Event) => void;
    private boundHandleAudioSettingsChange: (event: Event) => void;
    private crosshairColor: string = "#ffffff";
    private controls: ControlBindings = { ...DEFAULT_CONTROLS };
    private shootingInterval: NodeJS.Timeout | null = null;
    private fireRate: number = 1000; // domyślny czas między strzałami
    private jetpackEnergy: number = 100;
    private maxJetpackEnergy: number = 100;
    private jetpackDrainPerSecond: number = 35;
    private jetpackRechargePerSecond: number = 20;
    private jetpackThrust: number = -20;
    private latestInput: PlayerInputSchema = { left: false, right: false, jump: false };
    private inputSequence: number = 0;
    private pendingInputs: Array<{
        tick: number;
        input: {left: boolean, right: boolean, jump: boolean};
    }> = [];
    private currentWeaponIndex: number = 0;
    private serverPosition: any = { x: 1000, y: 300, dx: 0, dy: 0 };
    private serverTick: number = 0;
    private onHudUpdate?: (data: Partial<HudState>, scoreboard?: ScoreboardEntry[]) => void;

    constructor(containerElement: HTMLDivElement, room: Room<any>, onHudUpdate?: (data: Partial<HudState>, scoreboard?: ScoreboardEntry[]) => void) {
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        this.boundHandleMouseWheel = this.handleMouseWheel.bind(this);
        this.boundHandleCrosshairColorChange = this.handleCrosshairColorChange.bind(this);
        this.boundHandleControlsChange = this.handleControlsChange.bind(this);
        this.boundHandleAudioSettingsChange = this.handleAudioSettingsChange.bind(this);
        this.room = room;
        this.onHudUpdate = onHudUpdate;
        this.crosshairColor = this.getStoredCrosshairColor();
        this.controls = this.getStoredControls();
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
        this.room.onMessage("player_stats_update", (data: any) => {
            console.log("Otrzymano nagrodę:", data);

            // NOWA LOGIKA:
            // Obliczamy postęp na podstawie danych z serwera.
            // data.experience = obecne XP w pasku (np. 50)
            // data.nextLevelXP = wymagane XP na poziom (np. 1000)
            
            const maxXP = data.nextLevelXP || 1; // Zabezpieczenie przed dzieleniem przez 0
            const currentXP = data.experience || 0;
            
            // Proste obliczenie procentu (0-100)
            let calculatedProgress = (currentXP / maxXP) * 100;
            
            // Ograniczenie do zakresu 0-100 (dla bezpieczeństwa UI)
            calculatedProgress = Math.min(100, Math.max(0, calculatedProgress));

            if (this.onHudUpdate) {
                const updates: Partial<HudState> = {
                    level: data.level,
                    experience: currentXP,
                    nextLevelXP: maxXP,
                    levelProgress: calculatedProgress, // Przekazujemy obliczony %
                    addedXP: data.addedXP,
                    addedCoins: data.addedCoins
                };

                if (data.coins !== undefined) updates.coins = data.coins;
                if (data.cash !== undefined) updates.cash = data.cash;

                this.onHudUpdate(updates);
            }
        });

        // this.room.onMessage("weapon_switched", (newWeaponId: number) => {
        //     this.player.setGun(newWeaponId);
        //     this.player.playerWeaponId = newWeaponId; 
        //     this.currentWeaponIndex = this.userWeapons.indexOf(newWeaponId);
        //     this.fireRate = this.allWeapons[newWeaponId]?.fireInterval;
        //     if (this.onHudUpdate) {
        //         this.onHudUpdate({ weaponId: newWeaponId });
        //     }
        // });
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
            // this.drawDebugBodies();
            this.setupFPSCounter();
        })();
    }

    private broadcastScoreboard() {
        if (!this.onHudUpdate || !this.room) return;

        const scoreboardData: ScoreboardEntry[] = [];
        
        this.room.state.playerEntities.forEach((player: any, sessionId: string) => {
            scoreboardData.push({
                id: sessionId,
                name: player.name || "Unknown",
                kills: player.kills,
                deaths: player.deaths,
                ping: player.ping || 0,
                isMe: sessionId === this.room.sessionId
            });
        });

        // Sortowanie po zabójstwach
        scoreboardData.sort((a, b) => b.kills - a.kills);

        // Wysyłamy puste updates dla HUD, ale pełny scoreboard
        this.onHudUpdate({}, scoreboardData);
    }

    private addPlayer() {
        this.player = new Player(this.room?.sessionId, 1000, 300, this.gameContainer, this.world, false, this.bullets, this.room, this.viewport, this.userWeapons[0]);
        const speedX = 15;
        const jetpackThrust = this.jetpackThrust;

        this.app.ticker.add(() => {
            if (!this.player._armatureDisplay) return;
            // 1. Input
            const input = {
                left: this.isControlPressed(this.controls.left),
                right: this.isControlPressed(this.controls.right),
                jump: this.isControlPressed(this.controls.jump)
            };
            this.latestInput = input;
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
            const jetpackActive = input.jump && this.jetpackEnergy > 0;
            const adjustedInput = { ...input, jump: jetpackActive };
            this.applyInput(
                this.player.playerMatterBody,
                adjustedInput,
                speedX,
                jetpackThrust
            );
            // 5. Interpolacja wizualna PIXI -> MATTER  
            const currentPos = this.player.playerMatterBody.position;
            const alpha = Math.min(this.accumulator / this.fixedDelta, 1);
            this.player.playerContainer.x = this.player.x = this.lastPlayerPos.x + (currentPos.x - this.lastPlayerPos.x) * alpha;
            this.player.playerContainer.y = this.player.y = this.lastPlayerPos.y + (currentPos.y - this.lastPlayerPos.y) * alpha;
            this.player.setJetpackActive(jetpackActive);
            this.player.updateJetpackParticles(this.app.ticker.deltaMS / 1000);

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
            
            this.broadcastScoreboard();
            
            console.log("Player added:", sessionId, this.room!.sessionId);

            if (this.onHudUpdate) {
                this.onHudUpdate({ 
                    weaponId: player.currentWeaponId,
                    kills: player.kills,
                    deaths: player.deaths,
                    ammo: player.ammo,
                    maxAmmo: this.allWeapons[this.userWeapons[0]].amunition,
                    health: player.maxHealth,
                    maxHealth: player.maxHealth,
                    jetpackEnergy: player.jetpackEnergy,
                    maxJetpackEnergy: player.maxJetpackEnergy,
                 });
            }
            if (sessionId === this.room!.sessionId) {
                this.player.playerName = player.name || "Anon";
                this.player.drawPlayerName();
                if (player.accuracy !== undefined) {
                    this.player.accuracy = player.accuracy;
                }
                if (player.jetpackEnergy !== undefined) {
                    this.jetpackEnergy = player.jetpackEnergy;
                }
                if (player.maxJetpackEnergy !== undefined) {
                    this.maxJetpackEnergy = player.maxJetpackEnergy;
                }
                this.roomCallBacks(player).onChange(() => {

                    const updates: Partial<HudState> = {};

                    if (player.currentWeaponId !== undefined && player.currentWeaponId !== this.player.playerWeaponId) {
                        this.handleWeaponChange(player.currentWeaponId, updates);
                    }
                    if (player.ammo !== undefined) {
                        this.player.ammo = player.ammo; // synchronizacja lokalna
                        updates.ammo = player.ammo;  // do HUD
                    }

                    if (player.health !== undefined) updates.health = player.health;
                    if (player.maxHealth !== undefined) updates.maxHealth = player.maxHealth;
                    if (player.accuracy !== undefined) {
                        this.player.accuracy = player.accuracy;
                    }
                    if (player.jetpackEnergy !== undefined) {
                        this.jetpackEnergy = player.jetpackEnergy;
                        updates.jetpackEnergy = player.jetpackEnergy;
                    }
                    if (player.maxJetpackEnergy !== undefined) {
                        this.maxJetpackEnergy = player.maxJetpackEnergy;
                        updates.maxJetpackEnergy = player.maxJetpackEnergy;
                    }
                    
                    if (this.onHudUpdate && Object.keys(updates).length > 0) {
                        this.onHudUpdate(updates);
                    }
                    if (player.isAlive !== undefined) {
                        if (player.isAlive === false && this.player.isAlive) {
                            this.player.isAlive = false;
                            this.player.playerContainer.visible = false; // Ukryj gracza
                            console.log("Player died...");
                        } else if (player.isAlive === true && !this.player.isAlive) {
                            this.player.isAlive = true;
                            this.player.playerContainer.visible = true; // Pokaż gracza
                            console.log("Respawning player...");
                        }
                    }
                    if (player.reloadingWeapons !== undefined) this.player.reloadingWeapons = player.reloadingWeapons;
                    this.serverPosition = { x: player.x, y: player.y, dx: player.dx, dy: player.dy };
                    this.serverTick = player.lastInputTick || 0;

                });
                this.broadcastScoreboard();
                console.log("YOU joined:", sessionId);
            } else {
                // Tworzymy nowego gracza z pozycją z serwera
                const newPlayer = new Player(sessionId, player.x || 1000, player.y || 300, this.gameContainer, this.world, true, this.bullets, this.room, this.viewport, player.currentWeaponId);
                newPlayer.playerName = player.name || "Anon";
                newPlayer.drawPlayerName();
                if (player.accuracy !== undefined) {
                    newPlayer.accuracy = player.accuracy;
                }
                otherPlayers[sessionId] = newPlayer;
                newPlayer.positionBuffer = [];
                // Synchronizuj jego pozycję z serwera
                this.roomCallBacks(player).onChange(() => {
                    const other = otherPlayers[sessionId];
                    this.broadcastScoreboard();
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
                        if (player.accuracy !== undefined) {
                            other.accuracy = player.accuracy;
                        }
                        if (player.jetpackEnergy !== undefined) {
                            other.jetpackEnergy = player.jetpackEnergy;
                        }
                        if (player.maxJetpackEnergy !== undefined) {
                            other.maxJetpackEnergy = player.maxJetpackEnergy;
                        }
                        other.setJetpackActive(player.input.jump && player.jetpackEnergy > 0);
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
            this.broadcastScoreboard();
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
            // Usuń pocisk z lokalnej tablicy i świata fizyki
            console.log("Bullet removed:", bulletId);
        });
    }

    private handleWeaponChange(newWeaponId: number, updates: Partial<HudState>) {
        // 1. Aktualizacja fizyczna/wizualna gracza
        this.player.setGun(newWeaponId);
        this.player.playerWeaponId = newWeaponId;
        
        // 2. Aktualizacja logiki strzelania (lokalnie)
        this.currentWeaponIndex = this.userWeapons.indexOf(newWeaponId);
        const weaponStats = this.allWeapons[newWeaponId];
        
        if (weaponStats) {
            this.fireRate = weaponStats.fireInterval;
            // 3. Przygotowanie danych do HUD
            updates.weaponId = newWeaponId;
            updates.maxAmmo = weaponStats.amunition;
        }
    }

    private updateOtherPlayers() {
        const renderTime = Date.now() - 20; // 100ms opóźnienie dla płynności

        this.app.ticker.add(() => {
            const deltaSeconds = this.app.ticker.deltaMS / 1000;
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
                player.updateJetpackParticles(deltaSeconds);

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

    private getStoredControls(): ControlBindings {
        if (typeof window === "undefined") return { ...DEFAULT_CONTROLS };
        try {
            const stored = localStorage.getItem(CONTROL_STORAGE_KEY);
            if (!stored) return { ...DEFAULT_CONTROLS };
            const parsed = JSON.parse(stored) as Partial<ControlBindings>;
            const normalized = this.normalizeControls(parsed);
            return { ...DEFAULT_CONTROLS, ...normalized };
        } catch (err) {
            return { ...DEFAULT_CONTROLS };
        }
    }

    private getStoredPercent(key: string, fallback: number): number {
        if (typeof window === "undefined") return fallback;
        const raw = localStorage.getItem(key);
        const value = raw ? Number(raw) : NaN;
        if (!Number.isFinite(value)) return fallback;
        return Math.min(100, Math.max(0, value));
    }

    private getStoredSoundVolume(): number {
        const percent = this.getStoredPercent(SOUND_VOLUME_KEY, 60);
        return percent / 100;
    }

    private normalizeKeyLabel(value: string): string {
        if (value === " ") return "SPACE";
        const trimmed = value.trim();
        if (!trimmed) return "";
        const upper = trimmed.toUpperCase();

        if (upper === "SPACE" || upper === "SPACEBAR") return "SPACE";
        if (upper === "CTRL" || upper === "CONTROL") return "CTRL";
        if (upper === "SHIFT") return "SHIFT";
        if (upper === "ALT") return "ALT";
        if (upper === "ARROWLEFT" || upper === "LEFT") return "LEFT";
        if (upper === "ARROWRIGHT" || upper === "RIGHT") return "RIGHT";
        if (upper === "ARROWUP" || upper === "UP") return "UP";
        if (upper === "ARROWDOWN" || upper === "DOWN") return "DOWN";
        if (upper === "ESCAPE" || upper === "ESC") return "ESC";
        if (upper === "ENTER" || upper === "RETURN") return "ENTER";
        if (upper === "TAB") return "TAB";
        if (upper === "BACKSPACE") return "BACKSPACE";
        if (upper === "DELETE" || upper === "DEL") return "DELETE";

        if (upper.length === 1) return upper;
        return upper;
    }

    private normalizeControls(input: Partial<ControlBindings>): Partial<ControlBindings> {
        const normalized: Partial<ControlBindings> = {};
        (Object.keys(DEFAULT_CONTROLS) as Array<keyof ControlBindings>).forEach((key) => {
            const value = input[key];
            if (typeof value === "string") {
                const label = this.normalizeKeyLabel(value);
                if (label) {
                    normalized[key] = label;
                }
            }
        });
        return normalized;
    }

    private handleControlsChange(event: Event) {
        const detail = (event as CustomEvent).detail as Partial<ControlBindings> | undefined;
        if (!detail) return;
        const normalized = this.normalizeControls(detail);
        this.controls = { ...this.controls, ...normalized };
    }

    private handleAudioSettingsChange(event: Event) {
        const detail = (event as CustomEvent).detail as { sound?: number; music?: number } | undefined;
        if (!detail) return;
        if (detail.sound !== undefined && this.shootSound) {
            const clamped = Math.min(100, Math.max(0, detail.sound));
            this.shootSound.volume = clamped / 100;
        }
    }

    private isControlPressed(key: string): boolean {
        const normalized = this.normalizeKeyLabel(key);
        if (!normalized) return false;
        return !!keysPressed[normalized];
    }

    private getStoredCrosshairColor(): string {
        if (typeof window === "undefined") return "#ffffff";
        const stored = localStorage.getItem("crosshairColor");
        return stored && stored.trim().length > 0 ? stored : "#ffffff";
    }

    private handleCrosshairColorChange(event: Event) {
        const detail = (event as CustomEvent).detail;
        if (typeof detail === "string") {
            this.crosshairColor = detail;
        }
    }

    private parseCrosshairColor(color: string): number {
        const cleaned = color.replace("#", "").trim();
        if (cleaned.length === 3) {
            const expanded = cleaned.split("").map(c => c + c).join("");
            const parsed = Number.parseInt(expanded, 16);
            return Number.isNaN(parsed) ? 0xffffff : parsed;
        }
        if (cleaned.length === 6) {
            const parsed = Number.parseInt(cleaned, 16);
            return Number.isNaN(parsed) ? 0xffffff : parsed;
        }
        return 0xffffff;
    }

    private getCrosshairRadius(distance: number): number {
        const maxRadius = 18;
        const minRadius = 4;
        const accuracy = this.player?.accuracy ?? 0;
        const clamped = Math.max(0, Math.min(accuracy, 50));
        const t = clamped / 50;
        const baseRadius = maxRadius - (maxRadius - minRadius) * t;
        const maxDistance = 1500;
        const distanceT = Math.min(1, distance / maxDistance);
        const distancePenalty = 12 * distanceT;
        return baseRadius + distancePenalty;
    }
    
    
    private updateJetpackEnergy(input: PlayerInputSchema, deltaMs: number) {
        const deltaSeconds = deltaMs / 1000;
        const wantsJetpack = input.jump;
        const jetpackActive = wantsJetpack && this.jetpackEnergy > 0;

        if (jetpackActive) {
            this.jetpackEnergy = Math.max(0, this.jetpackEnergy - this.jetpackDrainPerSecond * deltaSeconds);
        } else if (!wantsJetpack) {
            this.jetpackEnergy = Math.min(
                this.maxJetpackEnergy,
                this.jetpackEnergy + this.jetpackRechargePerSecond * deltaSeconds
            );
        }
    }

    private applyInput(
        body: Matter.Body,
        input: {left: boolean, right: boolean, jump: boolean},
        speedX: number,
        jetpackThrust: number
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
            velocity.y = jetpackThrust;
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
                        const adjustedInput = { ...p.input, jump: p.input.jump && this.jetpackEnergy > 0 };
                        this.applyInput(this.player.playerMatterBody, adjustedInput, 15, this.jetpackThrust);
                    });
                }
                this.updateJetpackEnergy(this.latestInput, this.fixedDelta);

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
        // this.backgroundSprite.width = 3360;
        // this.backgroundSprite.height = 2538;
        // this.foregroundSprite.width = 3360;
        // this.foregroundSprite.height = 2538;

        this.backgroundSprite.width = 7056;
        this.backgroundSprite.height = 5328;
        this.foregroundSprite.width = 7056;
        this.foregroundSprite.height = 5328;
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
            // worldWidth: 3360,
            // worldHeight: 2538,
            worldWidth: 7056,
            worldHeight: 5328,


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
        this.shootSound.volume = this.getStoredSoundVolume();
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
        const circle = new PIXI.Graphics();
        container.addChild(circle);
        circle.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
        this.app.stage.hitArea = this.app.screen;
        this.app.ticker.add(() => {
            const global = this.app.renderer.events.pointer.global;
            let mousePosition = this.viewport.toLocal(global);
            this.mouseX = mousePosition.x;
            this.mouseY = mousePosition.y;
            const playerX = this.player?.x ?? mousePosition.x;
            const playerY = this.player?.y ?? mousePosition.y;
            const distance = Math.hypot(mousePosition.x - playerX, mousePosition.y - playerY);
            const maxDistance = 1500;
            const distanceT = Math.min(1, distance / maxDistance);
            const radius = this.getCrosshairRadius(distance);
            const length = 16 + distanceT * 12;
            const thickness = 5;
            const color = this.parseCrosshairColor(this.crosshairColor);
            circle.clear();
            circle.rect(-thickness / 2, -(radius + length), thickness, length).fill({ color, alpha: 0.9 });
            circle.rect(-thickness / 2, radius, thickness, length).fill({ color, alpha: 0.9 });
            circle.rect(-(radius + length), -thickness / 2, length, thickness).fill({ color, alpha: 0.9 });
            circle.rect(radius, -thickness / 2, length, thickness).fill({ color, alpha: 0.9 });
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
        document.addEventListener('pointerdown', this.boundHandleMouseDown);
        document.addEventListener('pointerup', this.boundHandleMouseUp);
        document.addEventListener('wheel', this.boundHandleMouseWheel);
        window.addEventListener('crosshair-color-changed', this.boundHandleCrosshairColorChange);
        window.addEventListener('controls-changed', this.boundHandleControlsChange);
        window.addEventListener('audio-settings-changed', this.boundHandleAudioSettingsChange);
    }

    private handleKeyDown(event: KeyboardEvent) {
        const normalized = this.normalizeKeyLabel(event.key);
        if (!normalized) return;
        keysPressed[normalized] = true;
    }

    private handleKeyUp(event: KeyboardEvent) {
        const normalized = this.normalizeKeyLabel(event.key);
        if (!normalized) return;
        keysPressed[normalized] = false;
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
        document.removeEventListener('wheel', this.boundHandleMouseWheel);
        window.removeEventListener('crosshair-color-changed', this.boundHandleCrosshairColorChange);
        window.removeEventListener('controls-changed', this.boundHandleControlsChange);
        window.removeEventListener('audio-settings-changed', this.boundHandleAudioSettingsChange);
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
                // graphics.poly(pixiPoints.flatMap(p => [p.x, p.y]), true).stroke({ width: 2, color: 0x0000ff, join: 'round' });

            } else {
                // graphics.rect(obj.x * scaleFactor, obj.y * scaleFactor, obj.width * scaleFactor, obj.height * scaleFactor)
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
        }
    }

    handlePlayerDeath() {
        
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


