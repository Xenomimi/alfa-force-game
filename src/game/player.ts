export class Player {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    speed: number;
    gravity: number;
    verticalSpeed: number;
    groundY: number;
    mouseX: number;
    mouseY: number;
    handEndXY: {x: number, y: number};
    gun_model: HTMLImageElement;
    gun_loaded?: boolean;
    isAlive: boolean;
    health: number;
    maxHealth: number;
    deathAnimation: {
        active: boolean;
        progress: number;
        duration: number;
    };
    lastDamageTime: number;
    immunityDuration: number;
    killerId?: string;
    deathTime?: number;

    constructor(id: string, x: number, y: number) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 100;
        this.color = 'blue';
        this.speed = 3.5;
        this.gravity = 0.19;
        this.verticalSpeed = 0;
        this.groundY = 600;
        this.mouseX = 0;
        this.mouseY = 0;
        this.handEndXY = {x: 0, y: 0};
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.isAlive = true;
        this.deathAnimation = {
            active: false,
            progress: 0,
            duration: 1000 // 1 sekunda na animację
        };
        this.lastDamageTime = 0;
        this.deathTime = 100;
        this.immunityDuration = 1000; // 1 sekunda niewrażliwości po otrzymaniu obrażeń

        this.gun_model = new Image();
        this.gun_model.src = "/1654.png";
        this.gun_model.onload = () => {
            this.gun_loaded = true;
        };
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.deathAnimation.active) {
            this.drawDeathAnimation(ctx);
            return;
        }

        if (!this.isAlive) return;

        // Rysuj gracza
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.globalAlpha = 1;

        // Rysuje ramie
        this.drawHand(ctx, this.mouseX, this.mouseY);

        // Rysuj pasek zdrowiad
        this.drawHealthBar(ctx);
    }

    drawHand(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number) {
        const handLength = 50;
        const handWidth = 12;
    
        // Punkt obrotu (ramię)
        const shoulderX = this.x + this.width / 2;
        const shoulderY = this.y + this.height / 3;
    
        // Oblicz wektor kierunku
        let dirX = mouseX - shoulderX;
        let dirY = mouseY - shoulderY;
    
        // Normalizuj wektor (zamień na wektor jednostkowy)
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        if (length > 0) {
            dirX = dirX / length;
            dirY = dirY / length;
        }
    
        // Oblicz końcowy punkt ręki
        const endX = shoulderX + dirX * handLength;
        const endY = shoulderY + dirY * handLength;
        
        this.handEndXY.x = endX;
        this.handEndXY.y = endY;

        ctx.save();

        // Rysuj rękę (możesz dostosować pozycję lub kolor)
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = handWidth;
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

       // Rysuj broń
       if (this.gun_loaded) {
            ctx.save();

            // Przesuń kontekst do końca ręki
            ctx.translate(endX, endY);

            // Oblicz kąt, ale nie odwracaj go w zależności od kierunku
            const angle = Math.atan2(dirY, dirX);

            // Skaluj broń, jeśli mysz jest po lewej stronie gracza
            if (dirX < 0) {
                ctx.rotate(angle + Math.PI);
                ctx.scale(-1, 1);
            }
            else
                ctx.rotate(angle);

            // Parametry broni
            const gunWidth = 100;
            const gunHeight = 40;

            // Rysuj broń (wycentrowana względem rękojeści)
            ctx.drawImage(
                this.gun_model,
                0, -gunHeight / 2,  // Pozycja X i Y (środek broni na linii ręki)
                gunWidth, gunHeight // Wymiary broni
            );

            ctx.restore();
        }
    
        // Punkt obrotu (ramię)
        ctx.beginPath();
        ctx.arc(shoulderX, shoulderY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#38ff00';
        ctx.fill();

        ctx.restore();
    }

    drawDeathAnimation(ctx: CanvasRenderingContext2D) {
        if (!this.deathTime) return;  // Ensure deathTime is set
    
        const progress = (Date.now() - this.deathTime) / this.deathAnimation.duration;
    
        if (progress >= 1) {
            this.deathAnimation.active = false;
            return;
        }
    
        const particles = 100;
        const particleSize = 20;
        ctx.fillStyle = this.color;
        
        for (let i = 0; i < particles; i++) {
            const angle = (i / particles) * Math.PI * 2;
            const distance = progress * 50;
            
            const particleX = this.x + this.width / 2 + Math.cos(angle) * distance;
            const particleY = this.y + this.height / 2 + Math.sin(angle) * distance;
            
            ctx.globalAlpha = 1 - progress;
            ctx.fillRect(
                particleX - particleSize / 2,
                particleY - particleSize / 2,
                particleSize,
                particleSize
            );
        }
        ctx.globalAlpha = 1;
    }

    drawDeathScreen(ctx: CanvasRenderingContext2D) {
        if (!this.isAlive && this.deathTime) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
            ctx.fillStyle = 'white';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('You Died!', ctx.canvas.width / 2, ctx.canvas.height / 2 - 50);
    
            const timeLeft = Math.max(0, Math.ceil((this.deathTime + 5000 - Date.now()) / 1000));
            if (timeLeft > 0) {
                ctx.font = '24px Arial';
                ctx.fillText(`Respawning in ${timeLeft} seconds...`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);
            }
    
            if (this.killerId) {
                ctx.font = '20px Arial';
                ctx.fillText(`Killed by: Player ${this.killerId}`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 60);
            }
        }
    }

    move(keysPressed: { [key: string]: boolean }) {
        // Ogranicz ruch gracza do granic ekranu
        if (keysPressed['d'] && this.x + this.width < 1920) {
            this.x += this.speed;
        }
        if (keysPressed['a'] && this.x > 0) {
            this.x -= this.speed;
        }

        // Dodaj grawitację
        this.verticalSpeed += this.gravity; // Przyspieszenie grawitacyjne
        this.y += this.verticalSpeed; // Aktualizuj położenie gracza w osi Y

        // Sprawdź kolizję z ziemią
        if (this.y + this.height > this.groundY) {
            this.y = this.groundY - this.height; // Zatrzymaj gracza na ziemi
            this.verticalSpeed = 0; // Resetuj prędkość pionową
        }
    }

    takeDamage(damage: number): boolean {
        this.health = Math.max(0, this.health - damage);

        if (this.health <= 0) {
            this.isAlive = false;
        }

        return true;
    }

    die(killerId?: string) {
        this.isAlive = false;
        this.killerId = killerId;
        this.deathTime = Date.now();  // Record the exact time of death
        this.deathAnimation.active = true;
        this.deathAnimation.progress = 0;
    }

    respawn(x: number, y: number) {
        this.health = this.maxHealth;
        this.isAlive = true;
        this.x = x;
        this.y = y;
        this.verticalSpeed = 0;
    }

    jump() {
        // Umożliw skok, tylko jeśli gracz jest na ziemi
        if (this.y + this.height >= this.groundY) {
            this.verticalSpeed = -10; // Ustaw prędkość skoku (ujemna)
        }
    }

    drawHealthBar(ctx: CanvasRenderingContext2D) {
        const barWidth = this.width;
        const barHeight = 6;
        const barY = this.y - 15;
        const healthPercent = this.health / this.maxHealth;

        // Tło paska
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.x, barY, barWidth, barHeight);

        // Pasek zdrowia
        const gradient = ctx.createLinearGradient(this.x, barY, this.x + barWidth * healthPercent, barY);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(1, '#ff0000');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, barY, barWidth * healthPercent, barHeight);

        // Ramka paska
        ctx.strokeStyle = '#000';
        ctx.strokeRect(this.x, barY, barWidth, barHeight);

        // Tekst z wartością zdrowia
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${Math.ceil(this.health)}/${this.maxHealth}`, 
            this.x + barWidth/2, 
            barY - 2
        );
    }
    
    getHandPosition() {
        return this.handEndXY;
    }

}
