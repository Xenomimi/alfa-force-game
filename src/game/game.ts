import { io } from "socket.io-client";
import { Player } from "./player";
import { Bullet } from "./bullet";
import { Camera } from "./camera";
import CollisionChecker from "./collisionChecker"
import mapData from "../assets/map_data.json";



const socket = io('http://localhost:3000');
const keysPressed: { [key: string]: boolean } = {};
const otherPlayers: { [id: string]: Player } = {};  // Przechowuj pozostałych graczy
const collisionLayer = mapData.layers.find((layer: any) => layer.name === "Warstwa Obiektu 1")!;
const collisionObjects = collisionLayer.objects!;
const collisionChecker = new CollisionChecker(collisionObjects, 3);

export class Game {
    canvas: HTMLCanvasElement;
    collisionCanvas: HTMLCanvasElement;
    backgroundCanvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    collisionCtx: CanvasRenderingContext2D;
    backgroundCtx: CanvasRenderingContext2D;
    backgroundImage: HTMLImageElement;
    collisionImage: HTMLImageElement;
    camera: Camera;
    cameraX: number;
    cameraY: number;
    player: Player;
    prevPlayerPosition: { x: number, y: number, mouseX: number, mouseY: number };
    mouseX: number;
    mouseY: number;
    bullets: Bullet[];
    private shootSound: HTMLAudioElement;

    constructor(backgroundCanvas: HTMLCanvasElement, collisionCanvas: HTMLCanvasElement, gameCanvas: HTMLCanvasElement) {
        // Canvas init
        this.canvas = gameCanvas;
        this.collisionCanvas = collisionCanvas;
        this.backgroundCanvas = backgroundCanvas;
        // Context init
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.collisionCtx = this.collisionCanvas.getContext('2d') as CanvasRenderingContext2D;
        this.backgroundCtx = this.backgroundCanvas.getContext('2d') as CanvasRenderingContext2D;
        // Map images init
        this.backgroundImage = new Image();
        this.backgroundImage.src = "./map.jpg";
        this.collisionImage = new Image();
        this.collisionImage.src = "./11a.png";
        // Camera init
        this.camera = new Camera(this.canvas.width, this.canvas.height, this.backgroundCanvas.width, this.backgroundCanvas.height);
        // Player init
        this.player = new Player(socket.id as string, 850, 300, this.camera);
        this.prevPlayerPosition = { 
            x: this.player.x, 
            y: this.player.y, 
            mouseX: this.player.mouseX, 
            mouseY: this.player.mouseY
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
        this.shootSound = new Audio('/snd_weapon_14.mp3');
        this.shootSound.volume = 0.05; // Set volume (0.0 to 1.0)

        socket.on('player_health_update', (data: {
            playerId: string,
            health: number,
            isAlive: boolean
        }) => {
            if (data.playerId === this.player.id) {
                this.player.health = data.health;
                this.player.isAlive = data.isAlive;
            } else if (otherPlayers[data.playerId]) {
                otherPlayers[data.playerId].health = data.health;
                otherPlayers[data.playerId].isAlive = data.isAlive;
            }
        });

        socket.on('player_respawned', (data: {
            playerId: string,
            x: number,
            y: number,
            health: number,
            isAlive: boolean,
            legSwingDirection: number,
            thighSwingAngle: number,
            calfSwingAngle: number,
            headHitbox: any,
            torsoHitbox: any,
            legHitbox: any
        }) => {
            if (data.playerId === this.player.id) {
                this.player.health = data.health;
                this.player.isAlive = data.isAlive;
                this.player.x = data.x;
                this.player.y = data.y;
                this.player.legSwingDirection = data.legSwingDirection;
                this.player.thighSwingAngle = data.thighSwingAngle;
                this.player.calfSwingAngle = data.calfSwingAngle;
                this.player.headHitbox = data.headHitbox;
                this.player.torsoHitbox = data.torsoHitbox;
                this.player.legHitbox = data.legHitbox;
            } else if (otherPlayers[data.playerId]) {
                otherPlayers[data.playerId].health = data.health;
                otherPlayers[data.playerId].isAlive = data.isAlive;
                otherPlayers[data.playerId].x = data.x;
                otherPlayers[data.playerId].y = data.y;
                otherPlayers[data.playerId].legSwingDirection = data.legSwingDirection;
                otherPlayers[data.playerId].thighSwingAngle = data.thighSwingAngle;
                otherPlayers[data.playerId].calfSwingAngle = data.calfSwingAngle;
                otherPlayers[data.playerId].headHitbox = data.headHitbox;
                otherPlayers[data.playerId].torsoHitbox = data.torsoHitbox;
                otherPlayers[data.playerId].legHitbox = data.legHitbox;
                
            }
        });
    
        socket.on('current_players', (players) => {
            for (let id in players) {
                if (id === socket.id) {
                    this.player = new Player(id, players[id].x, players[id].y, this.camera);
                    this.player.mouseX = players[id].handX;
                    this.player.mouseY = players[id].handY;
                    this.player.legSwingDirection = players[id].legSwingDirection;
                    this.player.thighSwingAngle = players[id].thighSwingAngle;
                    this.player.calfSwingAngle = players[id].calfSwingAngle;
                    this.player.headHitbox = players[id].headHitbox;
                    this.player.torsoHitbox = players[id].torsoHitbox;
                    this.player.legHitbox = players[id].legHitbox;
                } else {
                    otherPlayers[id] = new Player(id, players[id].x, players[id].y, this.camera);
                    otherPlayers[id].mouseX = players[id].handX;
                    otherPlayers[id].mouseY = players[id].handY;
                    otherPlayers[id].legSwingDirection = players[id].legSwingDirection;
                    otherPlayers[id].thighSwingAngle = players[id].thighSwingAngle;
                    otherPlayers[id].calfSwingAngle = players[id].calfSwingAngle;
                    otherPlayers[id].headHitbox = players[id].headHitbox;
                    otherPlayers[id].torsoHitbox = players[id].torsoHitbox;
                    otherPlayers[id].legHitbox = players[id].legHitbox;
                }
            }
        });

        socket.on('new_player', (data: { id: string, x: number, y: number, handX: number, handY: number }) => {
            if (data.id !== socket.id) {
                otherPlayers[data.id] = new Player(data.id, data.x, data.y, this.camera);
            }
        });

        socket.on('update_position', (data: { 
            id: string, 
            x: number, 
            y: number, 
            handX: number, 
            handY: number,
            legSwingDirection: number,
            thighSwingAngle: number,
            calfSwingAngle: number,
            headHitbox: { x: number, y: number },
            torsoHitbox: { x: number, y: number },
            legHitbox: { x: number, y: number }
        }) => {
            if (data.id !== socket.id && otherPlayers[data.id]) {
                const player = otherPlayers[data.id];
                player.x = data.x;
                player.y = data.y;
                player.mouseX = data.handX;
                player.mouseY = data.handY;
                player.legSwingDirection = data.legSwingDirection;
                player.thighSwingAngle = data.thighSwingAngle;
                player.calfSwingAngle = data.calfSwingAngle;
                player.headHitbox.x = data.headHitbox.x;
                player.headHitbox.y = data.headHitbox.y;
                player.torsoHitbox.x = data.torsoHitbox.x;
                player.torsoHitbox.y = data.torsoHitbox.y;
                player.legHitbox.x = data.legHitbox.x;
                player.legHitbox.y = data.legHitbox.y;
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
                data.playerId
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

        socket.on('player_disconnected', (data: { id: string }) => {
            delete otherPlayers[data.id];
        });

        this.setupEventListeners();
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
            this.mouseX = (event.clientX - rect.left) * scaleX;
            this.mouseY = (event.clientY - rect.top) * scaleY;
        
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
    
        if (this.player.x !== this.prevPlayerPosition.x || 
            this.player.y !== this.prevPlayerPosition.y || 
            this.player.mouseX !== this.prevPlayerPosition.mouseX ||
            this.player.mouseY !== this.prevPlayerPosition.mouseY ) {
    
            socket.emit('player_move', { 
                x: this.player.x, 
                y: this.player.y,
                handX: this.mouseX,
                handY: this.mouseY,
                legSwingDirection: this.player.legSwingDirection,
                thighSwingAngle: this.player.thighSwingAngle,
                calfSwingAngle: this.player.calfSwingAngle,
                headHitbox: { x: this.player.headHitbox.x, y: this.player.headHitbox.y },
                torsoHitbox: { x: this.player.torsoHitbox.x, y: this.player.torsoHitbox.y },
                legHitbox: { x: this.player.legHitbox.x, y: this.player.legHitbox.y }
            });
    
            this.prevPlayerPosition = { 
                x: this.player.x, 
                y: this.player.y,
                mouseX: this.player.mouseX,
                mouseY: this.player.mouseY
            };
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

    drawCollisionMap(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        const scaleFactor = 3;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        


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
            if (bullet.isOffscreen(this.backgroundCanvas.width, this.backgroundCanvas.height)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    
    handlePlayerHit(shooterId: string, damage: number = 10) {
        if (!this.player.isAlive) return;
    
        // Próba zadania obrażeń z uwzględnieniem czasu niewrażliwości
        if (this.player.takeDamage(damage)) {
            // Wyślij aktualizację stanu zdrowia do innych graczy
            socket.emit('health_update', {
                playerId: this.player.id,
                health: this.player.health,
                isAlive: this.player.isAlive
            });
    
            // Jeśli gracz zmarł
            if (!this.player.isAlive) {
                this.handlePlayerDeath(shooterId);
            }
        }
    }

    handlePlayerShooting() {
        let shootingInterval: NodeJS.Timeout | null = null;
        
        document.addEventListener('mousedown', () => {
            // Blokada strzelania jeżeli gracz jest martwy
            if(!this.player.isAlive) return

            // Pojedynczy strzał
            const bullet = new Bullet(
                this.player.getHandPosition().x,
                this.player.getHandPosition().y,
                this.player.getShoulderPosition().x,
                this.player.getShoulderPosition().y,
                this.player.id
            );
            this.bullets.push(bullet); // Dodaj pocisk do tablicy
            // Przekaż innym jeden strzał
            socket.emit('player_shoot', {
                x: this.player.getHandPosition().x,
                y: this.player.getHandPosition().y,
                targetX: this.player.getShoulderPosition().x,
                targetY: this.player.getShoulderPosition().y,
                playerId: this.player.id
            });
            // Puść dźwięk pojedynczego strzału
            const shootSoundInstance = new Audio(this.shootSound.src);
            shootSoundInstance.volume = this.shootSound.volume;  // Ustaw tę samą głośność
            shootSoundInstance.play();

            if (!shootingInterval) {
                shootingInterval = setInterval(() => {
                    const bullet = new Bullet(
                        this.player.getHandPosition().x,
                        this.player.getHandPosition().y,
                        this.player.getShoulderPosition().x,
                        this.player.getShoulderPosition().y,
                        this.player.id
                    );
    
                    this.bullets.push(bullet); // Dodaj pocisk do tablicy

                    socket.emit('player_shoot', {
                        x: this.player.getHandPosition().x,
                        y: this.player.getHandPosition().y,
                        targetX: this.player.getShoulderPosition().x,
                        targetY: this.player.getShoulderPosition().y,
                        playerId: this.player.id
                    });

                    const shootSoundInstance = new Audio(this.shootSound.src);
                    shootSoundInstance.volume = this.shootSound.volume;  // Ustaw tę samą głośność
                    shootSoundInstance.play();
                }, 100);
            }
        });

        document.addEventListener('mouseup', () => {
            if (shootingInterval) {
                clearInterval(shootingInterval); // Zatrzymaj interwał
                shootingInterval = null; // Zresetuj zmienną
            }
        });
    }

    handlePlayerDeath(killerId: string) {
        this.player.isAlive = false;
        this.player.deathTime = Date.now();
        this.player.killerId = killerId; // Ustawienie ID zabójcy
    
        socket.emit('player_death', {
            playerId: this.player.id,
            killerId: killerId
        });
    
        setTimeout(() => {
            const respawnX = Math.random() * (this.canvas.width - this.player.width);
            const respawnY = 300;
            
            this.player.respawn(respawnX, respawnY);
            
            socket.emit('player_respawn', {
                playerId: this.player.id,
                x: respawnX,
                y: respawnY,
                legSwingDirection: 0,
                thighSwingAngle: 0,
                calfSwingAngle: 1,
                headHitbox: { x: respawnX, y: respawnY },
                torsoHitbox: { x: respawnX, y: respawnY + 12 },
                legHitbox: { x: respawnX, y: respawnY + 12 + 37 - 12 }
            });
        }, 5000);
    }

    drawContextLines() {
        const contextColors = [
            { ctx: this.backgroundCtx, color: "blue" },
            { ctx: this.collisionCtx, color: "green" },
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
        // Wyczyszczenie tła
        ctx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        
        // Rysowanie tylko widocznego fragmentu tła na podstawie pozycji kamery
        ctx.drawImage(
            this.backgroundImage,
            0,
            0,
            ctx.canvas.width,
            ctx.canvas.height
        )
    }

    renderGame() {
        // Czyszczenie poprzedniej instacji gry
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawBackground(this.backgroundCtx);

        this.drawCollisionMap(this.collisionCtx);

        // this.drawContextLines();

        //Bloku ruch gracza jeżeli jest martwy
        if (this.player.isAlive) {
            this.player.move(keysPressed, collisionChecker);
            this.camera.update();
        }
        // Rysowanie gracza
        this.player.draw(this.backgroundCtx);

        for (let id in otherPlayers) {
            otherPlayers[id].draw(this.backgroundCtx);
        }

        // Aktualizacja pocisków
        this.updateBullets();
        for (const bullet of this.bullets) {
            bullet.draw(this.backgroundCtx);
        }

        if (!this.player.isAlive) {
            this.player.drawDeathAnimation(this.backgroundCtx);
            this.player.drawDeathScreen(this.backgroundCtx);
        }
    }

    renderCameraView() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.drawImage(
            this.backgroundCanvas,
            this.camera.xView,
            this.camera.yView,
            1600,
            1048,
            0,
            0,
            this.ctx.canvas.width,
            this.ctx.canvas.height
        )
    }

    update() {

        this.renderGame();
        this.renderCameraView();

        // Pozycja kursora
        this.ctx.beginPath();
        this.ctx.arc(this.player.mouseX, this.player.mouseY, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = 'red';
        this.ctx.fill();
        this.ctx.closePath();

        console.log(this.player.verticalSpeed);

        this.checkAndEmitPosition();
        requestAnimationFrame(() => this.update());
    }
}
