/**
 * LayoutDesigner - Step 2 of the export workflow.
 *
 * Full-screen modal: live preview center, left element editor, right
 * global settings panel. Pure UI over `exportState`. Drag/resize is
 * deferred to Task 5b; rendering is deferred to Tasks 6/7.
 */
import {
    PAGE_PRESETS,
    DPI_PRESETS,
    OUTPUT_FORMATS,
    applyOrientation,
    resetElementPositions,
    defaultElementPositions,
    buildFilename,
} from './ExportState.js';
import { assetUrl } from '../data/DataManager.js';

export class LayoutDesigner {
    constructor(exportState, layerManager) {
        this.exportState = exportState;
        this.layerManager = layerManager;
        this.modal = null;
        this.previewEl = null;
        this.leftPanel = null;
        this.rightPanel = null;
        this.selectedElementId = null;
        this.resolve = null;
        this.reject = null;
    }

    open() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this._render();
            this._escHandler = (e) => {
                if (e.key === 'Escape') this._cancel();
            };
            document.addEventListener('keydown', this._escHandler);
        });
    }

    _render() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal export-designer-modal active';

        const content = document.createElement('div');
        content.className = 'export-designer-content';

        // Top bar
        const topbar = document.createElement('div');
        topbar.className = 'export-designer-topbar';

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'btn btn-secondary';
        backBtn.textContent = '\u25C0 Back';
        backBtn.addEventListener('click', () => this._cancel());

        const title = document.createElement('div');
        title.className = 'export-designer-title';
        title.textContent = 'Layout Designer';

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn btn-secondary';
        resetBtn.textContent = 'Reset layout';
        resetBtn.addEventListener('click', () => this._resetLayout());

        const exportBtn = document.createElement('button');
        exportBtn.type = 'button';
        exportBtn.className = 'btn btn-primary';
        exportBtn.textContent = '\u2B07 Export';
        exportBtn.addEventListener('click', () => this._confirm());

        topbar.appendChild(backBtn);
        topbar.appendChild(title);
        topbar.appendChild(resetBtn);
        topbar.appendChild(exportBtn);

        // Body
        const body = document.createElement('div');
        body.className = 'export-designer-body';

        this.leftPanel = document.createElement('aside');
        this.leftPanel.className = 'export-designer-left';

        const center = document.createElement('main');
        center.className = 'export-designer-center';
        this.previewEl = document.createElement('div');
        this.previewEl.className = 'export-preview';
        center.appendChild(this.previewEl);

        this.rightPanel = document.createElement('aside');
        this.rightPanel.className = 'export-designer-right';

        body.appendChild(this.leftPanel);
        body.appendChild(center);
        body.appendChild(this.rightPanel);

        content.appendChild(topbar);
        content.appendChild(body);
        this.modal.appendChild(content);
        document.body.appendChild(this.modal);

        this._renderLeftPanel();
        this._renderRightPanel();
        this._renderPreview();
    }

    _renderPreview() {
        this.previewEl.textContent = '';
        const page = this.exportState.page;
        const mmToPx = Math.min(700 / page.widthMm, 500 / page.heightMm);

        const sheet = document.createElement('div');
        sheet.className = 'export-preview-sheet';
        sheet.style.width = (page.widthMm * mmToPx) + 'px';
        sheet.style.height = (page.heightMm * mmToPx) + 'px';
        sheet.dataset.mmToPx = String(mmToPx);

        for (const el of this.exportState.elements) {
            if (!el.visible) continue;
            const node = document.createElement('div');
            node.className = `export-el export-el-${el.type}`;
            node.style.left = (el.x * mmToPx) + 'px';
            node.style.top = (el.y * mmToPx) + 'px';
            node.style.width = (el.w * mmToPx) + 'px';
            node.style.height = (el.h * mmToPx) + 'px';
            node.dataset.elementId = el.id;
            if (this.selectedElementId === el.id) node.classList.add('selected');
            node.appendChild(this._renderElementContent(el));

            if (this.selectedElementId === el.id) {
                const handle = document.createElement('div');
                handle.className = 'export-el-resize';
                handle.addEventListener('mousedown', (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();

                    const liveSheet = this.previewEl.querySelector('.export-preview-sheet');
                    if (!liveSheet) return;
                    const mmToPxR = parseFloat(liveSheet.dataset.mmToPx);

                    const liveNode = node;
                    const startMouseX = ev.clientX;
                    const startMouseY = ev.clientY;
                    const startW = el.w;
                    const startH = el.h;

                    const onMove = (me) => {
                        const dwMm = (me.clientX - startMouseX) / mmToPxR;
                        const dhMm = (me.clientY - startMouseY) / mmToPxR;
                        const newW = Math.max(5, Math.min(this.exportState.page.widthMm - el.x, startW + dwMm));
                        const newH = Math.max(5, Math.min(this.exportState.page.heightMm - el.y, startH + dhMm));
                        el.w = newW;
                        el.h = newH;
                        el._customized = true;
                        liveNode.style.width = (newW * mmToPxR) + 'px';
                        liveNode.style.height = (newH * mmToPxR) + 'px';
                    };
                    const onUp = () => {
                        window.removeEventListener('mousemove', onMove);
                        window.removeEventListener('mouseup', onUp);
                        this._renderPreview();
                        this._renderLeftPanel();
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                });
                node.appendChild(handle);
            }

            node.addEventListener('mousedown', (ev) => {
                if (ev.target.classList && ev.target.classList.contains('export-el-resize')) return;
                ev.stopPropagation();
                ev.preventDefault();

                const elementId = el.id;
                this.selectedElementId = elementId;
                this._renderLeftPanel();
                this._renderPreview();

                const liveSheet = this.previewEl.querySelector('.export-preview-sheet');
                const liveNode = this.previewEl.querySelector(`[data-element-id="${elementId}"]`);
                if (!liveSheet || !liveNode) return;
                const mmToPxD = parseFloat(liveSheet.dataset.mmToPx);

                const startMouseX = ev.clientX;
                const startMouseY = ev.clientY;
                const startX = el.x;
                const startY = el.y;

                const onMove = (me) => {
                    const dxMm = (me.clientX - startMouseX) / mmToPxD;
                    const dyMm = (me.clientY - startMouseY) / mmToPxD;
                    const newX = Math.max(0, Math.min(this.exportState.page.widthMm - el.w, startX + dxMm));
                    const newY = Math.max(0, Math.min(this.exportState.page.heightMm - el.h, startY + dyMm));
                    el.x = newX;
                    el.y = newY;
                    el._customized = true;
                    liveNode.style.left = (newX * mmToPxD) + 'px';
                    liveNode.style.top = (newY * mmToPxD) + 'px';
                };
                const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                    this._renderPreview();
                    this._renderLeftPanel();
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
            });
            sheet.appendChild(node);
        }

        sheet.addEventListener('click', () => {
            this.selectedElementId = null;
            this._renderLeftPanel();
            this._renderPreview();
        });

        this.previewEl.appendChild(sheet);
    }

    _renderElementContent(el) {
        const inner = document.createElement('div');
        inner.className = 'export-el-inner';

        switch (el.type) {
            case 'map':
                inner.classList.add('export-el-map-placeholder');
                inner.textContent = '\u25A1 Map';
                return inner;
            case 'title': {
                inner.style.flexDirection = 'column';
                if (el.align) inner.style.textAlign = el.align;
                const primary = document.createElement('div');
                primary.textContent = el.text || '';
                if (el.fontSize) primary.style.fontSize = el.fontSize + 'pt';
                if (el.fontWeight) primary.style.fontWeight = String(el.fontWeight);
                primary.style.lineHeight = '1.1';
                inner.appendChild(primary);
                if (el.textGr) {
                    const secondary = document.createElement('div');
                    secondary.textContent = el.textGr;
                    secondary.style.fontSize = ((el.fontSize || 16) * 0.75) + 'pt';
                    secondary.style.fontWeight = '300';
                    secondary.style.color = '#555';
                    secondary.style.lineHeight = '1.1';
                    secondary.style.marginTop = '2px';
                    inner.appendChild(secondary);
                }
                return inner;
            }
            case 'subtitle':
            case 'date':
            case 'credits':
                inner.textContent = el.text || '';
                inner.style.fontSize = (el.fontSize || 8) + 'pt';
                inner.style.color = '#666';
                if (el.align) inner.style.textAlign = el.align;
                return inner;
            case 'legend':
                inner.classList.add('export-el-legend-placeholder');
                inner.textContent = el.title || 'Legend';
                return inner;
            case 'scalebar':
                inner.textContent = '\u2500\u2500\u2500\u2500 Scale';
                return inner;
            case 'north-arrow':
                inner.textContent = '\u25B2 N';
                return inner;
            case 'logo': {
                const img = document.createElement('img');
                img.src = assetUrl(el.src);
                img.alt = '';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                return img;
            }
            default:
                inner.textContent = el.type;
                return inner;
        }
    }

    _renderLeftPanel() {
        this.leftPanel.textContent = '';
        const h = document.createElement('h4');
        h.textContent = 'Element editor';
        this.leftPanel.appendChild(h);

        if (!this.selectedElementId) {
            const hint = document.createElement('p');
            hint.className = 'export-designer-hint';
            hint.textContent = 'Click an element in the preview to edit it.';
            this.leftPanel.appendChild(hint);
            return;
        }

        const el = this.exportState.elements.find((e) => e.id === this.selectedElementId);
        if (!el) return;

        const typeDiv = document.createElement('div');
        typeDiv.className = 'export-editor-type';
        typeDiv.textContent = el.type.toUpperCase();
        this.leftPanel.appendChild(typeDiv);

        const textTypes = ['title', 'subtitle', 'date', 'credits'];
        if (textTypes.includes(el.type)) {
            this.leftPanel.appendChild(this._makeTextField('Text', el.text || '', (v) => {
                el.text = v;
                this._renderPreview();
            }));
            if (el.type === 'title') {
                this.leftPanel.appendChild(this._makeTextField('Greek', el.textGr || '', (v) => {
                    el.textGr = v;
                    this._renderPreview();
                }));
            }
            this.leftPanel.appendChild(this._makeNumberField('Font size (pt)', el.fontSize || 12, 6, 48, (v) => {
                el.fontSize = v;
                this._renderPreview();
            }));
        }

        if (el.type === 'legend') {
            this.leftPanel.appendChild(this._makeTextField('Title', el.title || 'Legend', (v) => {
                el.title = v;
                this._renderPreview();
            }));
            this.leftPanel.appendChild(this._makeNumberField('Columns', el.columns || 1, 1, 4, (v) => {
                el.columns = v;
                this._renderPreview();
            }));
        }

        const grid = document.createElement('div');
        grid.className = 'export-editor-posgrid';
        const posFields = [
            { key: 'x', label: 'X (mm)', min: 0, max: 2000 },
            { key: 'y', label: 'Y (mm)', min: 0, max: 2000 },
            { key: 'w', label: 'W (mm)', min: 5, max: 2000 },
            { key: 'h', label: 'H (mm)', min: 5, max: 2000 },
        ];
        for (const f of posFields) {
            grid.appendChild(this._makeNumberField(f.label, el[f.key], f.min, f.max, (v) => {
                el[f.key] = v;
                el._customized = true;
                this._renderPreview();
            }));
        }
        this.leftPanel.appendChild(grid);

        const btns = document.createElement('div');
        btns.className = 'export-editor-btns';

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn btn-secondary';
        resetBtn.textContent = 'Reset';
        resetBtn.addEventListener('click', () => {
            // Reset ONLY the currently selected element back to its default
            // position/size for the current page. Other elements are untouched.
            const defaults = defaultElementPositions(this.exportState.page);
            const d = defaults[el.id];
            if (d) {
                el.x = d.x;
                el.y = d.y;
                el.w = d.w;
                el.h = d.h;
            }
            el._customized = false;
            this._renderPreview();
            this._renderLeftPanel();
        });
        btns.appendChild(resetBtn);

        if (!el.mandatory) {
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'btn btn-danger';
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', () => {
                el.visible = false;
                this.selectedElementId = null;
                this._renderPreview();
                this._renderLeftPanel();
                this._renderRightPanel();
            });
            btns.appendChild(delBtn);
        }
        this.leftPanel.appendChild(btns);
    }

    _makeTextField(label, value, onChange) {
        const wrap = document.createElement('label');
        wrap.className = 'export-editor-field';
        const lbl = document.createElement('span');
        lbl.textContent = label;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.addEventListener('input', (e) => onChange(e.target.value));
        wrap.appendChild(lbl);
        wrap.appendChild(input);
        return wrap;
    }

    _makeNumberField(label, value, min, max, onChange) {
        const wrap = document.createElement('label');
        wrap.className = 'export-editor-field';
        const lbl = document.createElement('span');
        lbl.textContent = label;
        const input = document.createElement('input');
        input.type = 'number';
        input.value = String(value);
        input.min = String(min);
        input.max = String(max);
        input.step = '1';
        input.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(v);
        });
        wrap.appendChild(lbl);
        wrap.appendChild(input);
        return wrap;
    }

    _renderRightPanel() {
        this.rightPanel.textContent = '';
        this.rightPanel.appendChild(this._sectionHeader('Page'));
        this.rightPanel.appendChild(this._makePageSelect());
        this.rightPanel.appendChild(this._makeOrientationToggle());
        this.rightPanel.appendChild(this._makeCustomSizeFields());

        this.rightPanel.appendChild(this._sectionHeader('Resolution'));
        this.rightPanel.appendChild(this._makeDpiSelect());

        this.rightPanel.appendChild(this._sectionHeader('Format'));
        this.rightPanel.appendChild(this._makeFormatSelect());
        this.rightPanel.appendChild(this._makePersonField());
        this.rightPanel.appendChild(this._makeFilenamePreview());

        this.rightPanel.appendChild(this._sectionHeader('Elements'));
        this.rightPanel.appendChild(this._makeElementToggles());
    }

    _sectionHeader(text) {
        const h = document.createElement('h4');
        h.className = 'export-designer-section';
        h.textContent = text;
        return h;
    }

    _makePageSelect() {
        const wrap = document.createElement('label');
        wrap.className = 'export-editor-field';
        const lbl = document.createElement('span');
        lbl.textContent = 'Size';
        const sel = document.createElement('select');
        for (const name of Object.keys(PAGE_PRESETS)) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            if (name === this.exportState.page.preset) opt.selected = true;
            sel.appendChild(opt);
        }
        const customOpt = document.createElement('option');
        customOpt.value = 'Custom';
        customOpt.textContent = 'Custom';
        if (this.exportState.page.preset === 'Custom') customOpt.selected = true;
        sel.appendChild(customOpt);
        sel.addEventListener('change', () => {
            const preset = sel.value;
            this.exportState.page.preset = preset;
            if (preset !== 'Custom') {
                const p = PAGE_PRESETS[preset];
                const o = this.exportState.page.orientation;
                const dims = applyOrientation(p.widthMm, p.heightMm, o);
                this.exportState.page.widthMm = dims.widthMm;
                this.exportState.page.heightMm = dims.heightMm;
                resetElementPositions(this.exportState, true);
            }
            this._renderRightPanel();
            this._renderPreview();
        });
        wrap.appendChild(lbl);
        wrap.appendChild(sel);
        return wrap;
    }

    _makeOrientationToggle() {
        const wrap = document.createElement('label');
        wrap.className = 'export-editor-field';
        const lbl = document.createElement('span');
        lbl.textContent = 'Orientation';
        const sel = document.createElement('select');
        for (const o of ['landscape', 'portrait']) {
            const opt = document.createElement('option');
            opt.value = o;
            opt.textContent = o.charAt(0).toUpperCase() + o.slice(1);
            if (o === this.exportState.page.orientation) opt.selected = true;
            sel.appendChild(opt);
        }
        sel.addEventListener('change', () => {
            this.exportState.page.orientation = sel.value;
            const dims = applyOrientation(
                this.exportState.page.widthMm,
                this.exportState.page.heightMm,
                sel.value,
            );
            this.exportState.page.widthMm = dims.widthMm;
            this.exportState.page.heightMm = dims.heightMm;
            resetElementPositions(this.exportState, true);
            this._renderRightPanel();
            this._renderPreview();
        });
        wrap.appendChild(lbl);
        wrap.appendChild(sel);
        return wrap;
    }

    _makeCustomSizeFields() {
        const wrap = document.createElement('div');
        wrap.className = 'export-editor-custom-size';
        if (this.exportState.page.preset !== 'Custom') return wrap;
        wrap.appendChild(this._makeNumberField('Width (mm)', this.exportState.page.widthMm, 50, 2000, (v) => {
            this.exportState.page.widthMm = v;
            resetElementPositions(this.exportState, true);
            this._renderPreview();
        }));
        wrap.appendChild(this._makeNumberField('Height (mm)', this.exportState.page.heightMm, 50, 2000, (v) => {
            this.exportState.page.heightMm = v;
            resetElementPositions(this.exportState, true);
            this._renderPreview();
        }));
        return wrap;
    }

    _makeDpiSelect() {
        const wrap = document.createElement('label');
        wrap.className = 'export-editor-field';
        const lbl = document.createElement('span');
        lbl.textContent = 'DPI';
        const sel = document.createElement('select');
        for (const [name, dpi] of Object.entries(DPI_PRESETS)) {
            const opt = document.createElement('option');
            opt.value = String(dpi);
            opt.textContent = `${name} (${dpi})`;
            if (dpi === this.exportState.page.dpi) opt.selected = true;
            sel.appendChild(opt);
        }
        sel.addEventListener('change', () => {
            this.exportState.page.dpi = parseInt(sel.value, 10);
            this._renderRightPanel();
        });
        wrap.appendChild(lbl);
        wrap.appendChild(sel);
        return wrap;
    }

    _makeFormatSelect() {
        const wrap = document.createElement('label');
        wrap.className = 'export-editor-field';
        const lbl = document.createElement('span');
        lbl.textContent = 'Format';
        const sel = document.createElement('select');
        for (const f of OUTPUT_FORMATS) {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f.toUpperCase();
            if (f === this.exportState.output.format) opt.selected = true;
            sel.appendChild(opt);
        }
        sel.addEventListener('change', () => {
            this.exportState.output.format = sel.value;
            this._renderRightPanel();
        });
        wrap.appendChild(lbl);
        wrap.appendChild(sel);
        return wrap;
    }

    _makePersonField() {
        const wrap = document.createElement('label');
        wrap.className = 'export-editor-field';
        const lbl = document.createElement('span');
        lbl.textContent = 'Person';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.exportState.output.person;
        input.addEventListener('input', (e) => {
            this.exportState.output.person = e.target.value.trim() || 'NKUA';
            localStorage.setItem('naxos_export_person', this.exportState.output.person);
            this._renderRightPanel();
        });
        wrap.appendChild(lbl);
        wrap.appendChild(input);
        return wrap;
    }

    _makeFilenamePreview() {
        const wrap = document.createElement('div');
        wrap.className = 'export-filename-preview';
        wrap.textContent = buildFilename(this.exportState);
        return wrap;
    }

    _makeElementToggles() {
        const wrap = document.createElement('div');
        wrap.className = 'export-element-toggles';
        for (const el of this.exportState.elements) {
            if (el.mandatory) continue;
            if (el.type === 'map') continue;
            const label = document.createElement('label');
            label.className = 'export-element-toggle';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = el.visible;
            cb.addEventListener('change', () => {
                el.visible = cb.checked;
                this._renderPreview();
            });
            const text = document.createElement('span');
            text.textContent = el.type.charAt(0).toUpperCase() + el.type.slice(1);
            label.appendChild(cb);
            label.appendChild(text);
            wrap.appendChild(label);
        }
        return wrap;
    }

    _resetLayout() {
        for (const el of this.exportState.elements) {
            el._customized = false;
            el.visible = true;
        }
        resetElementPositions(this.exportState, false);
        this.selectedElementId = null;
        this._renderPreview();
        this._renderLeftPanel();
        this._renderRightPanel();
    }

    _confirm() {
        this._close();
        this.resolve(this.exportState);
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
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
    }
}
