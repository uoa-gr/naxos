# Print / Export Feature — Design Spec

**Project:** Naxos Geomorphological Map (uoa-gr/naxos)
**Date:** 2026-04-06
**Status:** Design — pending implementation
**Owner:** NKUA / EAGME WebGIS team

---

## 1. Purpose

Add a professional print/export feature to the Naxos WebGIS so researchers can produce publication-quality cartographic outputs (PDF, PNG, JPEG, SVG) of the current map content, with full control over layout elements (title, legend, scale, north arrow, logos, credits) and area selection (whole island, current view, or custom drawn shape).

The output must be of academic publication quality, with the project's exact symbology preserved (SVG pattern fills, scaled markers, per-class visibility). No basemap is included — exports are produced on a clean white background, matching standard cartographic conventions for academic figures.

## 2. User Flow

```
Header bar: [📥 Export]
            │
            ▼
┌──────────────────────────────────────┐
│  Step 1 — Area Selection (small modal)│
│                                       │
│   ◉ Whole Naxos island                │
│   ○ Current map view                  │
│   ○ Draw on map…  ▾                   │
│       ◇ Rectangle  ○ Circle  ○ Polygon│
│                                       │
│       [Cancel]      [Continue ▶]      │
└──────────────────────────────────────┘
            │
            │ if "Draw on map":
            │ — modal closes
            │ — drawing tools activate on the live map
            │ — user draws shape
            │ — Step 2 opens automatically when shape committed
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 2 — Layout Designer (full-screen modal)                 │
│  ┌────────────────────────────────────┬─────────────────────┐│
│  │                                     │  RIGHT PANEL        ││
│  │   Live preview canvas               │                     ││
│  │   (page outline at chosen size)     │  Page size          ││
│  │                                     │   A4 / A3 / Custom… ││
│  │   • Drag elements                   │  Orientation        ││
│  │   • Click element → editor (left)   │  DPI                ││
│  │   • Resize handles                  │   Screen 96         ││
│  │                                     │   Print  200        ││
│  │                                     │   High   300        ││
│  │                                     │  Format             ││
│  │                                     │   PDF / PNG /       ││
│  │                                     │   JPEG / SVG        ││
│  │                                     │  Filename preview   ││
│  ├─────────────────────────────────────┤                     ││
│  │  LEFT PANEL — element editor        │  Elements           ││
│  │                                     │   Title    ☑        ││
│  │  Title text: [_______________]      │   Subtitle ☑        ││
│  │  Greek:      [_______________]      │   Legend   ☑        ││
│  │  Font size:  [16]                   │   Scale    ☑        ││
│  │  Align:      ◉ ○ ○                  │   N. arrow ☑        ││
│  │  [Reset to default] [Delete]        │   Date     ☑        ││
│  │                                     │  (Logos/Credits     ││
│  │                                     │   always included)  ││
│  │                                     │  Legend classes     ││
│  │                                     │   ☑ Marbles-Schists ││
│  │                                     │   ☑ Alluvium        ││
│  │                                     │   ...               ││
│  ├─────────────────────────────────────┴─────────────────────┤│
│  │  [◀ Back to area]   [Reset layout]   [⬇ Export]           ││
│  └───────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### Mobile (≤ 768 px)

- Step 1 modal occupies most of the viewport
- Step 2 modal: preview takes full width at the top; the right and left panels collapse into a bottom drawer with tabs (Page / Format / Elements / Legend / Editor)
- Drag/resize gestures work via touch events

## 3. Element Types

| Type | Mandatory | Editable text | Notes |
|------|-----------|---------------|-------|
| `map` | ✅ Yes | — | The rendered map area. Always present. |
| `title` | No | EN + GR | Default: "Geomorphological Map of Naxos / Γεωμορφολογικός Χάρτης Νάξου" |
| `subtitle` | No | EN + GR | Default: "Naxos Sheet · 1:50,000" |
| `legend` | No | Title + per-class label override | Visible-classes-only by default; user can toggle individual classes back on |
| `scalebar` | No | — | Metric, computed from current map area + zoom |
| `north-arrow` | No | — | Simple "N" + triangle, vector |
| `date` | No | Free text | Default: `Generated YYYY-MM-DD` |
| `credits` | ✅ Yes | Editable | Default: NKUA / EAGME / scientific team / 2025 |
| `logo` (NKUA) | ✅ Yes | — | NKUA logo image |
| `logo` (EAGME) | ✅ Yes | — | EAGME logo image |

**All elements** can be moved (drag) and resized (corner handles). Text elements can be edited in-place via the left editor panel. Mandatory elements cannot be deleted. All elements have a "Reset to default" button that snaps them back to their preset position/size for the current page.

## 4. Architecture

### 4.1 New modules

```
js/export/
├── ExportController.js     Workflow orchestrator. Wires the trigger, owns
│                           the workflow state machine, holds the export state.
├── AreaSelector.js         Step-1 modal + Leaflet drawing primitives.
├── LayoutDesigner.js       Step-2 full-screen modal. Pure UI on the
│                           exportState data model. No rendering logic.
├── PrintMapRenderer.js     Hidden offscreen Leaflet instance. Single
│                           responsibility: bbox + dimensions + DPI +
│                           visible-layer-state → HTMLCanvasElement of the map.
└── ExportEngine.js         Pure compositor. Takes layout state + map canvas,
                            produces a Blob in the requested format. No DOM
                            dependencies beyond <canvas> and jsPDF.
```

### 4.2 Modifications to existing files

- `js/data/LayerConfig.js` — add `EXPORT_DEFAULTS` constant: list of standard page sizes (A0–A5, Letter, Legal, Tabloid), DPI presets, default element positions per page-size + orientation.
- `js/main.js` — import and initialize `ExportController` after `LayerManager`.
- `index.html` — add `<button id="export-btn">📥 Export</button>` to the header (between the title and the right toggle group).
- `styles.css` — styles for both modals, drawing UI, layout designer panels, drag handles.

### 4.3 External libraries (CDN, no build step)

- **jsPDF 2.x** — vector PDF generation (text + raster + primitives)
- **html2canvas 1.x** — fallback raster compositing if direct SVG serialization fails
- **dom-to-image-more 3.x** — alternative SVG-aware compositor (used when SVG patterns must be preserved)

All loaded via `<script src="https://unpkg.com/...">` in `index.html`.

### 4.4 State machine

`ExportController.status`:

```
idle → selecting-area → drawing? → designing → rendering → done
                                   ↑          │
                                   └──────────┘  (back button)
```

Transitions:
- `idle → selecting-area`: user clicks export button
- `selecting-area → drawing`: user picks "Draw on map" + a shape type
- `drawing → designing`: shape committed (double-click for polygon, mouseup for rectangle/circle)
- `selecting-area → designing`: user picks "Whole island" or "Current view" + Continue
- `designing → rendering`: user clicks Export button
- `rendering → done`: file downloaded
- `* → idle`: cancel / close modal

## 5. Data Model

The single source of truth is one `exportState` object passed between modules.

```javascript
exportState = {
    area: {
        type: 'whole-island' | 'current-view' | 'rectangle' | 'circle' | 'polygon',
        bbox: [west, south, east, north],
        shape: GeoJSONGeometry | null,
    },

    page: {
        preset: 'A4' | 'A3' | 'A2' | 'Letter' | ... | 'Custom',
        widthMm: 297,
        heightMm: 210,
        orientation: 'landscape' | 'portrait',
        dpi: 96 | 200 | 300,
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
    },

    output: {
        format: 'pdf' | 'png' | 'jpeg' | 'svg',
        quality: 0.92,                    // jpeg only
        person: 'NKUA',                   // editable, persisted in localStorage
    },

    // Visible classes (mirrors LayerManager toggle state at modal-open time,
    // then independently editable in the modal)
    layers: {
        // layerId -> Set<entryIndex>
    },

    elements: [
        { id: 'el_map',         type: 'map',         x:10, y:25, w:200, h:150, mandatory:true, visible:true },
        { id: 'el_title',       type: 'title',       x:10, y:8,  w:200, h:10,  text:'…', textGr:'…', fontSize:16, fontWeight:600, align:'center', visible:true },
        { id: 'el_subtitle',    type: 'subtitle',    x:10, y:18, w:200, h:6,   text:'…', fontSize:10, visible:true },
        { id: 'el_legend',      type: 'legend',      x:220, y:25, w:70, h:150, title:'Legend', titleGr:'Υπόμνημα', fontSize:9, columns:1, visible:true },
        { id: 'el_scale',       type: 'scalebar',    x:10, y:180, w:60, h:6,   unit:'metric', visible:true },
        { id: 'el_north',       type: 'north-arrow', x:200, y:25, w:10, h:12,  style:'simple', visible:true },
        { id: 'el_date',        type: 'date',        x:220, y:195, w:70, h:5,  text:'Generated 2026-04-06', fontSize:8, visible:true },
        { id: 'el_credits',     type: 'credits',     x:10, y:195, w:200, h:8,  mandatory:true, text:'…', fontSize:7, visible:true },
        { id: 'el_logo_nkua',   type: 'logo',        x:10, y:5, w:18, h:12,    src:'images/nkua_logo_en.jpg', mandatory:true, visible:true },
        { id: 'el_logo_eagme',  type: 'logo',        x:270, y:5, w:18, h:12,   src:'images/eagme_logo_en.png', mandatory:true, visible:true },
    ],

    status: 'idle' | 'selecting-area' | 'drawing' | 'designing' | 'rendering' | 'done' | 'error',
}
```

**Key properties:**
- All dimensions in **millimeters** (single unit, no conversion bugs)
- Element coordinates relative to the **page top-left**
- Pixels computed at render time: `px = mm × dpi / 25.4`
- Default element positions are presets per page-size + orientation, stored in `EXPORT_DEFAULTS`
- Legend element is "smart" — derives its content from `layers` at render time
- Text elements support optional bilingual `text` + `textGr`

## 6. Render Pipeline

### 6.1 PrintMapRenderer

Single responsibility: produce a high-DPI raster image of just the map area.

```javascript
async render(exportState) {
    const { area, page, layers } = exportState;
    const mapEl = exportState.elements.find(e => e.type === 'map');

    // 1. Compute target pixel dimensions
    const widthPx  = Math.round((mapEl.w * page.dpi) / 25.4);
    const heightPx = Math.round((mapEl.h * page.dpi) / 25.4);

    // 2. Hidden container at the exact target size
    const container = document.createElement('div');
    container.style.cssText = `position:fixed;top:-99999px;left:-99999px;
                               width:${widthPx}px;height:${heightPx}px;
                               background:#ffffff;pointer-events:none;`;
    document.body.appendChild(container);

    // 3. Offscreen Leaflet map (no zoom controls, no animations,
    //    SVG renderer for pattern fidelity, NO basemap)
    const map = L.map(container, {
        zoomControl: false, attributionControl: false,
        fadeAnimation: false, zoomAnimation: false, markerZoomAnimation: false,
        preferCanvas: false,
        renderer: L.svg({ padding: 0.1 }),
    });

    // 4. Fit the bbox EXACTLY to the offscreen map
    map.fitBounds([[area.bbox[1], area.bbox[0]], [area.bbox[3], area.bbox[2]]],
                  { animate: false, padding: [0, 0] });

    // 5. Re-init SVG patterns into the new map's defs
    new SvgPatterns(map).init();

    // 6. Clone all visible layers with the same styles + visible-class filter
    await this._cloneLayers(map, layers);

    // 7. Wait for ALL <image> hrefs (pattern tiles + symbol markers) to load
    await this._waitForReady(map, container);

    // 8. Serialize the SVG element to a string, encode as data URL,
    //    draw onto an Image, then drawImage() to a canvas at native px size
    const canvas = await this._svgToCanvas(container, widthPx, heightPx);

    // 9. Cleanup
    map.remove();
    container.remove();

    return canvas;   // HTMLCanvasElement on white background
}
```

**No basemap is ever rendered** — the white container background is the base layer. This eliminates CORS, tile-load timeouts, and provider attribution complexity. Standard for academic cartographic figures.

### 6.2 ExportEngine

Pure compositor. Takes the layout state + map canvas, returns a Blob.

```javascript
async export(exportState, mapCanvas) {
    const { output } = exportState;
    if (output.format === 'pdf')  return this._exportPdf(exportState, mapCanvas);
    if (output.format === 'svg')  return this._exportSvg(exportState, mapCanvas);
    return this._exportRaster(exportState, mapCanvas, output.format);  // png / jpeg
}
```

**Raster path** (`png`, `jpeg`):
- Create a page-sized canvas (`widthMm × dpi / 25.4`)
- Fill white background
- Iterate `elements.filter(e => e.visible)` in array order
- For each element type, draw via the appropriate canvas method:
  - `map` → `ctx.drawImage(mapCanvas, …)`
  - `title` / `subtitle` / `date` / `credits` → `ctx.fillText()` with proper font + alignment
  - `legend` → grid of `ctx.fillRect()` swatches + `ctx.drawImage()` symbol PNGs + `ctx.fillText()` labels
  - `scalebar` → `ctx.fillRect()` segments + `ctx.fillText()` distance labels
  - `north-arrow` → `ctx.beginPath()` triangle + `ctx.fillText('N')`
  - `logo` → `ctx.drawImage()` from preloaded logo Image
- `canvas.toBlob(callback, mimeType, quality)`

**PDF path** (vector + embedded raster):
- `new jsPDF({ unit: 'mm', format: [page.widthMm, page.heightMm], orientation: … })`
- Map element: `doc.addImage(mapCanvas, 'PNG', x, y, w, h)` — embedded high-DPI raster
- Every other element: drawn as **vector PDF primitives** for crisp text and resolution-independent shapes:
  - Text: `doc.text(str, x, y, { align: … })` with `doc.setFont()` + `doc.setFontSize()`
  - Legend swatches: `doc.setFillColor(r,g,b); doc.rect(x,y,w,h, 'F')`; symbol icons via `doc.addImage()`
  - Scale bar: alternating filled rectangles + vector text
  - North arrow: `doc.lines()` triangle + vector "N"
  - Logos: `doc.addImage()` from PNG/JPEG
- `doc.save(filename)`

**SVG path** (post-editable):
- Build a single `<svg>` document with width = `page.widthMm`mm
- Map element: `<image href="data:image/png;base64,…" />` from `mapCanvas.toDataURL()`
- All other elements: native SVG primitives (`<text>`, `<rect>`, `<line>`, `<image>`)
- Serialize to string → Blob with `image/svg+xml`

### 6.3 Filename

Pattern (file-naming convention applied):
```
Naxos_Geomorphological_Map-NKUA-YYYYMMDD.{ext}
```

- **Project:** `Naxos_Geomorphological_Map` (constant, professional, full name)
- **Person:** defaults to `NKUA`, editable in modal, persisted in localStorage
- **Date:** auto, `YYYYMMDD`
- **Ext:** matches `output.format` (`pdf` / `png` / `jpeg` / `svg`)

The export modal shows a live filename preview that updates as the user changes the Person field. No area, no document-type prefix — clean and standard.

### 6.4 Error handling

- **Tile load timeout** is N/A (no basemap)
- **SVG image href fails** (symbol PNG missing on Supabase): show warning toast, continue export with that symbol blank
- **`canvas.toBlob` failure** (memory pressure on huge pages, e.g. A0 @ 300 DPI = ~14 000 × 9 900 px): catch error, show modal warning ("Page too large for current memory; reduce DPI or page size"), keep modal open
- **PDF generation failure**: catch jsPDF error, show error toast with copy-error-details button
- **Drawing tool error**: bail out of drawing mode, reset cursor, show error toast

## 7. Page Size Presets

| Preset | Width × Height (mm) | Default orientation |
|--------|---------------------|---------------------|
| A0     | 841 × 1189          | Portrait            |
| A1     | 594 × 841           | Portrait            |
| A2     | 420 × 594           | Portrait            |
| A3     | 297 × 420           | Landscape           |
| A4     | 210 × 297           | Landscape           |
| A5     | 148 × 210           | Landscape           |
| Letter | 215.9 × 279.4       | Landscape           |
| Legal  | 215.9 × 355.6       | Landscape           |
| Tabloid| 279.4 × 431.8      | Landscape           |
| Custom | User input          | User choice         |

## 8. DPI Presets

| Label   | DPI | Use case |
|---------|-----|----------|
| Screen  | 96  | Web previews, slideshows |
| Print   | 200 | Standard office printing |
| High    | 300 | Publication / poster |

Custom DPI is editable in a numeric input field (range 72–600).

## 9. Mobile Responsive Behavior

- Step-1 modal: full-screen on mobile, centered card on desktop
- Step-2 modal:
  - Desktop ≥ 768 px: preview center, panels left/right
  - Mobile < 768 px: preview top, panels collapse into a tabbed bottom drawer with tabs `Page / Format / Elements / Legend / Editor`
- Drawing tools work on touch via Leaflet's built-in touch handling
- All controls have ≥ 44 px tap targets

## 10. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Pattern fills disappear in raster output because the offscreen SVG defs aren't re-applied | `PrintMapRenderer` re-instantiates `SvgPatterns(map).init()` after the offscreen map exists; awaits all `<image>` hrefs before serialization |
| Symbol PNG markers not loaded by serialization time | `_waitForReady` resolves only after all `img.complete && img.naturalWidth > 0` for every `<image>` in the SVG |
| Large pages × high DPI = OOM | Document max dimensions in UI; show warning above 100 megapixels |
| jsPDF text encoding for Greek characters | Use the `doc.addFileToVFS()` + `doc.addFont()` API to embed an Inter font that supports Greek glyphs |
| Drawn polygon with > 1000 vertices breaks the bbox calculation | Validate vertex count, simplify with `turf.simplify` if needed (or warn user) |

## 11. Out of Scope (this iteration)

- Tile-based basemap export (no basemap at all)
- Interactive PDF (clickable layers, popups)
- Multi-page output / map atlas
- Server-side rendering
- Saving / loading layout templates
- Watermarking / DRM

## 12. Acceptance Criteria

- [ ] Clicking the header `📥 Export` button opens the area-selection modal
- [ ] All four area options work and produce a correct bbox
- [ ] Drawing rectangle / circle / polygon on the live map produces a valid bbox
- [ ] Layout designer modal opens with all default elements positioned for the chosen page
- [ ] All elements can be dragged, resized, edited (where applicable), reset, and (non-mandatory) deleted
- [ ] Page size, orientation, DPI, and format selectors update the preview live
- [ ] Filename preview matches the file-naming convention and updates on Person change
- [ ] PDF export produces a vector PDF with selectable text and an embedded high-DPI map raster
- [ ] PNG / JPEG / SVG exports produce valid files at the chosen DPI
- [ ] Map raster preserves SVG pattern fills, scaled symbols, and per-class visibility
- [ ] Mobile layout works at 375 px wide (iPhone SE)
- [ ] Cancel / Back buttons return to previous step without losing state
- [ ] Logos and credits cannot be deleted
- [ ] Person field is persisted in localStorage between sessions
