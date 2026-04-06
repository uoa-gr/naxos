/**
 * MapManager - Initializes and manages the Leaflet map instance, basemaps, and controls
 */

import { MAP_DEFAULTS, BASEMAP_OPTIONS } from '../data/LayerConfig.js';

export class MapManager {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.map = null;
        this.basemaps = {};
        this.activeBasemap = null;
        this.activeBasemapId = null;
    }

    /**
     * Initialize the Leaflet map with basemaps and controls
     * @param {string} elementId - DOM element id for the map
     */
    init(elementId = 'map') {
        // Create map with SVG renderer for better vector rendering
        this.map = L.map(elementId, {
            center: MAP_DEFAULTS.center,
            zoom: MAP_DEFAULTS.zoom,
            minZoom: MAP_DEFAULTS.minZoom,
            maxZoom: MAP_DEFAULTS.maxZoom,
            renderer: L.svg({ padding: 0.5 }),
            zoomControl: false,
        });

        // Add zoom control to bottom-right so it doesn't clash with basemap picker
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Create all basemap tile layers
        for (const opt of BASEMAP_OPTIONS) {
            this.basemaps[opt.id] = L.tileLayer(opt.url, {
                attribution: opt.attribution,
                maxZoom: opt.maxZoom || MAP_DEFAULTS.maxZoom,
            });
        }

        // Activate the default basemap (satellite)
        const defaultId = BASEMAP_OPTIONS.find(b => b.default)?.id || 'satellite';
        this.switchBasemap(defaultId);

        // Add scale bar (bottom-left, metric)
        L.control.scale({
            position: 'bottomleft',
            metric: true,
            imperial: false,
        }).addTo(this.map);

        // Add custom controls
        this.addBasemapPicker();
        this.addNorthArrow();

        // Store reference and notify
        this.stateManager.set('mapInstance', this.map);
        this.eventBus.emit('map:ready', { map: this.map });

        console.log('MapManager: Map initialized');
        return this.map;
    }

    /**
     * Return the Leaflet map instance
     */
    getMap() {
        return this.map;
    }

    /**
     * Switch the active basemap by id
     * @param {string} name - basemap id from BASEMAP_OPTIONS
     */
    switchBasemap(name) {
        if (!this.basemaps[name]) {
            console.warn('MapManager: Unknown basemap "' + name + '"');
            return;
        }

        // Remove current basemap
        if (this.activeBasemap && this.map.hasLayer(this.activeBasemap)) {
            this.map.removeLayer(this.activeBasemap);
        }

        // Add new basemap at the bottom
        this.activeBasemap = this.basemaps[name];
        this.activeBasemap.addTo(this.map);
        this.activeBasemap.bringToBack();

        this.activeBasemapId = name;
        this.eventBus.emit('basemap:changed', { basemap: name });
    }

    /**
     * Add a click-based basemap picker control (top-left panel)
     */
    addBasemapPicker() {
        const manager = this;

        const BasemapPicker = L.Control.extend({
            options: { position: 'topleft' },

            onAdd: function (map) {
                const container = L.DomUtil.create('div', 'basemap-picker leaflet-bar');
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                // Toggle button
                const toggleBtn = L.DomUtil.create('a', 'basemap-picker-toggle', container);
                toggleBtn.href = '#';
                toggleBtn.title = 'Change basemap';
                toggleBtn.textContent = '\uD83D\uDDFA'; // world map emoji
                toggleBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;width:34px;height:34px;font-size:18px;text-decoration:none;color:#333;background:#fff;cursor:pointer;';

                // Dropdown panel (hidden by default)
                const panel = L.DomUtil.create('div', 'basemap-picker-panel', container);
                panel.style.cssText = 'display:none;position:absolute;top:0;left:40px;background:#fff;border:1px solid #ccc;border-radius:4px;padding:4px 0;min-width:160px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:1000;';

                // Create entries for each basemap
                for (const opt of BASEMAP_OPTIONS) {
                    const item = L.DomUtil.create('div', 'basemap-picker-item', panel);
                    item.textContent = opt.label;
                    item.dataset.id = opt.id;
                    item.style.cssText = 'padding:6px 12px;cursor:pointer;font-size:12px;font-family:Inter,sans-serif;white-space:nowrap;';

                    if (opt.id === manager.activeBasemapId) {
                        item.style.fontWeight = '600';
                        item.style.background = '#f0f0f0';
                    }

                    item.addEventListener('mouseenter', function () {
                        item.style.background = '#e8e8e8';
                    });
                    item.addEventListener('mouseleave', function () {
                        item.style.background = item.dataset.id === manager.activeBasemapId ? '#f0f0f0' : '';
                    });

                    item.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        manager.switchBasemap(opt.id);

                        // Update active styles on all items
                        panel.querySelectorAll('.basemap-picker-item').forEach(function (el) {
                            el.style.fontWeight = '';
                            el.style.background = '';
                        });
                        item.style.fontWeight = '600';
                        item.style.background = '#f0f0f0';

                        panel.style.display = 'none';
                    });
                }

                // Toggle panel on click
                toggleBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                });

                // Close panel when clicking elsewhere on the map
                map.on('click', function () {
                    panel.style.display = 'none';
                });

                return container;
            },
        });

        new BasemapPicker().addTo(this.map);
    }

    /**
     * Add a CSS-based north arrow (top-right)
     */
    addNorthArrow() {
        const NorthArrow = L.Control.extend({
            options: { position: 'topright' },

            onAdd: function () {
                const container = L.DomUtil.create('div', 'north-arrow leaflet-bar');
                container.style.cssText = 'background:#fff;width:34px;height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:4px;font-family:Inter,sans-serif;';
                container.title = 'North';

                const letter = L.DomUtil.create('span', '', container);
                letter.textContent = 'N';
                letter.style.cssText = 'font-size:11px;font-weight:600;line-height:1;color:#333;';

                const arrow = L.DomUtil.create('span', '', container);
                arrow.textContent = '\u25B2'; // upward triangle
                arrow.style.cssText = 'font-size:14px;line-height:1;color:#333;margin-top:1px;';

                L.DomEvent.disableClickPropagation(container);
                return container;
            },
        });

        new NorthArrow().addTo(this.map);
    }
}
