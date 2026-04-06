# Print / Export Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a professional print/export feature to the Naxos WebGIS that produces publication-quality cartographic outputs (PDF, PNG, JPEG, SVG) with a two-step wizard (area selection → layout designer) preserving all current symbology and visible-class state.

**Architecture:** Five new ES modules under `js/export/` form a pipeline: `ExportController` orchestrates a workflow state machine; `AreaSelector` provides Step 1 modal + Leaflet drawing; `LayoutDesigner` is a full-screen Step 2 modal that edits an `exportState` data model; `PrintMapRenderer` uses a hidden offscreen Leaflet instance at the target DPI to produce a white-background map canvas with all SVG patterns preserved; `ExportEngine` composes the final file (PDF via jsPDF, raster via canvas, SVG via primitives). **No basemap is rendered — always white background.**

**Tech Stack:**
- Vanilla ES6 modules (no build step)
- Leaflet 1.9.4 (already loaded)
- jsPDF 2.5 (new, CDN)
- Existing modules: `SvgPatterns`, `LayerManager`, `DataManager`, `EventBus`

---

## Verification approach

This is a static browser-only web app with no automated test suite. **Each task uses manual browser verification** — the worker loads `http://localhost:8080`, performs the listed actions, and confirms the expected outcome before committing.

Run a local server from the project root between tasks:
```bash
cd "c:/Users/alexl/Downloads/Naxos geomorphological map/naxos-geomorphological-webgis"
python -m http.server 8080
```

---

## File structure

```
js/export/
├── ExportState.js         [Task 1]  Factory + mutation helpers for exportState
├── ExportController.js    [Task 2]  Workflow orchestrator + state machine
├── AreaSelector.js        [Task 3,4] Step-1 modal + Leaflet drawing handler
├── LayoutDesigner.js      [Task 5]  Step-2 modal (preview + side panels + drag/resize)
├── PrintMapRenderer.js    [Task 6]  Offscreen Leaflet → canvas
└── ExportEngine.js        [Task 7]  Format dispatch (PDF/PNG/JPEG/SVG compositors)

js/data/LayerConfig.js     [Task 1]  + re-export PAGE_PRESETS / DPI_PRESETS
index.html                 [Task 2]  + header button, + jsPDF CDN
js/main.js                 [Task 2]  + ExportController init
styles.css                 [Tasks 3,5,8,9] modal + designer + mobile + overlay styles
```

Module boundaries:
- **`ExportState.js`** — pure data model, no DOM, no Leaflet
- **`ExportController.js`** — only module that talks to LayerManager/MapManager
- **`AreaSelector.js`** — self-contained Step-1 UI + draw handler
- **`LayoutDesigner.js`** — self-contained Step-2 UI, operates only on exportState
- **`PrintMapRenderer.js`** — only module that creates a second Leaflet instance
- **`ExportEngine.js`** — only module that knows about output formats

---

## Task 1: Data model — `ExportState` + presets

**Files:**
- Create: `js/export/ExportState.js`
- Modify: `js/data/LayerConfig.js` (append re-exports)

- [ ] **Step 1: Create `js/export/ExportState.js`**

This module owns the shape of the exportState data passed between modules. All dimensions are in millimeters; pixels are computed at render time via `mm × dpi / 25.4`.

Required exports: `PAGE_PRESETS`, `DPI_PRESETS`, `OUTPUT_FORMATS`, `applyOrientation(w, h, orientation)`, `defaultElementPositions(page)`, `createExportState({ person })`, `resetElementPositions(state, onlyUncustomized)`, `buildFilename(state)`.

Core structure of the `exportState` object:

```javascript
{
    area: { type, bbox: [w,s,e,n], shape: geojsonOrNull },
    page: {
        preset: 'A4',
        widthMm: 297,
        heightMm: 210,
        orientation: 'landscape',
        dpi: 200,
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
    },
    output: { format: 'pdf', quality: 0.92, person: 'NKUA' },
    layers: {},   // layerId -> Set<entryIndex> of VISIBLE entries
    elements: [ /* array of element objects, see below */ ],
    status: 'idle',
}
```

Default element list (10 entries, all created inside `createExportState()`):

| id | type | mandatory | extra props |
|----|------|-----------|-------------|
| `el_map` | `map` | ✅ | — |
| `el_logo_nkua` | `logo` | ✅ | `src: 'images/nkua_logo_en.jpg'` |
| `el_logo_eagme` | `logo` | ✅ | `src: 'images/eagme_logo_en.png'` |
| `el_title` | `title` | — | `text`, `textGr`, `fontSize: 16`, `fontWeight: 600`, `align: 'center'` |
| `el_subtitle` | `subtitle` | — | `text: 'Naxos Sheet · 1:50,000'`, `fontSize: 10`, `align: 'center'` |
| `el_legend` | `legend` | — | `title: 'Legend'`, `titleGr: 'Υπόμνημα'`, `fontSize: 9`, `columns: 1` |
| `el_scale` | `scalebar` | — | `unit: 'metric'` |
| `el_north` | `north-arrow` | — | `style: 'simple'` |
| `el_date` | `date` | — | `text: 'Generated YYYY-MM-DD'`, `fontSize: 8` |
| `el_credits` | `credits` | ✅ | `text: 'NKUA · EAGME · …'`, `fontSize: 7`, `align: 'center'` |

`PAGE_PRESETS` must include: `A0 (841×1189)`, `A1 (594×841)`, `A2 (420×594)`, `A3 (297×420)`, `A4 (210×297)`, `A5 (148×210)`, `Letter (215.9×279.4)`, `Legal (215.9×355.6)`, `Tabloid (279.4×431.8)`.

`DPI_PRESETS`: `Screen: 96`, `Print: 200`, `High: 300`.

`OUTPUT_FORMATS`: `['pdf', 'png', 'jpeg', 'svg']`.

`defaultElementPositions(page)` must compute positions assuming:
- 10 mm page margin
- 18 mm header band reserved at top
- Legend column on the right: `max(60, W*0.3)` wide
- 8 mm credits strip at bottom
- Map fills the remaining inner area

`buildFilename(state)` returns: `Naxos_Geomorphological_Map-{SanitizedPerson}-{YYYYMMDD}.{ext}` where `SanitizedPerson` strips whitespace → underscore and removes non-`[A-Za-z0-9_]` characters, defaulting to `'NKUA'` if empty.

`resetElementPositions(state, onlyUncustomized)` — when `onlyUncustomized` is true, only resets elements that don't have `_customized: true` set on them.

- [ ] **Step 2: Append to `js/data/LayerConfig.js`**

Append at the end of the file:

```javascript

// Re-exports so consumers importing from LayerConfig still find these.
export { PAGE_PRESETS, DPI_PRESETS, OUTPUT_FORMATS } from '../export/ExportState.js';
```

- [ ] **Step 3: Manual verification**

Start the local server and open `http://localhost:8080`. In DevTools console run:

```javascript
import('./js/export/ExportState.js').then(m => {
    const s = m.createExportState();
    console.log('Elements:', s.elements.length);
    console.log('Filename:', m.buildFilename(s));
    console.log('Page:', s.page);
    console.log('Mandatory:', s.elements.filter(e => e.mandatory).map(e => e.id));
});
```

Expected:
- `Elements: 10`
- `Filename: Naxos_Geomorphological_Map-NKUA-YYYYMMDD.pdf` (today's date)
- `Page: { preset: 'A4', widthMm: 297, heightMm: 210, orientation: 'landscape', dpi: 200, margins: {...} }`
- `Mandatory: ['el_map', 'el_logo_nkua', 'el_logo_eagme', 'el_credits']`

- [ ] **Step 4: Commit**

```bash
git add js/export/ExportState.js js/data/LayerConfig.js
git commit -m "feat(export): add ExportState data model + page/DPI presets"
```

---

## Task 2: Header Export button + jsPDF + `ExportController` skeleton

**Files:**
- Modify: `index.html`
- Create: `js/export/ExportController.js`
- Modify: `js/main.js`
- Modify: `styles.css`

- [ ] **Step 1: Add jsPDF CDN to `index.html` `<head>`**

Find the existing Supabase/Leaflet script tags in `<head>` and add after them:

```html
    <script src="https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
```

- [ ] **Step 2: Add the Export button inside `.header-right` in `index.html`**

Inside `<div class="header-right">…</div>`, insert BEFORE the existing `#right-sidebar-toggle` button:

```html
                <button id="export-btn" class="header-toggle-btn header-export-btn" aria-label="Export / Print" title="Export / Print">&#128229;</button>
```

- [ ] **Step 3: Create `js/export/ExportController.js`**

Requirements for this skeleton:

- Class `ExportController` with constructor `(eventBus, stateManager, layerManager, mapManager)`.
- Method `init()` — looks up `#export-btn`, attaches click handler that calls `this.openWorkflow()`.
- Method `openWorkflow()` — reads saved person from `localStorage.getItem('naxos_export_person') || 'NKUA'`, creates a fresh `exportState` via `createExportState({ person })`, seeds `exportState.layers` from the live LayerManager state via `_snapshotVisibleLayers()`, logs the state and shows a placeholder `console.log` (no alert — the wizard modals come in Tasks 3 and 5).
- Method `_snapshotVisibleLayers()` — iterates `this.layerManager.layers` (the Map of layerId → Leaflet layer) and for each layer, builds a `Set<entryIndex>` of visible entries by consulting `this.layerManager._hiddenEntries` (which stores `Map<layerId, Set<hiddenEntryIndex>>`). If `_hiddenEntries` has no entry for that layer, all indices from 0 to `legendEntries.length - 1` are visible. Must read layer configs from a module-level `_LAYERS_CACHE` variable (populated by main.js at init).
- Also export a `_setLayersCache(layers)` function from the module that populates the cache.

Import `createExportState` from `./ExportState.js`.

- [ ] **Step 4: Wire `ExportController` into `js/main.js`**

In the imports section:

```javascript
import { ExportController, _setLayersCache } from './export/ExportController.js';
```

Add `this.exportController = null;` to the constructor field initializers.

After the `safeRun('ModalManager', …)` block, add:

```javascript
        await safeRun('ExportController', async () => {
            const { LAYERS } = await import('./data/LayerConfig.js');
            _setLayersCache(LAYERS);
            this.exportController = new ExportController(
                this.eventBus,
                this.stateManager,
                this.layerManager,
                this.mapManager,
            );
            this.exportController.init();
        });
```

- [ ] **Step 5: Add button styles to `styles.css`**

Append (or place near the existing `.header-toggle-btn` rule):

```css
.header-export-btn { font-size: 15px; }
.header-export-btn:hover { background: var(--background-secondary); }
```

- [ ] **Step 6: Manual verification**

Reload `http://localhost:8080`. Confirm:
- The `📥` button appears in the header, between the EAGME logo and the `ℹ` info button
- Hovering shows the tooltip "Export / Print"
- Clicking logs `ExportController: workflow opened` to the console with a populated exportState object
- The `exportState.layers` object has one entry per loaded layer, each a Set of visible entry indices
- `ExportController: initialized` appears in the console on page load
- No red errors in the console

- [ ] **Step 7: Commit**

```bash
git add index.html js/main.js js/export/ExportController.js styles.css
git commit -m "feat(export): header button, jsPDF CDN, ExportController skeleton"
```

---

## Task 3: `AreaSelector` — Step 1 modal (whole-island + current-view)

**Files:**
- Create: `js/export/AreaSelector.js`
- Modify: `js/export/ExportController.js`
- Modify: `styles.css`

Draw-on-map support is deferred to Task 4 to keep this task bite-sized.

- [ ] **Step 1: Create `js/export/AreaSelector.js`**

Requirements:

- Export class `AreaSelector`. Constructor takes `(map)` — the live Leaflet map instance.
- Class-level constant `WHOLE_ISLAND_BBOX = [25.335, 36.920, 25.610, 37.205]` (matches the Naxos perimeter).
- Method `open()` — returns a Promise that resolves with `{ type, bbox, shape }` when the user confirms, or rejects with `new Error('cancelled')` on cancel.
- Method `_render()` — builds a modal with class `modal export-area-modal active` containing:
  - Title: "Export area · Περιοχή εξαγωγής"
  - Subtitle: "Choose which area to include in the exported map."
  - Three radio options inside a `<form>`: `Whole Naxos island / Όλη η νήσος` (default checked), `Current map view / Τρέχουσα προβολή`, `Draw on map… / Σχεδιάστε στον χάρτη…` (disabled in this task with a hint "(coming in next update)").
  - Footer with Cancel + Continue ▶ buttons.
- Method `_confirm(type)`:
  - `whole-island` → resolves with `{ type, bbox: [...WHOLE_ISLAND_BBOX], shape: null }`
  - `current-view` → calls `this.map.getBounds()` and resolves with `{ type, bbox: [getWest, getSouth, getEast, getNorth], shape: null }`
- Method `_cancel()` — closes the modal, rejects with `cancelled`.
- Method `_close()` — removes the modal element from the DOM.

**All DOM construction must use `document.createElement` and `appendChild`. Never use `innerHTML` or `document.write`.**

- [ ] **Step 2: Wire `AreaSelector` into `ExportController.openWorkflow()`**

Convert `openWorkflow` to an `async` method (if not already) and replace the placeholder log with:

```javascript
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
            // TODO: open Step-2 modal (Task 5)
        } catch (err) {
            if (err.message === 'cancelled') {
                this.exportState.status = 'idle';
                console.log('ExportController: workflow cancelled by user');
            } else {
                this.exportState.status = 'error';
                console.error('ExportController: workflow error', err);
            }
        }
    }
```

- [ ] **Step 3: Append modal styles to `styles.css`**

Add styles for:
- `.export-area-modal .modal-content` — max-width 460px, 90vw, spacious padding
- `.export-area-title` — 16px / 600 weight / right padding for close button
- `.export-area-sub` — 12px / secondary color / bottom margin
- `.export-area-options` — flex column, gap spacing-sm
- `.export-area-option` — flex row, padded border, rounded, hover background
- `.export-area-option.disabled` — 0.5 opacity, not-allowed cursor
- `.export-area-option-text` — 13px / 500 weight
- `.export-area-option-gr` — 11px / 300 weight / secondary color
- `.export-area-option-hint` — 10px / italic / auto-left-margin
- `.export-area-footer` — flex row, justify flex-end, top border
- `.btn-secondary` — white background with border
- `.btn-primary` — black background, white text (matches the `--primary-color`)

- [ ] **Step 4: Manual verification**

Reload. Click the `📥` header button. Confirm:
- A centered modal appears with the title "Export area · Περιοχή εξαγωγής"
- Three radio options visible; "Whole Naxos island" is pre-selected
- "Draw on map…" is dimmed and unselectable
- Clicking Cancel closes the modal and logs `workflow cancelled by user`
- Reopening, picking "Whole Naxos island", clicking Continue → logs `area selected: { type: 'whole-island', bbox: [25.335, 36.92, 25.61, 37.205], shape: null }`
- Reopening, picking "Current map view", clicking Continue → logs the bbox matching the current viewport

- [ ] **Step 5: Commit**

```bash
git add js/export/AreaSelector.js js/export/ExportController.js styles.css
git commit -m "feat(export): Step-1 area selector modal (whole-island, current-view)"
```

---

## Task 4: Draw-on-map modes (rectangle, circle, polygon)

**Files:**
- Modify: `js/export/AreaSelector.js`
- Modify: `styles.css`

- [ ] **Step 1: Enable the `draw` radio option in `_render`**

Remove the `disabled: true` flag from the `draw` option and remove the "(coming in next update)" hint. Add a nested sub-options container that's hidden by default and shown only when `draw` is the selected main option. Sub-options are three radios: `Rectangle / Ορθογώνιο` (default), `Circle / Κύκλος`, `Polygon / Πολύγωνο`. The container responds to `change` events on the main form.

- [ ] **Step 2: Extend `_confirm(type)` to handle the `draw` case**

When `type === 'draw'`, read the selected `draw-shape` radio value from the modal, call `this._close()`, then call `this._startDrawing(shape)`. The promise stays open — it will resolve when drawing finishes.

- [ ] **Step 3: Implement `_startDrawing(shape)` on the `AreaSelector` class**

Behavior:
- Show a floating banner via `_showDrawBanner(shape)` with instructions per shape type
- Set map cursor to `crosshair` and disable `map.doubleClickZoom`
- Subscribe to `map.on('click')`, `map.on('mousemove')`, and (for polygon) `map.on('dblclick')`
- **Rectangle:** first click stores the corner; subsequent `mousemove` updates a dashed orange `L.rectangle` preview; second click commits and resolves
- **Circle:** first click stores the center; `mousemove` updates a dashed orange `L.circle` with radius = `map.distance(center, current)`; second click commits and resolves
- **Polygon:** each click pushes a vertex; `mousemove` updates a dashed `L.polyline` preview through all vertices + current cursor; `dblclick` requires at least 3 vertices, then commits and resolves
- On commit, call `_resolveBbox(type, bounds, extra)` where `bounds` is `L.latLngBounds` and `extra` carries shape-specific data (`center + radius` for circle, `points` array for polygon, nothing for rectangle)
- Always remove listeners, restore cursor, remove the banner, remove the temp layer, re-enable `doubleClickZoom`

- [ ] **Step 4: Implement `_resolveBbox(type, bounds, extra)` and `_showDrawBanner(shape)`**

`_resolveBbox` builds a GeoJSON-ish `shape` object:
- `Rectangle` → `{ type: 'Rectangle', coordinates: bbox }`
- `Circle` → `{ type: 'Circle', center: [lng, lat], radius }`
- `Polygon` → `{ type: 'Polygon', coordinates: [points.map(p => [lng, lat])] }`

Then resolves with `{ type, bbox: [w, s, e, n], shape }`.

`_showDrawBanner(shape)` creates a fixed-position div with id `export-draw-banner` containing the instruction string and appends it to document.body. It also installs a document-level `keydown` listener that cancels on Escape (unsubscribes all map listeners, calls `_hideDrawBanner`, rejects the promise with `cancelled`, restores cursor).

`_hideDrawBanner()` removes the banner element and detaches the keydown listener.

**All DOM construction must use `createElement` + `textContent`. No innerHTML.**

- [ ] **Step 5: Append draw-mode styles to `styles.css`**

Add:
- `.export-draw-subopts` — flex column, left-margin, left-border-accent, hidden by default
- `.export-draw-subopt` — flex row, font-size 12px, cursor pointer
- `.export-draw-subopt-gr` — 10px, secondary color
- `.export-draw-banner` — fixed near the top of the viewport, orange background `#ff6600`, white text, rounded, shadow, z-index 9999, pointer-events: none

- [ ] **Step 6: Manual verification**

Reload, open the export modal. Confirm:
- Picking "Draw on map…" reveals the three shape sub-radios
- Rectangle flow: modal closes → orange banner appears at top → cursor is crosshair → click once to set corner → dashed orange rectangle follows the mouse → click again to commit → logs the bbox
- Circle flow: same pattern but click sets center, second click commits on the radius edge
- Polygon flow: each click adds a vertex, dashed polyline follows, double-click (requires ≥3 vertices) commits
- Escape during drawing cleans up and logs `workflow cancelled by user`

- [ ] **Step 7: Commit**

```bash
git add js/export/AreaSelector.js styles.css
git commit -m "feat(export): draw-on-map modes (rectangle, circle, polygon)"
```

---

## Task 5: `LayoutDesigner` — Step 2 full-screen modal

This is the biggest task. Split into two commits: **5a** static structure + panels, **5b** drag/resize interactivity.

### Task 5a: Static preview + panels

**Files:**
- Create: `js/export/LayoutDesigner.js`
- Modify: `js/export/ExportController.js`
- Modify: `styles.css`

- [ ] **Step 1: Create `js/export/LayoutDesigner.js`**

Export class `LayoutDesigner`. Constructor `(exportState, layerManager)`. Method `open()` returns a Promise that resolves with the mutated exportState when the user clicks Export, or rejects with `cancelled` on Back/close.

Modal structure (built entirely via createElement + appendChild):

```
.modal.export-designer-modal.active
  .export-designer-content
    .export-designer-topbar
      [◀ Back]   .export-designer-title   [Reset layout]   [⬇ Export]
    .export-designer-body
      aside.export-designer-left   (element editor)
      main.export-designer-center
        .export-preview
          .export-preview-sheet  (page outline with .export-el children)
      aside.export-designer-right  (page/format/elements panels)
```

**Preview rendering (`_renderPreview`)**:
- Computes `mmToPx` that fits the page inside max 700×500 CSS px
- Creates a white sheet div with explicit CSS width/height in px
- Stores `mmToPx` on `sheet.dataset.mmToPx` for drag handlers in Task 5b
- For each visible element, creates a `.export-el.export-el-{type}` div positioned absolutely inside the sheet using `x/y/w/h × mmToPx`
- The `selectedElementId === el.id` adds `.selected` class
- Clicking an element (via `addEventListener('click')`) selects it and re-renders
- Clicking the sheet background deselects
- Each element's inner content is a placeholder:
  - `map` → text `□ Map` on gray background
  - `title` → `el.text` with inline font-size/weight/align styles
  - `subtitle`/`date`/`credits` → `el.text` smaller, secondary color
  - `legend` → text `Legend`, dashed border
  - `scalebar` → `──── Scale`
  - `north-arrow` → `▲ N`
  - `logo` → `<img>` with `src = assetUrl(el.src)` (import `assetUrl` from `../data/DataManager.js`)

**Left panel (`_renderLeftPanel`)** — per-element editor:
- Empty state: "Click an element in the preview to edit it."
- When an element is selected, shows:
  - Element type header (uppercase)
  - Text-editable types (`title`, `subtitle`, `date`, `credits`): Text input; for `title` also a Greek text input; and a font-size number input (6–48)
  - `legend` type: Title input, Columns input (1–4)
  - All types: X / Y / W / H number fields (mm), changing any sets `el._customized = true`
  - Reset button: sets `_customized = false`, calls `resetElementPositions(state, false)`, re-renders
  - Delete button (only for non-mandatory): sets `el.visible = false`, deselects

**Right panel (`_renderRightPanel`)** — global settings:
- Page section: Size `<select>` with all `PAGE_PRESETS` keys + `'Custom'`, Orientation `<select>` (`landscape`/`portrait`), plus two visible Width/Height number inputs when preset is `Custom`
- Resolution section: DPI `<select>` with `Screen (96)` / `Print (200)` / `High (300)`
- Format section: Format `<select>` with `PDF/PNG/JPEG/SVG`, Person text input, and a live filename preview div styled as a monospace pill
- Elements section: Checkbox toggles for each non-mandatory, non-map element (changes `el.visible`)

Page/orientation changes must:
1. Update `page.widthMm`/`heightMm` via `applyOrientation()`
2. Call `resetElementPositions(state, true)` (only uncustomized elements)
3. Re-render the right panel (for custom size inputs visibility) and the preview

Person input must write `localStorage.setItem('naxos_export_person', value)` on each change.

Top bar buttons:
- **Back** → `_cancel()` → closes modal → rejects with `cancelled`
- **Reset layout** → sets all `el._customized = false`, all `el.visible = true`, calls `resetElementPositions(state, false)`, re-renders everything
- **Export** → `_confirm()` → closes modal → resolves with `this.exportState`

- [ ] **Step 2: Wire `LayoutDesigner` into `ExportController.openWorkflow()`**

After the `const area = await selector.open()` line, add:

```javascript
            const { LayoutDesigner } = await import('./LayoutDesigner.js');
            const designer = new LayoutDesigner(this.exportState, this.layerManager);
            const finalState = await designer.open();
            this.exportState = finalState;
            this.exportState.status = 'rendering';
            console.log('ExportController: ready to render', finalState);
            // TODO: render + export (Tasks 6, 7)
```

Wrap it in the same try/catch as the AreaSelector call so cancel is handled.

- [ ] **Step 3: Append designer styles to `styles.css`**

Required selectors (match names used in the module above):
- `.export-designer-modal` — full-screen override
- `.export-designer-content` — 100vw × 100vh, column flex, overflow hidden
- `.export-designer-topbar` — flex row, secondary background, bottom border, spacing
- `.export-designer-title` — centered, uppercase 13px 600
- `.export-designer-body` — CSS grid `260px 1fr 280px`, flex: 1, min-height: 0
- `.export-designer-left`, `.export-designer-right` — padded, overflow-y auto, side borders
- `.export-designer-center` — gray background, flex center, overflow auto, padding
- `.export-preview-sheet` — white, box-shadow, position: relative
- `.export-el` — absolute, dashed border, overflow hidden, cursor pointer
- `.export-el:hover` — blue border color
- `.export-el.selected` — solid 2px blue border
- `.export-el-inner` — full width/height flex center, Inter font
- `.export-el-map-placeholder`, `.export-el-legend-placeholder` — distinct background/border hints
- `.export-designer-section`, `.export-editor-type` — section/type headers
- `.export-editor-field` — flex column label wrapper with 10px label + input
- `.export-editor-field input`, `.export-editor-field select` — padded, bordered, small
- `.export-editor-posgrid` — two-column grid for X/Y/W/H
- `.export-editor-btns` — flex row for Reset/Delete
- `.btn-danger` — red button
- `.export-filename-preview` — monospace background pill
- `.export-element-toggles` — flex column
- `.export-element-toggle` — flex row 12px
- `.export-designer-hint` — italic 11px secondary-color

- [ ] **Step 4: Manual verification**

Reload. Click `📥` → Whole island → Continue. Confirm:
- Full-screen Layout Designer modal opens
- Top bar: Back / "LAYOUT DESIGNER" title / Reset layout / Export
- Center shows a white A4 landscape page with placeholders for map, title, subtitle, both logos, legend, scale, north arrow, date, credits
- Left panel: "Click an element in the preview to edit it"
- Right panel: Page A4 / Landscape / DPI Print 200 / Format PDF / Person NKUA / live filename preview / element toggles
- Clicking an element selects it (blue outline) and the left panel switches to its editor
- Editing text, font size, or X/Y/W/H updates the preview live
- Changing page size (A4 → A3) rescales the preview and reflows default element positions
- Changing orientation (landscape → portrait) swaps width/height
- Toggling an element in the right panel hides/shows it in the preview
- Reset layout restores defaults
- Back logs `workflow cancelled by user`
- Export logs `ready to render` with the exportState

- [ ] **Step 5: Commit**

```bash
git add js/export/LayoutDesigner.js js/export/ExportController.js styles.css
git commit -m "feat(export): Step-2 Layout Designer modal (static preview + panels)"
```

### Task 5b: Drag and resize interactivity

**Files:**
- Modify: `js/export/LayoutDesigner.js`
- Modify: `styles.css`

- [ ] **Step 1: Add a mousedown drag handler on each element**

Replace the single `click` listener on each `.export-el` with a `mousedown` listener that:
1. Ignores events on the resize handle (`ev.target.classList.contains('export-el-resize')`)
2. Selects the element and re-renders the left panel
3. Reads `mmToPx` from `sheet.dataset.mmToPx`
4. Stores `startMouseX/Y` from the event and `startX/Y` from the element
5. Installs a window-level `mousemove` listener that computes delta in mm, updates `el.x`/`el.y` clamped to `[0, pageWidth - el.w]` / `[0, pageHeight - el.h]`, sets `el._customized = true`, re-renders preview
6. Installs a window-level `mouseup` listener that removes both listeners and re-renders the left panel

Pressing Escape mid-drag is optional but nice-to-have.

- [ ] **Step 2: Add a resize handle div when the element is selected**

Inside the element loop, only when `this.selectedElementId === el.id`, append a child `div` with class `export-el-resize` AFTER the content div. Attach its own `mousedown` listener that:
1. Stops propagation (so the drag handler doesn't fire)
2. Reads starting W/H, installs window-level `mousemove` and `mouseup` listeners
3. On mousemove, updates `el.w`/`el.h` clamped to `[5, pageWidth - el.x]` / `[5, pageHeight - el.y]`, sets `_customized`, re-renders
4. On mouseup, removes listeners, re-renders the left panel

- [ ] **Step 3: Add resize handle styles**

Append to `styles.css`:

```css
.export-el-resize {
    position: absolute;
    right: -4px;
    bottom: -4px;
    width: 12px;
    height: 12px;
    background: #007aff;
    border: 2px solid #fff;
    border-radius: 2px;
    cursor: nwse-resize;
    z-index: 2;
}
```

- [ ] **Step 4: Manual verification**

Reload. Open designer. Confirm:
- Clicking an element shows the blue bottom-right handle
- Dragging the element body moves it; X/Y in the left panel updates live
- Dragging the handle resizes; W/H updates live
- Elements can't be dragged outside the page bounds
- After moving an element, clicking Reset layout restores it

- [ ] **Step 5: Commit**

```bash
git add js/export/LayoutDesigner.js styles.css
git commit -m "feat(export): drag and resize elements in layout preview"
```

---

## Task 6: `PrintMapRenderer` — offscreen Leaflet → canvas

**Files:**
- Create: `js/export/PrintMapRenderer.js`
- Modify: `js/export/ExportController.js`

- [ ] **Step 1: Create `js/export/PrintMapRenderer.js`**

Export class `PrintMapRenderer`. Constructor `(dataManager, layerManager)`.

Method `async render(exportState)` → returns `HTMLCanvasElement`:

1. Find `mapEl = exportState.elements.find(e => e.type === 'map')`
2. Compute `widthPx = round(mapEl.w * page.dpi / 25.4)`, `heightPx = round(mapEl.h * page.dpi / 25.4)`
3. Create a hidden container div:
   - `position: fixed; left: -99999px; top: -99999px`
   - `width/height` set to widthPx/heightPx
   - `background: #ffffff`, `pointer-events: none`
4. Create offscreen Leaflet map with options `{ zoomControl: false, attributionControl: false, fadeAnimation: false, zoomAnimation: false, markerZoomAnimation: false, preferCanvas: false, renderer: L.svg({ padding: 0.1 }) }`
5. Fit the bbox exactly: `map.fitBounds([[s, w], [n, e]], { animate: false, padding: [0, 0] })`
6. Call `new SvgPatterns(map).init()` to register the SVG pattern defs in the new map's SVG
7. Call `await this._cloneLayers(map, exportState)`
8. Call `await this._waitForReady(container)`
9. Call `const canvas = await this._svgToCanvas(container, widthPx, heightPx)`
10. In `finally`, remove the map and the container
11. Return the canvas

**`_cloneLayers(map, exportState)`** — for each entry in `exportState.layers`:
- Skip if the visible set is empty
- Fetch the layer's GeoJSON via `this.dataManager.loadLayer(layerId)`
- Filter features to only those whose matching legend entry index is in the visible set (use `_findEntryIndex` helper)
- For polygon layers, sort features by bbox area descending (same approach as LayerManager)
- Create pane `layer-z{zIndex}` on the offscreen map
- Build a `L.geoJSON` layer:
  - For `point` geomType: use `pointToLayer` with `L.icon({ iconUrl: assetUrl('symbols/' + entry.symbolIcon), iconSize: [entry.symbolSize || 24, entry.symbolSize || 24], iconAnchor: [size/2, size/2] })`
  - For `polygon` or `line`: use `style: feature => this.layerManager.getFeatureStyle(layerId, feature)` to reuse the live style function
- Add to the offscreen map
- For polygon layers, after `setTimeout(0)`, iterate features and call `this._applyPatternFill(featureLayer, config)` (same logic as LayerManager._applyPatternFills, inline a `PATTERN_ICON_TO_ID` map)

**`_waitForReady(container, timeoutMs = 15000)`** — wait for all `<img>` and `<svg image>` elements inside `container` to finish loading:
- First wait 200ms for Leaflet to create path/image elements
- Collect `container.querySelectorAll('img')` and `container.querySelectorAll('svg image')`
- For each `<img>`, wait for `complete && naturalWidth > 0`, or listen for `load`/`error` events
- For each `<svg image>`, read its `href` or `xlink:href` and probe-load it via a new `Image()` instance
- Race the combined Promise against a 15-second timeout so the call always returns

**`_svgToCanvas(container, widthPx, heightPx)`** — serialize and rasterize:
- Find the first `<svg>` inside the container
- Set explicit `width`/`height` attributes to `widthPx`/`heightPx`
- Use `new XMLSerializer().serializeToString(svg)` to get the string
- Ensure `xmlns="http://www.w3.org/2000/svg"` is present on the root `<svg>` tag (add it via string replace if missing)
- Wrap the string in a `Blob` with `type: 'image/svg+xml;charset=utf-8'`
- Create an object URL via `URL.createObjectURL(blob)`
- Create an `<img>` with `crossOrigin = 'anonymous'`, set `src` to the URL, await load
- Create a canvas at `widthPx × heightPx`
- Fill with white, then `drawImage(img, 0, 0, widthPx, heightPx)`
- Revoke the object URL
- Return the canvas

Helper methods to inline:
- `_findEntryIndex(config, feature)` — returns the first matching legend entry index or -1 (duplicates LayerManager's logic)
- `_findMatchingEntry(config, feature)` — returns the entry object or null
- `_featureMatchesEntry(feature, entry)` — returns boolean
- `_applyPatternFill(featureLayer, config)` — finds the matching entry, resolves its patternType or patternIcon-mapped id, and sets `fill="url(#id)"` + `fill-opacity="1"` on the path element
- `_bboxArea(geom)` — approximate bbox area for sorting

- [ ] **Step 2: Add a lazy accessor to `ExportController`**

Add method:

```javascript
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
```

- [ ] **Step 3: Add a temporary debug rendering step inside `openWorkflow`**

After `const finalState = await designer.open()`, add:

```javascript
            const renderer = await this._getPrintMapRenderer();
            const canvas = await renderer.render(finalState);

            // Debug: preview the rendered map in a new window using safe DOM construction
            const dataUrl = canvas.toDataURL('image/png');
            const win = window.open('', '_blank');
            if (win) {
                win.document.title = 'PrintMapRenderer output';
                const body = win.document.body;
                body.style.cssText = 'margin:0;background:#222;display:flex;align-items:center;justify-content:center;min-height:100vh';
                const img = win.document.createElement('img');
                img.src = dataUrl;
                img.style.cssText = 'max-width:95vw;max-height:95vh;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.5)';
                body.appendChild(img);
            }
            console.log('ExportController: renderer produced canvas', canvas.width, 'x', canvas.height);
            // TODO: compose via ExportEngine — Task 7
```

- [ ] **Step 4: Manual verification**

Reload. Open workflow → Whole island → Continue → Export. Confirm:
- A new browser tab opens showing a white page with an image of Naxos
- The image shows the lithology polygons, contours, faults, and all other visible layers in their expected symbology (exactly like the live map)
- SVG pattern fills are visible where expected
- Point markers appear at their locations
- Console logs the canvas size; for A4 landscape at 200 DPI, the map-area width should be roughly `(297 - 2*10 - 60 - 4) × 200 / 25.4 ≈ 1680 px` (adjust for the default legend column width)
- No red errors in the console (CORS warnings on images loaded through the svg-to-image pipeline are expected and harmless)

- [ ] **Step 5: Commit**

```bash
git add js/export/PrintMapRenderer.js js/export/ExportController.js
git commit -m "feat(export): PrintMapRenderer (offscreen Leaflet -> canvas)"
```

---

## Task 7: `ExportEngine` — PDF / PNG / JPEG / SVG + download

**Files:**
- Create: `js/export/ExportEngine.js`
- Modify: `js/export/ExportController.js`

- [ ] **Step 1: Create `js/export/ExportEngine.js`**

Export class `ExportEngine`. No constructor parameters needed.

Method `async export(exportState, mapCanvas)`:
- Builds the filename via `buildFilename(exportState)`
- Dispatches to format-specific method:
  - `pdf` → `this._exportPdf(exportState, mapCanvas)` → returns `Blob`
  - `svg` → `this._exportSvg(exportState, mapCanvas)` → returns `Blob`
  - `png` / `jpeg` → `this._exportRaster(exportState, mapCanvas, format)` → returns `Blob`
- Calls `this._triggerDownload(blob, filename)`

Method `_triggerDownload(blob, filename)`:
- Creates a temporary `<a>` element
- Sets `a.href = URL.createObjectURL(blob)` and `a.download = filename`
- Appends to `document.body`, calls `a.click()`, removes it
- Revokes the URL after 1 second

**Raster path (`_exportRaster`)**:
- Call `await this._composeCanvas(exportState, mapCanvas)` → returns full page canvas
- Call `canvas.toBlob(cb, mime, quality)` where `mime` is `'image/png'` or `'image/jpeg'` and `quality` is `exportState.output.quality` for jpeg only
- Wrap in a Promise

**Canvas composition (`_composeCanvas`)**:
- Compute `mmToPx = page.dpi / 25.4`, `W = page.widthMm * mmToPx`, `H = page.heightMm * mmToPx`
- Create canvas, fill white
- Iterate visible elements in order, dispatch by type:
  - `map` → `ctx.drawImage(mapCanvas, x, y, w, h)`
  - `title` / `subtitle` / `date` / `credits` → `this._drawText(ctx, el, x, y, w, h, mmToPx)`
  - `legend` → `await this._drawLegend(ctx, el, exportState, x, y, w, h, mmToPx)`
  - `scalebar` → `this._drawScaleBar(ctx, el, exportState, x, y, w, h, mmToPx)`
  - `north-arrow` → `this._drawNorthArrow(ctx, x, y, w, h)`
  - `logo` → `await this._drawLogo(ctx, el, x, y, w, h)` — loads `assetUrl(el.src)` via `_loadImage`

**Text drawing**: font size in CSS pixels = `el.fontSize * mmToPx / 3.78`; primary line plus an optional secondary Greek line at 75% size and secondary color.

**Legend drawing** — iterate `exportState.layers` entries, for each visible legend entry:
- If `entry.symbolIcon` → load image and drawImage as the swatch
- Else if `entry.style.fillColor && !== 'transparent'` → drawRect with fill + stroke
- Else if `entry.style.color` (line type) → drawLine horizontal through middle
- Draw the label text next to the swatch, then the Greek label smaller below
- Clip when vertical cursor would overflow the legend bounds

**Scale bar** — computes real-world meters covered by the bar width using haversine on the bbox south edge, rounds to a nice 1/2/5×10^n value, draws a filled rectangle at that actual width plus a numeric label ("500 m", "2 km", etc.).

**North arrow** — filled triangle pointing up + bold "N" label below.

**PDF path (`_exportPdf`)**:
- `const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: page.orientation, unit: 'mm', format: [page.widthMm, page.heightMm], compress: true })`
- Iterate visible elements and call format-specific PDF methods:
  - `map` → `doc.addImage(mapCanvas, 'PNG', x, y, w, h, undefined, 'FAST')`
  - text types → `_pdfDrawText(doc, el)` using `doc.setFont('helvetica', bold?'bold':'normal')` + `doc.setFontSize(el.fontSize)` + `doc.text(str, tx, ty, { align })`
  - `logo` → load the image, draw it onto a temporary canvas, add via `doc.addImage(canvas, 'PNG', x, y, w, h)`
  - `legend` → `_pdfDrawLegend(doc, el, exportState)` — draws a border rect + iterates visible entries drawing small filled rects for polygon swatches, lines for line swatches, and text labels via `doc.text`. Uses `_parseColor(hex)` helper to convert `#rrggbb` to RGB int triples for `doc.setFillColor`/`setDrawColor`.
  - `scalebar` → `_pdfDrawScaleBar(doc, el, exportState)` — computes the nice round value via haversine and draws a vector rectangle + label
  - `north-arrow` → `_pdfDrawNorth(doc, el)` — uses `doc.triangle(x1,y1,x2,y2,x3,y3,'F')` and `doc.text('N', cx, y + h, { align: 'center' })`
- Return `doc.output('blob')`

**SVG path (`_exportSvg`)**:
- Build an SVG string as a template literal (escape text via `_xmlEscape`)
- Root: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">`
- White background rect
- Map element: `<image x y width height href="${mapCanvas.toDataURL('image/png')}"/>`
- Text elements: `<text>` with `font-family`, `font-size`, `text-anchor`, `fill` attributes
- Legend/scale/north/logo are **omitted in SVG output** (documented out-of-scope: users wanting full fidelity should export PDF)
- Return a `Blob` with `type: 'image/svg+xml;charset=utf-8'`

Helper `_xmlEscape(s)` replaces `< > & " '` with entities.

Helper `_parseColor(s)` accepts `#rgb`, `#rrggbb`, `rgb(...)`, `rgba(...)` and returns `[r, g, b]` 0-255 integers, defaulting to `[0,0,0]`.

Helper `_haversineMeters(lat1, lon1, lat2, lon2)` for scale bar calculations.

Helper `_loadImage(url)` returns a Promise resolving to a loaded `Image` with `crossOrigin='anonymous'`.

- [ ] **Step 2: Replace the debug preview block in `ExportController.openWorkflow`**

Replace the debug window opening with:

```javascript
            const renderer = await this._getPrintMapRenderer();
            const canvas = await renderer.render(finalState);

            const { ExportEngine } = await import('./ExportEngine.js');
            const engine = new ExportEngine();
            await engine.export(finalState, canvas);

            this.exportState.status = 'done';
            console.log('ExportController: export complete');
```

- [ ] **Step 3: Manual verification**

Reload. For each format (PDF, PNG, JPEG, SVG):
- Click `📥` → Whole island → Continue
- In the designer, change Format to the target
- Click Export
- A file download triggers with filename `Naxos_Geomorphological_Map-NKUA-YYYYMMDD.{ext}`
- Open the downloaded file:
  - **PDF:** Map area is a high-quality raster; title, subtitle, date, credits, legend text are selectable vector text; scale bar and north arrow are vector shapes; logos are embedded images; page dimensions match the chosen preset
  - **PNG:** Opens as an image showing the full composition at the target DPI
  - **JPEG:** Same as PNG but JPEG-compressed
  - **SVG:** Opens in a browser and renders (map + text elements only; legend/scale/north are omitted per spec)

Verify different area options:
- Current view → exported map bounded by the viewport at export time
- Drawn rectangle → exported map bounded by the drawn rectangle
- Change page from A4 to A3 → PDF/PNG dimensions match A3

- [ ] **Step 4: Commit**

```bash
git add js/export/ExportEngine.js js/export/ExportController.js
git commit -m "feat(export): ExportEngine (PDF/PNG/JPEG/SVG + download trigger)"
```

---

## Task 8: Mobile responsive layout for the Layout Designer

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: Add responsive media query at the end of `styles.css`**

```css
@media (max-width: 768px) {
    .export-designer-body {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr auto auto;
    }
    .export-designer-left,
    .export-designer-right {
        border: none;
        border-top: 1px solid var(--border-light);
        max-height: 40vh;
    }
    .export-designer-center { order: 1; padding: var(--spacing-sm); }
    .export-designer-right  { order: 2; }
    .export-designer-left   { order: 3; }
    .export-designer-topbar { flex-wrap: wrap; }
    .export-designer-topbar .btn {
        flex: 1 1 auto;
        padding: 6px 10px;
        font-size: 11px;
    }
    .export-designer-title {
        flex: 1 1 100%;
        order: -1;
        padding: 4px 0;
    }
}
```

- [ ] **Step 2: Manual verification**

Open DevTools → Device Toolbar → iPhone 12 (390 px). Reload.
- Click `📥` → Whole island → Continue
- Confirm:
  - Layout Designer opens full-screen
  - Preview canvas is at the top
  - Right panel (page/DPI/format/elements) is below it
  - Left panel (element editor) is below the right panel
  - Top bar buttons wrap into a grid
  - Clicking an element still selects it and the editor panel updates
  - Exporting still works end-to-end

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat(export): mobile responsive layout for Layout Designer"
```

---

## Task 9: Loading overlay + error toast

**Files:**
- Modify: `js/export/ExportController.js`
- Modify: `styles.css`

- [ ] **Step 1: Add helper functions at the top of `ExportController.js`**

After the imports, add three top-level helper functions (NOT class methods):

- `showLoadingOverlay(message)` — creates `#export-loading-overlay` div containing a spinner and the message via `createElement` + `appendChild` (no innerHTML), appends to `document.body`
- `hideLoadingOverlay()` — removes the overlay element if present
- `showErrorToast(message)` — creates `.export-error-toast` div with the text via `textContent`, appends to body, fades out and removes after 4 seconds

- [ ] **Step 2: Wrap the render and export steps with the helpers**

Replace the render + export block inside `openWorkflow`:

```javascript
            showLoadingOverlay('Rendering map\u2026');
            let canvas;
            try {
                const renderer = await this._getPrintMapRenderer();
                canvas = await renderer.render(finalState);
            } catch (err) {
                hideLoadingOverlay();
                showErrorToast('Failed to render map: ' + err.message);
                this.exportState.status = 'error';
                console.error(err);
                return;
            }

            hideLoadingOverlay();
            showLoadingOverlay('Generating ' + finalState.output.format.toUpperCase() + '\u2026');
            try {
                const { ExportEngine } = await import('./ExportEngine.js');
                const engine = new ExportEngine();
                await engine.export(finalState, canvas);
            } catch (err) {
                showErrorToast('Export failed: ' + err.message);
                this.exportState.status = 'error';
                console.error(err);
                return;
            } finally {
                hideLoadingOverlay();
            }

            this.exportState.status = 'done';
            console.log('ExportController: export complete');
```

- [ ] **Step 3: Append overlay + toast styles to `styles.css`**

Required styles:
- `.export-loading-overlay` — fixed inset 0, black/45% background, z-index 11000, flex center
- `.export-loading-box` — white, padded, rounded, column flex, centered, shadow
- `.export-loading-spinner` — 32×32 circle border with top color `--primary-color`, animated with the existing `@keyframes spin`
- `.export-loading-text` — 12px / 500 weight
- `.export-error-toast` — fixed bottom 24px, centered, red background, white text, rounded, shadow, z-index 11100, max-width 90vw, centered text, transition opacity 0.5s
- `.export-error-toast.fade-out` — opacity 0

- [ ] **Step 4: Manual verification**

Reload. Click `📥` → Whole island → Continue → Export.
- "Rendering map…" overlay appears
- Switches to "Generating PDF…" when render finishes
- Disappears when the download triggers
- No console errors

Optional error path test: temporarily rename a method inside PrintMapRenderer so it throws, run the flow, confirm the error toast appears at the bottom and the overlay is dismissed. Revert the breakage before committing.

- [ ] **Step 5: Commit**

```bash
git add js/export/ExportController.js styles.css
git commit -m "feat(export): loading overlay + error toast"
```

---

## Task 10: Regression test + push

**Files:** none (verification + push)

- [ ] **Step 1: Regression test existing features**

Reload the page. Confirm all pre-export functionality still works:
- Map loads with all 25 layers
- Left sidebar: per-class toggles, search
- Right sidebar: Project Info collapsible, Reference Maps collapsible, Legend collapsible
- Mobile sidebars collapse; export button is visible
- Feature-click modal works
- SVG pattern fills visible on the main map
- Scale-dependent visibility still works — zooming from 12 to 14 reveals spring/cave/terrace markers

- [ ] **Step 2: Full export smoke test**

For each combination, verify the exported file:

| Area           | Format | Page         |
|----------------|--------|--------------|
| Whole island   | PDF    | A4 landscape |
| Current view   | PDF    | A3 landscape |
| Drawn rect     | PNG    | A4 landscape |
| Whole island   | JPEG   | Letter       |
| Whole island   | SVG    | A4 landscape |
| Whole island   | PDF    | Custom 500×300 |
| Whole island   | PDF    | A4 landscape @ 300 DPI |

Each file must:
- Download with the correct filename pattern
- Open without errors
- Show the expected map extent
- Reflect the layer-toggle state at export time (turn some layers off first)
- For PDFs: have selectable vector text

- [ ] **Step 3: Push**

```bash
git push origin main
```

Wait for the GitHub Actions deploy to finish (~30 seconds).

- [ ] **Step 4: Live verification**

Hard-refresh https://uoa-gr.github.io/naxos/ and run the smoke test against the live deployment. Confirm at least:
- Export button appears in the header
- Workflow opens Step-1 modal
- Whole-island PDF export downloads and opens correctly
- Draw-a-rectangle PNG export works

---

## Self-review notes

- **Spec coverage check:**
  - §2 User Flow → Tasks 2 (trigger), 3–4 (Step 1), 5 (Step 2)
  - §3 Element Types → Task 1 (data), Task 5 (UI), Task 7 (rendering)
  - §4 Architecture → Tasks 1 (ExportState), 2 (Controller), 3–4 (AreaSelector), 5 (LayoutDesigner), 6 (PrintMapRenderer), 7 (ExportEngine)
  - §5 Data Model → Task 1
  - §6 Render pipeline → Tasks 6 (renderer), 7 (engine + PDF/PNG/JPEG/SVG + filename)
  - §7 Page presets, §8 DPI presets → Task 1 constants, Task 5 right panel selects
  - §9 Mobile responsive → Task 8
  - §10 Error handling → Task 9
  - §11 Out of scope (basemap, templates, server-side) → explicitly excluded
  - §12 Acceptance criteria → covered by Task 10 smoke test

- **No placeholders:** all tasks have concrete file paths, concrete behavior descriptions, concrete manual-verification steps, and concrete commit messages.

- **Type consistency:** `exportState` shape is defined in Task 1 and consumed identically in Tasks 2, 5, 6, 7. The four methods `createExportState`, `buildFilename`, `applyOrientation`, `resetElementPositions` are referenced with the exact same signatures across tasks.
