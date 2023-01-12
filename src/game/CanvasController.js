export class CanvasController {
    constructor(gameCanvas, animCanvas) {
        console.log(gameCanvas);
        this.canvas = [gameCanvas, animCanvas];
        this.context = this.canvas.map((canvas) => canvas.getContext("2d"));

        this.resize();
    }

    get gameContext() {
        return this.context[0];
    }

    get animContext() {
        return this.context[1];
    }

    resize() {
        for (const canvas of this.canvas) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
    }

    clear() {
        for (const context of this.context) {
            context.fillStyle = "black";
            context.fillRect(0, 0, context.canvas.width, context.canvas.height);
        }
    }
}
