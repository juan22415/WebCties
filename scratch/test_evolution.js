import { GameState } from '../game.js';
import { TILES } from '../config.js';

const game = new GameState();

// Setup a 5x5 residential zone at x=5, y=5 surrounded by roads
for (let y = 4; y <= 10; y++) {
    for (let x = 4; x <= 10; x++) {
        if (x === 4 || x === 10 || y === 4 || y === 10) {
            game.setTile(x, y, TILES.ROAD);
        } else {
            game.setTile(x, y, TILES.ZONE_RES);
        }
    }
}

// Power the grid
for (let i = 0; i < game.grid.length; i++) {
    game.powerGrid[i] = true;
    game.desirabilityGrid[i] = 100;
}
game.demand.res = 100;

const originalSim = game.simulateStep.bind(game);
game.simulateStep = function() {
    const oldCalc = this.calculateDemand.bind(this);
    this.calculateDemand = function() {
        this.demand.res = 2000;
        this.demand.com = 2000;
        this.demand.ind = 2000;
    };
    originalSim();
}

// Run some steps to let 1x2 and 2x1 build on edges
for (let i = 0; i < 50; i++) {
    game.simulateStep();
}

for (let y = 5; y <= 9; y++) {
    let row = "";
    for (let x = 5; x <= 9; x++) {
        row += game.getTile(x, y).toString().padStart(3, ' ') + " ";
    }
    console.log(row);
}

// Now force the demand high and see if 3x3 builds
game.demand.res = 100;
game.simulateStep();

console.log("Grid after forcing evolution step:");
for (let y = 5; y <= 9; y++) {
    let row = "";
    for (let x = 5; x <= 9; x++) {
        row += game.getTile(x, y).toString().padStart(3, ' ') + " ";
    }
    console.log(row);
}
