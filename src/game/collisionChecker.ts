type Point = { x: number; y: number };
type Polygon = Point[];

export default class CollisionChecker {
    private collisionObjects: { x: number; y: number; polygon?: Polygon; width?: number; height?: number }[];
    private scaleFactor: number;

    constructor(collisionObjects: { x: number; y: number; polygon?: Polygon; width?: number; height?: number }[], scaleFactor: number = 1) {
        this.collisionObjects = collisionObjects;
        this.scaleFactor = scaleFactor;
    }

    // Funkcja sprawdzająca kolizję pomiędzy graczem a obiektami na mapie
    checkPlayerCollision(playerPolygon: Polygon): boolean {
        return this.collisionObjects.some(obj => {
            const objectPolygon: Polygon = obj.polygon
                ? obj.polygon.map((point: Point) => ({
                      x: (obj.x + point.x) * this.scaleFactor,
                      y: (obj.y + point.y) * this.scaleFactor
                  }))
                : [
                      { x: obj.x * this.scaleFactor, y: obj.y * this.scaleFactor },
                      { x: (obj.x + obj.width!) * this.scaleFactor, y: obj.y * this.scaleFactor },
                      { x: (obj.x + obj.width!) * this.scaleFactor, y: (obj.y + obj.height!) * this.scaleFactor },
                      { x: obj.x * this.scaleFactor, y: (obj.y + obj.height!) * this.scaleFactor }
                  ];
            return this.checkSATCollision(playerPolygon, objectPolygon);
        });
    }

    // Algorytm SAT: sprawdza kolizję pomiędzy dwoma wielokątami
    private checkSATCollision(polygon1: Polygon, polygon2: Polygon): boolean {
        const edges = [...this.getEdges(polygon1), ...this.getEdges(polygon2)];
        for (const edge of edges) {
            const axis = this.getPerpendicularAxis(edge);
            const projection1 = this.projectVertices(polygon1, axis);
            const projection2 = this.projectVertices(polygon2, axis);

            if (!this.isOverlapping(projection1, projection2)) {
                return false;
            }
        }
        return true;
    }

    // Generuj krawędzie wielokąta
    private getEdges(vertices: Polygon): Point[] {
        return vertices.map((vertex: Point, i: number) => ({
            x: vertices[(i + 1) % vertices.length].x - vertex.x,
            y: vertices[(i + 1) % vertices.length].y - vertex.y
        }));
    }

    // Wygeneruj oś prostopadłą do krawędzi
    private getPerpendicularAxis(edge: Point): Point {
        const axis = { x: -edge.y, y: edge.x };
        return axis;
    }

    // Rzutuj wierzchołki na oś
    private projectVertices(vertices: Polygon, axis: Point): { min: number; max: number } {
        let [min, max] = [Infinity, -Infinity];
        vertices.forEach((vertex: Point) => {
            const projection = vertex.x * axis.x + vertex.y * axis.y;
            min = Math.min(min, projection);
            max = Math.max(max, projection);
        });
        return { min, max };
    }

    // Sprawdź, czy projekcje nakładają się na siebie
    private isOverlapping(proj1: { min: number; max: number }, proj2: { min: number; max: number }): boolean {
        return proj1.max >= proj2.min && proj2.max >= proj1.min;
    }
}