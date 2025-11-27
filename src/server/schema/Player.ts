import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerInput extends Schema {
  @type("boolean") left: boolean = false;
  @type("boolean") right: boolean = false;
  @type("boolean") jump: boolean = false;
}

export class Player extends Schema {
  // Informacyjne
  @type("string") id: string = "";
  @type("string") name: string;
  @type("number") health: number = 0;
  @type("number") maxHealth: number = 0;
  @type("boolean") isAlive: boolean = true;

  // Statystyki
  @type("number") deaths: number = 0;
  @type("number") kills: number = 0;
  @type("number") ping: number = 0;

  // Pozycja i ruch
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") dx: number = 0;
  @type("number") dy: number = 0;
  @type("number") lastInputTick: number = 0; // Numer ostatniego przetworzonego inputu

  // Broń
  @type("number") currentWeaponId: number = 1;
  @type("number") ammo: number = 30;
  @type({ map: "boolean" }) reloadingWeapons = new MapSchema<boolean>();

  // Sterowanie
  @type(PlayerInput) input = new PlayerInput();

  // Wewnętrzne
  weaponMagazines: Map<number, number> = new Map();

  constructor(sessionId: string, health: number, name: string) {
    super();
    this.id = sessionId;
    this.health = health;
    this.maxHealth = health;
    this.name = name;
  }
}