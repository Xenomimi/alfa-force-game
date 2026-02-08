import { Schema, type } from "@colyseus/schema";
import Matter from 'matter-js';

export class Bullet extends Schema {
    @type("string") id!: string;
    @type("string") playerId!: string;
    @type("number") aimAngle: number = 0;
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") damage: number = 0;

    radius: number = 5;
    speed: number = 50;
    physicsWorld: Matter.World;
    bulletBody: Matter.Body;

    constructor(id: string, playerId: string, x: number, y: number, aimAngle: number, damage: number, world: Matter.World) {
        super();
        this.id = id;
        this.playerId = playerId;
        this.x = x;
        this.y = y;
        this.aimAngle = aimAngle;
        this.damage = damage;
        this.physicsWorld = world;
        // Matter
        this.bulletBody = Matter.Bodies.circle(x, y, this.radius, {
            isSensor: true,
            label: "bullet",
            inertia: Infinity,
            frictionAir: 0
        });
        this.bulletBody.ignoreGravity = true;
        
        (this.bulletBody as any).bulletRef = this;

        Matter.Body.setVelocity(this.bulletBody, {
            x: Math.cos(this.aimAngle) * this.speed,
            y: Math.sin(this.aimAngle) * this.speed,
        });    
        Matter.Composite.add(this.physicsWorld, this.bulletBody);
    }
}