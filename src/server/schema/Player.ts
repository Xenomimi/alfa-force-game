import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerInput extends Schema {
  @type("boolean") left: boolean = false;
  @type("boolean") right: boolean = false;
  @type("boolean") jump: boolean = false;
}

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") name: string;
  @type("number") health: number = 0;

  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") dx: number = 0;
  @type("number") dy: number = 0;
  @type("number") lastInputTick: number = 0; // Numer ostatniego przetworzonego inputu

  @type("number") currentWeaponId: number = 1;
  @type("number") ammo: number = 30;
  @type("number") maxAmmo: number = 30;

  @type(PlayerInput) input = new PlayerInput();
  @type({ map: "boolean" }) reloadingWeapons = new MapSchema<boolean>();
  weaponMagazines: Map<number, number> = new Map();

  constructor(sessionId: string, health: number, name: string) {
    super();
    this .id = sessionId;
    this.health = health;
    this.name = name;
  }
}