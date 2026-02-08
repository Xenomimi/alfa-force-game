import { Room, Client, AuthContext } from "@colyseus/core";
import { nanoid } from "nanoid";
import { Player } from "../schema/Player";
import { Bullet } from "../schema/Bullet";
import { GrenadePickup } from "../schema/GrenadePickup";
import { GrenadeProjectile } from "../schema/GrenadeProjectile";
import { MyRoomState } from "../schema/MyRoomState";
import mapData from "../../assets/map3_data.json";
import Matter from 'matter-js';
import { JWT } from "@colyseus/auth"
import { JWT_SECRET } from "../routers/auth";
import { prisma } from "../index";
import { Weapons } from "../game/weapons";
import { LevelSystem } from "../game/levelSystem";

type Point = {
    x: number;
    y: number;
};

type JwtPayload = {
    userId: number;
};

type InventoryItem = {
    id: number;
    profileId: number;
    weaponId: number;
    equipped: boolean;
    acquiredAt: Date;
};

type Inventory = InventoryItem[];

type UserInfo = {
  id: number;
  email: string;
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    id: number;
    userId: number;
    level: number;
    experience: number;
    coins: number;
    cash: number;
    lastLogin: Date | null;
    stats: {
      id: number;
      profileId: number;
      health: number;
      armor: number;
      strength: number;
      agility: number;
      intelligence: number;
      accuracy: number;
    } | null;
    inventory: Inventory | null;
  } | null;
};

const REWARDS = {
    KILL_XP: 50,
    KILL_COINS: 10,
    WIN_XP: 500
};

export class MyRoom extends Room<MyRoomState> {
    
    private collisionObjects = mapData.layers.find((layer: any) => layer.name === "Warstwa Obiektu 1")!.objects;
    private physicsEngine: Matter.Engine;
    private world: Matter.World;
    private playerBodies: Map<string, Matter.Body> = new Map();
    private bulletBodies: Map<string, Matter.Body> = new Map();
    private grenadeBodies: Map<string, Matter.Body> = new Map();
    private moveSpeed = 15;
    private jetpackThrust = -20;
    private jetpackMaxEnergy = 100;
    private jetpackDrainPerSecond = 35;
    private jetpackRechargePerSecond = 20;
    private grenadeSpawnIntervalMs = 9000;
    private maxGroundGrenadePickups = 6;
    private grenadePickupCollectRadius = 34;
    private grenadeFuseMs = 1800;
    private grenadeThrowSpeed = 34;
    private grenadeExplosionRadius = 220;
    private grenadeExplosionMaxDamage = 70;
    private readonly mapScaleFactor = 3;
    private readonly worldWidth = mapData.width * this.mapScaleFactor;
    private readonly worldHeight = mapData.height * this.mapScaleFactor;
    private enlapsedTime = 0;
    private fixedTimeStep = 1000 / 60;

    constructor() {
        super();
        this.patchRate = 16; // ok. upds 144 / s
        this.physicsEngine = Matter.Engine.create({gravity: { x: 0, y: 2.5 }});
        this.world = this.physicsEngine.world;
    }
    
    // --- LOGIKA POKOJU ---

    onCreate(options: any) {

        this.initEngine();
        this.setSimulationInterval((deltaTime) => {
            this.enlapsedTime += deltaTime;
            while (this.enlapsedTime >= this.fixedTimeStep) {
                this.enlapsedTime -= this.fixedTimeStep;
                this.updateEngine(this.fixedTimeStep);
            }
        });
        this.createMap();
        this.state = new MyRoomState();
        this.addMessageHandlers();
        this.startGrenadeSpawner();
        console.log("🕹️  MyRoom created!", options);
    }
    
    static async onAuth(token: string, options: any, context: AuthContext): Promise<UserInfo> {
        console.log("🔐 Authenticating user with token:", token);
        
        if (!token) {
            throw new Error("Missing authentication token");
        }

        try {
            JWT.settings.secret = JWT_SECRET;
            console.log("Using JWT secret:", JWT.settings.secret);
            const userdata = await JWT.verify(token) as JwtPayload;

            // Tutaj po udanej weryfikacji możemy zwrócić dodatkowe dane użytkownika
            // z bazy danych, jeśli to konieczne vvvv.
            const userInfo = await prisma.user.findUniqueOrThrow({
                where: { id: userdata.userId }, 
                include: { 
                    profile: { 
                        include: {
                            stats: true, 
                            inventory: true 
                        }
                    } 
                } 
            });

            return userInfo;

        } catch (e: any) {
            // Logujemy szczegółowy błąd po stronie serwera
            console.error(`Authentication failed for token: ${token}`, e.message);
            
            // Rzucamy ogólny błąd, który zobaczy klient
            throw new Error("Invalid or expired token");
        }
    }
 
    onJoin(client: Client, options: any, auth: UserInfo) {

        console.dir(auth, { depth: null });

        if (!auth.profile || !auth.profile.stats) {
            throw new Error("Brak profilu lub statystyk dla użytkownika");
        }
        // Najpierw tworzymy ciało gracza w silniku fizyki
        const startX = 1000;
        const startY = 300;
        const playerWidth = 36;
        const playerHeight = 140;
        const playerMatterBody = Matter.Bodies.rectangle(startX, startY, playerWidth, playerHeight, {
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
        (playerMatterBody as any).sessionId = client.sessionId;
        Matter.Composite.add(this.world, playerMatterBody);
        this.playerBodies.set(client.sessionId, playerMatterBody);

        const playerState = new Player(
            client.sessionId, 
            auth.profile.stats.health,
            client.auth.username
        );
        playerState.accuracy = auth.profile.stats.accuracy;
        playerState.maxJetpackEnergy = this.jetpackMaxEnergy;
        playerState.jetpackEnergy = this.jetpackMaxEnergy;
        playerState.grenades = 0;

        const userInventory = auth.profile.inventory || [];
        const userWeaponIds = userInventory.map((item) => item.weaponId);

        if (userWeaponIds.length > 0) {
            playerState.currentWeaponId = userWeaponIds[0];
        }
        userWeaponIds.forEach(weaponId => {
            const stats = Weapons[weaponId];
            if (stats) {
                // Zapisz max ammo do pamięci podręcznej gracza
                playerState.weaponMagazines.set(weaponId, stats.amunition);
            }
        });
        if (userWeaponIds.length === 0 && Weapons[1]) {
            playerState.weaponMagazines.set(1, Weapons[1].amunition);
        }
        playerState.ammo = playerState.weaponMagazines.get(playerState.currentWeaponId) || 0;
        this.state.playerEntities.set(client.sessionId, playerState);
        
        client.send("all_available_weapons", Weapons);
        client.send("available_weapons", auth.profile.inventory?.map((item) => item.weaponId) || []);
    }
 
    onLeave(client: Client, options: any) {
        this.state.playerEntities.delete(client.sessionId);
        const body = this.playerBodies.get(client.sessionId);
        if (body) {
            Matter.Composite.remove(this.world, body);
        }
        this.playerBodies.delete(client.sessionId);
    }

    private startGrenadeSpawner() {
        this.clock.setInterval(() => {
            this.spawnGrenadePickup();
        }, this.grenadeSpawnIntervalMs);
    }

    private spawnGrenadePickup() {
        if (this.state.grenadePickups.size >= this.maxGroundGrenadePickups) return;

        const spawnPoint = this.findGrenadeSpawnPosition();
        if (!spawnPoint) return;

        const pickupId = nanoid();
        const pickup = new GrenadePickup(pickupId, spawnPoint.x, spawnPoint.y);
        this.state.grenadePickups.set(pickupId, pickup);
    }

    private findGrenadeSpawnPosition(): Point | null {
        const margin = 220;

        for (let i = 0; i < 40; i++) {
            const x = margin + Math.random() * (this.worldWidth - margin * 2);
            const y = margin + Math.random() * (this.worldHeight - margin * 2);
            if (this.isValidGrenadeSpawnPoint(x, y)) {
                return { x, y };
            }
        }

        return null;
    }

    private isValidGrenadeSpawnPoint(x: number, y: number): boolean {
        const point = { x, y };
        const pointCollisions = Matter.Query.point(Matter.Composite.allBodies(this.world), point);
        if (pointCollisions.some((body) => body.label === "wall")) {
            return false;
        }

        let tooCloseToPickup = false;
        this.state.grenadePickups.forEach((pickup) => {
            if (Math.hypot(pickup.x - x, pickup.y - y) < 140) {
                tooCloseToPickup = true;
            }
        });
        if (tooCloseToPickup) return false;

        let tooCloseToPlayer = false;
        for (const body of this.playerBodies.values()) {
            if (Math.hypot(body.position.x - x, body.position.y - y) < 180) {
                tooCloseToPlayer = true;
                break;
            }
        }

        return !tooCloseToPlayer;
    }

    // --- LOGIKA GRY ---

    startReload(player: Player, weaponId: number) {
        const weaponIdStr = weaponId.toString();

        if (player.reloadingWeapons.get(weaponIdStr)) return;

        const weaponStats = Weapons[weaponId];
        if (!weaponStats) {
            console.log("Weapon stats not found for id:", weaponId);
            return;
        }
        
        player.reloadingWeapons.set(weaponIdStr, true);

        this.clock.setTimeout(() => {
            player.weaponMagazines.set(weaponId, weaponStats.amunition);
            // Usuń flagę przeładowania
            player.reloadingWeapons.delete(weaponIdStr);
            if (player.currentWeaponId === weaponId) {
                player.ammo = weaponStats.amunition;
            }
            console.log(`Weapon ${weaponId} reloaded!`);
        }, weaponStats.reloadTime);
    }

    initEngine() {
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
        Matter.Events.on(this.physicsEngine, "collisionStart", (event) => {
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
                    this.handleBulletHit(a, b);
                }
                if (b.label === "bullet" && a.label === "player") {
                    this.handleBulletHit(b, a);
                }
            }
        });
    }

    handleBulletHit(bulletBody: Matter.Body, playerBody: Matter.Body) {
        const bullet = (bulletBody as any).bulletRef;
        if (!bullet) return;

        const bulletState = this.state.bulletEntities.get(bullet.id);
        if (!bulletState) return;

        const sessionId = (playerBody as any).sessionId;
        const hitPlayer = this.state.playerEntities.get(sessionId);
        if (!hitPlayer) return;

        // --- POPRAWKA 1: Jeśli gracz już nie żyje, ignorujemy trafienie ---
        if (!hitPlayer.isAlive) return; 

        hitPlayer.health -= bulletState.damage;
        console.log(`💥 Player ${hitPlayer.name} hit for ${bulletState.damage}. HP = ${hitPlayer.health}`);

        if (hitPlayer.health <= 0) {
            // --- POPRAWKA 2: Zabezpieczenie przed wielokrotnym wywołaniem śmierci ---
            hitPlayer.health = 0; // Zerujemy dla porządku
            this.handlePlayerDeath(hitPlayer, bulletState.playerId);
        }

        bullet.hasCollided = true;
    }

    async handlePlayerDeath(player: Player, killerId: string) {
        if (!player.isAlive) return; // Zabezpieczenie
        
        player.isAlive = false;
        player.deaths += 1;
        
        // 1. Logika Zabójcy (jeśli to nie samobójstwo)
        if (killerId && killerId !== player.id) {
            const killer = this.state.playerEntities.get(killerId);
            if (killer) {
                killer.kills += 1;
                console.log(`🔫 Killer: ${killer.name} (+${REWARDS.KILL_XP} XP, +${REWARDS.KILL_COINS} Coins)`);

                // Pobieramy klienta by mieć dostęp do auth data (jeśli trzymasz to w onJoin)
                const killerClient = this.clients.find(c => c.sessionId === killer.id);
                
                if (killerClient && killerClient.auth) {
                    // 1. Pobieramy aktualne dane z bazy, aby wiedzieć ile mamy XP
                    const currentProfile = await prisma.playerProfile.findUnique({
                        where: { id: killerClient.auth.profile.id }
                    });
                    if (currentProfile) {
                        // 1. Obliczamy nowy stan używając metody systemowej
                        const result = LevelSystem.calculateNewState(
                            currentProfile.level,
                            currentProfile.experience, 
                            REWARDS.KILL_XP
                        );
                        
                        const newTotalCoins = currentProfile.coins + REWARDS.KILL_COINS;
                        const newSkillPoints = (currentProfile.skillPoints || 0) + result.levelsGained;

                        // 2. Wysyłamy do klienta zaktualizowane dane
                        killerClient.send("player_stats_update", {
                            level: result.newLevel,
                            experience: result.newXP,           // Wysyłamy zresetowaną wartość (np. 15)
                            nextLevelXP: result.xpForNextLevel, // Maksimum paska (np. 200)
                            coins: newTotalCoins,
                            cash: currentProfile.cash,
                            skillPoints: newSkillPoints,
                            addedXP: REWARDS.KILL_XP,
                            addedCoins: REWARDS.KILL_COINS
                        });

                        // 3. Zapisujemy do bazy
                        await prisma.playerProfile.update({
                            where: { id: currentProfile.id },
                            data: {
                                experience: result.newXP,  // WAŻNE: Zapisujemy resztę, a nie sumę!
                                level: result.newLevel,
                                coins: newTotalCoins,
                                skillPoints: newSkillPoints,
                                totalKills: { increment: 1 }
                            }
                        }).catch(err => console.error("DB Save Error (Killer):", err));

                        console.log(`🔫 Killer: ${killer.name}. Lvl: ${currentProfile.level} -> ${result.newLevel}. XP: ${result.newXP}/${result.xpForNextLevel}`);

                        // 4. Obsługa awansu
                        if (result.leveledUp) {
                            killerClient.send("level_up", { newLevel: result.newLevel });
                        }
                    }
                }
            }
        }
    
        // 3. Zapisz śmierć ofiary w Bazie Danych
        const victimClient = this.clients.find(c => c.sessionId === player.id);
        if (victimClient && victimClient.auth) {
             prisma.playerProfile.update({
                where: { id: victimClient.auth.profile.id },
                data: {
                    totalDeaths: { increment: 1 }
                }
            }).catch(err => console.error("DB Save Error (Victim):", err));
        }

        // Fizyka: wyrzuć gracza poza mapę
        const body = this.playerBodies.get(player.id);
        if (body) {
            Matter.Body.setPosition(body, { x: -9999, y: -9999 });
            Matter.Body.setVelocity(body, { x: 0, y: 0 });
        }

        // 4. RESPAWN po czasie
        this.clock.setTimeout(() => {
            const bodyRef = this.playerBodies.get(player.id);
            if (bodyRef && this.state.playerEntities.has(player.id)) {
                // Tutaj warto dodać logikę bezpiecznego respawnu (losowe punkty na mapie)
                Matter.Body.setPosition(bodyRef, { x: 1000, y: 300 }); 
                Matter.Body.setVelocity(bodyRef, { x: 0, y: 0 });
                
                player.health = player.maxHealth;
                // Odnów amunicję w aktualnej broni
                const currentMag = Weapons[player.currentWeaponId]?.amunition || 30;
                player.weaponMagazines.set(player.currentWeaponId, currentMag);
                player.ammo = currentMag;
                player.jetpackEnergy = player.maxJetpackEnergy;
                
                player.isAlive = true;
            }
        }, 3000);
    }

    updateEngine(deltaTime: number) {
        const deltaSeconds = deltaTime / 1000;
        for (const [sessionId, body] of this.playerBodies.entries()) {
            const player = this.state.playerEntities.get(sessionId);
            if (player) {
                player.x = body.position.x;
                player.y = body.position.y;

                let velocity = { x: body.velocity.x, y: body.velocity.y };

                if (player.input.left) {
                    velocity.x = -this.moveSpeed;
                } else if (player.input.right) {
                    velocity.x = this.moveSpeed;
                } else {
                    velocity.x = 0;
                }
                // if (player.input.jump && body.velocity.y === 0) {
                //     velocity.y = this.jumpVelocity;
                // }

                const wantsJetpack = player.input.jump;
                const jetpackActive = wantsJetpack && player.jetpackEnergy > 0;

                if (jetpackActive) {
                    player.jetpackEnergy = Math.max(0, player.jetpackEnergy - this.jetpackDrainPerSecond * deltaSeconds);
                    velocity.y = this.jetpackThrust;
                } else if (!wantsJetpack) {
                    player.jetpackEnergy = Math.min(
                        player.maxJetpackEnergy,
                        player.jetpackEnergy + this.jetpackRechargePerSecond * deltaSeconds
                    );
                }
                Matter.Body.setVelocity(body, velocity);
            }
        }

        this.handleGrenadePickupCollection();

        for (const [bulletId, bulletBody] of this.bulletBodies.entries()) {
            const bulletState = this.state.bulletEntities.get(bulletId);
            if (bulletState) {
                bulletState.x = bulletBody.position.x;
                bulletState.y = bulletBody.position.y;
            }

            if ((bulletBody as any).bulletRef.hasCollided) {
                Matter.Composite.remove(this.world, bulletBody);
                this.bulletBodies.delete(bulletId);
                this.state.bulletEntities.delete(bulletId);
            }
        }

        for (const [grenadeId, grenadeBody] of this.grenadeBodies.entries()) {
            const grenadeState = this.state.grenadeProjectiles.get(grenadeId);
            if (!grenadeState) {
                Matter.Composite.remove(this.world, grenadeBody);
                this.grenadeBodies.delete(grenadeId);
                continue;
            }

            grenadeState.x = grenadeBody.position.x;
            grenadeState.y = grenadeBody.position.y;
        }

        Matter.Engine.update(this.physicsEngine, deltaTime);
    }

    private handleGrenadePickupCollection() {
        if (this.state.grenadePickups.size === 0) return;

        const pickupsToCollect: Array<{ pickupId: string; collector: Player }> = [];

        this.state.grenadePickups.forEach((pickup, pickupId) => {
            for (const [sessionId, player] of this.state.playerEntities.entries()) {
                if (!player.isAlive) continue;

                const body = this.playerBodies.get(sessionId);
                if (!body) continue;

                const distance = Math.hypot(body.position.x - pickup.x, body.position.y - pickup.y);
                if (distance <= this.grenadePickupCollectRadius) {
                    pickupsToCollect.push({ pickupId, collector: player });
                    break;
                }
            }
        });

        for (const entry of pickupsToCollect) {
            if (!this.state.grenadePickups.has(entry.pickupId)) continue;
            this.state.grenadePickups.delete(entry.pickupId);
            entry.collector.grenades += 1;
        }
    }

    private async explodeGrenade(grenadeId: string) {
        const grenadeState = this.state.grenadeProjectiles.get(grenadeId);
        const grenadeBody = this.grenadeBodies.get(grenadeId);
        if (!grenadeState || !grenadeBody) return;

        const centerX = grenadeBody.position.x;
        const centerY = grenadeBody.position.y;
        const ownerId = grenadeState.playerId;

        Matter.Composite.remove(this.world, grenadeBody);
        this.grenadeBodies.delete(grenadeId);
        this.state.grenadeProjectiles.delete(grenadeId);

        for (const [sessionId, player] of this.state.playerEntities.entries()) {
            if (!player.isAlive) continue;

            const body = this.playerBodies.get(sessionId);
            if (!body) continue;

            const distance = Math.hypot(body.position.x - centerX, body.position.y - centerY);
            if (distance > this.grenadeExplosionRadius) continue;

            const falloff = 1 - distance / this.grenadeExplosionRadius;
            const damage = Math.max(10, Math.round(this.grenadeExplosionMaxDamage * falloff));
            player.health -= damage;

            if (player.health <= 0) {
                player.health = 0;
                await this.handlePlayerDeath(player, ownerId);
            }
        }

        this.broadcast("grenade_explosion", {
            x: centerX,
            y: centerY,
            radius: this.grenadeExplosionRadius
        });
    }

    addMessageHandlers() {
        this.onMessage("input", (client, data) => {
            const player = this.state.playerEntities.get(client.sessionId);
            if (player) {
                player.input.left = data.left;
                player.input.right = data.right;
                player.input.jump = data.jump;
                player.lastInputTick = data.tick;
                player.dx = data.dx;
                player.dy = data.dy;
            }
        });

        this.onMessage("shoot", (client, data) => {
                const player = this.state.playerEntities.get(client.sessionId);
                if (!player) return;

                const weaponIdStr = player.currentWeaponId.toString();

                // 1. Jeśli ta konkretna broń się przeładowuje - STOP
                if (player.reloadingWeapons.get(weaponIdStr)) {
                    return;
                }

                // 2. Jeśli amunicja <= 0, spróbuj przeładować i STOP
                if (player.ammo <= 0) {
                    this.startReload(player, player.currentWeaponId);
                    return;
                }

                // 3. Strzał właściwy
                player.ammo -= 1;
                player.weaponMagazines.set(player.currentWeaponId, player.ammo);
                const bulletId = nanoid();
                const bulletState = new Bullet(
                    bulletId, 
                    player.id, 
                    data.x,
                    data.y,
                    data.angle,
                    Weapons[player.currentWeaponId].min_damage + 
                                        Math.floor(
                                            Math.random() * (
                                                Weapons[player.currentWeaponId].max_damage - Weapons[player.currentWeaponId].min_damage + 1
                                            )
                                        ),
                    this.world
                );

                this.bulletBodies.set(bulletId, bulletState.bulletBody);
                this.state.bulletEntities.set(bulletId, bulletState);

                if (player.ammo <= 0) {
                    this.startReload(player, player.currentWeaponId);
                }    
            }
        );

        this.onMessage("throw_grenade", (client, data) => {
            const player = this.state.playerEntities.get(client.sessionId);
            if (!player || !player.isAlive) return;
            if (player.grenades <= 0) return;

            const body = this.playerBodies.get(client.sessionId);
            if (!body) return;

            player.grenades -= 1;

            const rawAngle = typeof data?.angle === "number" ? data.angle : 0;
            const aimAngle = Number.isFinite(rawAngle) ? rawAngle : 0;
            const spawnX = body.position.x + Math.cos(aimAngle) * 45;
            const spawnY = body.position.y - 40 + Math.sin(aimAngle) * 45;

            const grenadeId = nanoid();
            const grenadeState = new GrenadeProjectile(
                grenadeId,
                player.id,
                spawnX,
                spawnY,
                this.world
            );

            this.state.grenadeProjectiles.set(grenadeId, grenadeState);
            this.grenadeBodies.set(grenadeId, grenadeState.grenadeBody);

            Matter.Body.setVelocity(grenadeState.grenadeBody, {
                x: Math.cos(aimAngle) * this.grenadeThrowSpeed + body.velocity.x * 0.35,
                y: Math.sin(aimAngle) * this.grenadeThrowSpeed - 6
            });

            this.clock.setTimeout(() => {
                void this.explodeGrenade(grenadeId);
            }, this.grenadeFuseMs);
        });

        this.onMessage("switch_weapon", (client, data) => {
            const player = this.state.playerEntities.get(client.sessionId);
            if (!player) return;

            const profileWeapons = client.auth.profile.inventory?.map((w: InventoryItem) => w.weaponId) ?? [];
            if (profileWeapons.length === 0) return;

            const currentId = player.currentWeaponId;
            const currentIndex = profileWeapons.indexOf(currentId);
            if (currentIndex === -1) return;

            let newIndex;
            if (data.direction === "next") {
                newIndex = (currentIndex + 1) % profileWeapons.length;
            } else {
                newIndex = (currentIndex - 1 + profileWeapons.length) % profileWeapons.length;
            }

            const newWeaponId = profileWeapons[newIndex];
            player.currentWeaponId = newWeaponId;

            // Wczytaj ammo z pamięci
            let savedAmmo = player.weaponMagazines.get(newWeaponId);
            if (savedAmmo === undefined) {
                 // Fallback do pełnego magazynka (pierwsze użycie)
                 savedAmmo = Weapons[newWeaponId]?.amunition || 0;
                 player.weaponMagazines.set(newWeaponId, savedAmmo);
            }
            player.ammo = savedAmmo;

            console.log(`🔄 Player ${player.name} switched weapon to ID: ${newWeaponId} (Ammo: ${player.ammo})`);

            // Jeśli wyciągnęliśmy pustą broń, która się NIE ładuje -> ładuj
            if (player.ammo <= 0 && !player.reloadingWeapons.get(newWeaponId.toString())) {
                this.startReload(player, newWeaponId);
            }

            // client.send("weapon_switched", newWeaponId);
        });
    }

    createMap() {
        const scaleFactor = 3;

        this.collisionObjects?.forEach((obj: any) => {
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

            } else {
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
    }
}
