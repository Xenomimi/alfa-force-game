import { io, Socket } from "socket.io-client";
import { Player } from "./player";
import { Bullet } from "./bullet";
import { Camera } from "./camera";
import CollisionChecker from "./collisionChecker"
import mapData from "../assets/map_data.json";
import { DirectionVector } from './directionVector';

type Point = { x: number; y: number };
type Polygon = Point[];

const socket: Socket = io('http://localhost:3000');
const keysPressed: { [key: string]: boolean } = {};
const otherPlayers: { [id: string]: Player } = {};  // Przechowuj pozostałych graczy
const collisionLayer = mapData.layers.find((layer: any) => layer.name === "Warstwa Obiektu 1")!;
const collisionObjects = collisionLayer.objects!;
const collisionChecker = new CollisionChecker(collisionObjects, 3);

export class Game {
    canvas: HTMLCanvasElement;
    backgroundCanvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    backgroundCtx: CanvasRenderingContext2D;
    backgroundImage: HTMLImageElement;
    foregroundImage: HTMLImageElement;
    camera: Camera;
    cameraX: number;
    cameraY: number;
    player: Player;
    prevPlayerPosition: { x: number, y: number, mouseX: number, mouseY: number, leftThighAngle : number, rightThighAngle: number, legPhase: number };
    mouseX: number;
    mouseY: number;
    bullets: Bullet[];
    private shootSound: HTMLAudioElement;
    directionVector: DirectionVector;
    constructor(backgroundCanvas: HTMLCanvasElement, gameCanvas: HTMLCanvasElement) {
        // Canvas init
        this.canvas = gameCanvas;
        this.backgroundCanvas = backgroundCanvas;
        // Context init
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.backgroundCtx = this.backgroundCanvas.getContext('2d') as CanvasRenderingContext2D;
        // Map images init
        this.backgroundImage = new Image();
        this.backgroundImage.src = "./map.jpg";
        this.foregroundImage = new Image();
        this.foregroundImage.src = "./foreground.png";
        // Camera init
        this.camera = new Camera(this.canvas.width, this.canvas.height, this.backgroundCanvas.width, this.backgroundCanvas.height);
        // Player init
        this.player = new Player(socket, 850, 300, this.camera);
        this.prevPlayerPosition = { 
            x: this.player.x, 
            y: this.player.y, 
            mouseX: this.player.mouseX, 
            mouseY: this.player.mouseY,
            leftThighAngle: this.player.leftThighAngle,
            rightThighAngle: this.player.rightThighAngle,
            legPhase: this.player.legPhase
        };
        // Camera setup
        this.camera.follow(this.player);
        this.cameraX = this.player.x;
        this.cameraY = this.player.y;
        // Mouse position
        this.mouseX = 0;
        this.mouseY = 0;
        // Bullets in game
        this.bullets = [];
        // Gun sounds
        this.shootSound = new Audio('/snd_weapon_64.mp3');
        this.shootSound.volume = 0.05; // Set volume (0.0 to 1.0)

        this.setupSocketListeners();

        this.setupEventListeners();

        this.directionVector = new DirectionVector(this.backgroundCanvas, {
            strokeColor: 'blue',   // Kolor linii
            fillColor: 'blue',     // Kolor grotu
            lineWidth: 3,          // Grubość linii
            arrowLength: 60,       // Długość strzałki
            arrowSize: 12          // Rozmiar grotu
        });
    }

    setupSocketListeners() {
        socket.on('player_health_update', (data: {
            playerId: string,
            health: number
        }) => {
            if (data.playerId === this.player.id) {
                this.player.health = data.health;
            } else if (otherPlayers[data.playerId]) {
                otherPlayers[data.playerId].health = data.health;
            }
        });

        socket.on('player_move', (data) => {
            if (otherPlayers[data.id]) {
                otherPlayers[data.id].x = data.x;
                otherPlayers[data.id].y = data.y;
            }
        }); 

        socket.on('player_mouse_move', (data) => {
            if (otherPlayers[data.id]) {
                otherPlayers[data.id].mouseX = data.handX;
                otherPlayers[data.id].mouseY = data.handY;
            }
        });

        socket.on('player_respawned', (data) => {
            if (data.playerId === this.player.id) {
                this.player.health = data.health;
                this.player.isAlive = data.isAlive;
                this.player.x = data.x;
                this.player.y = data.y;
                this.player.leftThighAngle = data.leftThighAngle,
                this.player.rightThighAngle = data.rightThighAngle,
                this.player.legPhase = data.legPhase,
                this.player.headHitbox = data.headHitbox;
                this.player.torsoHitbox = data.torsoHitbox;
                this.player.legHitbox = data.legHitbox;
            } else if (otherPlayers[data.playerId]) {
                otherPlayers[data.playerId].health = data.health;
                otherPlayers[data.playerId].isAlive = data.isAlive;
                otherPlayers[data.playerId].x = data.x;
                otherPlayers[data.playerId].y = data.y;
                otherPlayers[data.playerId].leftThighAngle = data.leftThighAngle;
                otherPlayers[data.playerId].rightThighAngle = data.rightThighAngle;
                otherPlayers[data.playerId].legPhase = data.legPhase;
                otherPlayers[data.playerId].headHitbox = data.headHitbox;
                otherPlayers[data.playerId].torsoHitbox = data.torsoHitbox;
                otherPlayers[data.playerId].legHitbox = data.legHitbox;
            }
        });
    
        socket.on('current_players', (players) => {
            for (let id in players) {
                if (id === socket.id) {
                    // Aktualizuj dane lokalnego gracza, w tym id i playerName
                    this.player.id = id; // Ustaw ID z serwera
                    this.player.playerName = players[id].playerName; // Ustaw nazwę z serwera
                    this.player.x = players[id].x;
                    this.player.y = players[id].y;
                    this.player.mouseX = players[id].handX;
                    this.player.mouseY = players[id].handY;
                    this.player.headHitbox = players[id].headHitbox;
                    this.player.torsoHitbox = players[id].torsoHitbox;
                    this.player.legHitbox = players[id].legHitbox;
                    this.camera.follow(this.player); // Opcjonalne
                } else {
                    // Twórz lub aktualizuj innych graczy
                    if (!otherPlayers[id]) {
                        otherPlayers[id] = new Player(socket, players[id].x, players[id].y, this.camera);
                    }
                    otherPlayers[id].id = id;
                    otherPlayers[id].playerName = players[id].playerName;
                    otherPlayers[id].x = players[id].x;
                    otherPlayers[id].y = players[id].y;
                    otherPlayers[id].mouseX = players[id].handX;
                    otherPlayers[id].mouseY = players[id].handY;
                    otherPlayers[id].headHitbox = players[id].headHitbox;
                    otherPlayers[id].torsoHitbox = players[id].torsoHitbox;
                    otherPlayers[id].legHitbox = players[id].legHitbox;
                }
            }
        });

        socket.on('update_position', (data) => {
            if (data.id !== socket.id && otherPlayers[data.id]) {
                const player = otherPlayers[data.id];
                player.x = data.x;
                player.y = data.y;
                player.leftThighAngle = data.leftThighAngle;
                player.rightThighAngle = data.rightThighAngle;
                player.legPhase = data.legPhase;
                player.headHitbox.x = data.headHitbox.x;
                player.headHitbox.y = data.headHitbox.y;
                player.torsoHitbox.x = data.torsoHitbox.x;
                player.torsoHitbox.y = data.torsoHitbox.y;
                player.legHitbox.x = data.legHitbox.x;
                player.legHitbox.y = data.legHitbox.y;
            }
        });

        socket.on('update_mouse_position', (data) => {
            if (data.id !== socket.id && otherPlayers[data.id]) {
                otherPlayers[data.id].mouseX = data.handX;  // Absolutne współrzędne świata
                otherPlayers[data.id].mouseY = data.handY;
            }
        });

        socket.on('new_bullet', (data: {
            x: number,
            y: number,
            targetX: number,
            targetY: number,
            playerId: string
        }) => {
            const bullet = new Bullet(
                data.x,
                data.y,
                data.targetX,
                data.targetY,
                data.playerId,
                collisionChecker
            );
            this.bullets.push(bullet);
        });

        socket.on('bullet_removed', (data: { index: number, playerId: string }) => {
            // Usuń odpowiedni pocisk, jeśli istnieje
            this.bullets = this.bullets.filter(bullet => 
                !(bullet.playerId === data.playerId && 
                  bullet.isOffscreen(this.backgroundCanvas.width, this.backgroundCanvas.height))
            );
        });

        socket.on('player_died', (data) => {
            const { playerId, killerId, deathTime } = data;
            if (playerId === this.player.id) {
                // Lokalny gracz już obsłużony w handlePlayerDeath, ale upewniamy się
                this.player.isAlive = false;
                this.player.deathTime = deathTime;
                this.player.killerId = killerId;
                this.player.deathAnimation.active = true;
                this.player.deathAnimation.progress = 0;
            } else if (otherPlayers[playerId]) {
                // Aktualizacja stanu innego gracza
                const deadPlayer = otherPlayers[playerId];
                deadPlayer.isAlive = false;
                deadPlayer.deathTime = deathTime;
                deadPlayer.killerId = killerId;
                deadPlayer.deathAnimation.active = true;
                deadPlayer.deathAnimation.progress = 0;
            }
        });

        socket.on('player_disconnected', (data: { id: string }) => {
            delete otherPlayers[data.id];
        });
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => {

            if (!this.player.isAlive) return;

            keysPressed[event.key] = true;

            if (event.key === 'w') {
                this.player.jump(collisionChecker);
            }
            if (event.key === 't') {
                const collisionLayer = mapData.layers.find((layer: any) => layer.name === "Warstwa Obiektu 1");
                console.log(collisionLayer?.objects);
            }
        });

        document.addEventListener('keyup', (event) => {

            if (!this.player.isAlive) return;

            keysPressed[event.key] = false;
        });

        document.addEventListener('mousemove', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            
            // Skalowanie w osi X i Y
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
        
            // Przeskalowanie współrzędnych myszy względem canvasu
            this.mouseX = Math.round((event.clientX - rect.left) * scaleX);
            this.mouseY = Math.round((event.clientY - rect.top) * scaleY);
        
            // Aktualizuj pozycję ręki gracza
            this.player.mouseX = this.mouseX;
            this.player.mouseY = this.mouseY;

        });

        // Logika strzelania
        this.handlePlayerShooting()
    }

    // Sprawdź, czy pozycja gracza się zmieniła i wyślij tylko wtedy
    checkAndEmitPosition() {
        if (!this.player.isAlive) return;

        const positionChanged = this.player.x !== this.prevPlayerPosition.x || 
                                this.player.y !== this.prevPlayerPosition.y;
        const legsChanged = this.player.leftThighAngle !== this.prevPlayerPosition.leftThighAngle || 
                            this.player.rightThighAngle !== this.prevPlayerPosition.rightThighAngle || 
                            this.player.legPhase !== this.prevPlayerPosition.legPhase;
    
        if (positionChanged || legsChanged) {
            socket.emit('player_move', {
                x: this.player.x, 
                y: this.player.y,
                leftThighAngle: this.player.leftThighAngle,
                rightThighAngle: this.player.rightThighAngle,
                legPhase: this.player.legPhase,
                headHitbox: { x: this.player.headHitbox.x, y: this.player.headHitbox.y },
                torsoHitbox: { x: this.player.torsoHitbox.x, y: this.player.torsoHitbox.y },
                legHitbox: { x: this.player.legHitbox.x, y: this.player.legHitbox.y }
            });
            
            // Aktualizuj poprzednie wartości
            this.prevPlayerPosition.x = this.player.x;
            this.prevPlayerPosition.y = this.player.y;
            this.prevPlayerPosition.leftThighAngle = this.player.leftThighAngle;
            this.prevPlayerPosition.rightThighAngle = this.player.rightThighAngle;
            this.prevPlayerPosition.legPhase = this.player.legPhase;
        }
    
        if (this.player.mouseX !== this.prevPlayerPosition.mouseX ||
            this.player.mouseY !== this.prevPlayerPosition.mouseY) {
            // Przelicz współrzędne myszy na współrzędne świata gry
            const worldMouseX = this.player.mouseX + this.camera.xView;
            const worldMouseY = this.player.mouseY + this.camera.yView;
            socket.emit('player_mouse_move', {
                handX: worldMouseX,
                handY: worldMouseY    
            });
            this.prevPlayerPosition.mouseX = this.player.mouseX;
            this.prevPlayerPosition.mouseY = this.player.mouseY;
        }
    }

    start() {
        // Wait until player's images are loaded
        const waitForImages = () => {
            if (this.player.imagesLoaded) {
                this.update();
            } else {
                requestAnimationFrame(waitForImages);
            }
        };
        waitForImages();
    }

    drawMap(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        const scaleFactor = 3;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        collisionObjects?.forEach((obj: any) => {
            if (obj.polygon) {
                // Rysowanie wielokąta ze skalowaniem
                ctx.beginPath();
                const startX = (obj.x + obj.polygon[0].x) * scaleFactor;
                const startY = (obj.y + obj.polygon[0].y) * scaleFactor;
                ctx.moveTo(startX, startY);
    
                obj.polygon.slice(1).forEach((point: any) => {
                    const x = (obj.x + point.x) * scaleFactor;
                    const y = (obj.y + point.y) * scaleFactor;
                    ctx.lineTo(x, y);
                });

                ctx.closePath();
                ctx.stroke();
            } else {
                // Rysowanie prostokąta ze skalowaniem
                ctx.strokeRect(
                    obj.x * scaleFactor,
                    obj.y * scaleFactor,
                    obj.width * scaleFactor,
                    obj.height * scaleFactor
                );
            }
        });
    }

    // Zaktualizuj pociski
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
    
            // Sprawdź kolizje tylko dla żywych graczy
            if (this.player.isAlive && bullet.checkCollision(this.player) && this.player.id !== bullet.playerId) {
                this.handlePlayerHit(bullet.playerId);
                this.bullets.splice(i, 1);
                continue;
            }
    
            // Sprawdź kolizje z innymi graczami
            for (let id in otherPlayers) {
                const otherPlayer = otherPlayers[id];
                if (otherPlayer.isAlive && bullet.checkCollision(otherPlayer)) {
                    socket.emit('player_hit', {
                        hitPlayerId: otherPlayer.id,
                        bulletPlayerId: bullet.playerId
                    });
                    this.bullets.splice(i, 1);
                    break;
                }
            }
    
            // Usuń pocisk, jeśli jest poza ekranem lub koliduje z mapą
            if (bullet.shouldRemove(this.backgroundCanvas.width, this.backgroundCanvas.height)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    
    handlePlayerHit(shooterId: string, damage: number = 10) {
        if (!this.player.isAlive) return;
    
        if (this.player.takeDamage(damage)) {
            // Wyślij aktualizację stanu zdrowia do innych graczy
            socket.emit('health_update', {
                playerId: this.player.id,
                health: this.player.health
            });
    
            // Jeśli gracz zmarł
            if (!this.player.isAlive) {
                this.handlePlayerDeath(shooterId);
            }
        }
    }

    handlePlayerShooting() {
        let shootingInterval: NodeJS.Timeout | null = null;
    
        const calculateHandPositionAndDirection = (player: Player, mouseX: number, mouseY: number, camera: Camera) => {
            const adjustedMouseX = mouseX + camera.xView;
            const adjustedMouseY = mouseY + camera.yView;
            const isFlipped = mouseX < (player.x - camera.xView + player.width / 2);
            const shoulderX = isFlipped ? player.x + player.width - 5 : player.x + 5;
            const shoulderY = player.y + 16;
    
            let dirX = adjustedMouseX - shoulderX;
            let dirY = adjustedMouseY - shoulderY;
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            if (length > 0) {
                dirX = dirX / length;
                dirY = dirY / length;
            }
    
            const upperArmLength = 15;
            const forearmLength = 15;
            const elbowX = shoulderX + dirX * upperArmLength;
            const elbowY = shoulderY + dirY * upperArmLength;
            const handX = elbowX + dirX * forearmLength;
            const handY = elbowY + dirY * forearmLength;
    
            const targetDistance = 1000;
            const targetX = handX + dirX * targetDistance;
            const targetY = handY + dirY * targetDistance;
    
            return { handPos: { x: handX, y: handY }, targetX, targetY };
        };
    
        document.addEventListener('mousedown', () => {
            if (!this.player.isAlive) return;
    
            const { handPos, targetX, targetY } = calculateHandPositionAndDirection(this.player, this.mouseX, this.mouseY, this.camera);
    
            const bullet = new Bullet(
                handPos.x,
                handPos.y,
                targetX,
                targetY,
                this.player.id,
                collisionChecker
            );
            this.bullets.push(bullet);
    
            socket.emit('player_shoot', {
                x: handPos.x,
                y: handPos.y,
                targetX: targetX,
                targetY: targetY,
                playerId: this.player.id
            });
    
            const shootSoundInstance = new Audio(this.shootSound.src);
            shootSoundInstance.volume = this.shootSound.volume;
            shootSoundInstance.play();
    
            if (!shootingInterval) {
                shootingInterval = setInterval(() => {
                    const { handPos, targetX, targetY } = calculateHandPositionAndDirection(this.player, this.mouseX, this.mouseY, this.camera);
    
                    const bullet = new Bullet(
                        handPos.x,
                        handPos.y,
                        targetX,
                        targetY,
                        this.player.id,
                        collisionChecker
                    );
                    this.bullets.push(bullet);
    
                    socket.emit('player_shoot', {
                        x: handPos.x,
                        y: handPos.y,
                        targetX: targetX,
                        targetY: targetY,
                        playerId: this.player.id
                    });
    
                    const shootSoundInstance = new Audio(this.shootSound.src);
                    shootSoundInstance.volume = this.shootSound.volume;
                    shootSoundInstance.play();
                }, 100);
            }
        });
    
        document.addEventListener('mouseup', () => {
            if (shootingInterval) {
                clearInterval(shootingInterval);
                shootingInterval = null;
            }
        });
    }

    handlePlayerDeath(killerId: string) {
        this.player.deathTime = Date.now();
        this.player.killerId = killerId; // Ustawienie ID zabójcy
    
        socket.emit('player_death', {
            playerId: this.player.id,
            killerId: killerId,
            deathTime: this.player.deathTime
        });
    
        setTimeout(() => {
            // const respawnX = Math.random() * (this.canvas.width - this.player.width);
            const safePosition = this.findSafeRespawnPosition();
            const respawnX = safePosition.x;
            const respawnY = safePosition.y;
            
            this.player.respawn(respawnX, respawnY);
            
            socket.emit('player_respawn', {
                playerId: this.player.id,
                x: respawnX,
                y: respawnY,
                leftThighAngle: 0,
                rightThighAngle: 0,
                legPhase: 0,
                headHitbox: { x: respawnX, y: respawnY },
                torsoHitbox: { x: respawnX, y: respawnY + 12 },
                legHitbox: { x: respawnX, y: respawnY + 12 + 37 - 12 }
            });
        }, 5000);
    }

    findSafeRespawnPosition(): { x: number, y: number } {
        const maxAttempts = 100; // Maksymalna liczba prób, aby uniknąć nieskończonej pętli
        let attempts = 0;
        let respawnX, respawnY;
    
        do {
            // Losuj współrzędne w granicach backgroundCanvas
            respawnX = Math.random() * (this.backgroundCanvas.width - this.player.width);
            respawnY = Math.random() * (this.backgroundCanvas.height - this.player.height);
    
            // Twórz poligon gracza dla tych współrzędnych
            const playerPolygon: Polygon = [
                { x: respawnX, y: respawnY },
                { x: respawnX + this.player.width, y: respawnY },
                { x: respawnX + this.player.width, y: respawnY + this.player.height },
                { x: respawnX, y: respawnY + this.player.height }
            ];
    
            attempts++;
            // Sprawdź, czy miejsce jest wolne od kolizji
            if (!collisionChecker.checkPlayerCollision(playerPolygon)) {
                return { x: respawnX, y: respawnY };
            }
        } while (attempts < maxAttempts);
    
        // Jeśli nie znaleziono miejsca, użyj domyślnego (bezpiecznego) punktu
        return { x: 850, y: 300 };
    }

    drawContextLines() {
        const contextColors = [
            { ctx: this.backgroundCtx, color: "blue" },
            { ctx: this.ctx, color: "red" }
        ];

        this.ctx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
    
        contextColors.forEach(({ ctx, color }) => {
            ctx.strokeStyle = color; // Ustawienie koloru obramowania dla kontekstu
            ctx.lineWidth = 5; // Grubość linii obramowania
            ctx.strokeRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Rysowanie obramowania wzdłuż krawędzi płótna
        });
    }

    drawBackground(ctx: CanvasRenderingContext2D) {
        this.drawMap(ctx);

        // Rysowanie tekstury mapy

        // ctx.drawImage(
        //     this.backgroundImage,
        //     0,
        //     0,
        //     ctx.canvas.width,
        //     ctx.canvas.height
        // );
    }

    drawForeground(ctx: CanvasRenderingContext2D) {
        ctx.drawImage(
            this.foregroundImage,
            0,
            0,
            ctx.canvas.width,
            ctx.canvas.height
        )
    }

    renderGame() {
        // Czyszczenie poprzedniej instacji gry
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Rysowanie mapy
        this.drawBackground(this.backgroundCtx);

        // this.drawCollisionMap(this.backgroundCtx);
        //Bloku ruch gracza jeżeli jest martwy
        
        // Rysowanie gracza
        this.player.draw(this.backgroundCtx);
        
    //     this.directionVector.draw(
    //         this.player.getShoulderPosition().x,
    //         this.player.getShoulderPosition().y,
    //         this.player.getHandPosition().x,
    //         this.player.getHandPosition().y,
    // );

        // Update pozycji gracza i kamera
        if (this.player.isAlive) {
            this.player.move(keysPressed, collisionChecker);
            this.camera.update({x: this.mouseX, y: this.mouseY});
        }

        // Rysowanie pozostałych graczy
        for (let id in otherPlayers) {
            otherPlayers[id].draw(this.backgroundCtx);
            // otherPlayers[id].updateHitboxes();
        }

        // Aktualizacja pocisków gracza oraz innych graczy
        this.updateBullets();
        for (const bullet of this.bullets) {
            bullet.draw(this.backgroundCtx);
        }

        // this.drawForeground(this.backgroundCtx);
        this.drawContextLines();
    }
    
    renderCameraView() {
        // Wyczyść canvas gry
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    
        // Oblicz widoczny obszar z uwzględnieniem granic mapy
        const renderWidth = Math.min(this.camera.viewportWidth, this.backgroundCanvas.width - this.camera.xView);
        const renderHeight = Math.min(this.camera.viewportHeight, this.backgroundCanvas.height - this.camera.yView);
    
        // Renderuj tylko widoczny fragment backgroundCanvas
        this.ctx.drawImage(
            this.backgroundCanvas,
            this.camera.xView,    // Źródłowe X na backgroundCanvas
            this.camera.yView,    // Źródłowe Y na backgroundCanvas
            renderWidth,          // Szerokość widocznego obszaru
            renderHeight,         // Wysokość widocznego obszaru
            0,                    // Docelowe X na canvasie gry
            0,                    // Docelowe Y na canvasie gry
            this.ctx.canvas.width, // Docelowa szerokość (rozciąga się do rozmiaru canvasu)
            this.ctx.canvas.height // Docelowa wysokość (rozciąga się do rozmiaru canvasu)
        );
    }

    update() {
        this.renderGame();
        this.renderCameraView();
        // Rysowanie ekranu śmierci oraz animacji
        if (!this.player.isAlive) {
            this.player.drawDeathAnimation(this.backgroundCtx);
            this.player.drawDeathScreen(this.ctx);
        }
        // Pozycja kursora
        this.ctx.beginPath();
        this.ctx.arc(this.player.mouseX, this.player.mouseY, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = 'red';
        this.ctx.fill();
        this.ctx.closePath();

        this.checkAndEmitPosition();
        requestAnimationFrame(() => this.update());
    }
}
