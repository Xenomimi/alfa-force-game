import { Client, LobbyRoom } from "colyseus";

export class CustomLobbyRoom extends LobbyRoom {
    // `async` + Promise<void>
    async onCreate(options: any) {
        await super.onCreate(options);
        console.log("CustomLobbyRoom created!", options);
    }

    onJoin(client: Client, options: any) {
        super.onJoin(client, options);
        this.broadcast("numberOfPlayers", { message:  this.clients.length});
    }

    onLeave(client: Client) {
        super.onLeave(client);
        this.broadcast("numberOfPlayers", { message:  this.clients.length});
    }

    onDispose() {
        super.onDispose();
        console.log("CustomLobbyRoom disposed");
    }
}
