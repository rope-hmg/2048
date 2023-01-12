import { Vec2 } from "../maths/Vec2";
import { randomRange, randomRangeInt } from "../game/Random";
import { HslColour } from "../game/Colour";

export class Stars {
    constructor(count, gameBoard) {
        this.spawn = new Vec2(-100, -100);
        this.stars = new Array(count);
        this.board = gameBoard;

        const colour = new HslColour(45, 100, 50);

        this.fillStyle = colour.background();
        this.strokeStyle = colour.border();

        for (let i = 0; i < count; i += 1) {
            const direction = Vec2.randomUnit();
            const offset = randomRange(10, 50);
            const translation = this.spawn.add(direction.mulAssign(offset));
            const lifetime = randomRangeInt(250, 300);

            this.stars[i] = { lifetime, translation, direction };
        }
    }

    setSpawn(x, y) {
        this.spawn.x = x;
        this.spawn.y = y;
    }

    render(context, dTime) {
        const count = this.stars.length;
        const spikes = 5;
        const outerRadius = 6;
        const innerRadius = 3;
        const step = Math.PI / spikes;
        const velocity = -0.1;
        const cellSize = this.board.cellSize(context);
        const smolSize = cellSize / 4;

        context.fillStyle = this.fillStyle;
        context.strokeStyle = this.strokeStyle;
        context.lineWidth = 2;
        context.beginPath();

        for (let i = 0; i < count; i += 1) {
            const star = this.stars[i];

            if (star.lifetime <= 0) {
                const offset = randomRange(smolSize, cellSize);

                star.direction.randomUnit();
                star.lifetime = randomRangeInt(250, 300);

                star.translation.copyFrom(this.spawn);
                star.translation.x += star.direction.x * offset;
                star.translation.y += star.direction.y * offset;
            }

            star.lifetime -= dTime;
            star.translation.y += velocity * dTime;

            let { x: cx, y: cy } = star.translation;
            let { x, y } = star.translation;
            let rotation = (Math.PI / 2) * 3;

            context.moveTo(cx, cy - outerRadius);

            for (let j = 0; j < spikes; j += 1) {
                x = cx + Math.cos(rotation) * outerRadius;
                y = cy + Math.sin(rotation) * outerRadius;
                context.lineTo(x, y);
                rotation += step;

                x = cx + Math.cos(rotation) * innerRadius;
                y = cy + Math.sin(rotation) * innerRadius;
                context.lineTo(x, y);
                rotation += step;
            }

            context.lineTo(cx, cy - outerRadius);
            context.closePath();
        }

        context.stroke();
        context.fill();
    }
}
