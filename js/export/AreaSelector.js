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
                disabled: true,
            },
        ];

        for (const opt of options) {
            const label = document.createElement('label');
            label.className = 'export-area-option' + (opt.disabled ? ' disabled' : '');

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'area-type';
            radio.value = opt.value;
            if (opt.checked) radio.checked = true;
            if (opt.disabled) radio.disabled = true;

            const text = document.createElement('span');
            text.className = 'export-area-option-text';
            text.textContent = opt.label;

            const textGr = document.createElement('span');
            textGr.className = 'export-area-option-gr';
            textGr.textContent = opt.labelGr;

            label.appendChild(radio);
            label.appendChild(text);
            label.appendChild(textGr);

            if (opt.disabled) {
                const hint = document.createElement('span');
                hint.className = 'export-area-option-hint';
                hint.textContent = '(coming in next update)';
                label.appendChild(hint);
            }

            form.appendChild(label);
        }

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
        // 'draw' is disabled in this task; unreachable.
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
}
