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

type Point = {
    x: number;
    y: number;
};

type JwtPayload = {
    userId: number;
};

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
    inventory: {
      id: number;
      profileId: number;
      weaponId: number;
      equipped: boolean;
      acquiredAt: Date;
    }[] | null;
  } | null;
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
        Matter.Composite.add(this.world, playerMatterBody);
        this.playerBodies.set(client.sessionId, playerMatterBody);

        const playerState = new Player(client.sessionId, auth.profile.stats.health, client.auth.username);
        playerState.id = client.sessionId;
        this.state.playerEntities.set(client.sessionId, playerState);
    }
 
    onLeave(client: Client, options: any) {
        this.state.playerEntities.delete(client.sessionId);
        this.playerBodies.delete(client.sessionId);
    }

    // --- LOGIKA GRY ---

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
            if (player) {
                const bulletId = nanoid();
                const bulletState = new Bullet();
                bulletState.id = bulletId;
                bulletState.playerId = player.id;
                bulletState.x = data.x;
                bulletState.y = data.y;
                bulletState.aimAngle = data.angle;
                bulletState.damage = 0 // to ma być brane ze stałej listy z bazy
                this.state.bulletEntities.set(bulletId, bulletState);
            }
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