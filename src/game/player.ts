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
    killerId?: string;
    deathTime?: number;

    // Body
    head: HTMLImageElement;
    torso: HTMLImageElement;
    joint: HTMLImageElement;
    forearm: HTMLImageElement;
    hand: HTMLImageElement;
    leg: HTMLImageElement;

    legSwingDirection: number;
    thighSwingAngle: number;
    calfSwingAngle: number;

    headHitbox!: { x: number, y: number, width: number, height: number };
    torsoHitbox!: { x: number, y: number, width: number, height: number }
    legHitbox!: { x: number, y: number, width: number, height: number };

    imagesLoaded: boolean = false;

    constructor(id: string, x: number, y: number) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.color = 'rgb(255, 0, 0, 0.5)';
        this.speed = 2.5;
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
        this.deathTime = 100;
        this.gun_model = new Image();
        this.gun_model.src = "/1654.png";
        this.gun_model.onload = () => {
            this.gun_loaded = true;
        };

        // Body
        this.head = new Image();
        this.head.src = "./head.png";
        this.head.onload = this.checkImagesLoaded.bind(this);

        this.torso = new Image();
        this.torso.src = "./torso.png";
        this.torso.onload = this.checkImagesLoaded.bind(this);

        this.joint = new Image();
        this.joint.src = "./joint.png";
        this.joint.onload = this.checkImagesLoaded.bind(this);

        this.hand = new Image();
        this.hand.src = "./hand.png";
        this.hand.onload = this.checkImagesLoaded.bind(this);

        this.forearm = new Image();
        this.forearm.src = "./forearm.png";
        this.forearm.onload = this.checkImagesLoaded.bind(this);

        this.leg = new Image();
        this.leg.src = "./leg.png";
        this.leg.onload = this.checkImagesLoaded.bind(this);

        this.legSwingDirection = 1; // Kierunek wahadła nogi (1 = naprzód, -1 = w tył)
        this.thighSwingAngle = 0; // Kąt wychylenia uda
        this.calfSwingAngle = 0; // Kąt wychylenia podudzia

        this.width = this.torso.width - 3
        this.height = this.head.height + this.torso.height + this.leg.height + this.joint.height - 25;
    
        // Ustal hitboxy dla każdej części ciała w odpowiednich pozycjach
        this.initializeHitboxes();

        // console.log("headHitbox:");
        // console.log(this.headHitbox);

        // console.log("torsoHitbox:");
        // console.log(this.torsoHitbox);

        // console.log("legHitbox:");
        // console.log(this.legHitbox);
    }

    checkImagesLoaded(): void {
        // Sprawdź, czy wszystkie obrazy zostały załadowane
        if (
            this.head.complete &&
            this.torso.complete &&
            this.joint.complete &&
            this.hand.complete &&
            this.forearm.complete &&
            this.leg.complete
        ) {
            this.imagesLoaded = true;
            this.updateDimensions();
            this.initializeHitboxes();
        }
    }
    
    updateDimensions() {
        // Aktualizacja wymiarów na podstawie załadowanych obrazów
        this.width = this.torso.width - 3;
        this.height = this.head.height + this.torso.height + this.leg.height + this.joint.height - 25;
    }

    initializeHitboxes(): void {
        // Ustawienie hitboxów na podstawie aktualnych wymiarów obrazów
        this.headHitbox = { 
            x: this.x, 
            y: this.y, 
            width: this.head.width, 
            height: this.head.height 
        };
        this.torsoHitbox = { 
            x: this.x, 
            y: this.y + this.head.height, 
            width: this.torso.width - 2, 
            height: this.torso.height - 2 
        };
        this.legHitbox = { 
            x: this.x, 
            y: this.y + this.head.height + this.torso.height - 12, 
            width: this.joint.width + 3, 
            height: this.leg.height 
        };
    }

    updateHitboxes() {
        if (!this.imagesLoaded) return; // Tylko aktualizuj hitboxy, jeśli obrazy są załadowane
    
        // Aktualizacja pozycji hitboxów przy zmianie pozycji postaci
        this.headHitbox.x = this.x + this.width / 2 - this.head.width / 2;
        this.headHitbox.y = this.y;
    
        this.torsoHitbox.x = this.x;
        this.torsoHitbox.y = this.y + this.head.height - 9;
    
        this.legHitbox.x = this.x + this.width / 2 + 2;
        this.legHitbox.y = this.y + this.head.height + this.torso.height - 12;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.deathAnimation.active) {
            this.drawDeathAnimation(ctx);
            return;
        }
        if (!this.isAlive) return;
    
        // Określ, czy obrócić postać w lewo
        const flipLeft = this.mouseX < this.x + this.width / 2;
    

        ctx.save();
        if (flipLeft) {
            ctx.translate(this.x + this.width / 2, 0); // Przesuń punkt odniesienia
            ctx.scale(-1, 1); // Odwróć poziomo
            ctx.translate(-this.x - this.width / 2, 0); // Cofnij przesunięcie
        }
        // Rysuj zbiorczy hitbox (czerwony prostokąt) wokół całej postaci
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    
        // Rysuj nogi
        this.drawLeg(ctx, this.legHitbox.x, this.legHitbox.y, this.thighSwingAngle, this.calfSwingAngle);
        this.drawLeg(ctx, this.legHitbox.x, this.legHitbox.y, -this.thighSwingAngle, this.calfSwingAngle);
    
        // Rysuj tors i głowę
        ctx.drawImage(this.torso, this.torsoHitbox.x, this.torsoHitbox.y);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.torsoHitbox.x, this.torsoHitbox.y, this.torsoHitbox.width, this.torsoHitbox.height);
        
        ctx.drawImage(this.head, this.headHitbox.x, this.headHitbox.y);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.headHitbox.x, this.headHitbox.y, this.head.width, this.head.height);
    
        // Rysuj rękę z bronią
        this.drawHand(ctx, this.mouseX, this.mouseY, flipLeft);
        // Rysuj pasek zdrowia wycentrowany
        this.drawHealthBar(ctx);
    
        ctx.restore();
    }

    // Rysowanie nogi z ugięciem w kolanie
    drawLeg(ctx: CanvasRenderingContext2D, x: number, y: number, thighAngle: number, calfAngle: number) {
        ctx.save();
        ctx.translate(x, y); // Punkt zaczepienia nogi na wysokości bioder
        ctx.rotate(thighAngle); // Obrót uda (joint)

        // Punkt obrotu biodra

        // Rysuj udo (joint)
        ctx.drawImage(this.joint, -this.joint.width / 2, -5);

        // Rysowanie hitboxa uda
        ctx.strokeStyle = 'rgb(0, 0, 255, 1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.joint.width / 2, 0, this.joint.width, this.joint.height);

        // Przejdź do końca uda i rysuj podudzie (leg) z dodatkowym kątem dla zgięcia kolana
        ctx.translate(3, this.joint.height / 3);
        ctx.rotate(calfAngle); // Zgięcie w kolanie
        ctx.drawImage(this.leg, -this.leg.width / 2, 0);

        // Rysowanie hitboxa podudzia
        ctx.strokeRect(-this.leg.width / 2, 0, this.leg.width, this.leg.height);

        ctx.restore();
    }

    // Animacja uda i podudzia
    animateLegs() {
        const maxThighSwing = Math.PI / 6; // Maksymalny kąt wychylenia uda
        const swingSpeed = 0.035; // Szybkość wahadła

        // Animacja wychylenia uda
        this.thighSwingAngle += swingSpeed * this.legSwingDirection;

        // Animacja wychylenia podudzia z przesunięciem, by zginało się w kierunku uda
        this.calfSwingAngle = this.thighSwingAngle / 2;

        if (this.thighSwingAngle > maxThighSwing || this.thighSwingAngle < -maxThighSwing) {
            this.legSwingDirection *= -1; // Zmiana kierunku wahadła
        }
    }

    drawHand(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number, isFlipped: boolean) {
        const upperArmLength = 15;
        const forearmLength = 15;
        let shoulderX;
        if(isFlipped) {
            shoulderX = this.x + this.width - 5;
        } else {
            shoulderX = this.x + 5;
        }

        const shoulderY = this.y + 16;
    
        let dirX = mouseX - shoulderX;
        let dirY = mouseY - shoulderY;
    
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        if (length > 0) {
            dirX = dirX / length;
            dirY = dirY / length;
        }
    
        const elbowX = shoulderX + dirX * upperArmLength;
        const elbowY = shoulderY + dirY * upperArmLength;
        const endX = elbowX + dirX * forearmLength;
        const endY = elbowY + dirY * forearmLength;
    
        this.handEndXY.x = endX;
        this.handEndXY.y = endY;
    
        // Rysowanie wektorów kierunkowych
        ctx.restore();
    
        // Wektor od barku do łokcia (czerwony)
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(elbowX, elbowY);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Wektor od łokcia do ręki (niebieski)
        ctx.beginPath();
        ctx.moveTo(elbowX, elbowY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();
    
        // Wektor od ręki do punktu wystrzału (zielony)
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX + dirX * 10, endY + dirY * 10); // Krótka linia wyjściowa
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2;
        ctx.stroke();
    
        // Punkt wystrzału
        ctx.beginPath();
        ctx.arc(this.getHandPosition().x, this.getHandPosition().y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(0, 255, 0, 1)';
        ctx.fill();
        
        ctx.save();
        
        // Rysuj punkt obrotu barku (zielony) z uwzględnieniem kierunku
        ctx.translate(shoulderX, shoulderY);
        if (dirX < 0) {
            ctx.scale(-1, 1);
        } else {
            ctx.scale(1, 1);
        }
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(0, 255, 0, 1)';
        ctx.fill();
        ctx.restore();
        
        ctx.save();
        
        // Rysuj przegub (joint)
        ctx.translate(shoulderX, shoulderY);
        const upperArmAngle = Math.atan2(dirY, dirX);
        if (dirX < 0) {
            ctx.rotate(upperArmAngle + Math.PI);
            ctx.scale(-1, 1);
        } else {
            ctx.rotate(upperArmAngle);
        }
        ctx.save();
        
        if (this.joint.complete) {
            ctx.drawImage(this.forearm, -3, -this.forearm.height / 2);
        }
        ctx.restore();
        ctx.restore();
        
        // Rysuj dłoń (hand)
        ctx.save();
        ctx.translate(elbowX, elbowY);
        const forearmAngle = Math.atan2(dirY, dirX);
        if (dirX < 0) {
            ctx.rotate(forearmAngle + Math.PI);
            ctx.scale(-1, 1);
        } else {
            ctx.rotate(forearmAngle);
        }
        ctx.save();
        
        if (this.hand.complete) {
            ctx.drawImage(this.hand, -7, -this.hand.height / 2);
        }
        ctx.restore();
        ctx.restore();
        
        // Rysuj broń, jeśli załadowana
        if (this.gun_loaded) {
            ctx.save();
            ctx.translate(endX, endY);
        
            const gunAngle = Math.atan2(dirY, dirX);
            if (dirX < 0) {
                ctx.rotate(gunAngle + Math.PI);
                ctx.scale(-1, 1);
            } else {
                ctx.rotate(gunAngle);
            }
        
            const gunWidth = 50;
            const gunHeight = 25;
        
            ctx.drawImage(
                this.gun_model,
                0, -gunHeight / 2,
                gunWidth, gunHeight
            );
        
            ctx.restore();
        }
        
        ctx.restore();
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
        if (keysPressed['d']) {
            this.x += this.speed;
            this.animateLegs()
        }
        if (keysPressed['a']) {
            this.x -= this.speed;
            this.animateLegs()
        }

        // Dodaj grawitację
        this.verticalSpeed += this.gravity; // Przyspieszenie grawitacyjne
        this.y += this.verticalSpeed; // Aktualizuj położenie gracza w osi Y

        // Sprawdź kolizję z ziemią
        if (this.y + this.height > this.groundY) {
            this.y = this.groundY - this.height; // Zatrzymaj gracza na ziemi
            this.verticalSpeed = 0; // Resetuj prędkość pionową
        }

        this.updateHitboxes();
    }

    takeDamage(damage: number): boolean {
        this.health = Math.max(0, this.health - damage);
    
        if (this.health <= 0 && this.isAlive) {
            this.die();
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
        const barWidth = this.width + 30;
        const barHeight = 6;
        const barX = this.x + this.width / 2 - barWidth / 2;
        const barY = this.y - 20;
        const healthPercent = this.health / this.maxHealth;
    
        // Obliczanie koloru na podstawie poziomu zdrowia
        const green = Math.floor(255 * healthPercent);
        const red = 255 - green;
        const healthColor = `rgb(${red}, ${green}, 0)`;
    
        // Tło paska (opcjonalne)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
    
        // Pasek zdrowia
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    
        // Ramka paska
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    
        // Tekst z wartością zdrowia
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${Math.ceil(this.health)} / ${this.maxHealth}`, 
            barX + barWidth / 2, 
            barY - 2
        );
    }
    
    
    getHandPosition() {
        return this.handEndXY;
    }

}
