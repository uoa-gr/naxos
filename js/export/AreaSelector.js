/**
 * AreaSelector - Step 1 of the export workflow.
 *
 * Shows a small modal asking the user to choose the export area.
 * Resolves the returned Promise with { type, bbox, shape } when the
 * user confirms, or rejects with Error('cancelled') on cancel.
 *
 * Draw-on-map modes (rectangle/circle/polygon) are implemented in Task 4.
 * In this task the draw option is rendered but disabled.
 */

// Approximate bbox of the whole Naxos island [west, south, east, north].
// Matches the Perimeter_Naxos GeoJSON bounds.
const WHOLE_ISLAND_BBOX = [25.335, 36.920, 25.610, 37.205];

export class AreaSelector {
    /**
     * @param {L.Map} map - the live Leaflet map instance (used for current-view bbox)
     */
    constructor(map) {
        this.map = map;
        this.modal = null;
        this.resolve = null;
        this.reject = null;
    }

    /**
     * Open the Step-1 modal.
     * @returns {Promise<{type: string, bbox: number[], shape: object|null}>}
     */
    open() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this._render();
        });
    }

    _render() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal export-area-modal active';

        const content = document.createElement('div');
        content.className = 'modal-content export-area-content';

        // Close button (top-right X)
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'modal-close';
        close.textContent = '\u00D7';
        close.setAttribute('aria-label', 'Close');
        close.addEventListener('click', () => this._cancel());
        content.appendChild(close);

        // Heading
        const heading = document.createElement('h3');
        heading.className = 'export-area-title';
        heading.textContent = 'Export area \u00B7 \u03A0\u03B5\u03C1\u03B9\u03BF\u03C7\u03AE \u03B5\u03BE\u03B1\u03B3\u03C9\u03B3\u03AE\u03C2';
        content.appendChild(heading);

        const sub = document.createElement('p');
        sub.className = 'export-area-sub';
        sub.textContent = 'Choose which area to include in the exported map.';
        content.appendChild(sub);

        // Options form
        const form = document.createElement('form');
        form.className = 'export-area-options';
        // Prevent default submission just in case
        form.addEventListener('submit', (e) => e.preventDefault());

        const options = [
            {
                value: 'whole-island',
                label: 'Whole Naxos island',
                labelGr: '\u038C\u03BB\u03B7 \u03B7 \u03BD\u03AE\u03C3\u03BF\u03C2',
                checked: true,
            },
            {
                value: 'current-view',
                label: 'Current map view',
                labelGr: '\u03A4\u03C1\u03AD\u03C7\u03BF\u03C5\u03C3\u03B1 \u03C0\u03C1\u03BF\u03B2\u03BF\u03BB\u03AE',
            },
            {
                value: 'draw',
                label: 'Draw on map\u2026',
                labelGr: '\u03A3\u03C7\u03B5\u03B4\u03B9\u03AC\u03C3\u03C4\u03B5 \u03C3\u03C4\u03BF\u03BD \u03C7\u03AC\u03C1\u03C4\u03B7\u2026',
            },
        ];

        for (const opt of options) {
            const label = document.createElement('label');
            label.className = 'export-area-option';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'area-type';
            radio.value = opt.value;
            if (opt.checked) radio.checked = true;

            const text = document.createElement('span');
            text.className = 'export-area-option-text';
            text.textContent = opt.label;

            const textGr = document.createElement('span');
            textGr.className = 'export-area-option-gr';
            textGr.lang = 'el';
            textGr.textContent = opt.labelGr;

            label.appendChild(radio);
            label.appendChild(text);
            label.appendChild(textGr);
            form.appendChild(label);
        }

        // Sub-options for 'draw' mode — visible only when 'draw' is selected
        const drawOptions = document.createElement('div');
        drawOptions.className = 'export-draw-subopts';
        drawOptions.style.display = 'none';

        const drawShapes = [
            { value: 'rectangle', label: 'Rectangle', labelGr: '\u039F\u03C1\u03B8\u03BF\u03B3\u03CE\u03BD\u03B9\u03BF', checked: true },
            { value: 'circle',    label: 'Circle',    labelGr: '\u039A\u03CD\u03BA\u03BB\u03BF\u03C2' },
            { value: 'polygon',   label: 'Polygon',   labelGr: '\u03A0\u03BF\u03BB\u03CD\u03B3\u03C9\u03BD\u03BF' },
        ];
        for (const sh of drawShapes) {
            const lbl = document.createElement('label');
            lbl.className = 'export-draw-subopt';

            const r = document.createElement('input');
            r.type = 'radio';
            r.name = 'draw-shape';
            r.value = sh.value;
            if (sh.checked) r.checked = true;

            const t = document.createElement('span');
            t.textContent = sh.label;

            const tg = document.createElement('span');
            tg.className = 'export-draw-subopt-gr';
            tg.lang = 'el';
            tg.textContent = sh.labelGr;

            lbl.appendChild(r);
            lbl.appendChild(t);
            lbl.appendChild(tg);
            drawOptions.appendChild(lbl);
        }
        form.appendChild(drawOptions);

        // Show/hide sub-options based on main radio selection
        form.addEventListener('change', (e) => {
            if (e.target && e.target.name === 'area-type') {
                drawOptions.style.display = e.target.value === 'draw' ? 'flex' : 'none';
            }
        });

        content.appendChild(form);

        // Footer with Cancel + Continue
        const footer = document.createElement('div');
        footer.className = 'export-area-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => this._cancel());

        const continueBtn = document.createElement('button');
        continueBtn.type = 'button';
        continueBtn.className = 'btn btn-primary';
        continueBtn.textContent = 'Continue \u25B6';
        continueBtn.addEventListener('click', () => {
            const picked = form.querySelector('input[name="area-type"]:checked');
            if (picked) this._confirm(picked.value);
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(continueBtn);
        content.appendChild(footer);

        this.modal.appendChild(content);
        document.body.appendChild(this.modal);
    }

    _confirm(type) {
        if (type === 'whole-island') {
            this._close();
            this.resolve({ type, bbox: [...WHOLE_ISLAND_BBOX], shape: null });
            return;
        }
        if (type === 'current-view') {
            const b = this.map.getBounds();
            this._close();
            this.resolve({
                type,
                bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
                shape: null,
            });
            return;
        }
        if (type === 'draw') {
            const picked = this.modal.querySelector('input[name="draw-shape"]:checked');
            const shape = picked ? picked.value : 'rectangle';
            this._close();
            this._startDrawing(shape);
            return;
        }
    }

    _cancel() {
        this._close();
        this.reject(new Error('cancelled'));
    }

    _close() {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
    }

    /**
     * Begin an interactive drawing session on the live map. The user clicks
     * to place points (rectangle: 2 corners; circle: center + edge; polygon:
     * double-click to close). Resolves the original `open()` promise with
     * { type, bbox, shape } when done.
     *
     * @param {'rectangle'|'circle'|'polygon'} shape
     */
    _startDrawing(shape) {
        const map = this.map;
        this._showDrawBanner(shape);

        const container = map.getContainer();
        const originalCursor = container.style.cursor;
        container.style.cursor = 'crosshair';
        map.doubleClickZoom.disable();

        // Suppress feature click handlers on the live map while drawing,
        // otherwise a click that is meant to set a corner opens a feature
        // detail modal instead. LayerManager's click handlers check this flag.
        window.__naxosDrawing = true;

        let tempLayer = null;
        let firstPoint = null;
        const polyPoints = [];

        const cleanup = () => {
            container.style.cursor = originalCursor;
            map.doubleClickZoom.enable();
            map.off('click', onClick);
            map.off('mousemove', onMove);
            map.off('dblclick', onDblClick);
            if (tempLayer && map.hasLayer(tempLayer)) map.removeLayer(tempLayer);
            tempLayer = null;
            this._hideDrawBanner();
            window.__naxosDrawing = false;
        };

        // Expose cleanup so Escape handler can call it
        this._drawCleanup = cleanup;

        const onMove = (e) => {
            if (shape === 'rectangle' && firstPoint) {
                if (tempLayer) map.removeLayer(tempLayer);
                tempLayer = L.rectangle([firstPoint, e.latlng], {
                    color: '#ff6600', weight: 2, dashArray: '4,4', fill: false,
                }).addTo(map);
            } else if (shape === 'circle' && firstPoint) {
                if (tempLayer) map.removeLayer(tempLayer);
                const r = map.distance(firstPoint, e.latlng);
                tempLayer = L.circle(firstPoint, {
                    radius: r, color: '#ff6600', weight: 2, dashArray: '4,4', fill: false,
                }).addTo(map);
            } else if (shape === 'polygon' && polyPoints.length > 0) {
                if (tempLayer) map.removeLayer(tempLayer);
                tempLayer = L.polyline([...polyPoints, e.latlng], {
                    color: '#ff6600', weight: 2, dashArray: '4,4',
                }).addTo(map);
            }
        };

        const onClick = (e) => {
            if (shape === 'rectangle') {
                if (!firstPoint) {
                    firstPoint = e.latlng;
                } else {
                    const bounds = L.latLngBounds(firstPoint, e.latlng);
                    cleanup();
                    this._resolveBbox('rectangle', bounds);
                }
            } else if (shape === 'circle') {
                if (!firstPoint) {
                    firstPoint = e.latlng;
                } else {
                    const radius = map.distance(firstPoint, e.latlng);
                    const bounds = firstPoint.toBounds(radius * 2);
                    cleanup();
                    this._resolveBbox('circle', bounds, { center: firstPoint, radius });
                }
            } else if (shape === 'polygon') {
                polyPoints.push(e.latlng);
            }
        };

        const onDblClick = (e) => {
            if (shape !== 'polygon' || polyPoints.length < 3) return;
            if (e.originalEvent) e.originalEvent.preventDefault();
            const bounds = L.latLngBounds(polyPoints);
            const points = polyPoints.slice();
            cleanup();
            this._resolveBbox('polygon', bounds, { points });
        };

        map.on('click', onClick);
        map.on('mousemove', onMove);
        map.on('dblclick', onDblClick);
    }

    /**
     * Resolve the `open()` promise with a drawn shape result.
     */
    _resolveBbox(type, bounds, extra = {}) {
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
        let shape;
        if (extra.points) {
            shape = {
                type: 'Polygon',
                coordinates: [extra.points.map((p) => [p.lng, p.lat])],
            };
        } else if (extra.center) {
            shape = {
                type: 'Circle',
                center: [extra.center.lng, extra.center.lat],
                radius: extra.radius,
            };
        } else {
            shape = { type: 'Rectangle', coordinates: bbox };
        }
        this.resolve({ type, bbox, shape });
    }

    /**
     * Show a floating banner with drawing instructions.
     * Also installs an Escape-key handler that cancels the drawing session.
     */
    _showDrawBanner(shape) {
        const instructions = {
            rectangle: 'Click the first corner, then click again to finish. (Esc to cancel)',
            circle:    'Click the center, then click on the edge to finish. (Esc to cancel)',
            polygon:   'Click to add points, double-click to close the polygon. (Esc to cancel)',
        };

        const banner = document.createElement('div');
        banner.className = 'export-draw-banner';
        banner.id = 'export-draw-banner';
        banner.textContent = instructions[shape] || '';
        document.body.appendChild(banner);

        this._escHandler = (e) => {
            if (e.key === 'Escape') {
                if (typeof this._drawCleanup === 'function') this._drawCleanup();
                this.reject(new Error('cancelled'));
            }
        };
        document.addEventListener('keydown', this._escHandler);
    }

    /**
     * Remove the drawing instructions banner and detach the Escape handler.
     */
    _hideDrawBanner() {
        const banner = document.getElementById('export-draw-banner');
        if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
        this._drawCleanup = null;
    }
}
