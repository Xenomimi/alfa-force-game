import * as PIXI from 'pixi.js';
import * as Matter from 'matter-js';

export class Bullet {
    x: number;
    y: number;
    speed: number;
    radius: number;
    playerId: string;
    trail: Array<{ x: number; y: number; alpha: number }>;
    angle: number;
    lastX: number;
    lastY: number;
    private hasCollided: boolean;
    private graphics: PIXI.Graphics;
    private parentContainer: PIXI.Container;
    private physicsWorld: Matter.World;
    private bulletBody!: Matter.Body;

    constructor(
        x: number,
        y: number,
        angle: number,
        playerId: string,
        parentContainer: PIXI.Container,
        physicsWorld: Matter.World
    ) {
        this.x = x;
        this.y = y;
        this.lastX = x;
        this.lastY = y;
        this.speed = 30;
        this.radius = 5;
        this.playerId = playerId;
        this.trail = [];
        this.hasCollided = false;
        this.parentContainer = parentContainer;
        this.physicsWorld = physicsWorld;

        this.angle = angle;

        // Matter
        this.bulletBody = Matter.Bodies.circle(x, y, this.radius, {
            isSensor: true,
            label: "bullet",
            inertia: Infinity,
            frictionAir: 0,
            collisionFilter: {
                category: 0x0002,
                mask: 0x0001
            }
        });

        this.bulletBody.ignoreGravity = true;

        Matter.Composite.add(this.physicsWorld, this.bulletBody);
        (this.bulletBody as any).bulletRef = this;

        Matter.Body.setVelocity(this.bulletBody, {
            x: Math.cos(this.angle) * this.speed,
            y: Math.sin(this.angle) * this.speed,
        });

        // PIXI
        this.graphics = new PIXI.Graphics();
        this.graphics.circle(0, 0, this.radius).stroke({width: 5,  color: 0xff0000 });
        this.graphics.x = this.x;
        this.graphics.y = this.y;
        this.parentContainer.addChild(this.graphics);
    }

    update() {
        if (this.hasCollided) {
            this.destroy();
            return;
        }

        this.lastX = this.x;
        this.lastY = this.y;

        // Pozycja z Matter.js
        this.x = this.bulletBody.position.x;
        this.y = this.bulletBody.position.y;

        this.graphics.x = this.x;
        this.graphics.y = this.y;
    }

    destroy() {
        this.parentContainer.removeChild(this.graphics);
        this.graphics.destroy();
        Matter.World.remove(this.physicsWorld, this.bulletBody);
    }
}