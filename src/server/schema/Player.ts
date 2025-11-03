import { Schema, type } from "@colyseus/schema";

export class PlayerInput extends Schema {
  @type("boolean") left: boolean = false;
  @type("boolean") right: boolean = false;
  @type("boolean") jump: boolean = false;
}

export class Player extends Schema {
  @type("string") id: string = "";
  @type("number") health: number = 0;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") dx: number = 0;
  @type("number") dy: number = 0;
  @type("number") lastInputTick: number = 0; // Numer ostatniego przetworzonego inputu
  @type(PlayerInput) input = new PlayerInput();

  constructor(health: number) {
    super();
    this.health = health;
  }
}