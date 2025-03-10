export class DirectionVector {
    private ctx: CanvasRenderingContext2D; // Kontekst rysowania
    private canvas: HTMLCanvasElement;     // Płótno
    private strokeColor: string;           // Kolor linii
    private fillColor: string;             // Kolor grotu
    private lineWidth: number;             // Grubość linii
    private arrowLength: number;           // Długość strzałki
    private arrowSize: number;             // Rozmiar grotu

    constructor(canvas: HTMLCanvasElement, options: {
        strokeColor?: string,
        fillColor?: string,
        lineWidth?: number,
        arrowLength?: number,
        arrowSize?: number
    } = {}) {
        // Inicjalizacja płótna i kontekstu
        this.canvas = canvas;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Nie udało się uzyskać kontekstu 2D z płótna');
        }
        this.ctx = ctx;

        // Domyślne wartości z opcjami konfigurowalnymi
        this.strokeColor = options.strokeColor || 'green';
        this.fillColor = options.fillColor || 'green';
        this.lineWidth = options.lineWidth || 2;
        this.arrowLength = options.arrowLength || 50;
        this.arrowSize = options.arrowSize || 10;
    }

    // Metoda do rysowania wektora kierunku
    draw(startX: number, startY: number, targetX: number, targetY: number) {
        // Oblicz wektor kierunku
        const dx = targetX - startX;
        const dy = targetY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Jeśli wektor ma zerową długość, nie rysuj
        if (length === 0) return;

        // Normalizuj i skaluj wektor
        const unitX = dx / length;
        const unitY = dy / length;
        const endX = startX + unitX * this.arrowLength;
        const endY = startY + unitY * this.arrowLength;

        // Ustaw styl rysowania
        this.ctx.strokeStyle = this.strokeColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.fillStyle = this.fillColor;

        // Rysuj linię główną wektora
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        // Rysuj grot strzałki
        const angle = Math.atan2(dy, dx);
        const arrowPoint1X = endX - this.arrowSize * Math.cos(angle + Math.PI / 6);
        const arrowPoint1Y = endY - this.arrowSize * Math.sin(angle + Math.PI / 6);
        const arrowPoint2X = endX - this.arrowSize * Math.cos(angle - Math.PI / 6);
        const arrowPoint2Y = endY - this.arrowSize * Math.sin(angle - Math.PI / 6);

        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(arrowPoint1X, arrowPoint1Y);
        this.ctx.lineTo(arrowPoint2X, arrowPoint2Y);
        this.ctx.closePath();
        this.ctx.fill();
    }

    // Opcjonalne metody do zmiany parametrów w locie
    setStrokeColor(color: string) {
        this.strokeColor = color;
    }

    setFillColor(color: string) {
        this.fillColor = color;
    }

    setLineWidth(width: number) {
        this.lineWidth = width;
    }

    setArrowLength(length: number) {
        this.arrowLength = length;
    }

    setArrowSize(size: number) {
        this.arrowSize = size;
    }
}