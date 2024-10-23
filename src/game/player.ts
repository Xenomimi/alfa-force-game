export class Player {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    speed: number;
    gravity: number;
    verticalSpeed: number;
    groundY: number;
    previousAngle: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 100;
        this.color = 'blue';
        this.speed = 3.5;
        this.gravity = 0.19; // Przyspieszenie grawitacyjne
        this.verticalSpeed = 0; // Początkowa prędkość pionowa
        this.groundY = 600; // Ustal poziom ziemi
        this.previousAngle = 0;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
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

    jump() {
        // Umożliw skok, tylko jeśli gracz jest na ziemi
        if (this.y + this.height >= this.groundY) {
            this.verticalSpeed = -10; // Ustaw prędkość skoku (ujemna)
        }
    }

    drawHand(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number) {
        const handLength = 50;
        const handWidth = 12;
    
        // Punkt obrotu (ramię)
        const shoulderX = this.x + this.width / 2;
        const shoulderY = this.y + (this.height / 3);
    
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
    
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = handWidth;
        ctx.strokeStyle = 'red';
        ctx.stroke();
    
        // Punkt obrotu (ramię)
        ctx.beginPath();
        ctx.arc(shoulderX, shoulderY, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
    }
    
}
