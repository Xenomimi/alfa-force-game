import { Schema, type } from "@colyseus/schema";

export class Bullet extends Schema {
    @type("string") id!: string;
    @type("string") playerId!: string;
    @type("number") aimAngle: number = 0;
    @type("number") x: number = 0;
    @type("number") y: number = 0;
}