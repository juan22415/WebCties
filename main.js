import './style.css';
import { GameState } from './game.js';
import { Renderer } from './renderer.js';
import { BuildingRegistry, GlobalConfig } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // Dynamically inject costs based on data-tool maps
    const btnModeBrush = document.getElementById('mode-brush');
    const btnModeArea = document.getElementById('mode-area');

    btnModeBrush.addEventListener('click', () => {
         renderer.zoningMode = 'brush';
         btnModeBrush.classList.add('active');
         btnModeArea.classList.remove('active');
    });

    btnModeArea.addEventListener('click', () => {
         renderer.zoningMode = 'area';
         btnModeArea.classList.add('active');
         btnModeBrush.classList.remove('active');
    });

    const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
    toolButtons.forEach(btn => {
        const id = btn.dataset.tool;
        const costSpan = btn.querySelector('.cost');
        if (costSpan && BuildingRegistry[id]) {
            costSpan.innerText = BuildingRegistry[id].cost;
        }
    });

    const bulldozeCostSpan = document.querySelector('.cost-bulldoze');
    if (bulldozeCostSpan) bulldozeCostSpan.innerText = GlobalConfig.bulldozeCost;

    const canvas = document.getElementById('gameCanvas');
    const game = new GameState();
    const renderer = new Renderer(canvas, game);

    const moneyDisplay = document.getElementById('money-display');
    const popDisplay = document.getElementById('pop-display');
    const demandDisplay = document.getElementById('demand-display');
    const dateDisplay = document.getElementById('date-display');
    
    const timeButtons = document.querySelectorAll('.time-btn');
    const btnBudget = document.getElementById('btn-budget');
    const budgetModal = document.getElementById('budget-modal');
    const btnCloseBudget = document.getElementById('btn-close-budget');

    // UI elements for Budget
    const taxRSlider = document.getElementById('tax-r-slider');
    const taxCSlider = document.getElementById('tax-c-slider');
    const taxISlider = document.getElementById('tax-i-slider');
    const taxRDisplay = document.getElementById('tax-r-display');
    const taxCDisplay = document.getElementById('tax-c-display');
    const taxIDisplay = document.getElementById('tax-i-display');
    const fundPSlider = document.getElementById('fund-p-slider');
    const fundRSlider = document.getElementById('fund-r-slider');
    const fundPDisplay = document.getElementById('fund-p-display');
    const fundRDisplay = document.getElementById('fund-r-display');
    const btnSave = document.getElementById('btn-save');
    const btnReset = document.getElementById('btn-reset');

    let gameSpeed = 1;

    window.addEventListener('update-ui', (e) => {
        const state = e.detail;
        moneyDisplay.textContent = `₡ ${state.money.toLocaleString()}`;
        
        const revSpan = document.getElementById('revenue-display');
        const costSpan = document.getElementById('cost-display');
        if (revSpan && costSpan) {
            revSpan.textContent = `+₡${state.projectedRevenue.toLocaleString()}`;
            costSpan.textContent = `-₡${state.projectedCost.toLocaleString()}`;
        }
        
        popDisplay.textContent = state.population.toLocaleString();
        
        const r = Math.floor(Math.max(0, state.demand.res));
        const c = Math.floor(Math.max(0, state.demand.com));
        const i = Math.floor(Math.max(0, state.demand.ind));
        demandDisplay.textContent = `R:${r} C:${c} I:${i}`;
        
        const powerDisplay = document.getElementById('power-stats-display');
        const waterDisplay = document.getElementById('water-stats-display');
        
        if (powerDisplay) {
            powerDisplay.textContent = `${state.powerDemand}/${state.powerSupply}`;
            if (state.powerDemand > state.powerSupply) powerDisplay.style.color = '#ef4444'; // Red if deficit
            else powerDisplay.style.color = '#facc15';
        }
        
        if (waterDisplay) {
            waterDisplay.textContent = `${state.waterDemand}/${state.waterSupply}`;
            if (state.waterDemand > state.waterSupply) waterDisplay.style.color = '#ef4444'; // Red if deficit
            else waterDisplay.style.color = '#06b6d4';
        }

        const startDate = new Date(2024, 0, 1);
        startDate.setDate(startDate.getDate() + state.daysPassed);
        const month = startDate.toLocaleString('default', { month: 'short' });
        dateDisplay.textContent = `${month} ${startDate.getFullYear()}`;
    });

    toolButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toolButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            game.currentTool = e.currentTarget.dataset.tool;
        });
    });

    timeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            timeButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            gameSpeed = parseInt(e.currentTarget.dataset.speed);
        });
    });

    const viewButtons = document.querySelectorAll('.tool-btn[data-view]');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            viewButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            renderer.viewMode = e.currentTarget.dataset.view;
        });
    });

    function updateBudgetUI() {
        taxRSlider.value = game.taxRates.res;
        taxCSlider.value = game.taxRates.com;
        taxISlider.value = game.taxRates.ind;
        taxRDisplay.textContent = `${game.taxRates.res}%`;
        taxCDisplay.textContent = `${game.taxRates.com}%`;
        taxIDisplay.textContent = `${game.taxRates.ind}%`;

        fundPSlider.value = game.funding.police;
        fundRSlider.value = game.funding.road;
        fundPDisplay.textContent = `${game.funding.police}%`;
        fundRDisplay.textContent = `${game.funding.road}%`;

        document.getElementById('ledg-inc-r').textContent = `₡${game.ledger.income.res.toLocaleString()}`;
        document.getElementById('ledg-inc-c').textContent = `₡${game.ledger.income.com.toLocaleString()}`;
        document.getElementById('ledg-inc-i').textContent = `₡${game.ledger.income.ind.toLocaleString()}`;
        document.getElementById('ledg-inc-tot').textContent = `₡${game.ledger.income.total.toLocaleString()}`;

        document.getElementById('ledg-exp-m').textContent = `-₡${game.ledger.expenses.maintenance.toLocaleString()}`;
        document.getElementById('ledg-exp-p').textContent = `-₡${game.ledger.expenses.police.toLocaleString()}`;
        document.getElementById('ledg-exp-r').textContent = `-₡${game.ledger.expenses.roads.toLocaleString()}`;
        document.getElementById('ledg-exp-b').textContent = `-₡${game.ledger.expenses.bonds.toLocaleString()}`;
        document.getElementById('ledg-exp-tot').textContent = `-₡${game.ledger.expenses.total.toLocaleString()}`;

        const net = game.ledger.income.total - game.ledger.expenses.total;
        const netEl = document.getElementById('ledg-net');
        netEl.textContent = `${net >= 0 ? '+' : ''}₡${net.toLocaleString()}`;
        netEl.className = net >= 0 ? 'pos' : 'neg';

        document.getElementById('bonds-display').textContent = game.bonds;
    }

    btnBudget.addEventListener('click', () => {
        game.calculateEconomyProjections();
        updateBudgetUI();
        budgetModal.classList.remove('hidden');
    });

    btnCloseBudget.addEventListener('click', () => {
        budgetModal.classList.add('hidden');
    });

    window.addEventListener('yearly-budget-review', () => {
        game.calculateEconomyProjections();
        updateBudgetUI();
        budgetModal.classList.remove('hidden');
        // Pause game so user can review budget
        gameSpeed = 0;
        timeButtons.forEach(b => b.classList.remove('active'));
        document.querySelector('.time-btn[data-speed="0"]').classList.add('active');
    });

    taxRSlider.addEventListener('input', (e) => { game.taxRates.res = parseInt(e.target.value); taxRDisplay.textContent = `${e.target.value}%`; game.calculateEconomyProjections(); updateBudgetUI(); game.updateUI(); });
    taxCSlider.addEventListener('input', (e) => { game.taxRates.com = parseInt(e.target.value); taxCDisplay.textContent = `${e.target.value}%`; game.calculateEconomyProjections(); updateBudgetUI(); game.updateUI(); });
    taxISlider.addEventListener('input', (e) => { game.taxRates.ind = parseInt(e.target.value); taxIDisplay.textContent = `${e.target.value}%`; game.calculateEconomyProjections(); updateBudgetUI(); game.updateUI(); });
    fundPSlider.addEventListener('input', (e) => { game.funding.police = parseInt(e.target.value); fundPDisplay.textContent = `${e.target.value}%`; game.calculateEconomyProjections(); game.recalculateCrime(); updateBudgetUI(); game.updateUI(); });
    fundRSlider.addEventListener('input', (e) => { game.funding.road = parseInt(e.target.value); fundRDisplay.textContent = `${e.target.value}%`; game.calculateEconomyProjections(); updateBudgetUI(); game.updateUI(); });

    document.getElementById('btn-issue-bond').addEventListener('click', () => {
        game.bonds++;
        game.money += GlobalConfig.bondAmount;
        game.calculateEconomyProjections();
        updateBudgetUI();
        game.updateUI();
    });

    btnSave.addEventListener('click', () => { 
        game.save(); 
        const oldText = btnSave.textContent;
        btnSave.textContent = "Saved ✓";
        setTimeout(() => btnSave.textContent = oldText, 2000);
    });

    btnReset.addEventListener('click', () => { 
        game.reset();
    });

    if (!game.load()) {
        // initial run setup
    }
    
    // Cheat Codes (SC2000 classics)
    let cheatBuffer = "";
    window.addEventListener('keydown', (e) => {
        cheatBuffer += e.key.toLowerCase();
        if (cheatBuffer.length > 25) cheatBuffer = cheatBuffer.slice(-25);
        
        if (cheatBuffer.endsWith('fund') || cheatBuffer.endsWith('porntipsguzzardo')) {
            game.money += 10000;
            game.updateUI();
            cheatBuffer = "";
            console.log("Cheat activated: +₡10,000 funds!");
        }
    });

    // Ticker logic
    const ticker = document.getElementById('news-ticker');
    setInterval(() => {
        let msgs = [];
        if (game.powerDemand > game.powerSupply) msgs.push("Rolling brownouts plague downtown!");
        if (game.waterDemand > game.waterSupply) msgs.push("Water shortage! Citizens thirsty.");
        if (game.taxRates.res > 10 || game.taxRates.com > 10 || game.taxRates.ind > 10) msgs.push("Sims outraged by high property taxes!");
        if (game.funding.road < 50) msgs.push("Potholes everywhere! Mayor ignores infrastructure.");
        if (game.funding.police < 50) msgs.push("Police Chief warns of rising crime due to budget cuts!");
        if (game.bonds > 5) msgs.push("City debt skyrocketing! Financial crisis looming?");
        
        let hasCrime = false;
        for (let i = 0; i < game.crimeGrid.length; i++) if (game.crimeGrid[i] > 50) { hasCrime = true; break; }
        if (hasCrime) msgs.push("Crime wave sweeps city! Citizens demand Police.");

        if (msgs.length === 0) msgs = [
            "City enjoys period of peace and prosperity.", 
            "Mayor praised as local property values remain stable.", 
            "Weather: Sunny with a chance of pixels.",
            "Local Llama spotted near City Hall.",
            "Scientists report new 'Reticulating Splines' breakthrough."
        ];

        ticker.textContent = msgs[Math.floor(Math.random() * msgs.length)];
    }, 25000); 

    let lastTime = 0;
    let tickTimer = 0;
    const BASE_TICK = GlobalConfig.baseTickMs; 

    function loop(time) {
        requestAnimationFrame(loop);
        let dt = time - lastTime;
        lastTime = time;

        if (gameSpeed > 0) {
            const currentInterval = BASE_TICK / gameSpeed;
            tickTimer += dt;
            if (tickTimer > currentInterval) {
                tickTimer -= currentInterval;
                if (tickTimer > currentInterval) tickTimer = 0; 
                game.simulateStep();
            }
        }
        renderer.draw();
    }
    
    game.updateUI();
    requestAnimationFrame(loop);
});
