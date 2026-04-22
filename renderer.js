import { GRID_SIZE, TILES } from './game.js';
import { BuildingRegistry, GlobalConfig } from './config.js';

export class Renderer {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = game;
        this.tileSize = GlobalConfig.tileSize; 
        
        const centerX = (GRID_SIZE * this.tileSize) / 2;
        const centerY = (GRID_SIZE * this.tileSize) / 2;

        this.camera = { x: window.innerWidth / 2 - centerX, y: window.innerHeight / 2 - centerY, zoom: 1 };
        window.addEventListener('resize', () => this.resize());
        this.resize();

        this.isDragging = false;
        this.isPainting = false;
        this.isAreaSelecting = false;
        this.zoningMode = 'brush'; 
        this.viewMode = 'normal';
        this.areaStart = { x: -1, y: -1 };
        
        this.lastMouse = { x: 0, y: 0 };
        this.hoverTile = { x: -1, y: -1 };
        this.setupInput();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupInput() {
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || e.button === 2 || this.game.currentTool === 'select') { 
                this.isDragging = true; 
            } else if (e.button === 0) { 
                if (this.zoningMode === 'brush') {
                    this.isPainting = true; 
                    this.applyToolAtMouse(e.clientX, e.clientY); 
                } else if (this.zoningMode === 'area') {
                    this.isAreaSelecting = true;
                    const worldCoords = this.screenToWorld(e.clientX, e.clientY);
                    this.areaStart = { 
                        x: Math.floor(worldCoords.x / this.tileSize), 
                        y: Math.floor(worldCoords.y / this.tileSize) 
                    };
                }
            }
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });
        this.canvas.addEventListener('mousemove', (e) => {
            const worldCoords = this.screenToWorld(e.clientX, e.clientY);
            this.hoverTile = { x: Math.floor(worldCoords.x / this.tileSize), y: Math.floor(worldCoords.y / this.tileSize) };

            if (this.isDragging) {
                this.camera.x += e.clientX - this.lastMouse.x;
                this.camera.y += e.clientY - this.lastMouse.y;
            } else if (this.isPainting && this.zoningMode === 'brush') {
                this.applyToolAtMouse(e.clientX, e.clientY);
            }
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });
        this.canvas.addEventListener('mouseup', (e) => { 
            this.isDragging = false; 
            this.isPainting = false; 
            
            if (this.isAreaSelecting) {
                this.isAreaSelecting = false;
                // Execute Area Bounds
                const minX = Math.max(0, Math.min(this.areaStart.x, this.hoverTile.x));
                const maxX = Math.min(GRID_SIZE - 1, Math.max(this.areaStart.x, this.hoverTile.x));
                const minY = Math.max(0, Math.min(this.areaStart.y, this.hoverTile.y));
                const maxY = Math.min(GRID_SIZE - 1, Math.max(this.areaStart.y, this.hoverTile.y));
                
                for (let y = minY; y <= maxY; y++) {
                     for (let x = minX; x <= maxX; x++) {
                          this.game.applyTool(x, y); 
                     }
                }
            }
        });
        this.canvas.addEventListener('mouseleave', () => { 
            this.isDragging = false; 
            this.isPainting = false; 
            this.isAreaSelecting = false;
            this.hoverTile = { x: -1, y: -1 }; 
        });
        this.canvas.addEventListener('wheel', (e) => {
            const worldBefore = this.screenToWorld(e.clientX, e.clientY);
            const zoomAmount = e.deltaY > 0 ? GlobalConfig.zoomStepDown : GlobalConfig.zoomStepUp;
            this.camera.zoom *= zoomAmount;
            this.camera.zoom = Math.max(GlobalConfig.minZoom, Math.min(this.camera.zoom, GlobalConfig.maxZoom));
            const worldAfter = this.screenToWorld(e.clientX, e.clientY);
            this.camera.x += (worldAfter.x - worldBefore.x) * this.camera.zoom;
            this.camera.y += (worldAfter.y - worldBefore.y) * this.camera.zoom;
        });
    }

    screenToWorld(sx, sy) {
        return { x: (sx - this.camera.x) / this.camera.zoom, y: (sy - this.camera.y) / this.camera.zoom };
    }

    applyToolAtMouse(sx, sy) {
        const worldCoords = this.screenToWorld(sx, sy);
        this.game.applyTool(Math.floor(worldCoords.x / this.tileSize), Math.floor(worldCoords.y / this.tileSize));
    }

    draw() {
        this.ctx.fillStyle = '#0f0f13';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);

        const startX = Math.max(0, Math.floor(-this.camera.x / (this.tileSize * this.camera.zoom)));
        const endX = Math.min(GRID_SIZE, Math.ceil((this.canvas.width - this.camera.x) / (this.tileSize * this.camera.zoom)));
        const startY = Math.max(0, Math.floor(-this.camera.y / (this.tileSize * this.camera.zoom)));
        const endY = Math.min(GRID_SIZE, Math.ceil((this.canvas.height - this.camera.y) / (this.tileSize * this.camera.zoom)));

        // Pass 1: Backgrounds, Roads, Zones
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const i = y * GRID_SIZE + x;
                const tile = this.game.getTile(x, y);
                const sz = this.tileSize;
                const vx = x * sz, vy = y * sz;

                // Checkerboard
                this.ctx.fillStyle = (x + y) % 2 === 0 ? '#1a1d24' : '#1e2128';
                this.ctx.fillRect(vx, vy, sz, sz);
                
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                this.ctx.lineWidth = 1 / this.camera.zoom;
                this.ctx.strokeRect(vx, vy, sz, sz);

                if (tile === TILES.ROAD) {
                    this.ctx.fillStyle = '#4b5563'; 
                    this.ctx.fillRect(vx, vy, sz, sz);
                } else if (tile === TILES.BRIDGE) {
                    this.ctx.fillStyle = '#38bdf8'; // water under
                    this.ctx.fillRect(vx, vy, sz, sz);
                    this.ctx.fillStyle = '#4b5563'; // road surface
                    this.ctx.fillRect(vx, vy + sz*0.2, sz, sz*0.6);
                    this.ctx.fillStyle = '#9ca3af'; // rails
                    this.ctx.fillRect(vx, vy + sz*0.1, sz, sz*0.1);
                    this.ctx.fillRect(vx, vy + sz*0.8, sz, sz*0.1);
                } else if (tile === TILES.POWER_COAL) {
                    this.ctx.fillStyle = '#1e293b'; 
                    this.ctx.fillRect(vx, vy, sz, sz);
                    this.ctx.fillStyle = '#64748b'; 
                    this.ctx.fillRect(vx + sz*0.2, vy + sz*0.2, sz*0.6, sz*0.6);
                    this.ctx.fillStyle = '#facc15';
                    this.ctx.font = `${sz*0.5}px monospace`;
                    this.ctx.fillText('⚡', vx + sz*0.25, vy + sz*0.65);
                } else if (tile === TILES.WATER_PUMP) {
                    this.ctx.fillStyle = '#0f172a'; 
                    this.ctx.fillRect(vx, vy, sz, sz);
                    this.ctx.fillStyle = '#06b6d4'; 
                    this.ctx.fillRect(vx + sz*0.2, vy + sz*0.2, sz*0.6, sz*0.6);
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = `${sz*0.5}px monospace`;
                    this.ctx.fillText('💧', vx + sz*0.3, vy + sz*0.65);
                } else if (tile === TILES.WATER) {
                    this.ctx.fillStyle = '#38bdf8';
                    this.ctx.fillRect(vx, vy, sz, sz);
                } else if (tile >= TILES.ZONE_RES && tile <= TILES.ZONE_IND || (tile >= TILES.ZONE_DENSE_RES && tile <= TILES.ZONE_DENSE_IND)) {
                    if (tile === TILES.ZONE_RES) this.ctx.fillStyle = '#4ade80';
                    else if (tile === TILES.ZONE_COM) this.ctx.fillStyle = '#3b82f6';
                    else if (tile === TILES.ZONE_IND) this.ctx.fillStyle = '#eab308';
                    else if (tile === TILES.ZONE_DENSE_RES) this.ctx.fillStyle = '#22c55e';
                    else if (tile === TILES.ZONE_DENSE_COM) this.ctx.fillStyle = '#2563eb';
                    else if (tile === TILES.ZONE_DENSE_IND) this.ctx.fillStyle = '#ca8a04';
                    
                    this.ctx.globalAlpha = 0.4;
                    this.ctx.fillRect(vx, vy, sz, sz);
                    
                    // Dense zones get an inner thick border
                    if (tile >= TILES.ZONE_DENSE_RES) {
                         this.ctx.globalAlpha = 1.0;
                         this.ctx.strokeStyle = this.ctx.fillStyle;
                         this.ctx.lineWidth = 4;
                         this.ctx.strokeRect(vx + 2, vy + 2, sz - 4, sz - 4);
                    }
                    
                    this.ctx.globalAlpha = 1.0;
                }

                if (this.game.unpoweredDays[i] > 0) {
                    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; 
                    this.ctx.fillRect(vx, vy, sz, sz);
                }
                
                if (this.game.unwateredDays[i] > 0) {
                    this.ctx.fillStyle = 'rgba(6, 182, 212, 0.4)'; 
                    this.ctx.fillRect(vx + sz * 0.25, vy + sz * 0.25, sz * 0.5, sz * 0.5);
                }

                // Debug: show power dots
                if (this.game.powerGrid[i]) {
                    this.ctx.fillStyle = 'rgba(250, 204, 21, 0.5)';
                    this.ctx.fillRect(vx + sz*0.4, vy + sz*0.4, sz*0.2, sz*0.2);
                }
                // Debug: show water dots slightly offset
                if (this.game.waterGrid[i] && this.viewMode !== 'desirability') {
                    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
                    this.ctx.fillRect(vx + sz*0.6, vy + sz*0.6, sz*0.2, sz*0.2);
                }
                
                // Desirability / Crime Heatmap Overlay
                if (this.viewMode === 'desirability') {
                    const des = this.game.desirabilityGrid[i];
                    if (des < GlobalConfig.desirabilityBase) {
                        const alpha = Math.min(0.8, (GlobalConfig.desirabilityBase - des) / GlobalConfig.desirabilityBase);
                        this.ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`; // Red
                    } else if (des > GlobalConfig.desirabilityBase) {
                        const alpha = Math.min(0.8, (des - GlobalConfig.desirabilityBase) / (100 - GlobalConfig.desirabilityBase));
                        this.ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`; // Green
                    } else {
                        this.ctx.fillStyle = `rgba(255, 255, 255, 0)`; // Transparent
                    }
                    this.ctx.fillRect(vx, vy, sz, sz);
                } else if (this.viewMode === 'crime') {
                    const crime = this.game.crimeGrid[i];
                    if (crime > 0) {
                        const alpha = Math.min(0.8, crime / 50);
                        this.ctx.fillStyle = `rgba(220, 38, 38, ${alpha})`;
                        this.ctx.fillRect(vx, vy, sz, sz);
                    } else {
                        // Show blue for safe areas under police protection
                        this.ctx.fillStyle = `rgba(59, 130, 246, 0.1)`; 
                        this.ctx.fillRect(vx, vy, sz, sz);
                    }
                } else if (this.viewMode === 'traffic' && (tile === TILES.ROAD || tile === TILES.BRIDGE)) {
                    const traffic = this.game.trafficGrid[i] || 0;
                    if (traffic > 0) {
                        // Max congestion color at 150 trips
                        const ratio = Math.min(1, traffic / 150);
                        // Green to Yellow to Red
                        const r = ratio < 0.5 ? Math.floor(ratio * 2 * 255) : 255;
                        const g = ratio > 0.5 ? Math.floor((1 - ratio) * 2 * 255) : 255;
                        this.ctx.fillStyle = `rgba(${r}, ${g}, 0, 0.7)`;
                        this.ctx.fillRect(vx, vy, sz, sz);
                    } else {
                        // Unused roads are light green/transparent
                        this.ctx.fillStyle = `rgba(34, 197, 94, 0.2)`;
                        this.ctx.fillRect(vx, vy, sz, sz);
                    }
                }
            }
        }

        // Pass 2: Vertical Structures (Procedural Buildings)
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.game.getTile(x, y);
                if (tile === TILES.EMPTY || tile === TILES.ROAD || tile === TILES.SLOT) continue;

                const ent = this.game.reverseRegistryMap[tile];
                if (ent && (!ent.isTool || [TILES.POWER_COAL, TILES.POLICE, TILES.PARK, TILES.SCHOOL, TILES.HOSPITAL].includes(tile))) {
                     const isPowered = this.game.powerGrid[y * GRID_SIZE + x];
                     const s = this.tileSize;
                     const renderX = x * s, renderY = y * s;
                     const w = ent.width * s;
                     const h = ent.height * s;

                     let color = '#4b5563'; // Unpowered gray
                     if (isPowered) {
                         if (ent.zoneType === TILES.ZONE_RES) color = '#22c55e';
                         else if (ent.zoneType === TILES.ZONE_COM) color = '#3b82f6';
                         else if (ent.zoneType === TILES.ZONE_IND) color = '#eab308';
                         else if (ent.zoneType === TILES.ZONE_DENSE_RES) color = '#166534'; // Dark Green
                         else if (ent.zoneType === TILES.ZONE_DENSE_COM) color = '#1e40af'; // Dark Blue
                         else if (ent.zoneType === TILES.ZONE_DENSE_IND) color = '#854d0e'; // Dark Yellow
                         else if (tile === TILES.POWER_COAL) color = '#111827';
                         else if (tile === TILES.POLICE) color = '#1e3a8a';
                         else if (tile === TILES.PARK) color = '#166534';
                         else if (tile === TILES.SCHOOL) color = '#ea580c';
                         else if (tile === TILES.HOSPITAL) color = '#f3f4f6';
                     }

                     this.ctx.fillStyle = color;
                     this.ctx.fillRect(renderX, renderY, w, h);
                     
                     // Adding details proportional to size!
                     if (ent.zoneType) {
                         this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                         this.ctx.fillRect(renderX + w*0.1, renderY + h*0.8, w*0.8, h*0.1); 
                         
                         // Density window detailing
                         this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
                         if (ent.width === 3) {
                             this.ctx.fillRect(renderX + w*0.1, renderY + h*0.2, w*0.3, h*0.5); 
                             this.ctx.fillRect(renderX + w*0.6, renderY + h*0.2, w*0.3, h*0.5); 
                         } else {
                             this.ctx.fillRect(renderX + w*0.2, renderY + h*0.2, w*0.6, h*0.5); 
                         }
                         
                         if (!isPowered) {
                             this.ctx.fillStyle = '#ef4444'; 
                             this.ctx.fillRect(renderX + w*0.4, renderY + h*0.4, w*0.2, h*0.2);
                         }
                     }

                     if (tile === TILES.POWER_COAL) {
                         this.ctx.strokeStyle = '#374151';
                         this.ctx.lineWidth = 2 / this.camera.zoom;
                         this.ctx.strokeRect(renderX, renderY, w, h);

                         this.ctx.fillStyle = '#eab308'; 
                         this.ctx.fillRect(renderX + s * 0.4, renderY + s * 0.4, s * 1.2, s * 1.2);
                         
                         this.ctx.fillStyle = '#4b5563';
                         this.ctx.fillRect(renderX + s * 0.5, renderY + s * 0.5, s * 0.3, s * 0.3);
                         this.ctx.fillRect(renderX + s * 1.2, renderY + s * 0.5, s * 0.3, s * 0.3);
                         this.ctx.fillRect(renderX + s * 0.5, renderY + s * 1.2, s * 0.3, s * 0.3);
                         this.ctx.fillRect(renderX + s * 1.2, renderY + s * 1.2, s * 0.3, s * 0.3);
                     } else if (tile === TILES.POLICE) {
                         this.ctx.fillStyle = '#3b82f6';
                         this.ctx.fillRect(renderX + s*0.2, renderY + s*0.2, w - s*0.4, h - s*0.4);
                         this.ctx.fillStyle = '#facc15';
                         this.ctx.fillRect(renderX + w/2 - s*0.2, renderY + h/2 - s*0.2, s*0.4, s*0.4);
                     } else if (tile === TILES.PARK) {
                         this.ctx.fillStyle = '#22c55e';
                         this.ctx.beginPath();
                         this.ctx.arc(renderX + w/2, renderY + h/2, s*0.3, 0, Math.PI * 2);
                         this.ctx.fill();
                     } else if (tile === TILES.SCHOOL) {
                         this.ctx.fillStyle = '#fb923c'; 
                         this.ctx.fillRect(renderX + w*0.1, renderY + h*0.2, w*0.8, h*0.6);
                         this.ctx.fillStyle = '#22c55e';
                         this.ctx.fillRect(renderX + w*0.2, renderY + h*0.5, w*0.6, h*0.3);
                     } else if (tile === TILES.HOSPITAL) {
                         this.ctx.fillStyle = '#ef4444';
                         this.ctx.fillRect(renderX + w/2 - s*0.15, renderY + h*0.2, s*0.3, h*0.6);
                         this.ctx.fillRect(renderX + w*0.2, renderY + h/2 - s*0.15, w*0.6, s*0.3);
                     }
                }
            }
        }

        // Pass 3: Area Preview or Hover Tools
        if (this.isAreaSelecting && this.areaStart.x !== -1) {
             const minX = Math.min(this.areaStart.x, this.hoverTile.x);
             const maxX = Math.max(this.areaStart.x, this.hoverTile.x);
             const minY = Math.min(this.areaStart.y, this.hoverTile.y);
             const maxY = Math.max(this.areaStart.y, this.hoverTile.y);
             
             const width = (maxX - minX + 1) * this.tileSize;
             const height = (maxY - minY + 1) * this.tileSize;
             
             this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
             this.ctx.fillRect(minX * this.tileSize, minY * this.tileSize, width, height);
             this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
             this.ctx.lineWidth = 2 / this.camera.zoom;
             this.ctx.strokeRect(minX * this.tileSize, minY * this.tileSize, width, height);
             
        } else if (this.hoverTile.x >= 0 && this.hoverTile.x < GRID_SIZE && this.hoverTile.y >= 0 && this.hoverTile.y < GRID_SIZE) {
            let width = this.tileSize;
            let height = this.tileSize;
            const ent = BuildingRegistry[this.game.currentTool];
            if (ent) {
                 width = ent.width * this.tileSize;
                 height = ent.height * this.tileSize;
            }

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.fillRect(this.hoverTile.x * this.tileSize, this.hoverTile.y * this.tileSize, width, height);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 2 / this.camera.zoom;
            this.ctx.strokeRect(this.hoverTile.x * this.tileSize, this.hoverTile.y * this.tileSize, width, height);
        }

        this.ctx.restore();
    }
}
