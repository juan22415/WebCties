import { GameState } from '../game.js';
import { TILES, BuildingRegistry } from '../config.js';

global.window = { dispatchEvent: () => {} };
global.localStorage = { setItem: () => {}, getItem: () => {} };

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

for (let i = 0; i < game.grid.length; i++) {
    game.powerGrid[i] = true;
}
game.recalculateDesirability();
// Desirability should be 50

// Force build a 1x2 building at 5,5
game.setTile(5, 5, BuildingRegistry['bld-res-1x2'].tileId);
game.setTile(5, 6, TILES.SLOT);

// Log state
console.log("Desirability at 5,5:", game.desirabilityGrid[5*100+5]);

// Now let's try to simulate one step manually for 3x3 blueprint at x=5, y=5
const bp = BuildingRegistry['bld-res-low-3x3'];
console.log("Evaluating bp", bp.name, "at 5,5");

let fits = true;
let anchorsInFootprint = new Set();
let x = 5, y = 5;
for (let dy = 0; dy < bp.height; dy++) {
    for (let dx = 0; dx < bp.width; dx++) {
        const nx = x + dx; const ny = y + dy;
        const targetTile = game.getTile(nx, ny);
        if (targetTile === TILES.ZONE_RES) continue;
        
        const anchorInfo = game.findAnchor(nx, ny);
        if (anchorInfo && anchorInfo.ent.zoneType === TILES.ZONE_RES) {
            console.log("Found anchor", anchorInfo.ent.name, "at", nx, ny);
            if (anchorInfo.ent.width * anchorInfo.ent.height < bp.width * bp.height) {
                anchorsInFootprint.add(`${anchorInfo.x},${anchorInfo.y}`);
                continue;
            } else {
                console.log("Anchor too big", anchorInfo.ent.width * anchorInfo.ent.height);
            }
        } else {
            console.log("No anchor found or wrong zone type at", nx, ny, "tile is", targetTile);
        }
        fits = false; break;
    }
    if (!fits) break;
}

if (fits) {
    if (anchorsInFootprint.size === 1) {
        const singleAnchor = Array.from(anchorsInFootprint)[0];
        const [ax, ay] = singleAnchor.split(',');
        const existingTile = game.getTile(parseInt(ax), parseInt(ay));
        if (existingTile === bp.tileId) {
             console.log("Already this building");
             fits = false;
        }
    }
}

if (fits && game.hasRoadAccess(x, y, bp.width, bp.height)) {
    console.log("IT FITS!");
} else {
    console.log("FAILED. fits:", fits, "roadAccess:", game.hasRoadAccess(x, y, bp.width, bp.height));
}
