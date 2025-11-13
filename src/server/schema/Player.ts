import { Schema, type } from "@colyseus/schema";

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
  @type("number") ammo = 30;

  @type(PlayerInput) input = new PlayerInput();

  constructor(sessionId: string, health: number, name: string) {
    super();
    this .id = sessionId;
    this.health = health;
    this.name = name;
  }

  // equipWeapon(weapon: any) {
  //   this.currentWeaponId = weapon.weaponId;
  //   this.damage = weapon.damage;
  //   this.maxAmmo = weapon.ammo ?? 30;
  //   this.currentAmmo = this.maxAmmo;
  // }
}