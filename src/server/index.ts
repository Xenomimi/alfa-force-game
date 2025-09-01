import { Server, LobbyRoom, Client, Room } from "colyseus";
import { uWebSocketsTransport } from "@colyseus/uwebsockets-transport";
import { MyRoom } from "./rooms/MyRoom";

const port = Number(process.env.PORT) || 2567;

const gameServer = new Server({
  transport: new uWebSocketsTransport(),
});

gameServer.define("lobby", LobbyRoom)
  .on("create", (room: LobbyRoom) => console.log(`----------| NOWE LOBBY |---------- \n🌐  Lobby room created: \x1b[36m${room.roomId}\x1b[0m`))
  .on("join", (room: LobbyRoom, client: Client) => console.log(`🌐 Gracz \x1b[32m${client.sessionId}\x1b[0m dołączył do lobby \x1b[36m${room.roomId}\x1b[0m`))
  .on("leave", (room: LobbyRoom, client: Client) => console.log(`🌐 Gracz \x1b[32m${client.sessionId}\x1b[0m opuścił lobby \x1b[36m${room.roomId}\x1b[0m`))
  .on("dispose", (room: LobbyRoom) => console.log(`🌐 Lobby room disposed: \x1b[36m${room.roomId}\x1b[0m`));

gameServer.define("player_room", MyRoom)
  .on("create", (room: Room) => console.log(`🏠 Player room created: \x1b[31m${room.roomId}\x1b[0m`))
  .on("join", (room: Room, client: Client) => console.log(`🏠 Gracz \x1b[32m${client.sessionId}\x1b[0m dołączył do pokoju \x1b[31m${room.roomId}\x1b[0m`))
  .on("leave", (room: Room, client: Client) => console.log(`🏠 Gracz \x1b[32m${client.sessionId}\x1b[0m opuścił pokój \x1b[31m${room.roomId}\x1b[0m`))
  .on("dispose", (room: Room) => console.log(`🏠 Player room disposed: \x1b[31m${room.roomId}\x1b[0m`))
  .enableRealtimeListing();

gameServer.listen(port).then(() => {
  console.log(`🚀 Colyseus listening on ws://localhost:${port}`);
});