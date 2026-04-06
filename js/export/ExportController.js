/**
 * ExportController - orchestrator for the print/export feature.
 *
 * Owns the workflow state machine:
 *   idle -> selecting-area -> drawing? -> designing -> rendering -> done
 *
 * Instantiates AreaSelector, LayoutDesigner, PrintMapRenderer, ExportEngine
 * on demand and passes the single `exportState` between them.
 *
 * Called from main.js after LayerManager is ready.
 */
import { createExportState } from './ExportState.js';

// Module-level cache of the LAYERS config so `_snapshotVisibleLayers` can look
// up legend-entry counts without re-importing LayerConfig on every call.
// Populated by `_setLayersCache(LAYERS)` from main.js at initialization time.
let _LAYERS_CACHE = null;

export function _setLayersCache(layers) {
    _LAYERS_CACHE = layers;
}

export class ExportController {
    /**
     * @param {EventBus}     eventBus
     * @param {StateManager} stateManager
     * @param {LayerManager} layerManager
     * @param {MapManager}   mapManager
     */
    constructor(eventBus, stateManager, layerManager, mapManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.layerManager = layerManager;
        this.mapManager = mapManager;
        this.exportState = null;
    }

    init() {
        const btn = document.getElementById('export-btn');
        if (btn) {
            btn.addEventListener('click', () => this.openWorkflow());
        }
        console.log('ExportController: initialized');
    }

    /**
     * Entry point for the export workflow. Currently just creates the
     * exportState and logs it. Step-1 and Step-2 modals are wired in
     * Task 3 and Task 5 respectively.
     */
    async openWorkflow() {
        const savedPerson = localStorage.getItem('naxos_export_person') || 'NKUA';

        this.exportState = createExportState({ person: savedPerson });
        this.exportState.layers = this._snapshotVisibleLayers();
        this.exportState.status = 'selecting-area';

        const { AreaSelector } = await import('./AreaSelector.js');
        const selector = new AreaSelector(this.mapManager.getMap());

        try {
            const area = await selector.open();
            this.exportState.area = area;
            this.exportState.status = 'designing';
            console.log('ExportController: area selected', area);
            // TODO: open Step-2 modal (LayoutDesigner) in Task 5
        } catch (err) {
            if (err && err.message === 'cancelled') {
                this.exportState.status = 'idle';
                console.log('ExportController: workflow cancelled by user');
            } else {
                this.exportState.status = 'error';
                console.error('ExportController: workflow error', err);
            }
        }
    }

    /**
     * Snapshot which legend-entries are currently visible on the live map.
     * Returns an object keyed by layerId, each value a Set of visible entryIndex.
     * Used to initialize exportState.layers.
     */
    _snapshotVisibleLayers() {
        const result = {};
        if (!_LAYERS_CACHE) return result;

        // LayerManager stores hidden entries as Map<layerId, Set<entryIndex>>.
        // Some layers may not be tracked there yet (means "all visible").
        const hiddenEntries = this.layerManager._hiddenEntries || new Map();

        // Iterate the layers that have been loaded onto the map. Each loaded
        // layer's id is a key in `layerManager.layers`.
        for (const [layerId] of this.layerManager.layers) {
            const config = _LAYERS_CACHE[layerId];
            if (!config) continue;

            const n = config.legendEntries ? config.legendEntries.length : 1;
            const hiddenSet = hiddenEntries.get(layerId) || new Set();
            const visible = new Set();
            for (let i = 0; i < n; i++) {
                if (!hiddenSet.has(i)) visible.add(i);
            }
            result[layerId] = visible;
        }
        return result;
    }
}
