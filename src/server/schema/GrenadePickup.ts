import { Schema, type } from "@colyseus/schema";

export class GrenadePickup extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;

  constructor(id: string, x: number, y: number) {
    super();
    this.id = id;
    this.x = x;
    this.y = y;
  }
}
