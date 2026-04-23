import fs from 'fs';

// Mock Browser Environment
global.window = {
    dispatchEvent: () => {},
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    }
import { GameState } from '../game.js';
import { TILES } from '../config.js';

const game = new GameState();

// Build a Coal Power Plant
game.money = 100000;
game.currentTool = 'power-coal';
game.placeToolInternal('power-coal', 5, 5);

// Build some Industry
game.currentTool = 'zone-ind';
game.placeToolInternal('zone-ind', 10, 5);

// Simulate multiple steps
for (let i = 0; i < 30; i++) {
    game.simulateStep();
}

console.log("Pollution at power plant (5,5):", game.pollutionGrid[5 * 50 + 5]);
console.log("Pollution at (7,5):", game.pollutionGrid[5 * 50 + 7]);
console.log("Desirability near power plant (5,5):", game.desirabilityGrid[5 * 50 + 5]);
console.log("Desirability far away (40,40):", game.desirabilityGrid[40 * 50 + 40]);

// Build a police station far away
game.currentTool = 'police';
game.placeToolInternal('police', 30, 30);

// Set some population to generate crime
game.populationMap[TILES.ZONE_RES] = 100;
game.setTile(30, 32, TILES.ZONE_RES);
game.setTile(10, 32, TILES.ZONE_RES);

for (let i = 0; i < 10; i++) {
    game.simulateStep();
}

console.log("Crime near police (30,32):", game.crimeGrid[32 * 50 + 30]);
console.log("Crime far from police (10,32):", game.crimeGrid[32 * 50 + 10]);
