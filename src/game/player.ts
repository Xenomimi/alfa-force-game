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
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    move(keysPressed: { [key: string]: boolean }) {
        if (keysPressed['ArrowRight']) this.x += this.speed;
        if (keysPressed['ArrowLeft']) this.x -= this.speed;

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
        // Umożliw skok
        if (this.y + this.height >= this.groundY) {
            this.verticalSpeed = -10; // Ustaw prędkość skoku (ujemna)
        }
    }
}
