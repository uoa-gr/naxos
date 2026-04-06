/**
 * DataManager - Loads GeoJSON layers from Supabase Storage with local fallback
 */

import { LAYERS } from './LayerConfig.js';

const SUPABASE_STORAGE_BASE =
    'https://gemokuqzdurkkgkyseix.supabase.co/storage/v1/object/public/naxos-geomorphological/data';

export class DataManager {
    constructor(eventBus, cacheManager, stateManager) {
        this.eventBus = eventBus;
        this.cacheManager = cacheManager;
        this.stateManager = stateManager;
        /** @type {Map<string, object>} in-memory GeoJSON cache */
        this.layerData = new Map();
    }

    async init() {
        console.log('DataManager: initialized');
        return true;
    }

    /**
     * Load GeoJSON for a single layer by its id.
     * Tries Supabase Storage first, falls back to local ./data/ directory.
     * Results are cached in memory so repeated calls return instantly.
     *
     * @param {string} layerId - key from LAYERS config
     * @returns {Promise<object>} GeoJSON FeatureCollection
     */
    async loadLayer(layerId) {
        // Return from memory cache if available
        if (this.layerData.has(layerId)) {
            return this.layerData.get(layerId);
        }

        // Also check CacheManager (persists across soft reloads if needed)
        const cacheKey = 'geojson:' + layerId;
        const cached = this.cacheManager.get(cacheKey);
        if (cached) {
            this.layerData.set(layerId, cached);
            return cached;
        }

        const layerCfg = LAYERS[layerId];
        if (!layerCfg) {
            const err = new Error('DataManager: Unknown layer "' + layerId + '"');
            this.eventBus.emit('data:error', { layerId, error: err });
            throw err;
        }

        const filename = layerCfg.file;
        let geojson = null;

        // Try Supabase Storage first
        try {
            const url = SUPABASE_STORAGE_BASE + '/' + encodeURIComponent(filename);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            geojson = await response.json();
        } catch (remoteErr) {
            console.warn('DataManager: Supabase fetch failed for "' + layerId + '", trying local fallback.', remoteErr.message);

            // Fallback to local file
            try {
                const localUrl = './data/' + filename;
                const response = await fetch(localUrl);
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                geojson = await response.json();
            } catch (localErr) {
                const err = new Error(
                    'DataManager: Failed to load "' + layerId + '" from both Supabase and local. ' + localErr.message
                );
                this.eventBus.emit('data:error', { layerId, error: err });
                throw err;
            }
        }

        // Cache the result
        this.layerData.set(layerId, geojson);
        this.cacheManager.set(cacheKey, geojson); // no TTL — GeoJSON is static

        this.eventBus.emit('data:loaded', { layerId, featureCount: geojson.features ? geojson.features.length : 0 });
        return geojson;
    }

    /**
     * Load all visible layers in parallel.
     * @returns {Promise<Map<string, object>>} Map of layerId -> GeoJSON
     */
    async loadAllLayers() {
        const visibleIds = Object.keys(LAYERS).filter(id => LAYERS[id].visible);

        const results = await Promise.allSettled(
            visibleIds.map(id => this.loadLayer(id).then(data => ({ id, data })))
        );

        const loaded = new Map();
        let totalFeatures = 0;

        for (const result of results) {
            if (result.status === 'fulfilled') {
                loaded.set(result.value.id, result.value.data);
                totalFeatures += result.value.data.features ? result.value.data.features.length : 0;
            } else {
                console.error('DataManager: layer load rejected:', result.reason);
            }
        }

        console.log('DataManager: Loaded ' + loaded.size + '/' + visibleIds.length + ' layers (' + totalFeatures + ' features)');
        this.stateManager.set('visiblePoints', totalFeatures);

        return loaded;
    }
}
