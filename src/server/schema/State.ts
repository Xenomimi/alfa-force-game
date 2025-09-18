import { Schema, MapSchema, type } from "@colyseus/schema";
import { Player } from "./Player.ts";

export class State extends Schema {
    @type({ map: Player}) players = new MapSchema<Player>();

    createPlayer(id: string) {
        this.players.set(id, new Player());
    }

    removePlayer(id: string) {
        this.players.delete(id);
    }
}