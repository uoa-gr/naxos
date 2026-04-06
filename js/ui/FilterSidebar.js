/**
 * FilterSidebar - Manages the left sidebar with layer group toggles,
 * individual layer toggles, and a feature search.
 *
 * All dynamic text is escaped via escapeHtml() before insertion to prevent XSS.
 */

import { LAYERS, LAYER_GROUPS } from '../data/LayerConfig.js';
import { debounce, escapeHtml } from '../utils/helpers.js';

export class FilterSidebar {
    constructor(eventBus, stateManager, layerManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.layerManager = layerManager;

        /** Currently highlighted search-result layer on the map */
        this._highlightLayer = null;
    }

    async init() {
        this._renderLayerControls();
        this._renderSearchPanel();
        this._bindEvents();
        return true;
    }

    // =========================================================================
    //  Layer controls
    // =========================================================================

    _renderLayerControls() {
        const container = document.getElementById('layer-controls');
        if (!container) return;
        container.textContent = '';

        // Build mapping: groupId -> array of {layerId, entryIndex, label, labelGr}
        // Mirrors the legend structure exactly so the user sees the same items here.
        const groupItems = {};
        for (const group of LAYER_GROUPS) groupItems[group.id] = [];
        const baseItems = [];

        for (const layer of Object.values(LAYERS)) {
            const targetId = layer.group || 'base';
            const items = layer.legendEntries.map((entry, idx) => ({
                layerId: layer.id,
                entryIndex: idx,
                label: entry.label || layer.label,
                labelGr: entry.labelGr || layer.labelGr,
                geomType: layer.geomType,
                // Effective minZoom: entry-level overrides layer-level
                minZoom: entry.minZoom || layer.minZoom || null,
            }));
            if (targetId === 'base') {
                baseItems.push(...items);
            } else if (groupItems[targetId]) {
                groupItems[targetId].push(...items);
            } else {
                // Layer's group is unknown — fold into 'general'
                if (!groupItems['general']) groupItems['general'] = [];
                groupItems['general'].push(...items);
            }
        }

        // Base layers section
        if (baseItems.length) {
            container.appendChild(this._buildGroupSection({
                id: 'base',
                label: 'Base layers',
                labelGr: '\u0392\u03B1\u03C3\u03B9\u03BA\u03AC \u03B5\u03C0\u03AF\u03C0\u03B5\u03B4\u03B1',
                expanded: false,
            }, baseItems));
        }

        // Environment groups — force collapsed by default so the filter
        // sidebar opens to a clean short list and the user can drill in.
        for (const group of LAYER_GROUPS) {
            const items = groupItems[group.id];
            if (items && items.length) {
                container.appendChild(this._buildGroupSection(
                    { ...group, expanded: false },
                    items,
                ));
            }
        }
    }

    /**
     * Build a group section with one toggle per legend entry (item).
     * @param {object} group   - { id, label, labelGr, expanded }
     * @param {Array}  items   - [{ layerId, entryIndex, label, labelGr }]
     */
    _buildGroupSection(group, items) {
        const section = document.createElement('div');
        section.className = 'layer-group-section';

        // Header
        const header = document.createElement('label');
        header.className = 'layer-group-header' + (group.expanded ? ' expanded' : '');

        const groupCb = document.createElement('input');
        groupCb.type = 'checkbox';
        groupCb.className = 'group-checkbox';
        groupCb.dataset.group = group.id;
        groupCb.checked = true;

        const labelSpan = document.createElement('span');
        labelSpan.className = 'group-label';
        labelSpan.textContent = group.label;

        const labelGrSpan = document.createElement('span');
        labelGrSpan.className = 'group-label-gr';
        labelGrSpan.textContent = group.labelGr;

        const chevron = document.createElement('span');
        chevron.className = 'group-chevron';
        chevron.textContent = '\u25B8';

        header.appendChild(groupCb);
        header.appendChild(labelSpan);
        header.appendChild(labelGrSpan);
        header.appendChild(chevron);

        // Items container
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'layer-group-layers' + (group.expanded ? '' : ' collapsed');

        for (const item of items) {
            const toggle = document.createElement('label');
            toggle.className = 'layer-toggle';
            if (item.minZoom) toggle.classList.add('has-min-zoom');

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'entry-checkbox';
            cb.dataset.layer = item.layerId;
            cb.dataset.entryIndex = String(item.entryIndex);
            cb.checked = true;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'layer-name';
            nameSpan.textContent = item.label;

            toggle.appendChild(cb);
            toggle.appendChild(nameSpan);

            if (item.labelGr && item.labelGr !== item.label) {
                const grSpan = document.createElement('span');
                grSpan.className = 'layer-name-gr';
                grSpan.textContent = item.labelGr;
                toggle.appendChild(grSpan);
            }

            // Scale-dependent indicator: small "zoom" hint when feature only shows at higher zoom
            if (item.minZoom) {
                const hint = document.createElement('span');
                hint.className = 'layer-minzoom-hint';
                hint.textContent = '\u2316 z\u2265' + item.minZoom;
                hint.title = 'Visible at zoom level ' + item.minZoom + ' and above';
                toggle.appendChild(hint);
            }

            itemsDiv.appendChild(toggle);
        }

        section.appendChild(header);
        section.appendChild(itemsDiv);
        return section;
    }

    // =========================================================================
    //  Search panel
    // =========================================================================

    _renderSearchPanel() {
        const container = document.getElementById('search-panel');
        if (!container) return;

        container.textContent = '';

        const searchSection = document.createElement('div');
        searchSection.className = 'search-section';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'feature-search-input';
        input.className = 'search-input';
        input.placeholder = 'Search by name...';
        input.autocomplete = 'off';

        const results = document.createElement('div');
        results.id = 'search-results';
        results.className = 'search-results hidden';

        searchSection.appendChild(input);
        searchSection.appendChild(results);
        container.appendChild(searchSection);
    }

    // =========================================================================
    //  Event binding
    // =========================================================================

    _bindEvents() {
        const container = document.getElementById('layer-controls');
        if (container) {
            container.addEventListener('change', (e) => {
                // Group checkbox — toggle all entries in this section
                const groupCb = e.target.closest('.group-checkbox');
                if (groupCb) {
                    const visible = groupCb.checked;
                    const section = groupCb.closest('.layer-group-section');
                    if (section) {
                        section.querySelectorAll('.entry-checkbox').forEach(cb => {
                            cb.checked = visible;
                            const layerId = cb.dataset.layer;
                            const entryIndex = parseInt(cb.dataset.entryIndex, 10);
                            this.layerManager.toggleEntry(layerId, entryIndex, visible);
                        });
                    }
                    return;
                }

                // Entry checkbox — toggle a single legend class
                const entryCb = e.target.closest('.entry-checkbox');
                if (entryCb) {
                    const layerId = entryCb.dataset.layer;
                    const entryIndex = parseInt(entryCb.dataset.entryIndex, 10);
                    this.layerManager.toggleEntry(layerId, entryIndex, entryCb.checked);
                    this._syncGroupCheckbox(entryCb);
                }
            });

            // Group header click — expand/collapse
            container.addEventListener('click', (e) => {
                const header = e.target.closest('.layer-group-header');
                if (!header) return;

                // Ignore clicks on the checkbox itself
                if (e.target.classList.contains('group-checkbox')) return;

                header.classList.toggle('expanded');
                const layersDiv = header.nextElementSibling;
                if (layersDiv) {
                    layersDiv.classList.toggle('collapsed');
                }
            });
        }

        // Search input
        const searchInput = document.getElementById('feature-search-input');
        if (searchInput) {
            const debouncedSearch = debounce((query) => this._doSearch(query), 200);
            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value.trim());
            });
        }
    }

    /**
     * Synchronize the group checkbox state based on its child entry checkboxes.
     */
    _syncGroupCheckbox(entryCb) {
        const section = entryCb.closest('.layer-group-section');
        if (!section) return;
        const groupCb = section.querySelector('.group-checkbox');
        if (!groupCb) return;

        const allCheckboxes = section.querySelectorAll('.entry-checkbox');
        const allChecked = [...allCheckboxes].every(cb => cb.checked);
        groupCb.checked = allChecked;
    }

    // =========================================================================
    //  Search logic
    // =========================================================================

    _doSearch(query) {
        const resultsDiv = document.getElementById('search-results');
        if (!resultsDiv) return;

        // Clear previous highlight and results
        this._clearHighlight();
        resultsDiv.textContent = '';

        if (!query || query.length < 2) {
            resultsDiv.classList.add('hidden');
            return;
        }

        const lowerQuery = query.toLowerCase();
        const results = [];

        // Iterate over all loaded layers and their features
        for (const [layerId, leafletLayer] of this.layerManager.layers) {
            const config = LAYERS[layerId];
            if (!config) continue;

            leafletLayer.eachLayer((featureLayer) => {
                if (results.length >= 50) return;
                const props = featureLayer.feature?.properties;
                if (!props) return;

                // Search NAME-like properties
                const nameFields = ['NAME', 'Name', 'Name_ENG', 'Name_Eng', 'name', 'DSC_En'];
                for (const field of nameFields) {
                    if (props[field] && String(props[field]).toLowerCase().includes(lowerQuery)) {
                        results.push({
                            name: String(props[field]),
                            layerLabel: config.label,
                            featureLayer,
                        });
                        break;
                    }
                }
            });

            if (results.length >= 50) break;
        }

        if (results.length === 0) {
            const noResult = document.createElement('div');
            noResult.className = 'search-result-item';
            noResult.textContent = 'No results found';
            resultsDiv.appendChild(noResult);
            resultsDiv.classList.remove('hidden');
            return;
        }

        // Build result items using safe DOM methods
        const displayResults = results.slice(0, 20);
        for (let i = 0; i < displayResults.length; i++) {
            const r = displayResults[i];

            const item = document.createElement('div');
            item.className = 'search-result-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = r.name;

            const typeSpan = document.createElement('span');
            typeSpan.className = 'search-result-type';
            typeSpan.textContent = r.layerLabel;

            item.appendChild(nameSpan);
            item.appendChild(document.createTextNode(' '));
            item.appendChild(typeSpan);

            item.addEventListener('click', () => {
                this._zoomToFeature(r.featureLayer);
            });

            resultsDiv.appendChild(item);
        }

        resultsDiv.classList.remove('hidden');
    }

    _zoomToFeature(featureLayer) {
        this._clearHighlight();

        if (featureLayer.getBounds) {
            this.layerManager.map.fitBounds(featureLayer.getBounds(), { maxZoom: 16, padding: [30, 30] });
        } else if (featureLayer.getLatLng) {
            this.layerManager.map.setView(featureLayer.getLatLng(), 16);
        }

        // Highlight
        try {
            if (featureLayer.setStyle) {
                this._highlightLayer = featureLayer;
                featureLayer.setStyle({ color: '#ff0', weight: 4 });
                setTimeout(() => this._clearHighlight(), 4000);
            } else if (featureLayer.getLatLng) {
                const circle = L.circleMarker(featureLayer.getLatLng(), {
                    radius: 18,
                    color: '#ff0',
                    weight: 3,
                    fillOpacity: 0.15,
                });
                circle.addTo(this.layerManager.map);
                this._highlightLayer = circle;
                setTimeout(() => this._clearHighlight(), 4000);
            }
        } catch (_) {
            // Ignore highlight errors
        }
    }

    _clearHighlight() {
        if (!this._highlightLayer) return;
        try {
            if (this._highlightLayer._map || this._highlightLayer._mapToAdd) {
                this.layerManager.map.removeLayer(this._highlightLayer);
            }
        } catch (_) {
            // ignore
        }
        this._highlightLayer = null;
    }
}
