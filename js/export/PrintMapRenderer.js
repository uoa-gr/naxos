/**
 * PrintMapRenderer - produces a high-DPI raster of the map area on a
 * WHITE background. NO basemap.
 *
 * Strategy:
 *   1. Create a hidden DIV at the target pixel size (mm * dpi / 25.4).
 *   2. Spawn a fresh Leaflet map into it using the SVG renderer, no animations.
 *   3. Fit the requested bbox exactly.
 *   4. Re-init SvgPatterns into the new map's SVG defs.
 *   5. Clone all currently-visible layers (respect per-class visibility from exportState.layers).
 *   6. Wait for every <img> and <svg image> to load.
 *   7. Serialize the SVG element, encode as data URL, drawImage onto a canvas.
 *   8. Cleanup + return canvas.
 */
import { LAYERS } from '../data/LayerConfig.js';
import { SvgPatterns } from '../map/SvgPatterns.js';
import { assetUrl } from '../data/DataManager.js';

// Mapping from patternIcon filename to the SVG pattern id registered
// by SvgPatterns. Must match js/map/LayerManager.js PATTERN_ICON_TO_ID.
const PATTERN_ICON_TO_ID = {
    'pattern_hum.png': 'pattern-hum',
    'pattern_tafoni.png': 'pattern-tafoni',
    'pattern_tor.png': 'pattern-tor',
    'pattern_tombolo_dot.png': 'pattern-tombolo',
    'colluvium_pattern.png': 'pattern-colluvium',
    'pattern_sand_dunes.png': 'pattern-sand-dunes',
    'pattern_artificial_lake.png': 'pattern-artificial-lake',
};

export class PrintMapRenderer {
    /**
     * @param {DataManager}  dataManager   - used to fetch GeoJSON
     * @param {LayerManager} layerManager  - used to reuse styles + symbol logic
     */
    constructor(dataManager, layerManager) {
        this.dataManager = dataManager;
        this.layerManager = layerManager;
    }

    /**
     * Render the map area described by exportState.
     * Returns HTMLCanvasElement at the exact target pixel dimensions.
     * @param {object} exportState
     * @returns {Promise<HTMLCanvasElement>}
     */
    async render(exportState) {
        const mapEl = exportState.elements.find(e => e.type === 'map');
        if (!mapEl) throw new Error('PrintMapRenderer: no map element in state');

        const dpi = exportState.page.dpi;
        const widthPx  = Math.max(1, Math.round((mapEl.w * dpi) / 25.4));
        const heightPx = Math.max(1, Math.round((mapEl.h * dpi) / 25.4));

        const container = document.createElement('div');
        container.style.cssText =
            `position:fixed;left:-99999px;top:-99999px;` +
            `width:${widthPx}px;height:${heightPx}px;` +
            `background:#ffffff;pointer-events:none;`;
        document.body.appendChild(container);

        let map = null;
        try {
            map = L.map(container, {
                zoomControl: false,
                attributionControl: false,
                fadeAnimation: false,
                zoomAnimation: false,
                markerZoomAnimation: false,
                preferCanvas: false,
                renderer: L.svg({ padding: 0.1 }),
            });

            const [w, s, e, n] = exportState.area.bbox;
            map.fitBounds([[s, w], [n, e]], { animate: false, padding: [0, 0] });

            new SvgPatterns(map).init();

            await this._cloneLayers(map, exportState);
            await this._waitForReady(container);

            const canvas = await this._svgToCanvas(container, widthPx, heightPx);
            return canvas;
        } finally {
            if (map) map.remove();
            if (container.parentNode) container.parentNode.removeChild(container);
        }
    }

    /**
     * Clone visible layers onto the offscreen map.
     * @param {L.Map} map
     * @param {object} exportState
     */
    async _cloneLayers(map, exportState) {
        // Register per-zIndex panes so polygon fills layer correctly
        const zIndices = [...new Set(Object.values(LAYERS).map(l => l.zIndex || 400))].sort((a, b) => a - b);
        for (const z of zIndices) {
            const paneName = `layer-z${z}`;
            if (!map.getPane(paneName)) {
                const pane = map.createPane(paneName);
                pane.style.zIndex = String(400 + z);
            }
        }

        const entries = Object.entries(exportState.layers);
        for (const [layerId, visibleSet] of entries) {
            if (!visibleSet || visibleSet.size === 0) continue;

            const config = LAYERS[layerId];
            if (!config) continue;

            let geojson;
            try {
                geojson = await this.dataManager.loadLayer(layerId);
            } catch (err) {
                console.warn(`PrintMapRenderer: skipping ${layerId}:`, err.message);
                continue;
            }
            if (!geojson || !geojson.features || geojson.features.length === 0) continue;

            // Filter features to only the visible legend entries
            const filtered = {
                type: 'FeatureCollection',
                features: geojson.features.filter(f => {
                    const idx = this._findEntryIndex(config, f);
                    if (idx === -1) return true;
                    return visibleSet.has(idx);
                }),
            };
            if (filtered.features.length === 0) continue;

            // Sort polygons largest-first so small outcrops render on top
            if (config.geomType === 'polygon') {
                filtered.features.sort((a, b) =>
                    this._bboxArea(b.geometry) - this._bboxArea(a.geometry)
                );
            }

            const paneName = `layer-z${config.zIndex || 400}`;
            const leafletLayer = this._buildGeoJsonLayer(config, filtered, paneName, layerId);
            leafletLayer.addTo(map);

            // For polygons with patternType/patternIcon, apply pattern fills
            // after the paths have been created
            if (config.geomType === 'polygon') {
                await new Promise(r => setTimeout(r, 0));
                leafletLayer.eachLayer(fl => this._applyPatternFill(fl, config));
            }
        }
    }

    /**
     * Build a Leaflet GeoJSON layer matching LayerManager's styling.
     * Reuses `this.layerManager.getFeatureStyle(layerId, feature)` so the
     * live map and the rendered map always stay in sync.
     */
    _buildGeoJsonLayer(config, geojson, paneName, layerId) {
        if (config.geomType === 'point') {
            return L.geoJSON(geojson, {
                pane: paneName,
                pointToLayer: (feature, latlng) => {
                    const entry = this._findMatchingEntry(config, feature);
                    if (!entry || !entry.symbolIcon) {
                        return L.marker(latlng, { pane: paneName });
                    }
                    const size = entry.symbolSize || 24;
                    return L.marker(latlng, {
                        icon: L.icon({
                            iconUrl: assetUrl('symbols/' + entry.symbolIcon),
                            iconSize: [size, size],
                            iconAnchor: [size / 2, size / 2],
                        }),
                        pane: paneName,
                    });
                },
            });
        }
        // polygon or line
        return L.geoJSON(geojson, {
            pane: paneName,
            style: (feature) => this.layerManager.getFeatureStyle(layerId, feature),
        });
    }

    _findMatchingEntry(config, feature) {
        if (!config.legendEntries) return null;
        for (const entry of config.legendEntries) {
            if (this._featureMatchesEntry(feature, entry)) return entry;
        }
        if (config.legendEntries.length === 1 && !config.legendEntries[0].matchField) {
            return config.legendEntries[0];
        }
        return null;
    }

    _findEntryIndex(config, feature) {
        if (!config.legendEntries) return -1;
        for (let i = 0; i < config.legendEntries.length; i++) {
            if (this._featureMatchesEntry(feature, config.legendEntries[i])) return i;
        }
        if (config.legendEntries.length === 1 && !config.legendEntries[0].matchField) return 0;
        return -1;
    }

    _featureMatchesEntry(feature, entry) {
        if (!entry.matchField || !entry.matchValues) return false;
        const value = feature.properties ? feature.properties[entry.matchField] : undefined;
        return entry.matchValues.includes(value);
    }

    _applyPatternFill(featureLayer, config) {
        const feature = featureLayer.feature;
        if (!feature) return;
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

    _bboxArea(geom) {
        if (!geom) return 0;
        let rings = [];
        if (geom.type === 'Polygon') rings = geom.coordinates;
        else if (geom.type === 'MultiPolygon') {
            for (const poly of geom.coordinates) rings.push(...poly);
        } else return 0;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const ring of rings) {
            for (const [x, y] of ring) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
        return isFinite(minX) ? (maxX - minX) * (maxY - minY) : 0;
    }

    /**
     * Wait for all <img> and <svg image> elements inside `container` to finish
     * loading. Resolves either when all are ready or after `timeoutMs`, whichever
     * comes first — the timeout prevents a single broken href from blocking export.
     */
    async _waitForReady(container, timeoutMs = 15000) {
        // Give Leaflet a tick to create path and image elements
        await new Promise(r => setTimeout(r, 200));

        const imgs = Array.from(container.querySelectorAll('img'));
        const svgImages = Array.from(container.querySelectorAll('svg image'));

        const waitFor = (node) => new Promise((resolve) => {
            if (node.tagName.toLowerCase() === 'img') {
                if (node.complete && node.naturalWidth > 0) return resolve();
                const done = () => resolve();
                node.addEventListener('load', done, { once: true });
                node.addEventListener('error', done, { once: true });
                return;
            }
            // SVG <image> — href or xlink:href
            const href = node.getAttribute('href') || node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
            if (!href) return resolve();
            const probe = new Image();
            probe.crossOrigin = 'anonymous';
            probe.onload = () => resolve();
            probe.onerror = () => resolve();
            probe.src = href;
        });

        const all = Promise.all([...imgs, ...svgImages].map(waitFor));
        const timeout = new Promise(resolve => setTimeout(resolve, timeoutMs));
        await Promise.race([all, timeout]);
    }

    /**
     * Serialize the first <svg> inside `container`, encode it as a data URL,
     * draw it onto a white canvas at the requested pixel size.
     */
    async _svgToCanvas(container, widthPx, heightPx) {
        const svg = container.querySelector('svg');
        if (!svg) throw new Error('PrintMapRenderer: offscreen map has no SVG element');

        svg.setAttribute('width', String(widthPx));
        svg.setAttribute('height', String(heightPx));

        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svg);
        if (!svgString.match(/^<svg[^>]+xmlns=/)) {
            svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        try {
            const img = await new Promise((resolve, reject) => {
                const i = new Image();
                i.crossOrigin = 'anonymous';
                i.onload = () => resolve(i);
                i.onerror = () => reject(new Error('SVG-to-image decode failed'));
                i.src = url;
            });

            const canvas = document.createElement('canvas');
            canvas.width = widthPx;
            canvas.height = heightPx;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, widthPx, heightPx);
            ctx.drawImage(img, 0, 0, widthPx, heightPx);
            return canvas;
        } finally {
            URL.revokeObjectURL(url);
        }
    }
}
