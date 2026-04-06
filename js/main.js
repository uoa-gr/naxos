/**
 * main.js - Application entry point for the Naxos Geomorphological WebGIS
 *
 * Initializes core services and bootstraps all modules.
 */

// Core services
import EventBus from './core/EventBus.js';
import StateManager from './core/StateManager.js';
import CacheManager from './core/CacheManager.js';

// Data layer
import { DataManager } from './data/DataManager.js';
import { LAYERS, LAYER_GROUPS } from './data/LayerConfig.js';

// Map layer
import { MapManager } from './map/MapManager.js';
import { LayerManager } from './map/LayerManager.js';
import { SvgPatterns } from './map/SvgPatterns.js';

// UI
import { StatusBar } from './ui/StatusBar.js';
import { InfoSidebar } from './ui/InfoSidebar.js';
import { LegendPanel } from './ui/LegendPanel.js';
import { FilterSidebar } from './ui/FilterSidebar.js';
import { UIController } from './ui/UIController.js';
import { MobileControls } from './ui/MobileControls.js';
import { ModalManager } from './ui/ModalManager.js';
import { ExportController, _setLayersCache } from './export/ExportController.js';

/**
 * Main application class — wires all modules together.
 */
class NaxosGeomorphApp {
    constructor() {
        this.eventBus = null;
        this.stateManager = null;
        this.cacheManager = null;
        this.dataManager = null;
        this.mapManager = null;
        this.layerManager = null;
        this.statusBar = null;
        this.infoSidebar = null;
        this.legendPanel = null;
        this.filterSidebar = null;
        this.uiController = null;
        this.mobileControls = null;
        this.modalManager = null;
        this.exportController = null;
    }

    async init() {
        console.log('Naxos Geomorphological WebGIS - Initializing...');

        const safeRun = async (label, fn) => {
            try {
                const t0 = performance.now();
                await fn();
                console.log(`✔ ${label} (${Math.round(performance.now() - t0)}ms)`);
            } catch (err) {
                console.error(`✘ ${label} FAILED:`, err);
            }
        };

        // 1. Core services (fatal if these fail)
        try {
            this.eventBus = new EventBus();
            this.stateManager = new StateManager(this.eventBus);
            this.cacheManager = new CacheManager();
        } catch (err) {
            console.error('FATAL: core services failed', err);
            return;
        }

        // 2-12. Each step isolated so a single failure doesn't break the rest
        await safeRun('DataManager', async () => {
            this.dataManager = new DataManager(this.eventBus, this.cacheManager, this.stateManager);
            await this.dataManager.init();
        });

        await safeRun('MapManager', async () => {
            this.mapManager = new MapManager(this.eventBus, this.stateManager);
            this.mapManager.init('map');
            if (!this.stateManager.get('mapInstance')) {
                this.stateManager.set('mapInstance', this.mapManager.getMap());
            }
        });

        await safeRun('SvgPatterns', async () => {
            this.svgPatterns = new SvgPatterns(this.mapManager.getMap());
            this.svgPatterns.init();
        });

        await safeRun('LayerManager', async () => {
            this.layerManager = new LayerManager(
                this.mapManager.getMap(),
                this.eventBus,
                this.stateManager,
                this.dataManager,
            );
            await this.layerManager.init();
        });

        await safeRun('InfoSidebar', async () => {
            this.infoSidebar = new InfoSidebar(this.eventBus, this.stateManager);
            this.infoSidebar.init();
        });

        await safeRun('LegendPanel', async () => {
            this.legendPanel = new LegendPanel(this.eventBus, this.stateManager);
            this.legendPanel.init();
        });

        await safeRun('FilterSidebar', async () => {
            this.filterSidebar = new FilterSidebar(this.eventBus, this.stateManager, this.layerManager);
            await this.filterSidebar.init();
        });

        await safeRun('UIController', async () => {
            this.uiController = new UIController(this.eventBus, this.stateManager);
            this.uiController.init();
        });

        await safeRun('MobileControls', async () => {
            this.mobileControls = new MobileControls(this.eventBus, this.stateManager);
            this.mobileControls.init();
        });

        await safeRun('ModalManager', async () => {
            this.modalManager = new ModalManager(this.eventBus, this.stateManager);
            this.modalManager.init();
        });

        await safeRun('ExportController', async () => {
            _setLayersCache(LAYERS);
            this.exportController = new ExportController(
                this.eventBus,
                this.stateManager,
                this.layerManager,
                this.mapManager,
            );
            this.exportController.init();
        });

        // StatusBar removed — bottom bar deleted from layout

        // Hide loading spinner regardless of failures
        const loading = document.getElementById('loading');
        if (loading) loading.classList.add('hidden');

        console.log('Naxos Geomorphological WebGIS - Init sequence complete');
        this.eventBus?.emit('app:ready');
    }
}

// Entry point
document.addEventListener('DOMContentLoaded', () => {
    const app = new NaxosGeomorphApp();
    window.app = app; // expose for debugging
    app.init();
});
