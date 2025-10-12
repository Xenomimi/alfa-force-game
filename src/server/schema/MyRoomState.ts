import { Schema, MapSchema, type } from "@colyseus/schema";
import { Player } from "./Player.ts";
import { Bullet } from "./Bullet.ts";

export class MyRoomState extends Schema {
  @type({ map: Player }) playerEntities = new MapSchema<Player>();
  @type({ map: Bullet }) bulletEntities = new MapSchema<Bullet>();
}