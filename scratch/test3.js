import { GameState } from '../game.js';
import { TILES, BuildingRegistry } from '../config.js';

global.window = { dispatchEvent: () => {} };
global.localStorage = { setItem: () => {}, getItem: () => {} };

const game = new GameState();

for (let y = 4; y <= 10; y++) {
    for (let x = 4; x <= 10; x++) {
        if (x === 4 || x === 10 || y === 4 || y === 10) {
            game.setTile(x, y, TILES.ROAD);
        } else {
            game.setTile(x, y, TILES.ZONE_RES);
        }
    }
}
for (let i = 0; i < game.grid.length; i++) game.powerGrid[i] = true;
game.recalculateDesirability();

game.setTile(5, 5, BuildingRegistry['bld-res-1x2'].tileId);
game.setTile(5, 6, TILES.SLOT);

const originalSim = game.simulateStep.bind(game);
game.simulateStep = function() {
    this.calculateDemand = function() {
        this.demand.res = 2000;
    };
    const oldFilter = this.blueprints.filter.bind(this.blueprints);
    this.blueprints.filter = function(fn) {
        const bps = oldFilter(fn);
        if (bps.find(b => b.name === 'Low Density Estate')) {
            console.log("3x3 blueprint allowed!");
        }
        return bps;
    };
    originalSim();
}
console.log("Running simulateStep");
game.simulateStep();

for (let y = 5; y <= 9; y++) {
    let row = "";
    for (let x = 5; x <= 9; x++) {
        row += game.getTile(x, y).toString().padStart(3, ' ') + " ";
    }
    console.log(row);
}


