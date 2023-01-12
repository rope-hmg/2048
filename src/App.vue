<script setup>
import { ref, onMounted } from "vue";

import NumericControl from "./components/NumericControl.vue";
import Overlay from "./components/Overlay.vue";

import { GameBoard, GameState, KeyCode } from "./game/GameBoard";
import { Stars } from "./particles/Stars";
import { Time } from "./game/Time";
import { CanvasController } from "./game/CanvasController";
import { debounce } from "./utilities/Debounce";

const gameBoard = new GameBoard();
const stars = new Stars(20, gameBoard);
const time = new Time();

// Not ideal, but the ref concept always makes this a bit messy.
let canvas;

const gameRef = ref();
const animRef = ref();

const MIN_GRID_SIZE = 3;
const MAX_GRID_SIZE = 8;
const MIN_OBSTACLES = 0;
const MAX_OBSTACLES = 4;

const gridSize = ref(6);
const obstacleCount = ref(0);

function startNewGame() {
    if (canvas) {
        gameBoard.reset(gridSize.value, obstacleCount.value);

        canvas.clear();

        gameBoard.render(canvas.gameContext);
    }
}


onMounted(() => {
    const gameCanvas = gameRef.value;
    const animCanvas = animRef.value;

    canvas = new CanvasController(gameCanvas, animCanvas);

    const context = canvas.animContext;

    function frame(currentTimeStamp) {
        const delta = time.delta(currentTimeStamp);

        // This is weird, but it clears the context.
        // eslint-disable-next-line no-self-assign
        context.canvas.width = context.canvas.width;

        stars.render(context, delta);

        requestAnimationFrame(frame);
    }

    window.addEventListener("keyup", (event) => {
        if (event.keyCode >= KeyCode.Left && event.keyCode <= KeyCode.Down) {
            event.preventDefault();

            gameBoard.update(event.keyCode);
            gameBoard.render(canvas.gameContext);

            const lastSpawned = gameBoard.lastSpawnedPosition(canvas.gameContext);
            stars.setSpawn(lastSpawned.x, lastSpawned.y);
        }
    });

    window.addEventListener("resize", debounce(() => {
        canvas.resize();
        gameBoard.render(canvas.gameContext);
    }), 150);

    startNewGame();
    frame(performance.now());
});
</script>

<template>
    <main id="content">
        <header id="controls">
            <button @click="startNewGame">Start New Game</button>

            <NumericControl
                label="Grid Size"
                :minimum="MIN_GRID_SIZE"
                :maximum="MAX_GRID_SIZE"
                v-model:value="gridSize"
            />
            <NumericControl
                label="Obstacles"
                :minimum="MIN_OBSTACLES"
                :maximum="MAX_OBSTACLES"
                v-model:value="obstacleCount"
            />
        </header>

        <Overlay
            :hide="gameBoard.state !== GameState.Win"
            :text="['Congratulations!', 'You reached 2048!']"
        />

        <Overlay
            :hide="gameBoard.state !== GameState.Lose"
            :text="['Game Over!', 'No Moves Remaining!']"
        />

        <canvas id="game-canvas" ref="gameRef"></canvas>
        <canvas id="anim-canvas" ref="animRef"></canvas>
    </main>
</template>

<style scoped>
#content {
    display: grid;
    width: 100%;
    height: 100%;

    grid-template:
        "controls" auto
        "canvas" 1fr;
}

#controls {
    grid-area: controls;
}

#game-canvas {
    grid-area: canvas;
    position: relative;
    width: 100%;
    height: 100%;
}

#anim-canvas {
    grid-area: canvas;
    position: relative;
    width: 100%;
    height: 100%;
    z-index: 10;
}

/* Not sure how this class is working. Seems like a bug? */
/* It's not added to any elements, but the Overlay component defines a class with the same name in a scoped style */
.overlay {
    z-index: 100;
    grid-area: canvas;
}
</style>
