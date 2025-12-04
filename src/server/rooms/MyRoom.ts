import { Room, Client, AuthContext } from "@colyseus/core";
import { nanoid } from "nanoid";
import { Player } from "../schema/Player";
import { Bullet } from "../schema/Bullet";
import { MyRoomState } from "../schema/MyRoomState";
import mapData from "../../assets/map_data.json";
import Matter from 'matter-js';
import { JWT } from "@colyseus/auth"
import { JWT_SECRET } from "../routers/auth";
import { prisma } from "../index";
import { Weapons } from "../game/weapons";


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
    private moveSpeed = 15;
    private jumpVelocity = -20;
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
        const startX = 800;
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
        this.playerBodies.delete(client.sessionId);
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
                     prisma.playerProfile.update({
                        where: { id: killerClient.auth.profile.id },
                        data: {
                            experience: { increment: REWARDS.KILL_XP },
                            coins: { increment: REWARDS.KILL_COINS },
                            totalKills: { increment: 1 }
                        }
                    }).catch(err => console.error("DB Save Error (Killer):", err));
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
                Matter.Body.setPosition(bodyRef, { x: 800, y: 300 }); 
                Matter.Body.setVelocity(bodyRef, { x: 0, y: 0 });
                
                player.health = player.maxHealth;
                // Odnów amunicję w aktualnej broni
                const currentMag = Weapons[player.currentWeaponId]?.amunition || 30;
                player.weaponMagazines.set(player.currentWeaponId, currentMag);
                player.ammo = currentMag;
                
                player.isAlive = true;
            }
        }, 3000); // 3 sekundy respawn
    }

    updateEngine(deltaTime: number) {
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

                if (player.input.jump) {
                    velocity.y = this.jumpVelocity;
                }
                Matter.Body.setVelocity(body, velocity);
            }
        }
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
        Matter.Engine.update(this.physicsEngine, deltaTime);
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