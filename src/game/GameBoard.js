import { randomRangeInt } from "./Random";
import { Vec2 } from "../maths/Vec2";
import { HslColour } from "./Colour";

export const GameState = {
    Play: 0,
    Win: 1,
    Lose: 2,
};

const CellState = {
    Obstacle: -1,
    Empty: 0,
};

export const KeyCode = {
    Left: 37,
    Up: 38,
    Right: 39,
    Down: 40,
};

const EMPTY_COLOUR = new HslColour(150, 50, 50);
const OBSTACLE_COLOUR = new HslColour(360, 100, 100);
const COLOURS = {
    1: new HslColour(230, 90, 70),
    2: new HslColour(230, 85, 55),
    4: new HslColour(230, 80, 40),
    8: new HslColour(230, 75, 25),
    16: new HslColour(320, 60, 55),
    32: new HslColour(320, 55, 40),
    64: new HslColour(320, 50, 25),
    128: new HslColour(80, 60, 55),
    256: new HslColour(80, 55, 40),
    512: new HslColour(80, 50, 25),
    1024: new HslColour(345, 55, 40),
    2048: new HslColour(345, 50, 25),
};

export class GameBoard {
    constructor() {
        this.state = GameState.Play;
        this.gridSize = 0;
        this.cells = [];
        this.lastSpawned = 0;
        this.anythingMoved = false;
    }

    reset(gridSize, obstacleCount) {
        const cellCount = gridSize * gridSize;

        this.state = GameState.Play;
        this.gridSize = gridSize;
        this.cells = new Array(cellCount);

        this.cells.fill(0);

        // Not a very fun game if the whole grid is filled with obstacles, but at least we wont get stuck in an
        // infinite loop trying to find somewhere to place them. Also, this will only be an issue if someone
        // modifies the MAX_OBSTACLES to be able to fill the grid.
        this.spawnAssumingSpace(
            CellState.Obstacle,
            Math.min(obstacleCount, cellCount)
        );

        // Spawn the starting block. We'll use the trySpawn function that checks here since we don't know how many
        // obstacles there are. We could do a simple check and conditionally call spawnAssumingSpace, but I
        // doubt this will be a performance issue for this app.
        this.trySpawn(2);
    }

    spawnAssumingSpace(item, count) {
        const cellCount = this.cells.length;
        let itemsToSpawn = count;

        while (itemsToSpawn > 0) {
            const itemCell = randomRangeInt(0, cellCount);

            if (this.cells[itemCell] === CellState.Empty) {
                this.cells[itemCell] = item;

                this.lastSpawned = itemCell;
                itemsToSpawn -= 1;
            }
        }
    }

    trySpawn(item) {
        const cellCount = this.cells.length;
        let spaceToSpawn = false;

        for (let i = 0; i < cellCount && !spaceToSpawn; i += 1) {
            spaceToSpawn = this.cells[i] === CellState.Empty;
        }

        if (spaceToSpawn) {
            this.spawnAssumingSpace(item, 1);
        }

        return spaceToSpawn;
    }

    /**
     * @param x The x coordinate in grid space
     * @param y The y coordinate in grid space
     * @returns number | undefined
     */
    getCell(x, y) {
        return this.cells[x + y * this.gridSize];
    }

    /**
     * @param x    The x coordinate in grid space
     * @param y    The y coordinate in grid space
     * @param cell The value to set in this cell
     *
     * @important This method doesn't check that the requested cell is valid.
     */
    setCell(x, y, value) {
        this.cells[x + y * this.gridSize] = value;
    }

    movePositiveSearchFromCondition = (x) => x < this.gridSize;
    moveNegativeSearchFromCondition = (x) => x >= 0;

    // Shh, saving some allocations.
    searchFromResults = [undefined, false];
    searchFrom(startIndex, condition, increment, getCell) {
        const { searchFromResults } = this;

        searchFromResults[0] = undefined;
        searchFromResults[1] = false;

        for (
            let x = startIndex;
            condition(x) && searchFromResults[0] === undefined;
            x = x + increment
        ) {
            const cell = getCell(x);

            if (cell === CellState.Obstacle) {
                searchFromResults[0] = x;
                searchFromResults[1] = true;
            }

            if (cell !== CellState.Empty) {
                searchFromResults[0] = x;
            }
        }

        return searchFromResults;
    }

    movePositiveSearchCondition = (index) => index < this.gridSize - 1;
    moveNegativeSearchCondition = (index) => index > 0;

    /**
     * The core update algorithm. This will handle a row or column at a time.
     *
     * The step are as follows:
     * 1.  Start at the end of the row or column based on input direction (e.g. if the user pressed left we'd start at index 0)
     * 2.  Search the row or column for the first cell with a value.
     * 3.  If nothing was found
     *       a.  There is nothing in the row or column and we can break.
     * 4.  If an obstacle was found
     *       a.  Set the start index to the cell after the obstacle
     *       b.  Goto 1.
     * 5.  If the cell should move (it may have already been at the end)
     *       a.  Set the start cell to the value
     *       b.  Set the found cell to empty
     * 6.  Search again from the cell after the found cell
     * 7.  If nothing was found
     *       a.  There is nothing in the row or column and we can break.
     * 8.  If an obstacle was found
     *       a.  Set the start index to the cell after the obstacle
     *       b.  Goto 1.
     * 9.  If the second and first cells have the same value
     *       a.  Compute the combined value and insert into start cell
     *       b.  If the computed value is 2048
     *             a. Set the game state to WIN
     * 10. If the cell should move (it may have already been next to the end)
     *       a.  Set the cell next to the start cell to the value
     *       b.  Set the found cell to empty
     * 11. Increment the start index
     * 12. Goto 1.
     *
     * @param startIndex          The starting index within the row or column.
     * @param searchCondition     A function to determine if we need to continue working in this row or column
     * @param searchFromCondition The condition used for searching the row or column for cells
     * @param increment           The increment used to move to the next cell
     * @param getCell             A function for getting a cell given a single coordinate
     * @param setCell             A function for setting a cell given a single coordinate
     */
    updateCells(
        startIndex,
        searchCondition,
        searchFromCondition,
        increment,
        getCell,
        setCell
    ) {
        while (searchCondition(startIndex)) {
            const [firstIndex, firstObstacle] = this.searchFrom(
                startIndex,
                searchFromCondition,
                increment,
                getCell
            );

            if (firstIndex === undefined) {
                break;
            }

            if (firstObstacle) {
                startIndex = firstIndex + increment;
                continue;
            }

            const firstCell = getCell(firstIndex);
            const firstShouldMove = firstIndex !== startIndex;

            if (firstShouldMove) {
                this.anythingMoved = true;
                setCell(startIndex, firstCell);
                setCell(firstIndex, CellState.Empty);
            }

            const secondStart = firstIndex + increment;
            const [secondIndex, secondObstacle] = this.searchFrom(
                secondStart,
                searchFromCondition,
                increment,
                getCell
            );

            if (secondIndex === undefined) {
                break;
            }

            if (secondObstacle) {
                startIndex = secondIndex + increment;
                continue;
            }

            // if found something and same as first then combine
            const secondCell = getCell(secondIndex);

            if (firstCell === secondCell) {
                const combined = firstCell + secondCell;

                if (combined === 2048) {
                    this.state = GameState.Win;
                }

                this.anythingMoved = true;
                setCell(startIndex, firstCell + secondCell);
                setCell(secondIndex, CellState.Empty);
            } else {
                const secondShouldMove = secondIndex !== secondStart;

                if (secondShouldMove) {
                    this.anythingMoved = true;
                    setCell(startIndex + increment, secondCell);
                    setCell(secondIndex, CellState.Empty);
                }
            }

            // move to next cell repeat
            startIndex = startIndex + increment;
        }
    }

    updateRows(startIndex, searchCondition, searchFromCondition, increment) {
        const { gridSize } = this;

        for (let y = 0; y < gridSize; y += 1) {
            const getCell = (x) => this.getCell(x, y);
            const setCell = (x, value) => this.setCell(x, y, value);

            this.updateCells(
                startIndex,
                searchCondition,
                searchFromCondition,
                increment,
                getCell,
                setCell
            );
        }
    }

    updateColumns(startIndex, searchCondition, searchFromCondition, increment) {
        const { gridSize } = this;

        for (let x = 0; x < gridSize; x += 1) {
            const getCell = (y) => this.getCell(x, y);
            const setCell = (y, value) => this.setCell(x, y, value);

            this.updateCells(
                startIndex,
                searchCondition,
                searchFromCondition,
                increment,
                getCell,
                setCell
            );
        }
    }

    /**
     * Checks to see if there are any valid moves available on the board
     *
     * It is valid to move if a cell contains a value and either up, down, left or right of it is empty or a
     * cell containing the same value.
     */
    movesAvailable() {
        let canContinue = false;

        const { gridSize } = this;

        for (let y = 0; y < gridSize && !canContinue; y += 1) {
            for (let x = 0; x < gridSize && !canContinue; x += 1) {
                const cellValue = this.getCell(x, y);

                if (cellValue !== CellState.Obstacle && cellValue !== CellState.Empty) {
                    const leftCell = this.getCell(x - 1, y);
                    const upCell = this.getCell(x, y - 1);
                    const rightCell = this.getCell(x + 1, y);
                    const downCell = this.getCell(x, y + 1);

                    canContinue =
                        leftCell === cellValue ||
                        leftCell === CellState.Empty ||
                        upCell === cellValue ||
                        upCell === CellState.Empty ||
                        rightCell === cellValue ||
                        rightCell === CellState.Empty ||
                        downCell === cellValue ||
                        downCell === CellState.Empty;
                }
            }
        }

        return canContinue;
    }

    update(keyCode) {
        this.anythingMoved = false;

        switch (keyCode) {
            case KeyCode.Left:
                this.updateRows(
                    0,
                    this.movePositiveSearchCondition,
                    this.movePositiveSearchFromCondition,
                    1
                );
                break;

            case KeyCode.Up:
                this.updateColumns(
                    0,
                    this.movePositiveSearchCondition,
                    this.movePositiveSearchFromCondition,
                    1
                );
                break;

            case KeyCode.Right:
                this.updateRows(
                    this.gridSize - 1,
                    this.moveNegativeSearchCondition,
                    this.moveNegativeSearchFromCondition,
                    -1
                );
                break;

            case KeyCode.Down:
                this.updateColumns(
                    this.gridSize - 1,
                    this.moveNegativeSearchCondition,
                    this.moveNegativeSearchFromCondition,
                    -1
                );
                break;
        }

        if (this.anythingMoved) {
            this.trySpawn(1);
        }

        if (!this.movesAvailable()) {
            this.state = GameState.Lose;
        }
    }

    renderCell(context, cellX, cellY, cellSide, cellCorner, colour) {
        context.fillStyle = colour.background();
        context.strokeStyle = colour.border();
        context.lineWidth = 4;

        context.beginPath();

        context.moveTo(Math.floor(cellX), Math.floor(cellY + cellCorner));
        context.lineTo(Math.floor(cellX), Math.floor(cellY + cellSide));
        context.lineTo(
            Math.floor(cellX + cellCorner),
            Math.floor(cellY + cellSide + cellCorner)
        );
        context.lineTo(
            Math.floor(cellX + cellSide),
            Math.floor(cellY + cellSide + cellCorner)
        );
        context.lineTo(
            Math.floor(cellX + cellSide + cellCorner),
            Math.floor(cellY + cellSide)
        );
        context.lineTo(
            Math.floor(cellX + cellSide + cellCorner),
            Math.floor(cellY + cellCorner)
        );
        context.lineTo(Math.floor(cellX + cellSide), Math.floor(cellY));
        context.lineTo(Math.floor(cellX + cellCorner), Math.floor(cellY));
        context.closePath();

        context.fill();
        context.stroke();
    }

    static SINGLE_DIGIT_MASK = 0x000f;
    static DOUBLE_DIGIT_MASK = 0x0070;
    static TRIPLE_DIGIT_MASK = 0x0380;

    renderText(context, cellX, cellY, cellSize, value) {
        context.fillStyle = "white";

        // TODO: Also consider the cell size when the board is small.
        context.font =
            value & GameBoard.SINGLE_DIGIT_MASK
                ? "bold 48px serif"
                : value & GameBoard.DOUBLE_DIGIT_MASK
                    ? "bold 44px serif"
                    : value & GameBoard.TRIPLE_DIGIT_MASK
                        ? "bold 40px serif"
                        : "bold 36px serif";

        const text = value.toString();
        const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } =
            context.measureText(text);

        const height = actualBoundingBoxAscent - actualBoundingBoxDescent;

        const x = cellX + (cellSize - width) / 2;
        const y = cellY + (cellSize + height) / 2;

        context.fillText(text, Math.floor(x), Math.floor(y));
    }

    cellSize(context) {
        const gridSize = Math.min(context.canvas.width, context.canvas.height);
        const cellSize = gridSize / this.gridSize;

        return cellSize;
    }

    lastSpawnedPosition(context) {
        const cellSize = this.cellSize(context);
        const halfSize = cellSize / 2;

        const x =
            Math.floor(this.lastSpawned % this.gridSize) * cellSize + halfSize;
        const y =
            Math.floor(this.lastSpawned / this.gridSize) * cellSize + halfSize;

        return new Vec2(x, y);
    }

    render(context) {
        const cellPadding = 2;
        const cellCorner = 8;

        const paddedSize = this.cellSize(context);
        const cellSize = paddedSize - cellPadding * 2;
        const cellSide = cellSize - cellCorner * 2;

        for (let y = 0; y < this.gridSize; y += 1) {
            for (let x = 0; x < this.gridSize; x += 1) {
                const cell = this.getCell(x, y);
                const cellX = x * paddedSize + cellPadding;
                const cellY = y * paddedSize + cellPadding;

                if (cell === CellState.Obstacle) {
                    this.renderCell(
                        context,
                        cellX,
                        cellY,
                        cellSide,
                        cellCorner,
                        OBSTACLE_COLOUR
                    );
                } else if (cell === CellState.Empty) {
                    this.renderCell(
                        context,
                        cellX,
                        cellY,
                        cellSide,
                        cellCorner,
                        EMPTY_COLOUR
                    );
                } else {
                    this.renderCell(
                        context,
                        cellX,
                        cellY,
                        cellSide,
                        cellCorner,
                        COLOURS[cell]
                    );
                    this.renderText(context, cellX, cellY, cellSize, cell);
                }
            }
        }
    }
}
