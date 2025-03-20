import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { handleSocketConnection } from './socketHandlers.js';

const app = express();
const server = createServer(app);

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
}));

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);
    handleSocketConnection(io, socket);
});

server.listen(3000, () => {
    console.log('Listening on *:3000');
});
