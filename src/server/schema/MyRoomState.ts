import { Schema, MapSchema, type } from "@colyseus/schema";
import { Player } from "./Player.ts";
import { Bullet } from "./Bullet.ts";
import { GrenadePickup } from "./GrenadePickup.ts";
import { GrenadeProjectile } from "./GrenadeProjectile.ts";

export class MyRoomState extends Schema {
  @type({ map: Player }) playerEntities = new MapSchema<Player>();
  @type({ map: Bullet }) bulletEntities = new MapSchema<Bullet>();
  @type({ map: GrenadePickup }) grenadePickups = new MapSchema<GrenadePickup>();
  @type({ map: GrenadeProjectile }) grenadeProjectiles = new MapSchema<GrenadeProjectile>();
}
