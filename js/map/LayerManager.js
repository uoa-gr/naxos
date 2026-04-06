/**
 * LayerManager - Loads GeoJSON layers onto the Leaflet map with correct symbology.
 *
 * Manages layer lifecycle (add, remove, toggle), applies styles from LayerConfig
 * legend entries, handles point markers, landmarks, and z-index panes.
 */

import { LAYERS, LAYER_GROUPS, MAP_DEFAULTS } from '../data/LayerConfig.js';
import { assetUrl } from '../data/DataManager.js';

// Mapping from patternIcon filename -> SVG pattern id registered in SvgPatterns
const PATTERN_ICON_TO_ID = {
    'pattern_hum.png': 'pattern-hum',
    'pattern_tafoni.png': 'pattern-tafoni',
    'pattern_tor.png': 'pattern-tor',
    'pattern_tombolo_dot.png': 'pattern-tombolo',
    'colluvium_pattern.png': 'pattern-colluvium',
    'pattern_sand_dunes.png': 'pattern-sand-dunes',
    'pattern_artificial_lake.png': 'pattern-artificial-lake',
};

const DEFAULT_STYLE = {
    color: '#999',
    weight: 1,
    fillColor: '#ccc',
    fillOpacity: 0.3,
};

export class LayerManager {
    /**
     * @param {L.Map}        map          - Leaflet map instance
     * @param {EventBus}     eventBus
     * @param {StateManager} stateManager
     * @param {DataManager}  dataManager
     */
    constructor(map, eventBus, stateManager, dataManager) {
        this.map = map;
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.dataManager = dataManager;

        /** @type {Map<string, L.GeoJSON>} layerId -> Leaflet layer group */
        this.layers = new Map();

        /** Track which layers are currently visible on the map */
        this.visibleLayerIds = new Set();

        /** Bound handler for contour zoom logic and symbol scaling */
        this._onZoomEnd = () => {
            this._handleZoomChange();
            this._updateSymbolScales();
            this._updateLandmarkScales();
        };
    }

    // =========================================================================
    //  Initialization
    // =========================================================================

    async init() {
        // Create custom panes for z-index ordering
        this._createZIndexPanes();

        // Listen for zoom changes (contour visibility)
        this.map.on('zoomend', this._onZoomEnd);

        // Load all initially visible layers
        const visibleIds = Object.keys(LAYERS).filter(id => LAYERS[id].visible);

        const results = await Promise.allSettled(
            visibleIds.map(id => this.addLayer(id))
        );

        const loaded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
            console.warn(`LayerManager: ${failed} layer(s) failed to load`);
        }

        // Apply initial zoom-based visibility (e.g. contours_50m)
        this._handleZoomChange();

        // Count features and update state
        this._updateFeatureCount();

        console.log(`LayerManager: initialized, ${loaded} layers loaded`);
        this.eventBus.emit('layers:loaded', { count: loaded });
        return true;
    }

    // =========================================================================
    //  Public API
    // =========================================================================

    /**
     * Fetch GeoJSON and add a layer to the map.
     * @param {string} layerId
     */
    async addLayer(layerId) {
        const config = LAYERS[layerId];
        if (!config) {
            console.warn(`LayerManager: Unknown layer "${layerId}"`);
            return;
        }

        // Don't add if already present
        if (this.layers.has(layerId)) {
            return;
        }

        const geojson = await this.dataManager.loadLayer(layerId);
        if (!geojson) return;

        const paneName = `layer-z${config.zIndex}`;
        let leafletLayer;

        if (layerId === 'landmarks') {
            // Special case: text labels
            leafletLayer = L.geoJSON(geojson, {
                pointToLayer: (feature, latlng) => this._createLandmarkMarker(feature, latlng),
                pane: paneName,
            });
        } else if (config.geomType === 'point') {
            leafletLayer = L.geoJSON(geojson, {
                pointToLayer: (feature, latlng) => {
                    const marker = this._createPointMarker(layerId, feature, latlng);

                    // Click: show feature detail modal
                    marker.on('click', () => {
                        this.eventBus.emit('feature:clicked', { feature, layerId });
                    });

                    // Tooltip on hover
                    const name = feature.properties.NAME || feature.properties.Name_ENG || feature.properties.DSC_En || '';
                    if (name) {
                        marker.bindTooltip(name, { direction: 'top', offset: [0, -12] });
                    }

                    return marker;
                },
                pane: paneName,
            });
        } else {
            // polygon or line
            leafletLayer = L.geoJSON(geojson, {
                style: (feature) => this.getFeatureStyle(layerId, feature),
                pane: paneName,
                onEachFeature: (feature, layer) => {
                    // Click: show feature detail modal
                    layer.on('click', () => {
                        this.eventBus.emit('feature:clicked', { feature, layerId });
                    });

                    // Hover: highlight
                    layer.on('mouseover', (e) => {
                        const l = e.target;
                        l.setStyle({
                            weight: (l.options.weight || 1) + 2,
                            fillOpacity: Math.min(1, (l.options.fillOpacity || 0) + 0.2),
                        });
                        l.bringToFront();
                    });
                    layer.on('mouseout', (e) => {
                        // Reset to original style
                        leafletLayer.resetStyle(e.target);
                        // Re-apply pattern fill since resetStyle overwrites fill attr
                        this._applyPatternFills(e.target, layerId);
                    });
                },
            });

            // Apply SVG pattern fills once polygons are added to the map.
            // _path is only available after the layer is on the map.
            const applyAll = () => {
                leafletLayer.eachLayer(l => this._applyPatternFills(l, layerId));
            };
            leafletLayer.on('add', () => {
                // Defer to next tick so Leaflet has created the path elements
                setTimeout(applyAll, 0);
            });
        }

        this.layers.set(layerId, leafletLayer);

        // Determine if this layer should be visible at current zoom
        if (this._shouldBeVisible(layerId)) {
            leafletLayer.addTo(this.map);
            this.visibleLayerIds.add(layerId);
        }
    }

    /**
     * Remove a layer from the map and internal tracking.
     * @param {string} layerId
     */
    removeLayer(layerId) {
        const layer = this.layers.get(layerId);
        if (!layer) return;

        if (this.map.hasLayer(layer)) {
            this.map.removeLayer(layer);
        }
        this.visibleLayerIds.delete(layerId);
        this.layers.delete(layerId);
        this._updateFeatureCount();
    }

    /**
     * Toggle a single layer's visibility.
     * @param {string}  layerId
     * @param {boolean} visible
     */
    toggleLayer(layerId, visible) {
        const layer = this.layers.get(layerId);
        if (!layer) {
            // If toggling on but layer was never loaded, load it now
            if (visible) {
                this.addLayer(layerId).then(() => {
                    this._updateFeatureCount();
                    this.eventBus.emit('layer:toggled', { layerId, visible });
                });
            }
            return;
        }

        if (visible) {
            if (!this.map.hasLayer(layer) && this._shouldBeVisible(layerId)) {
                layer.addTo(this.map);
                this.visibleLayerIds.add(layerId);
            }
        } else {
            if (this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
            this.visibleLayerIds.delete(layerId);
        }

        this._updateFeatureCount();
        this.eventBus.emit('layer:toggled', { layerId, visible });
    }

    /**
     * Toggle all layers in a group.
     * @param {string}  groupId
     * @param {boolean} visible
     */
    toggleGroup(groupId, visible) {
        const layerIds = Object.keys(LAYERS).filter(id => LAYERS[id].group === groupId);
        for (const id of layerIds) {
            this.toggleLayer(id, visible);
        }
    }

    /**
     * Get the L.GeoJSON layer instance for a given layer id.
     * @param {string} layerId
     * @returns {L.GeoJSON|undefined}
     */
    getLayerGroup(layerId) {
        return this.layers.get(layerId);
    }

    // =========================================================================
    //  Styling
    // =========================================================================

    /**
     * Determine the Leaflet path style for a feature based on its layer config.
     * @param {string} layerId
     * @param {object} feature - GeoJSON feature
     * @returns {object} Leaflet path options
     */
    getFeatureStyle(layerId, feature) {
        const config = LAYERS[layerId];
        if (!config || !config.legendEntries) return DEFAULT_STYLE;

        for (const entry of config.legendEntries) {
            if (this._featureMatchesEntry(feature, entry)) {
                return { ...entry.style };
            }
        }

        // No legend entry matched — if this layer has only one entry without matchField,
        // use that entry's style (e.g. contours, faults, perimeter)
        if (config.legendEntries.length === 1 && !config.legendEntries[0].matchField) {
            return { ...config.legendEntries[0].style };
        }

        return DEFAULT_STYLE;
    }

    /**
     * Apply SVG pattern fill to a feature path element after it's been
     * created by Leaflet. Looks up the matching legend entry and, if it
     * has a patternType or patternIcon, sets fill="url(#id)" on the path.
     */
    _applyPatternFills(featureLayer, layerId) {
        const feature = featureLayer.feature;
        if (!feature) return;
        const config = LAYERS[layerId];
        if (!config) return;
        const entry = this._findMatchingEntry(config, feature);
        if (!entry) return;

        let patternId = null;
        if (entry.patternType) {
            patternId = entry.patternType;
        } else if (entry.patternIcon) {
            patternId = PATTERN_ICON_TO_ID[entry.patternIcon] || null;
        }
        if (!patternId) return;

        const path = featureLayer._path;
        if (path) {
            path.setAttribute('fill', `url(#${patternId})`);
            path.setAttribute('fill-opacity', '1');
        }
    }

    // =========================================================================
    //  Private: Marker creation
    // =========================================================================

    /**
     * Create a point marker with the appropriate symbol icon, scaled to current zoom.
     */
    _createPointMarker(layerId, feature, latlng) {
        const config = LAYERS[layerId];
        if (!config) return L.marker(latlng);

        const entry = this._findMatchingEntry(config, feature);

        if (entry && entry.symbolIcon) {
            const baseSize = entry.symbolSize || 24;
            const size = this._getScaledIconSize(baseSize);
            const belowMinZoom = entry.minZoom && this.map.getZoom() < entry.minZoom;
            const marker = L.marker(latlng, {
                icon: L.icon({
                    iconUrl: assetUrl('symbols/' + entry.symbolIcon),
                    iconSize: [size, size],
                    iconAnchor: [size / 2, size / 2],
                }),
                pane: `layer-z${config.zIndex}`,
                opacity: belowMinZoom ? 0 : 1,
                interactive: !belowMinZoom,
            });
            // Store the legend entry reference for zoom-based rescaling
            marker._naxosEntry = entry;
            return marker;
        }

        // Fallback: default marker
        return L.marker(latlng, {
            pane: `layer-z${config.zIndex}`,
        });
    }

    /**
     * Create a text label marker for landmarks, with zoom-scaled font size.
     */
    _createLandmarkMarker(feature, latlng) {
        const name = feature.properties.Name_ENG || feature.properties.Name_Eng || '';
        if (!name) {
            return L.marker(latlng, { opacity: 0, pane: 'layer-z100' });
        }

        const zoom = this.map.getZoom();
        const refZoom = MAP_DEFAULTS.referenceZoom || 12;
        const fontSize = Math.round(11 * Math.pow(2, (zoom - refZoom) * 0.3));
        const clampedSize = Math.max(8, Math.min(fontSize, 20));

        return L.marker(latlng, {
            icon: L.divIcon({
                className: 'landmark-label',
                html: `<span style="font-size:${clampedSize}px">${name}</span>`,
                iconSize: null,
            }),
            pane: 'layer-z100',
        });
    }

    // =========================================================================
    //  Private: Scale-dependent symbol sizing
    // =========================================================================

    /**
     * Calculate a scaled icon size based on the current zoom vs reference zoom.
     * Uses moderate (square-root) scaling so symbols grow/shrink visibly but not excessively.
     * @param {number} baseSize - icon size in pixels at reference zoom
     * @returns {number} scaled size in pixels, clamped to reasonable bounds
     */
    _getScaledIconSize(baseSize) {
        const currentZoom = this.map.getZoom();
        const refZoom = MAP_DEFAULTS.referenceZoom || 12;
        const scaleFactor = Math.pow(2, (currentZoom - refZoom) * 0.5);
        const size = Math.round(baseSize * scaleFactor);
        // Clamp to reasonable bounds
        return Math.max(6, Math.min(size, baseSize * 3));
    }

    /**
     * Re-scale all point marker icons after a zoom change.
     * Skips landmarks (handled separately with font scaling).
     */
    _updateSymbolScales() {
        const currentZoom = this.map.getZoom();

        for (const [layerId, leafletLayer] of this.layers) {
            const config = LAYERS[layerId];
            if (!config || config.geomType !== 'point' || layerId === 'landmarks') continue;

            leafletLayer.eachLayer(marker => {
                if (marker.setIcon && marker._naxosEntry) {
                    const entry = marker._naxosEntry;
                    const baseSize = entry.symbolSize || 24;
                    const size = this._getScaledIconSize(baseSize);
                    marker.setIcon(L.icon({
                        iconUrl: assetUrl('symbols/' + entry.symbolIcon),
                        iconSize: [size, size],
                        iconAnchor: [size / 2, size / 2],
                    }));

                    // Per-entry minZoom: hide via opacity when zoomed out too far
                    if (entry.minZoom) {
                        const visible = currentZoom >= entry.minZoom;
                        marker.setOpacity(visible ? 1 : 0);
                        if (marker.options) marker.options.interactive = visible;
                    }
                }
            });
        }
    }

    /**
     * Re-scale all landmark labels after a zoom change.
     */
    _updateLandmarkScales() {
        const layer = this.layers.get('landmarks');
        if (!layer) return;

        const zoom = this.map.getZoom();
        const refZoom = MAP_DEFAULTS.referenceZoom || 12;
        const fontSize = Math.round(11 * Math.pow(2, (zoom - refZoom) * 0.3));
        const clampedSize = Math.max(8, Math.min(fontSize, 20));

        layer.eachLayer(marker => {
            if (marker.setIcon && marker.getElement) {
                const el = marker.getElement();
                if (!el) return;
                const span = el.querySelector('span');
                if (span) {
                    span.style.fontSize = `${clampedSize}px`;
                }
            }
        });
    }

    // =========================================================================
    //  Private: Legend entry matching
    // =========================================================================

    /**
     * Check if a feature matches a legend entry.
     */
    _featureMatchesEntry(feature, entry) {
        if (!entry.matchField || !entry.matchValues) return false;
        const value = feature.properties ? feature.properties[entry.matchField] : undefined;
        return entry.matchValues.includes(value);
    }

    /**
     * Find the first matching legend entry for a feature.
     */
    _findMatchingEntry(config, feature) {
        if (!config.legendEntries) return null;

        for (const entry of config.legendEntries) {
            if (this._featureMatchesEntry(feature, entry)) {
                return entry;
            }
        }

        // If only one entry and no matchField, treat it as a universal match
        if (config.legendEntries.length === 1 && !config.legendEntries[0].matchField) {
            return config.legendEntries[0];
        }

        return null;
    }

    // =========================================================================
    //  Private: Z-index panes
    // =========================================================================

    /**
     * Create custom Leaflet panes for each unique z-index in the config.
     */
    _createZIndexPanes() {
        const zIndices = [...new Set(Object.values(LAYERS).map(l => l.zIndex))].sort((a, b) => a - b);
        for (const z of zIndices) {
            const paneName = `layer-z${z}`;
            // Avoid creating duplicate panes
            if (!this.map.getPane(paneName)) {
                const pane = this.map.createPane(paneName);
                pane.style.zIndex = 400 + z; // Leaflet default overlay pane is 400
            }
        }
    }

    // =========================================================================
    //  Private: Zoom-dependent visibility (contours)
    // =========================================================================

    /**
     * Check if a layer should be visible at the current zoom level.
     */
    _shouldBeVisible(layerId) {
        const config = LAYERS[layerId];
        if (!config) return false;
        if (config.minZoom && this.map.getZoom() < config.minZoom) {
            return false;
        }
        return true;
    }

    /**
     * Handle zoom changes — show/hide layers with minZoom constraints.
     */
    _handleZoomChange() {
        const zoom = this.map.getZoom();

        for (const [layerId, layer] of this.layers) {
            const config = LAYERS[layerId];
            if (!config || !config.minZoom) continue;

            // Only manage zoom-dependent layers that the user has toggled on
            // (i.e. they exist in the layers Map)
            if (zoom >= config.minZoom) {
                if (!this.map.hasLayer(layer)) {
                    layer.addTo(this.map);
                    this.visibleLayerIds.add(layerId);
                }
            } else {
                if (this.map.hasLayer(layer)) {
                    this.map.removeLayer(layer);
                    this.visibleLayerIds.delete(layerId);
                }
            }
        }

        this._updateFeatureCount();
    }

    // =========================================================================
    //  Private: Feature count
    // =========================================================================

    /**
     * Count total features across all visible layers and update state.
     */
    _updateFeatureCount() {
        let total = 0;
        for (const layerId of this.visibleLayerIds) {
            const layer = this.layers.get(layerId);
            if (layer) {
                const geojson = layer.toGeoJSON();
                if (geojson && geojson.features) {
                    total += geojson.features.length;
                }
            }
        }
        this.stateManager.set('visiblePoints', total);
    }
}
