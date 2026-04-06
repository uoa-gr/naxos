/**
 * ExportController - orchestrator for the print/export feature.
 *
 * ⚠️  WORK IN PROGRESS — the whole `js/export/` directory is under active
 * development. The header button (#export-btn) is currently hidden via CSS
 * (see styles.css) so users do not see an unfinished feature. The code is
 * wired in and loads at startup but is unreachable from the UI until the
 * feature is polished.
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

/** Show a full-screen loading overlay with a spinner and message. */
function showLoadingOverlay(message) {
    hideLoadingOverlay();
    const el = document.createElement('div');
    el.id = 'export-loading-overlay';
    el.className = 'export-loading-overlay';
    const box = document.createElement('div');
    box.className = 'export-loading-box';
    const spinner = document.createElement('div');
    spinner.className = 'export-loading-spinner';
    box.appendChild(spinner);
    const text = document.createElement('div');
    text.className = 'export-loading-text';
    text.textContent = message;
    box.appendChild(text);
    el.appendChild(box);
    document.body.appendChild(el);
}

/** Remove the loading overlay if present. */
function hideLoadingOverlay() {
    const el = document.getElementById('export-loading-overlay');
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

/** Show a transient error toast near the bottom of the viewport. */
function showErrorToast(message) {
    const t = document.createElement('div');
    t.className = 'export-error-toast';
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => {
        t.classList.add('fade-out');
        setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 500);
    }, 4000);
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
            const { LayoutDesigner } = await import('./LayoutDesigner.js');
            const designer = new LayoutDesigner(this.exportState, this.layerManager);
            try {
                const finalState = await designer.open();
                this.exportState = finalState;
                this.exportState.status = 'rendering';

                showLoadingOverlay('Rendering map\u2026');
                let canvas;
                try {
                    const renderer = await this._getPrintMapRenderer();
                    canvas = await renderer.render(finalState);
                } catch (renderErr) {
                    hideLoadingOverlay();
                    showErrorToast('Failed to render map: ' + renderErr.message);
                    this.exportState.status = 'error';
                    console.error(renderErr);
                    return;
                }

                hideLoadingOverlay();
                showLoadingOverlay('Generating ' + finalState.output.format.toUpperCase() + '\u2026');
                try {
                    const { ExportEngine } = await import('./ExportEngine.js');
                    const engine = new ExportEngine();
                    await engine.export(finalState, canvas);
                } catch (engineErr) {
                    showErrorToast('Export failed: ' + engineErr.message);
                    this.exportState.status = 'error';
                    console.error(engineErr);
                    return;
                } finally {
                    hideLoadingOverlay();
                }

                this.exportState.status = 'done';
                console.log('ExportController: export complete');
            } catch (designerErr) {
                hideLoadingOverlay();
                if (designerErr && designerErr.message === 'cancelled') {
                    this.exportState.status = 'idle';
                    console.log('ExportController: layout designer cancelled');
                } else {
                    this.exportState.status = 'error';
                    console.error('ExportController: designer error', designerErr);
                }
            }
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

    async _getPrintMapRenderer() {
        if (!this._printMapRenderer) {
            const { PrintMapRenderer } = await import('./PrintMapRenderer.js');
            this._printMapRenderer = new PrintMapRenderer(
                window.app.dataManager,
                this.layerManager,
            );
        }
        return this._printMapRenderer;
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
