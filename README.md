# Multiplayer Shooter Game

td

## Project Description

A 2D multiplayer shooter game created in TypeScript and rendered using Canvas. The game includes a Node.js server that manages player connections and synchronizes the game state in real-time.

Players control characters equipped with futuristic armor and weapons, competing on dynamic maps.

## Features

- **Multiplayer Gameplay**: Allows multiple players to connect and compete against each other.
- **Physical Interactions**: Players can jump, walk, and shoot.
- **Advanced Visual Effects**: Weapon rotation along with the hand, death and walking animations.
- **Health System**: Players can inflict damage on others, and upon death, a death screen is displayed with a respawn timer and information about the killer.
- **Movement Control**: Animated character movement with separate hitboxes for different body parts.

## Technology

- **TypeScript**: Primary language for creating client-side game logic.
- **Node.js**: Server for handling multiplayer functionality and game state synchronization.
- **Canvas API**: For rendering game elements and visual effects.
- **WebSocket**: For real-time communication between players and the server.
- **React**: For handling the front-end.
- **MongoDB**: For storing player account data.

## Requirements

- **Node.js** version 16 or higher
- **npm** version 7 or higher

## Local Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/Xenomimi/alfa-force-game.git
    cd alfa-force-game
    ```

2. Install dependencies for both the client and server:
    ```bash
    npm install
    ```

3. Run the client (if using Vite, navigate to the frontend folder and start it):
    ```bash
    npm run dev
    ```

4. Start the server:
    ```bash
    cd src/server
    node server.js
    ```
