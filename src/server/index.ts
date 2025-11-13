import { Server, Client, Room } from "colyseus";
import { uWebSocketsTransport } from "@colyseus/uwebsockets-transport";
import { monitor } from "@colyseus/monitor";
import { MyRoom } from "./rooms/MyRoom";
import { CustomLobbyRoom } from "./rooms/CustomLobbyRoom";
import express from "express";
import cors from "cors";
import authRoutes from "./routers/auth";
import shopRoutes from "./routers/shop";
import userRoutes from "./routers/user";
import cookieParser from "cookie-parser";
import { PrismaClient } from "../generated/prisma";
import * as dotenv from 'dotenv';
import { loadWeapons, Weapons } from "./game/weapons";

dotenv.config()

const gameServerPort = Number(process.env.GAME_SERVER_PORT);
const apiPort = Number(process.env.API_PORT);
const monitorPort = Number(process.env.MONITOR_PORT);

export const prisma = new PrismaClient();

const app = express();
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: "http://localhost:5173",
}));
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/shop", shopRoutes);
app.use("/user", userRoutes);

const gameServer = new Server({
  transport: new uWebSocketsTransport(),
  greet: false,
});

gameServer.define("lobby", CustomLobbyRoom)
  .on("create", (room: CustomLobbyRoom) => console.log(`----------| NOWE LOBBY |---------- \n🌐  Lobby room created: \x1b[36m${room.roomId}\x1b[0m`))
  .on("join", (room: CustomLobbyRoom, client: Client) => console.log(`🌐 Gracz \x1b[32m${client.sessionId}\x1b[0m dołączył do lobby \x1b[36m${room.roomId}\x1b[0m`))
  .on("leave", (room: CustomLobbyRoom, client: Client) => console.log(`🌐 Gracz \x1b[32m${client.sessionId}\x1b[0m opuścił lobby \x1b[36m${room.roomId}\x1b[0m`))
  .on("dispose", (room: CustomLobbyRoom) => console.log(`🌐 Lobby room disposed: \x1b[36m${room.roomId}\x1b[0m`))

gameServer.define("player_room", MyRoom)
  .on("create", (room: Room) => console.log(`🏠 Player room created: \x1b[31m${room.roomId}\x1b[0m`))
  .on("join", (room: Room, client: Client) => console.log(`🏠 Gracz \x1b[32m${client.sessionId}\x1b[0m dołączył do pokoju \x1b[31m${room.roomId}\x1b[0m`))
  .on("leave", (room: Room, client: Client) => console.log(`🏠 Gracz \x1b[32m${client.sessionId}\x1b[0m opuścił pokój \x1b[31m${room.roomId}\x1b[0m`))
  .on("dispose", (room: Room) => console.log(`🏠 Player room disposed: \x1b[31m${room.roomId}\x1b[0m`))
  .enableRealtimeListing();

// gameServer.simulateLatency(100);

await loadWeapons();
console.log("Weapons loaded:", Object(Weapons));

// API Server
app.listen(apiPort, () => {
  console.log(`🌐 API server running at http://localhost:${apiPort}`);
});

// Game Server
gameServer.listen(gameServerPort).then(() => {
  console.log(`🚀 Colyseus listening on ws://localhost:${gameServerPort}`);
});

// Monitor
app.use("/colyseus", monitor());
app.listen(monitorPort, () => {
  console.log(`📊 Colyseus Monitor running at http://localhost:${monitorPort}/colyseus`);
});

