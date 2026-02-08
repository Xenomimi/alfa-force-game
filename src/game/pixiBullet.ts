import * as PIXI from 'pixi.js';
import * as Matter from 'matter-js';

export class Bullet {
    x: number;
    y: number;
    speed: number;
    radius: number;
    playerId: string;
    angle: number;
    lastX: number;
    lastY: number;
    private hasCollided: boolean;
    private destroyed: boolean;
    private headGraphics: PIXI.Graphics;
    private trailMesh: PIXI.MeshRope;
    private historyX: number[];
    private historyY: number[];
    private ropePoints: PIXI.Point[];
    private historySize: number;
    private ropeSize: number;
    private parentContainer: PIXI.Container;
    private physicsWorld: Matter.World;
    private bulletBody!: Matter.Body;
    private static trailTexture: PIXI.Texture | null = null;

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
        this.speed = 50;
        this.radius = 3;
        this.playerId = playerId;
        this.hasCollided = false;
        this.destroyed = false;
        this.parentContainer = parentContainer;
        this.physicsWorld = physicsWorld;
        this.historySize = 18;
        this.ropeSize = 24;
        this.angle = angle;
        this.historyX = [];
        this.historyY = [];
        this.ropePoints = [];

        for (let i = 0; i < this.historySize; i++) {
            this.historyX.push(x);
            this.historyY.push(y);
        }
        for (let i = 0; i < this.ropeSize; i++) {
            this.ropePoints.push(new PIXI.Point(x, y));
        }

        // Matter
        this.bulletBody = Matter.Bodies.circle(x, y, this.radius, {
            isSensor: true,
            label: "bullet",
            inertia: Infinity,
            frictionAir: 0
        });

        this.bulletBody.ignoreGravity = true;

        Matter.Composite.add(this.physicsWorld, this.bulletBody);
        (this.bulletBody as any).bulletRef = this;

        Matter.Body.setVelocity(this.bulletBody, {
            x: Math.cos(this.angle) * this.speed,
            y: Math.sin(this.angle) * this.speed,
        });

        // PIXI trail: styl inspirowany mesh mouse-trail.
        this.trailMesh = new PIXI.MeshRope({
            texture: Bullet.getTrailTexture(),
            points: this.ropePoints,
            textureScale: 0
        });
        this.trailMesh.blendMode = 'add';
        this.trailMesh.alpha = 0.95;

        this.headGraphics = new PIXI.Graphics();
        this.headGraphics.circle(0, 0, this.radius + 1.2).fill({ color: 0xffffff, alpha: 0.9 });
        this.headGraphics.circle(0, 0, this.radius + 3.4).stroke({ width: 2, color: 0x9be7ff, alpha: 0.8 });
        this.headGraphics.x = this.x;
        this.headGraphics.y = this.y;

        this.parentContainer.addChild(this.trailMesh);
        this.parentContainer.addChild(this.headGraphics);
    }

    update() {
        if (this.destroyed) return;

        if (this.hasCollided) {
            this.destroy();
            return;
        }

        this.lastX = this.x;
        this.lastY = this.y;

        // Pozycja z Matter.js
        this.x = this.bulletBody.position.x;
        this.y = this.bulletBody.position.y;

        this.historyX.pop();
        this.historyX.unshift(this.x);
        this.historyY.pop();
        this.historyY.unshift(this.y);

        for (let i = 0; i < this.ropeSize; i++) {
            const p = this.ropePoints[i];
            const t = (i / this.ropeSize) * this.historySize;
            p.x = this.cubicInterpolation(this.historyX, t, 1);
            p.y = this.cubicInterpolation(this.historyY, t, 1);
        }

        this.headGraphics.x = this.x;
        this.headGraphics.y = this.y;
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;

        this.parentContainer.removeChild(this.trailMesh);
        this.parentContainer.removeChild(this.headGraphics);
        this.trailMesh.destroy();
        this.headGraphics.destroy();
        Matter.World.remove(this.physicsWorld, this.bulletBody);
    }

    isDestroyed() {
        return this.destroyed;
    }

    private static getTrailTexture(): PIXI.Texture {
        if (Bullet.trailTexture) return Bullet.trailTexture;

        const width = 128;
        const height = 20;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');

        if (context) {
            const horizontal = context.createLinearGradient(0, 0, width, 0);
            horizontal.addColorStop(0, 'rgba(255, 255, 255, 1)');
            horizontal.addColorStop(0.35, 'rgba(120, 220, 255, 0.85)');
            horizontal.addColorStop(1, 'rgba(120, 220, 255, 0)');
            context.fillStyle = horizontal;
            context.fillRect(0, 0, width, height);

            context.globalCompositeOperation = 'destination-in';
            const verticalMask = context.createLinearGradient(0, 0, 0, height);
            verticalMask.addColorStop(0, 'rgba(255,255,255,0)');
            verticalMask.addColorStop(0.5, 'rgba(255,255,255,1)');
            verticalMask.addColorStop(1, 'rgba(255,255,255,0)');
            context.fillStyle = verticalMask;
            context.fillRect(0, 0, width, height);
            context.globalCompositeOperation = 'source-over';
        }

        Bullet.trailTexture = PIXI.Texture.from(canvas);
        return Bullet.trailTexture;
    }

    private clipInput(k: number, arr: number[]) {
        let index = k;
        if (index < 0) index = 0;
        if (index > arr.length - 1) index = arr.length - 1;
        return arr[index];
    }

    private getTangent(k: number, factor: number, array: number[]) {
        return (factor * (this.clipInput(k + 1, array) - this.clipInput(k - 1, array))) / 2;
    }

    private cubicInterpolation(array: number[], t: number, tangentFactor = 1) {
        const k = Math.floor(t);
        const m = [
            this.getTangent(k, tangentFactor, array),
            this.getTangent(k + 1, tangentFactor, array)
        ];
        const p = [this.clipInput(k, array), this.clipInput(k + 1, array)];
        const x = t - k;
        const x2 = x * x;
        const x3 = x2 * x;

        return (
            (2 * x3 - 3 * x2 + 1) * p[0] +
            (x3 - 2 * x2 + x) * m[0] +
            (-2 * x3 + 3 * x2) * p[1] +
            (x3 - x2) * m[1]
        );
    }
}
