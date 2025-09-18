import { Room, Client } from "@colyseus/core";
import { Schema, type, MapSchema } from "@colyseus/schema";

import { Player } from "../schema/Player";

export class MyRoomState extends Schema {
  @type({ map: Player }) playerEntities = new MapSchema<Player>();
}

export class MyRoom extends Room<MyRoomState> {;
    
    constructor() {
        super();
        this.patchRate = 7; // ok. upds 144 / s
    }
    
    // Called when the room is created
    onCreate(options: any) {
        this.state = new MyRoomState();

        this.onMessage("move", (client, message) => {
            const player = this.state.playerEntities.get(client.sessionId);
            if (player) {
                player.x = message.x;
                player.y = message.y;
                player.dx = message.dx;
                player.dy = message.dy;
                // console.log(`Player ${player.id} moved to (${player.x}, ${player.y})`);
            }
        });

        console.log("🕹️  MyRoom created!", options);
    }
 
    // Called when a client joins the room
    onJoin(client: Client, options: any) {
        const newPlayer = new Player();
        newPlayer.id = client.sessionId;
        this.state.playerEntities.set(client.sessionId, newPlayer);
        console.log("Players in room:", this.state.playerEntities.size);
    }
 
    // Called when a client leaves the room
    onLeave(client: Client, options: any) {
        this.state.playerEntities.delete(client.sessionId);
        console.log("Players in room:", this.state.playerEntities.size);
    }
 
    // Called when the room is disposed
    onDispose() { }
}