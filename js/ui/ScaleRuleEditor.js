/**
 * ScaleRuleEditor - small popup modal that lets the user set a per-entry
 * scale-dependent visibility rule (minZoom and/or maxZoom).
 *
 * Usage:
 *   ScaleRuleEditor.open({
 *       layerId, entryIndex, label, labelGr, defaults, mapInstance,
 *   });
 *
 * The editor reads the current effective rule from `scaleRules`, lets the
 * user change it, persists via `scaleRules.set` / `scaleRules.reset`, and
 * closes. LayerManager re-renders automatically because it subscribes to
 * `scaleRules` changes.
 */
import { scaleRules } from '../data/ScaleRules.js';

export class ScaleRuleEditor {
    /**
     * Show the editor popup.
     * @param {object}  opts
     * @param {string}  opts.layerId
     * @param {number}  opts.entryIndex
     * @param {string}  opts.label       English label of the entry
     * @param {string}  opts.labelGr     Greek label
     * @param {object}  opts.defaults    { minZoom, maxZoom } from LayerConfig
     * @param {L.Map}   opts.mapInstance for the "use current zoom" buttons
     */
    static open(opts) {
        const editor = new ScaleRuleEditor(opts);
        editor._render();
        return editor;
    }

    constructor(opts) {
        this.layerId = opts.layerId;
        this.entryIndex = opts.entryIndex;
        this.label = opts.label || '';
        this.labelGr = opts.labelGr || '';
        this.defaults = opts.defaults || {};
        this.map = opts.mapInstance || null;
        this.modal = null;
        this._escHandler = null;
    }

    _render() {
        const current = scaleRules.getEffective(this.layerId, this.entryIndex, this.defaults);

        this.modal = document.createElement('div');
        this.modal.className = 'modal scale-rule-modal active';

        const content = document.createElement('div');
        content.className = 'modal-content scale-rule-content';

        // Close button
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'modal-close';
        close.textContent = '\u00D7';
        close.setAttribute('aria-label', 'Close');
        close.addEventListener('click', () => this._close());
        content.appendChild(close);

        // Heading
        const heading = document.createElement('h3');
        heading.className = 'scale-rule-title';
        heading.textContent = 'Scale rule';
        content.appendChild(heading);

        const subtitle = document.createElement('p');
        subtitle.className = 'scale-rule-subtitle';
        subtitle.textContent = this.label + (this.labelGr && this.labelGr !== this.label
            ? '  \u00B7  ' + this.labelGr
            : '');
        content.appendChild(subtitle);

        const help = document.createElement('p');
        help.className = 'scale-rule-help';
        help.textContent = 'Show this layer only when the map zoom is within the chosen range. Leave a field blank to remove that side of the rule.';
        content.appendChild(help);

        // Form fields
        const form = document.createElement('div');
        form.className = 'scale-rule-form';

        // Min zoom row
        const minRow = document.createElement('div');
        minRow.className = 'scale-rule-row';
        const minLbl = document.createElement('label');
        minLbl.className = 'scale-rule-label';
        minLbl.textContent = 'Show at zoom \u2265';
        const minInput = document.createElement('input');
        minInput.type = 'number';
        minInput.className = 'scale-rule-input';
        minInput.min = '0';
        minInput.max = '22';
        minInput.step = '1';
        minInput.placeholder = '\u2014';
        if (current.minZoom != null) minInput.value = String(current.minZoom);
        const minNow = document.createElement('button');
        minNow.type = 'button';
        minNow.className = 'scale-rule-now';
        minNow.title = 'Use current map zoom';
        minNow.textContent = 'now';
        minNow.addEventListener('click', () => {
            if (this.map) minInput.value = String(Math.round(this.map.getZoom()));
        });
        minRow.appendChild(minLbl);
        minRow.appendChild(minInput);
        minRow.appendChild(minNow);
        form.appendChild(minRow);

        // Max zoom row
        const maxRow = document.createElement('div');
        maxRow.className = 'scale-rule-row';
        const maxLbl = document.createElement('label');
        maxLbl.className = 'scale-rule-label';
        maxLbl.textContent = 'Show at zoom \u2264';
        const maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.className = 'scale-rule-input';
        maxInput.min = '0';
        maxInput.max = '22';
        maxInput.step = '1';
        maxInput.placeholder = '\u2014';
        if (current.maxZoom != null) maxInput.value = String(current.maxZoom);
        const maxNow = document.createElement('button');
        maxNow.type = 'button';
        maxNow.className = 'scale-rule-now';
        maxNow.title = 'Use current map zoom';
        maxNow.textContent = 'now';
        maxNow.addEventListener('click', () => {
            if (this.map) maxInput.value = String(Math.round(this.map.getZoom()));
        });
        maxRow.appendChild(maxLbl);
        maxRow.appendChild(maxInput);
        maxRow.appendChild(maxNow);
        form.appendChild(maxRow);

        // Current source indicator
        const source = document.createElement('p');
        source.className = 'scale-rule-source';
        if (current.source === 'user') source.textContent = 'Currently using a custom rule.';
        else if (current.source === 'default') source.textContent = 'Currently using the default rule.';
        else source.textContent = 'No rule set \u2014 always visible.';
        form.appendChild(source);

        // Current zoom hint
        if (this.map) {
            const z = document.createElement('p');
            z.className = 'scale-rule-zoom';
            z.textContent = 'Current map zoom: ' + Math.round(this.map.getZoom());
            form.appendChild(z);
        }

        content.appendChild(form);

        // Footer buttons
        const footer = document.createElement('div');
        footer.className = 'scale-rule-footer';

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn btn-secondary';
        resetBtn.textContent = 'Reset to default';
        resetBtn.addEventListener('click', () => {
            scaleRules.reset(this.layerId, this.entryIndex);
            this._close();
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => this._close());

        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.className = 'btn btn-primary';
        applyBtn.textContent = 'Apply';
        applyBtn.addEventListener('click', () => {
            const minVal = minInput.value.trim();
            const maxVal = maxInput.value.trim();
            const min = minVal === '' ? null : parseInt(minVal, 10);
            const max = maxVal === '' ? null : parseInt(maxVal, 10);
            if (min != null && isNaN(min)) return;
            if (max != null && isNaN(max)) return;
            if (min != null && max != null && min > max) {
                // Don't accept invalid range
                source.textContent = 'Invalid range: minimum must be \u2264 maximum.';
                source.style.color = '#c22';
                return;
            }
            scaleRules.set(this.layerId, this.entryIndex, { minZoom: min, maxZoom: max });
            this._close();
        });

        footer.appendChild(resetBtn);
        footer.appendChild(cancelBtn);
        footer.appendChild(applyBtn);
        content.appendChild(footer);

        this.modal.appendChild(content);
        document.body.appendChild(this.modal);

        // Backdrop click + Esc to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this._close();
        });
        this._escHandler = (e) => {
            if (e.key === 'Escape') this._close();
        };
        document.addEventListener('keydown', this._escHandler);

        // Focus the first input
        setTimeout(() => minInput.focus(), 50);
    }

    _close() {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
    }
}
