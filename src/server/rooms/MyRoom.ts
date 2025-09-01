import { Room, Client } from "@colyseus/core";
import { State } from "../schema/State.ts";
import { Player } from "../Player.ts";
import { Schema, type, MapSchema } from "@colyseus/schema";

class MyRoomState extends Schema {
  @type("string") map = "Default Map";
  @type("number") players = 0;
}

export class MyRoom extends Room<MyRoomState> {
    // Called when the room is created
    onCreate(options: any) {
        this.state = new MyRoomState();
        console.log("🕹️  MyRoom created!", options);
    }
 
    // Called when a client joins the room
    onJoin(client: Client, options: any) {
        this.state.players++;
        console.log("Players in room:", this.state.players);
    }
 
    // Called when a client leaves the room
    onLeave(client: Client, options: any) {
        this.state.players--;
        console.log("Players in room:", this.state.players);
    }
 
    // Called when the room is disposed
    onDispose() { }
}