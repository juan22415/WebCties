export const TILES = {
    EMPTY: 0, ROAD: 1, POWER_COAL: 2,
    ZONE_RES: 3, ZONE_COM: 4, ZONE_IND: 5,
    BLD_RES: 6, BLD_COM: 7, BLD_IND: 8,
    SLOT: 9,
    RES_2X2: 10, RES_3X3: 11,
    COM_2X2: 12, COM_3X3: 13,
    IND_2X2: 14, IND_3X3: 15,
    RES_1X2: 16, RES_2X1: 17, RES_1X3: 18, RES_3X1: 19,
    COM_1X2: 20, COM_2X1: 21, COM_1X3: 22, COM_3X1: 23,
    IND_1X2: 24, IND_2X1: 25, IND_1X3: 26, IND_3X1: 27,
    RES_LOW_2X2: 38, RES_LOW_3X3: 39,
    COM_LOW_2X2: 40, COM_LOW_3X3: 41,
    IND_LOW_2X2: 42, IND_LOW_3X3: 43,
    WATER: 28, ZONE_DENSE_RES: 29, ZONE_DENSE_COM: 30, ZONE_DENSE_IND: 31, WATER_PUMP: 32,
    POLICE: 33, PARK: 34, SCHOOL: 35, HOSPITAL: 36, BRIDGE: 37,
    HIGHWAY: 44, RAIL: 45, TRAIN_STATION: 46, RAIL_CROSSING: 47
};

export const BuildingRegistry = {
    // ---- [ TOOLS ] ---- //
    'road': {
        name: 'Road', isTool: true, tileId: TILES.ROAD,
        width: 1, height: 1, cost: 10, maintenance: 0.5,
        consumption: {}, output: {}
    },
    'highway': {
        name: 'Highway', isTool: true, tileId: TILES.HIGHWAY,
        width: 2, height: 2, cost: 200, maintenance: 8.0,
        consumption: {}, output: {}, fillAll: true
    },
    'rail': {
        name: 'Rail', isTool: true, tileId: TILES.RAIL,
        width: 1, height: 1, cost: 20, maintenance: 1.0,
        consumption: {}, output: {}
    },
    'train-station': {
        name: 'Train Station', isTool: true, tileId: TILES.TRAIN_STATION,
        width: 2, height: 2, cost: 250, maintenance: 25.0,
        consumption: { power: 1 }, output: {}, fillAll: true
    },
    'bridge': {
        name: 'Bridge', isTool: false, tileId: TILES.BRIDGE,
        width: 1, height: 1, cost: 50, maintenance: 2.0,
        consumption: {}, output: {}
    },
    'rail-crossing': {
        name: 'Rail Crossing', isTool: false, tileId: TILES.RAIL_CROSSING,
        width: 1, height: 1, cost: 0, maintenance: 1.0,
        consumption: {}, output: {}
    },
    'zone-res': {
        name: 'Residential Zone', isTool: true, tileId: TILES.ZONE_RES,
        width: 1, height: 1, cost: 5, maintenance: 0,
        consumption: {}, output: {}
    },
    'zone-com': {
        name: 'Commercial Zone', isTool: true, tileId: TILES.ZONE_COM,
        width: 1, height: 1, cost: 5, maintenance: 0,
        consumption: {}, output: {}
    },
    'zone-ind': {
        name: 'Industrial Zone', isTool: true, tileId: TILES.ZONE_IND,
        width: 1, height: 1, cost: 5, maintenance: 0,
        consumption: {}, output: {}
    },
    'power-coal': {
        name: 'Coal Power Plant', isTool: true, tileId: TILES.POWER_COAL,
        width: 2, height: 2, cost: 500, maintenance: 50,
        consumption: {}, output: { power: 500 }
    },
    'zone-dense-res': {
        name: 'Dense Res Zone', isTool: true, tileId: TILES.ZONE_DENSE_RES,
        width: 1, height: 1, cost: 10, maintenance: 0,
        consumption: {}, output: {}
    },
    'zone-dense-com': {
        name: 'Dense Com Zone', isTool: true, tileId: TILES.ZONE_DENSE_COM,
        width: 1, height: 1, cost: 10, maintenance: 0,
        consumption: {}, output: {}
    },
    'zone-dense-ind': {
        name: 'Dense Ind Zone', isTool: true, tileId: TILES.ZONE_DENSE_IND,
        width: 1, height: 1, cost: 10, maintenance: 0,
        consumption: {}, output: {}
    },
    'water-pump': {
        name: 'Water Pump', isTool: true, tileId: TILES.WATER_PUMP,
        width: 1, height: 1, cost: 100, maintenance: 10,
        consumption: { power: 2 }, output: { water: 250 }
    },
    'police': {
        name: 'Police Station', isTool: true, tileId: TILES.POLICE,
        width: 2, height: 2, cost: 500, maintenance: 50,
        consumption: { power: 2, water: 2 }, output: {}
    },
    'park': {
        name: 'Park', isTool: true, tileId: TILES.PARK,
        width: 1, height: 1, cost: 50, maintenance: 5,
        consumption: { water: 1 }, output: {}
    },
    'school': {
        name: 'School', isTool: true, tileId: TILES.SCHOOL,
        width: 2, height: 2, cost: 250, maintenance: 25,
        consumption: { power: 1, water: 1 }, output: {}
    },
    'hospital': {
        name: 'Hospital', isTool: true, tileId: TILES.HOSPITAL,
        width: 2, height: 2, cost: 500, maintenance: 50,
        consumption: { power: 3, water: 3 }, output: {}
    },

    // ---- [ PROCEDURAL BUILDINGS: RESIDENTIAL ] ---- //
    'bld-res-3x3': {
        name: 'Residential Skyscraper', isTool: false, tileId: TILES.RES_3X3, zoneType: TILES.ZONE_DENSE_RES,
        width: 3, height: 3, population: 150, minDesirability: 60, consumption: { power: 9, water: 9 }, output: {}
    },
    'bld-res-1x3': {
        name: 'Highrise Strip', isTool: false, tileId: TILES.RES_1X3, zoneType: TILES.ZONE_DENSE_RES,
        width: 1, height: 3, population: 45, minDesirability: 60, consumption: { power: 4, water: 3 }, output: {}
    },
    'bld-res-3x1': {
        name: 'Wide Apartment', isTool: false, tileId: TILES.RES_3X1, zoneType: TILES.ZONE_DENSE_RES,
        width: 3, height: 1, population: 45, minDesirability: 60, consumption: { power: 4, water: 3 }, output: {}
    },
    'bld-res-2x2': {
        name: 'Apartment Block', isTool: false, tileId: TILES.RES_2X2, zoneType: TILES.ZONE_DENSE_RES,
        width: 2, height: 2, population: 60, minDesirability: 60, consumption: { power: 4, water: 4 }, output: {}
    },
    'bld-res-1x2': {
        name: 'Townhouse', isTool: false, tileId: TILES.RES_1X2, zoneType: TILES.ZONE_RES,
        width: 1, height: 2, population: 25, consumption: { power: 2 }, output: {}
    },
    'bld-res-2x1': {
        name: 'Rowhomes', isTool: false, tileId: TILES.RES_2X1, zoneType: TILES.ZONE_RES,
        width: 2, height: 1, population: 25, consumption: { power: 2 }, output: {}
    },
    'bld-res-low-3x3': {
        name: 'Low Density Estate', isTool: false, tileId: TILES.RES_LOW_3X3, zoneType: TILES.ZONE_RES,
        width: 3, height: 3, population: 30, minDesirability: 50, consumption: { power: 3, water: 2 }, output: {}
    },
    'bld-res-low-2x2': {
        name: 'Suburban House', isTool: false, tileId: TILES.RES_LOW_2X2, zoneType: TILES.ZONE_RES,
        width: 2, height: 2, population: 15, minDesirability: 40, consumption: { power: 2, water: 1 }, output: {}
    },
    'bld-res-1x1': {
        name: 'House', isTool: false, tileId: TILES.BLD_RES, zoneType: TILES.ZONE_RES,
        width: 1, height: 1, population: 10, consumption: { power: 1 }, output: {}
    },

    // ---- [ PROCEDURAL BUILDINGS: COMMERCIAL ] ---- //
    'bld-com-3x3': {
        name: 'Commercial Corporate Hub', isTool: false, tileId: TILES.COM_3X3, zoneType: TILES.ZONE_DENSE_COM,
        width: 3, height: 3, jobs: 100, minDesirability: 60, taxMultiplier: 3.5, consumption: { power: 9, water: 9 }, output: {}
    },
    'bld-com-1x3': {
        name: 'Avenue Strip Mall', isTool: false, tileId: TILES.COM_1X3, zoneType: TILES.ZONE_DENSE_COM,
        width: 1, height: 3, jobs: 30, minDesirability: 60, taxMultiplier: 2.5, consumption: { power: 4, water: 3 }, output: {}
    },
    'bld-com-3x1': {
        name: 'Plaza Plaza', isTool: false, tileId: TILES.COM_3X1, zoneType: TILES.ZONE_DENSE_COM,
        width: 3, height: 1, jobs: 30, minDesirability: 60, taxMultiplier: 2.5, consumption: { power: 4, water: 3 }, output: {}
    },
    'bld-com-2x2': {
        name: 'Shopping Mall', isTool: false, tileId: TILES.COM_2X2, zoneType: TILES.ZONE_DENSE_COM,
        width: 2, height: 2, jobs: 40, minDesirability: 60, taxMultiplier: 2.5, consumption: { power: 4, water: 4 }, output: {}
    },
    'bld-com-1x2': {
        name: 'Convenience Block', isTool: false, tileId: TILES.COM_1X2, zoneType: TILES.ZONE_COM,
        width: 1, height: 2, jobs: 15, taxMultiplier: 2.2, consumption: { power: 2 }, output: {}
    },
    'bld-com-2x1': {
        name: 'Retail Outlet', isTool: false, tileId: TILES.COM_2X1, zoneType: TILES.ZONE_COM,
        width: 2, height: 1, jobs: 15, taxMultiplier: 2.2, consumption: { power: 2 }, output: {}
    },
    'bld-com-low-3x3': {
        name: 'Big Box Store', isTool: false, tileId: TILES.COM_LOW_3X3, zoneType: TILES.ZONE_COM,
        width: 3, height: 3, jobs: 40, taxMultiplier: 2.2, consumption: { power: 3, water: 2 }, output: {}
    },
    'bld-com-low-2x2': {
        name: 'Supermarket', isTool: false, tileId: TILES.COM_LOW_2X2, zoneType: TILES.ZONE_COM,
        width: 2, height: 2, jobs: 20, taxMultiplier: 2.1, consumption: { power: 2, water: 1 }, output: {}
    },
    'bld-com-1x1': {
        name: 'Small Shop', isTool: false, tileId: TILES.BLD_COM, zoneType: TILES.ZONE_COM,
        width: 1, height: 1, jobs: 5, taxMultiplier: 2, consumption: { power: 1 }, output: {}
    },

    // ---- [ PROCEDURAL BUILDINGS: INDUSTRIAL ] ---- //
    'bld-ind-3x3': {
        name: 'Massive Factory', isTool: false, tileId: TILES.IND_3X3, zoneType: TILES.ZONE_DENSE_IND,
        width: 3, height: 3, jobs: 120, taxMultiplier: 5, consumption: { power: 12, water: 9 }, output: {}
    },
    'bld-ind-1x3': {
        name: 'Assembly Line', isTool: false, tileId: TILES.IND_1X3, zoneType: TILES.ZONE_DENSE_IND,
        width: 1, height: 3, jobs: 40, taxMultiplier: 3.5, consumption: { power: 6, water: 3 }, output: {}
    },
    'bld-ind-3x1': {
        name: 'Shipping Center', isTool: false, tileId: TILES.IND_3X1, zoneType: TILES.ZONE_DENSE_IND,
        width: 3, height: 1, jobs: 40, taxMultiplier: 3.5, consumption: { power: 6, water: 3 }, output: {}
    },
    'bld-ind-2x2': {
        name: 'Warehouse', isTool: false, tileId: TILES.IND_2X2, zoneType: TILES.ZONE_DENSE_IND,
        width: 2, height: 2, jobs: 50, taxMultiplier: 3.5, consumption: { power: 6, water: 4 }, output: {}
    },
    'bld-ind-1x2': {
        name: 'Manufacturing Node', isTool: false, tileId: TILES.IND_1X2, zoneType: TILES.ZONE_IND,
        width: 1, height: 2, jobs: 20, taxMultiplier: 3.2, consumption: { power: 4 }, output: {}
    },
    'bld-ind-2x1': {
        name: 'Logistic Depot', isTool: false, tileId: TILES.IND_2X1, zoneType: TILES.ZONE_IND,
        width: 2, height: 1, jobs: 20, taxMultiplier: 3.2, consumption: { power: 4 }, output: {}
    },
    'bld-ind-low-3x3': {
        name: 'Large Warehouse', isTool: false, tileId: TILES.IND_LOW_3X3, zoneType: TILES.ZONE_IND,
        width: 3, height: 3, jobs: 50, taxMultiplier: 1.5, consumption: { power: 5, water: 2 }, output: {}
    },
    'bld-ind-low-2x2': {
        name: 'Medium Warehouse', isTool: false, tileId: TILES.IND_LOW_2X2, zoneType: TILES.ZONE_IND,
        width: 2, height: 2, jobs: 25, taxMultiplier: 1.5, consumption: { power: 3, water: 1 }, output: {}
    },
    'bld-ind-1x1': {
        name: 'Small Factory', isTool: false, tileId: TILES.BLD_IND, zoneType: TILES.ZONE_IND,
        width: 1, height: 1, jobs: 10, taxMultiplier: 1.5, consumption: { power: 2 }, output: {}
    }
};

export const GlobalConfig = {
    bulldozeCost: 2,
    defaultTaxRate: 7,
    startingMoney: 10000,
    startingDemand: { res: 10, com: 5, ind: 5 },

    // Simulation Logic
    taxPopMultiplier: 2,
    taxIncomeMultiplier: 10,
    daysPerTaxCycle: 360, // Changed from 30 to 360 (Yearly Budget)
    bondAmount: 10000,
    bondInterestRate: 0.05,
    roadCost: 1, // maintenance per road tile
    bridgeCost: 4, // maintenance per bridge tile

    // Traffic System
    roadCapacity: 100, // Traffic heat before congestion
    highwayCapacity: 300, // Traffic heat before congestion for highways
    trafficDesirabilityPenalty: 40, // Max penalty for heavy congestion
    trafficDesirabilityRadius: 4,

    // Demand Formula Tuning
    demandBaseR: 50,
    demandJobsMultR: 1.5,
    demandBaseC: 20,
    demandPopMultC: 0.4,
    demandBaseI: 20,
    demandPopMultI: 0.6,

    demandSmoothingMult: 0.5,
    taxPenaltyThreshold: 7,
    taxPenaltyMult: 4,
    spawnProbabilityDenom: 2000,
    demandReductionPerArea: 5,

    abandonmentDaysThreshold: 60, // days without power before a building reverts
    abandonmentWaterDaysThreshold: 30, // days without water

    // Desirability Tuning
    desirabilityBase: 50,
    desirabilityWaterBoost: 30,
    desirabilityWaterRadius: 8,
    desirabilityPollutionPenalty: -50, // Added to land value
    desirabilityPollutionRadius: 12,
    desirabilityDenseBoost: 10,
    desirabilityDenseRadius: 6,

    // Pollution
    pollutionBase: 0,
    pollutionDecay: 2, // How much pollution decays per tick
    pollutionSpread: 0.5, // Percentage of pollution that diffuses to adjacent tiles
    pollutionIndustryGen: 10, // Pollution generated per industry population/job per tick
    pollutionTrafficGen: 5, // Pollution generated per traffic unit per tick
    pollutionDesirabilityPenalty: 2, // 1 point of pollution = -2 desirability

    // Crime & Civics
    crimeBase: 0,
    crimeDensityMultiplier: 0.2, // Crime generated per unit of pop/jobs
    policeRadius: 30,
    policeCrimeReduction: 100,

    parkBoost: 20,
    parkRadius: 5,
    schoolBoost: 30,
    schoolRadius: 8,
    hospitalBoost: 40,
    hospitalRadius: 10,

    // Rendering & Engine
    tileSize: 40,
    baseTickMs: 300,
    zoomStepDown: 0.9,
    zoomStepUp: 1.1,
    minZoom: 0.1,
    maxZoom: 5.0,
    maxEntities: 100
};
