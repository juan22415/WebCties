import { TILES, BuildingRegistry, GlobalConfig } from './config.js';

export const GRID_SIZE = 128;
export { TILES };

export class GameState {
    constructor() {
        this.grid = new Array(GRID_SIZE * GRID_SIZE).fill(TILES.EMPTY);
        this.powerGrid = new Array(GRID_SIZE * GRID_SIZE).fill(false);
        this.unpoweredDays = new Array(GRID_SIZE * GRID_SIZE).fill(0);
        this.waterGrid = new Array(GRID_SIZE * GRID_SIZE).fill(false);
        this.unwateredDays = new Array(GRID_SIZE * GRID_SIZE).fill(0);
        this.desirabilityGrid = new Array(GRID_SIZE * GRID_SIZE).fill(GlobalConfig.desirabilityBase);
        this.crimeGrid = new Array(GRID_SIZE * GRID_SIZE).fill(GlobalConfig.crimeBase);
        this.trafficGrid = new Array(GRID_SIZE * GRID_SIZE).fill(0);
        
        this.money = GlobalConfig.startingMoney;
        this.population = 0;
        this.demand = { ...GlobalConfig.startingDemand };
        
        this.powerSupply = 0;
        this.powerDemand = 0;
        this.waterSupply = 0;
        this.waterDemand = 0;
        
        this.currentTool = 'select';
        this.taxRates = { res: GlobalConfig.defaultTaxRate, com: GlobalConfig.defaultTaxRate, ind: GlobalConfig.defaultTaxRate };
        this.funding = { police: 100, road: 100 };
        this.bonds = 0;
        this.daysPassed = 0;
        
        this.ledger = {
            income: { res: 0, com: 0, ind: 0, total: 0 },
            expenses: { maintenance: 0, police: 0, roads: 0, bonds: 0, total: 0 }
        };
        
        this.projectedRevenue = 0;
        this.projectedCost = 0;

        // O(1) attribute maps dynamically from Registry
        this.maintenanceMap = new Array(GlobalConfig.maxEntities).fill(0);
        this.powerConsumptionMap = new Array(GlobalConfig.maxEntities).fill(0);
        this.powerOutputMap = new Array(GlobalConfig.maxEntities).fill(0);
        this.waterConsumptionMap = new Array(GlobalConfig.maxEntities).fill(0);
        this.waterOutputMap = new Array(GlobalConfig.maxEntities).fill(0);
        this.populationMap = new Array(GlobalConfig.maxEntities).fill(0);
        this.jobsMap = new Array(GlobalConfig.maxEntities).fill(0);
        this.taxMultiplierMap = new Array(GlobalConfig.maxEntities).fill(0);
        this.reverseRegistryMap = {};

        // Sort procedural blueprints from biggest to smallest area for growth logic
        this.blueprints = Object.values(BuildingRegistry)
                            .filter(b => b.zoneType)
                            .sort((a,b) => (b.width * b.height) - (a.width * a.height));

        for (const key in BuildingRegistry) {
            const ent = BuildingRegistry[key];
            this.reverseRegistryMap[ent.tileId] = ent; // Map ID back to object for bulldoze anchor search
            
            this.maintenanceMap[ent.tileId] = ent.maintenance || 0;
            this.powerOutputMap[ent.tileId] = ent.output?.power || 0;
            this.powerConsumptionMap[ent.tileId] = ent.consumption?.power || 0;
            this.waterOutputMap[ent.tileId] = ent.output?.water || 0;
            this.waterConsumptionMap[ent.tileId] = ent.consumption?.water || 0;
            this.populationMap[ent.tileId] = ent.population || 0;
            this.jobsMap[ent.tileId] = ent.jobs || 0;
            this.taxMultiplierMap[ent.tileId] = ent.taxMultiplier || 0;
        }
    }

    setTile(x, y, tileType) {
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            this.grid[y * GRID_SIZE + x] = tileType;
            return true;
        }
        return false;
    }

    getTile(x, y) {
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            return this.grid[y * GRID_SIZE + x];
        }
        return null;
    }

    findAnchor(x, y) {
        // Look up to 3 tiles up and left to find a Top-Left anchor whose width/height overlaps x,y
        for (let dy = -3; dy <= 0; dy++) {
            for (let dx = -3; dx <= 0; dx++) {
                const tx = x + dx; const ty = y + dy;
                const tId = this.getTile(tx, ty);
                
                if (tId && this.reverseRegistryMap[tId]) {
                    const ent = this.reverseRegistryMap[tId];
                    if (x >= tx && x < tx + ent.width && y >= ty && y < ty + ent.height) {
                        return { x: tx, y: ty, ent: ent };
                    }
                }
            }
        }
        return null; // Not part of a registered entity block
    }

    applyTool(x, y) {
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
        if (this.currentTool === 'select') return;
        
        if (this.currentTool === 'bulldoze') {
            const cost = GlobalConfig.bulldozeCost;
            const currentData = this.getTile(x, y);
            if (currentData === TILES.EMPTY) return;

            if (this.money >= cost) {
                this.money -= cost;
                
                const structure = this.findAnchor(x, y);
                
                if (structure) {
                    const ent = structure.ent;
                    // Option B check: Does this entity have a zone footprint? Revert to it! 
                    // Otherwise revert to Grass (TILES.EMPTY)
                    const revertTile = ent.zoneType ? ent.zoneType : TILES.EMPTY;
                    
                    for (let dy = 0; dy < ent.height; dy++) {
                        for (let dx = 0; dx < ent.width; dx++) {
                            this.setTile(structure.x + dx, structure.y + dy, revertTile);
                        }
                    }
                } else {
                    this.setTile(x, y, TILES.EMPTY); // fallback
                }
                
                this.recalculatePower();
                this.recalculateWater();
                this.calculateEconomyProjections();
                this.updateUI();
            }
            return;
        }

        const tool = this.currentTool;
        const gridX = x; const gridY = y;
        
        switch(tool) {
            case 'road':
                if (this.grid[gridY * GRID_SIZE + gridX] === TILES.WATER) {
                    this.placeToolInternal('bridge', gridX, gridY);
                } else {
                    this.placeToolInternal(tool, gridX, gridY);
                }
                break;
            case 'power-coal':
                this.placeToolInternal(tool, gridX, gridY);
                break;
            case 'water-pump':
                let hasWater = false;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ny = gridY + dy;
                        const nx = gridX + dx;
                        if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) {
                            if (this.grid[ny * GRID_SIZE + nx] === TILES.WATER) hasWater = true;
                        }
                    }
                }
                if (hasWater) {
                    this.placeToolInternal(tool, gridX, gridY);
                }
                break;
            default:
                this.placeToolInternal(tool, gridX, gridY);
                break;
        }
    }

    placeToolInternal(tool, x, y) {
        if (!BuildingRegistry[tool]) return;
        
        const ent = BuildingRegistry[tool];
        const isZoneTool = tool.startsWith('zone-');
        
        // Bounds check
        if (x + ent.width > GRID_SIZE || y + ent.height > GRID_SIZE) return;

        // Collision check
        for (let dy = 0; dy < ent.height; dy++) {
            for (let dx = 0; dx < ent.width; dx++) {
                const targetTile = this.grid[(y + dy) * GRID_SIZE + (x + dx)];
                if (targetTile !== TILES.EMPTY) {
                    if (isZoneTool && [TILES.ZONE_RES, TILES.ZONE_COM, TILES.ZONE_IND].includes(targetTile)) {
                        // Allow rewriting a light zone with a dense zone
                    } else if (tool === 'bridge' && targetTile === TILES.WATER) {
                        // Allow placing a bridge over water
                    } else {
                        return; // abort
                    }
                }
            }
        }

        if (this.money >= ent.cost) {
            this.money -= ent.cost;
            for (let dy = 0; dy < ent.height; dy++) {
                for (let dx = 0; dx < ent.width; dx++) {
                    if (dx === 0 && dy === 0) {
                        this.setTile(x, y, ent.tileId);
                    } else {
                        this.setTile(x + dx, y + dy, TILES.SLOT);
                    }
                }
            }
            this.recalculatePower();
            this.recalculateWater();
            this.recalculateCrime();
            this.recalculateDesirability();
            this.calculateEconomyProjections();
            this.updateUI();
        }
    }



    updateUI() { window.dispatchEvent(new CustomEvent('update-ui', { detail: this })); }

    calculateEconomyProjections() {
        let taxIncomeR = 0; let taxIncomeC = 0; let taxIncomeI = 0;
        let popR = 0; let popC = 0; let popI = 0;
        let roadCount = 0;
        let policeCost = 0;
        let baseMaintenance = 0;
        
        for (let i = 0; i < this.grid.length; i++) {
            const tile = this.grid[i];
            
            if (tile === TILES.ROAD) { roadCount++; continue; }
            if (tile === TILES.EMPTY) continue;
            
            const ent = this.reverseRegistryMap[tile];
            if (!ent) continue;

            const isPowered = this.powerGrid[i];
            
            if (isPowered) {
                if (ent.zoneType) {
                    const pop = ent.population || 0;
                    const jobs = ent.jobs || 0;
                    
                    if (ent.zoneType === TILES.ZONE_RES || ent.zoneType === TILES.ZONE_DENSE_RES) {
                        taxIncomeR += this.taxMultiplierMap[tile] * GlobalConfig.taxIncomeMultiplier;
                        popR += pop;
                    } else if (ent.zoneType === TILES.ZONE_COM || ent.zoneType === TILES.ZONE_DENSE_COM) {
                        taxIncomeC += this.taxMultiplierMap[tile] * GlobalConfig.taxIncomeMultiplier;
                        popC += jobs;
                    } else if (ent.zoneType === TILES.ZONE_IND || ent.zoneType === TILES.ZONE_DENSE_IND) {
                        taxIncomeI += this.taxMultiplierMap[tile] * GlobalConfig.taxIncomeMultiplier;
                        popI += jobs;
                    }
                }
            }
            
            if (tile === TILES.POLICE) policeCost += this.maintenanceMap[tile];
            else baseMaintenance += this.maintenanceMap[tile];
        }
        
        const actualPoliceCost = Math.floor(policeCost * (this.funding.police / 100));
        let bridgeCount = 0;
        for (let i = 0; i < this.grid.length; i++) if (this.grid[i] === TILES.BRIDGE) bridgeCount++;
        const roadCost = Math.floor((roadCount * GlobalConfig.roadCost + bridgeCount * GlobalConfig.bridgeCost) * (this.funding.road / 100));
        const bondInterest = Math.floor(this.bonds * GlobalConfig.bondInterestRate);

        const totalMaintenance = baseMaintenance + actualPoliceCost + roadCost + bondInterest;
        
        const incomeR = Math.floor((popR * GlobalConfig.taxPopMultiplier + taxIncomeR) * (this.taxRates.res / 100));
        const incomeC = Math.floor((popC * GlobalConfig.taxPopMultiplier + taxIncomeC) * (this.taxRates.com / 100));
        const incomeI = Math.floor((popI * GlobalConfig.taxPopMultiplier + taxIncomeI) * (this.taxRates.ind / 100));

        this.projectedRevenue = incomeR + incomeC + incomeI;
        this.projectedCost = totalMaintenance;
        
        this.ledger = {
            income: { res: incomeR, com: incomeC, ind: incomeI, total: this.projectedRevenue },
            expenses: { maintenance: baseMaintenance, police: actualPoliceCost, roads: roadCost, bonds: bondInterest, total: totalMaintenance }
        };
    }

    collectTaxes() {
        this.calculateEconomyProjections();
        this.money += Math.floor(this.projectedRevenue - this.projectedCost);
        this.updateUI();
    }

    save() {
        localStorage.setItem('simplecity_save', JSON.stringify({
            grid: this.grid, money: this.money, population: this.population,
            demand: this.demand, taxRates: this.taxRates, funding: this.funding,
            bonds: this.bonds, daysPassed: this.daysPassed,
            trafficGrid: this.trafficGrid
        }));
    }

    load() {
        const data = localStorage.getItem('simplecity_save');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.grid = parsed.grid || this.grid;
                this.money = parsed.money ?? this.money;
                this.population = parsed.population || this.population;
                this.demand = parsed.demand || this.demand;
                this.taxRates = parsed.taxRates || this.taxRates;
                this.funding = parsed.funding || this.funding;
                this.bonds = parsed.bonds || this.bonds;
                this.daysPassed = parsed.daysPassed || 0;
                this.trafficGrid = parsed.trafficGrid || new Array(GRID_SIZE * GRID_SIZE).fill(0);
                this.recalculatePower();
                this.recalculateWater();
                this.recalculateCrime();
                this.recalculateDesirability();
                this.calculateEconomyProjections();
                this.updateUI();
                return true;
            } catch(e) {}
        }
        return false;
    }

    reset() {
        this.grid = new Array(GRID_SIZE * GRID_SIZE).fill(TILES.EMPTY);
        this.powerGrid = new Array(GRID_SIZE * GRID_SIZE).fill(false);
        this.unpoweredDays = new Array(GRID_SIZE * GRID_SIZE).fill(0);
        this.waterGrid = new Array(GRID_SIZE * GRID_SIZE).fill(false);
        this.unwateredDays = new Array(GRID_SIZE * GRID_SIZE).fill(0);
        this.money = GlobalConfig.startingMoney;
        this.population = 0;
        this.demand = { ...GlobalConfig.startingDemand };
        this.taxRates = { res: GlobalConfig.defaultTaxRate, com: GlobalConfig.defaultTaxRate, ind: GlobalConfig.defaultTaxRate };
        this.funding = { police: 100, road: 100 };
        this.bonds = 0;
        this.daysPassed = 0;
        this.trafficGrid.fill(0);
        this.generateTerrain();
        this.recalculatePower();
        this.recalculateWater();
        this.recalculateCrime();
        this.recalculateDesirability();
        this.calculateEconomyProjections();
        this.updateUI();
        this.save();
    }

    generateTerrain() {
        // Meandering river
        let rx = Math.floor(GRID_SIZE * 0.2);
        for (let y = 0; y < GRID_SIZE; y++) {
            rx += (Math.random() < 0.3) ? 1 : ((Math.random() > 0.7) ? -1 : 0);
            for (let w = 0; w < 4; w++) {
                if (rx + w >= 0 && rx + w < GRID_SIZE) {
                    this.grid[y * GRID_SIZE + rx + w] = TILES.WATER;
                }
            }
        }
    }


    recalculatePower() {
        this.powerGrid.fill(false);
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
        let visitedConductors = new Array(GRID_SIZE * GRID_SIZE).fill(false);
        
        let totalPowerProduction = 0;
        let totalPowerDemand = 0;

        for (let i = 0; i < this.grid.length; i++) {
            const tile = this.grid[i];
            const output = this.powerOutputMap[tile]; 
            const consumption = this.powerConsumptionMap[tile];
            
            if (output > 0) totalPowerProduction += output;
            if (consumption > 0) totalPowerDemand += consumption;
        }
        
        this.powerSupply = totalPowerProduction;
        this.powerDemand = totalPowerDemand;

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const idx = y * GRID_SIZE + x;
                const baseTile = this.grid[idx];
                
                if (this.powerOutputMap[baseTile] > 0 && !visitedConductors[idx]) {
                    let queue = [{x, y}];
                    visitedConductors[idx] = true;
                    
                    let clusterNodes = [];
                    let clusterDemandTiles = [];
                    let totalEnergy = 0;
                    
                    let head = 0;
                    while(head < queue.length) {
                        const curr = queue[head++];
                        const cIdx = curr.y * GRID_SIZE + curr.x;
                        const tile = this.grid[cIdx];
                        
                        clusterNodes.push(cIdx);
                        totalEnergy += this.powerOutputMap[tile]; 
                        
                        for (const [dx, dy] of dirs) {
                            const nx = curr.x + dx, ny = curr.y + dy;
                            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                                const nIdx = ny * GRID_SIZE + nx;
                                const nTile = this.grid[nIdx];
                                
                                const isConductor = (nTile === TILES.ROAD || this.powerOutputMap[nTile] > 0 || nTile === TILES.SLOT);
                                
                                if (isConductor) {
                                    if (!visitedConductors[nIdx]) {
                                        visitedConductors[nIdx] = true;
                                        queue.push({x: nx, y: ny});
                                    }
                                } else {
                                    if (this.powerConsumptionMap[nTile] > 0 || this.reverseRegistryMap[nTile]?.isTool) {
                                        if (!clusterDemandTiles.includes(nIdx)) {
                                            clusterDemandTiles.push(nIdx);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    for (const dIdx of clusterDemandTiles) {
                        const dTile = this.grid[dIdx];
                        const cost = this.powerConsumptionMap[dTile];
                        if (totalEnergy >= cost) {
                            totalEnergy -= cost;
                            this.powerGrid[dIdx] = true;
                        }
                    }
                    for (const cIdx of clusterNodes) { this.powerGrid[cIdx] = true; }
                }
            }
        }
        
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                 const idx = y * GRID_SIZE + x;
                 if (this.grid[idx] === TILES.SLOT) {
                      const structure = this.findAnchor(x, y);
                      if (structure && this.powerGrid[structure.y * GRID_SIZE + structure.x]) {
                          this.powerGrid[idx] = true;
                      }
                 }
            }
        }
    }

    recalculateWater() {
        this.waterGrid.fill(false);
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
        let visitedPipes = new Array(GRID_SIZE * GRID_SIZE).fill(false);
        
        let totalWaterProduction = 0;
        let totalWaterDemand = 0;

        for (let i = 0; i < this.grid.length; i++) {
            const tile = this.grid[i];
            const output = this.waterOutputMap[tile]; 
            const consumption = this.waterConsumptionMap[tile];
            
            if (output > 0 && this.powerGrid[i]) totalWaterProduction += output;
            if (consumption > 0) totalWaterDemand += consumption;
        }
        
        this.waterSupply = totalWaterProduction;
        this.waterDemand = totalWaterDemand;

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const idx = y * GRID_SIZE + x;
                const baseTile = this.grid[idx];
                
                if (this.waterOutputMap[baseTile] > 0 && !visitedPipes[idx] && this.powerGrid[idx]) {
                    let queue = [{x, y}];
                    visitedPipes[idx] = true;
                    
                    let clusterNodes = [];
                    let clusterDemandTiles = [];
                    let totalWater = 0;
                    
                    let head = 0;
                    while(head < queue.length) {
                        const curr = queue[head++];
                        const cIdx = curr.y * GRID_SIZE + curr.x;
                        const tile = this.grid[cIdx];
                        
                        clusterNodes.push(cIdx);
                        totalWater += this.waterOutputMap[tile]; 
                        
                        for (const [dx, dy] of dirs) {
                            const nx = curr.x + dx, ny = curr.y + dy;
                            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                                const nIdx = ny * GRID_SIZE + nx;
                                const nTile = this.grid[nIdx];
                                
                                const isPipe = (nTile === TILES.ROAD || this.waterOutputMap[nTile] > 0 || nTile === TILES.SLOT);
                                
                                if (isPipe) {
                                    if (!visitedPipes[nIdx]) {
                                        visitedPipes[nIdx] = true;
                                        queue.push({x: nx, y: ny});
                                    }
                                } else {
                                    if (this.waterConsumptionMap[nTile] > 0) {
                                        if (!clusterDemandTiles.includes(nIdx)) {
                                            clusterDemandTiles.push(nIdx);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    for (const dIdx of clusterDemandTiles) {
                        const dTile = this.grid[dIdx];
                        const cost = this.waterConsumptionMap[dTile];
                        if (totalWater >= cost) {
                            totalWater -= cost;
                            this.waterGrid[dIdx] = true;
                        }
                    }
                    for (const cIdx of clusterNodes) { this.waterGrid[cIdx] = true; }
                }
            }
        }
        
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                 const idx = y * GRID_SIZE + x;
                 if (this.grid[idx] === TILES.SLOT) {
                      const structure = this.findAnchor(x, y);
                      if (structure && this.waterGrid[structure.y * GRID_SIZE + structure.x]) {
                          this.waterGrid[idx] = true;
                      }
                 }
            }
        }
    }

    recalculateCrime() {
        this.crimeGrid.fill(GlobalConfig.crimeBase);
        
        // Pass 1: Generate Crime from density
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const idx = y * GRID_SIZE + x;
                const tile = this.grid[idx];
                const ent = this.reverseRegistryMap[tile];
                if (ent && !ent.isTool) {
                    const pop = ent.population || 0;
                    const jobs = ent.jobs || 0;
                    const totalDensity = pop + jobs;
                    if (totalDensity > 0) {
                        const crimeAmount = totalDensity * GlobalConfig.crimeDensityMultiplier;
                        const radius = 6; // Crime spillover radius
                        for (let dy = -radius; dy <= radius; dy++) {
                            for (let dx = -radius; dx <= radius; dx++) {
                                const ny = y + dy;
                                const nx = x + dx;
                                if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) {
                                    const dist = Math.sqrt(dx*dx + dy*dy);
                                    if (dist <= radius) {
                                        const falloff = 1 - (dist / radius);
                                        this.crimeGrid[ny * GRID_SIZE + nx] += crimeAmount * falloff;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Pass 2: Police Suppression
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (this.grid[y * GRID_SIZE + x] === TILES.POLICE) {
                    // Check if powered
                    if (!this.powerGrid[y * GRID_SIZE + x]) continue;
                    
                    const radius = Math.floor(GlobalConfig.policeRadius * (this.funding.police / 100));
                    if (radius <= 0) continue;
                    
                    for (let dy = -radius; dy <= radius; dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            const ny = y + dy;
                            const nx = x + dx;
                            if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) {
                                const dist = Math.sqrt(dx*dx + dy*dy);
                                if (dist <= radius) {
                                    const falloff = 1 - (dist / radius);
                                    this.crimeGrid[ny * GRID_SIZE + nx] -= GlobalConfig.policeCrimeReduction * falloff;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        for (let i = 0; i < this.crimeGrid.length; i++) {
            this.crimeGrid[i] = Math.max(0, Math.min(100, this.crimeGrid[i]));
        }
    }

    calculateTraffic() {
        this.trafficGrid.fill(0);
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        
        // Find all job tiles (Commercial/Industrial)
        const jobTiles = new Set();
        for (let i = 0; i < this.grid.length; i++) {
            if (this.jobsMap[this.grid[i]] > 0 && this.powerGrid[i]) {
                jobTiles.add(i);
            }
        }

        if (jobTiles.size === 0) return; // Nowhere to go

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const idx = y * GRID_SIZE + x;
                const tile = this.grid[idx];
                const pop = this.populationMap[tile];
                
                if (pop > 0 && this.powerGrid[idx]) {
                    // Try to find path to nearest job
                    let queue = [{x, y, path: []}];
                    let visited = new Set([idx]);
                    let found = false;

                    // BFS max depth to prevent lag
                    let iterations = 0;
                    while(queue.length > 0 && iterations < 500) {
                        iterations++;
                        const curr = queue.shift();
                        const cIdx = curr.y * GRID_SIZE + curr.x;
                        
                        if (jobTiles.has(cIdx)) {
                            // Apply traffic to path
                            for (const pIdx of curr.path) {
                                this.trafficGrid[pIdx] += pop;
                            }
                            found = true;
                            break;
                        }

                        for (const [dx, dy] of dirs) {
                            const nx = curr.x + dx, ny = curr.y + dy;
                            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                                const nIdx = ny * GRID_SIZE + nx;
                                if (!visited.has(nIdx)) {
                                    const nTile = this.grid[nIdx];
                                    if (nTile === TILES.ROAD || nTile === TILES.BRIDGE || jobTiles.has(nIdx) || nTile === TILES.SLOT) {
                                        visited.add(nIdx);
                                        const newPath = [...curr.path];
                                        if (nTile === TILES.ROAD || nTile === TILES.BRIDGE) {
                                            newPath.push(nIdx);
                                        }
                                        queue.push({x: nx, y: ny, path: newPath});
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    recalculateDesirability() {
        this.desirabilityGrid.fill(GlobalConfig.desirabilityBase);
        
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const tile = this.grid[y * GRID_SIZE + x];
                let val = 0;
                let radius = 0;
                
                if (tile === TILES.WATER) {
                    val = GlobalConfig.desirabilityWaterBoost;
                    radius = GlobalConfig.desirabilityWaterRadius;
                } else if (tile === TILES.POWER_COAL) {
                    val = GlobalConfig.desirabilityPollutionPenalty;
                    radius = GlobalConfig.desirabilityPollutionRadius;
                } else if ([TILES.RES_3X3, TILES.RES_2X2, TILES.COM_3X3, TILES.COM_2X2, TILES.IND_3X3, TILES.IND_2X2].includes(tile)) {
                    val = GlobalConfig.desirabilityDenseBoost;
                    radius = GlobalConfig.desirabilityDenseRadius;
                } else if (tile === TILES.PARK) {
                    val = GlobalConfig.desirabilityDenseBoost; // Re-using variables if needed, wait no:
                    val = GlobalConfig.parkBoost;
                    radius = GlobalConfig.parkRadius;
                } else if (tile === TILES.SCHOOL) {
                    val = GlobalConfig.schoolBoost;
                    radius = GlobalConfig.schoolRadius;
                } else if (tile === TILES.HOSPITAL) {
                    val = GlobalConfig.hospitalBoost;
                    radius = GlobalConfig.hospitalRadius;
                }
                
                if (val !== 0) {
                    for (let dy = -radius; dy <= radius; dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            const ny = y + dy;
                            const nx = x + dx;
                            if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) {
                                const dist = Math.sqrt(dx*dx + dy*dy);
                                if (dist <= radius) {
                                    const falloff = 1 - (dist / radius);
                                    this.desirabilityGrid[ny * GRID_SIZE + nx] += val * falloff;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Apply crime and traffic penalties, then clamp
        for (let i = 0; i < this.desirabilityGrid.length; i++) {
            this.desirabilityGrid[i] -= this.crimeGrid[i];
            
            // Apply traffic penalty
            let localTraffic = this.trafficGrid[i] || 0;
            if (localTraffic > GlobalConfig.roadCapacity) {
                const penaltyRatio = Math.min(1, (localTraffic - GlobalConfig.roadCapacity) / GlobalConfig.roadCapacity);
                this.desirabilityGrid[i] -= GlobalConfig.trafficDesirabilityPenalty * penaltyRatio;
            }

            this.desirabilityGrid[i] = Math.max(0, Math.min(100, this.desirabilityGrid[i]));
        }
    }

    hasRoadAccess(x, y, w = 1, h = 1) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                for (const [vx, vy] of dirs) {
                    const nx = x + dx + vx, ny = y + dy + vy;
                    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                        if (this.grid[ny * GRID_SIZE + nx] === TILES.ROAD) return true;
                    }
                }
            }
        }
        return false;
    }

    calculateDemand() {
       let currPop = 0;
       let currJobs = 0;

       for (let i = 0; i < this.grid.length; i++) {
           const tile = this.grid[i];
           if (this.powerGrid[i]) {
               currPop += this.populationMap[tile];
               currJobs += this.jobsMap[tile];
           }
       }
       this.population = currPop;
       
       const targetR = GlobalConfig.demandBaseR + currJobs * GlobalConfig.demandJobsMultR; 
       const targetC = GlobalConfig.demandBaseC + currPop * GlobalConfig.demandPopMultC;
       const targetI = GlobalConfig.demandBaseI + currPop * GlobalConfig.demandPopMultI;
       
       let dR = (targetR - currPop) * GlobalConfig.demandSmoothingMult;
       let dC = (targetC - currJobs*0.5) * GlobalConfig.demandSmoothingMult;
       let dI = (targetI - currJobs*0.5) * GlobalConfig.demandSmoothingMult;

       const taxPenaltyR = Math.max(0, this.taxRates.res - GlobalConfig.taxPenaltyThreshold) * GlobalConfig.taxPenaltyMult; 
       const taxPenaltyC = Math.max(0, this.taxRates.com - GlobalConfig.taxPenaltyThreshold) * GlobalConfig.taxPenaltyMult; 
       const taxPenaltyI = Math.max(0, this.taxRates.ind - GlobalConfig.taxPenaltyThreshold) * GlobalConfig.taxPenaltyMult; 

       dR -= taxPenaltyR; dC -= taxPenaltyC; dI -= taxPenaltyI;

       this.demand.res = Math.max(-100, Math.min(100, dR));
       this.demand.com = Math.max(-100, Math.min(100, dC));
       this.demand.ind = Math.max(-100, Math.min(100, dI));
    }

    simulateStep() {
        this.daysPassed++;
        
        if (this.daysPassed % GlobalConfig.daysPerTaxCycle === 0) {
            this.collectTaxes();
            this.save();
        }

        if (this.daysPassed % 10 === 0) {
            this.calculateTraffic();
        }

        this.calculateDemand();
        
        let changed = false;

        // Road Deterioration Logic
        if (this.funding.road < 100) {
            const deteriorationChance = (100 - this.funding.road) * 0.00005; 
            for (let i = 0; i < this.grid.length; i++) {
                if (this.grid[i] === TILES.ROAD && Math.random() < deteriorationChance) {
                    this.grid[i] = TILES.EMPTY; 
                    changed = true;
                }
            }
        }
        
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const idx = y * GRID_SIZE + x;
                const tile = this.grid[idx];
                
                if ([TILES.ZONE_RES, TILES.ZONE_COM, TILES.ZONE_IND, TILES.ZONE_DENSE_RES, TILES.ZONE_DENSE_COM, TILES.ZONE_DENSE_IND].includes(tile)) {
                    if (this.powerGrid[idx]) {
                        
                        let demandVal = 0;
                        if (tile === TILES.ZONE_RES || tile === TILES.ZONE_DENSE_RES) demandVal = this.demand.res;
                        if (tile === TILES.ZONE_COM || tile === TILES.ZONE_DENSE_COM) demandVal = this.demand.com;
                        if (tile === TILES.ZONE_IND || tile === TILES.ZONE_DENSE_IND) demandVal = this.demand.ind;

                        const r = Math.random() * GlobalConfig.spawnProbabilityDenom;

                        if (demandVal > r) {
                            const localDesirability = this.desirabilityGrid[idx];
                            const allowedBps = this.blueprints.filter(b => 
                                b.zoneType === tile && 
                                (!b.minDesirability || localDesirability >= b.minDesirability)
                            );
                            
                            for (const bp of allowedBps) {
                                if (x + bp.width > GRID_SIZE || y + bp.height > GRID_SIZE) continue;
                                
                                let fits = true;
                                for (let dy = 0; dy < bp.height; dy++) {
                                    for (let dx = 0; dx < bp.width; dx++) {
                                        if (this.grid[(y + dy) * GRID_SIZE + (x + dx)] !== tile) {
                                            fits = false; break;
                                        }
                                    }
                                    if (!fits) break;
                                }

                                if (fits && this.hasRoadAccess(x, y, bp.width, bp.height)) {
                                    // Found a place for High-Density Block! Consume the zones.
                                    for (let dy = 0; dy < bp.height; dy++) {
                                        for (let dx = 0; dx < bp.width; dx++) {
                                            if (dx === 0 && dy === 0) {
                                                this.grid[(y + dy) * GRID_SIZE + (x + dx)] = bp.tileId;
                                            } else {
                                                this.grid[(y + dy) * GRID_SIZE + (x + dx)] = TILES.SLOT;
                                            }
                                        }
                                    }
                                    changed = true;
                                    
                                    // Soft cap this tick directly so we don't spawn 10 skyscrapers simultaneously
                                    const area = bp.width * bp.height;
                                    if (tile === TILES.ZONE_RES) this.demand.res -= area * GlobalConfig.demandReductionPerArea;
                                    if (tile === TILES.ZONE_COM) this.demand.com -= area * GlobalConfig.demandReductionPerArea;
                                    if (tile === TILES.ZONE_IND) this.demand.ind -= area * GlobalConfig.demandReductionPerArea;

                                    break; 
                                }
                            }
                        }
                    }
                }
            }
        }
        
        
        // Abandonment Logic (SC2000 power shortage behavior)
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const idx = y * GRID_SIZE + x;
                const tile = this.grid[idx];
                const ent = this.reverseRegistryMap[tile];
                
                if (ent && !ent.isTool) { // Developed buildings only
                    let unpoweredResetDays = false;
                    let unwateredResetDays = false;

                    if (!this.powerGrid[idx] && ent.consumption && ent.consumption.power > 0) {
                        this.unpoweredDays[idx]++;
                    } else {
                        unpoweredResetDays = true;
                    }
                    
                    if (!this.waterGrid[idx] && ent.consumption && ent.consumption.water > 0) {
                        this.unwateredDays[idx]++;
                    } else {
                        unwateredResetDays = true;
                    }

                    if (this.unpoweredDays[idx] >= GlobalConfig.abandonmentDaysThreshold || 
                        this.unwateredDays[idx] >= GlobalConfig.abandonmentWaterDaysThreshold) {
                        
                        const zoneType = ent.zoneType || TILES.EMPTY;
                        for (let dy = 0; dy < ent.height; dy++) {
                            for (let dx = 0; dx < ent.width; dx++) {
                                this.grid[(y + dy) * GRID_SIZE + (x + dx)] = zoneType;
                                this.unpoweredDays[(y + dy) * GRID_SIZE + (x + dx)] = 0;
                                this.unwateredDays[(y + dy) * GRID_SIZE + (x + dx)] = 0;
                            }
                        }
                        changed = true;
                    } else {
                        if (unpoweredResetDays) this.unpoweredDays[idx] = 0;
                        if (unwateredResetDays) this.unwateredDays[idx] = 0;
                    }
                } else {
                    this.unpoweredDays[idx] = 0; // Reset for empty/road/tools
                    this.unwateredDays[idx] = 0;
                }
            }
        }

        if (changed) {
            this.recalculatePower();
            this.recalculateWater();
            this.recalculateCrime();
            this.recalculateDesirability();
            this.calculateEconomyProjections();
        }
        this.updateUI();
    }
}
