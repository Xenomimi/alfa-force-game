import { Schema, type } from "@colyseus/schema";
import Matter from "matter-js";

export class GrenadeProjectile extends Schema {
  @type("string") id: string = "";
  @type("string") playerId: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;

  radius: number = 12;
  speed: number = 34;
  physicsWorld: Matter.World;
  grenadeBody: Matter.Body;

  constructor(id: string, playerId: string, x: number, y: number, world: Matter.World) {
    super();
    this.id = id;
    this.playerId = playerId;
    this.x = x;
    this.y = y;
    this.physicsWorld = world;

    this.grenadeBody = Matter.Bodies.circle(x, y, this.radius, {
      label: "grenade",
      friction: 0.02,
      frictionAir: 0.015,
      restitution: 0.55,
      density: 0.002,
      collisionFilter: {
        category: 0x0004,
        mask: 0x0001
      }
    });

    Matter.Composite.add(this.physicsWorld, this.grenadeBody);
  }
}
