# Print / Export Feature — WORK IN PROGRESS

**Status:** Under active development. Not yet shipped to users.

The header export button (`#export-btn`) is hidden from the UI via a
`display: none !important` rule in `styles.css`. Remove that rule to re-enable
the feature for testing.

## What is done

- [x] Data model: `ExportState.js` (page presets, element factory, filename helper)
- [x] Workflow orchestrator: `ExportController.js` (state machine, localStorage)
- [x] Step-1 modal: `AreaSelector.js` (Whole island, Current view, Draw on map)
- [x] Draw-on-map modes: rectangle, circle, polygon with live preview + Escape to cancel
- [x] Step-2 modal: `LayoutDesigner.js` (preview + left/right panels)
- [x] Drag + resize of layout elements
- [x] Offscreen map rendering: `PrintMapRenderer.js` (SVG patterns preserved, white background)
- [x] File compositors: `ExportEngine.js` (PDF via jsPDF, PNG, JPEG, SVG)
- [x] Mobile responsive layout designer
- [x] Loading overlay + error toasts

## What is still open

- [ ] End-to-end visual verification against the ArcGIS Pro layout
- [ ] Polygon pattern fills in PDF output (currently rasterized via map image;
      non-rasterized patterns in PDF vector layer require SVG→PDF pattern port)
- [ ] Symbol icons in the PDF legend swatches (raster path draws them, PDF path
      doesn't)
- [ ] SVG export: legend / scale / north-arrow / logos are omitted (intentional
      per the spec but worth revisiting)
- [ ] More page-size tests at extreme DPIs (A0 @ 300 DPI ~ 14k × 10k px may OOM)
- [ ] Cross-browser test: Firefox and Safari SVG serialization quirks
- [ ] Graceful handling of a very long user-drawn polygon (thousands of vertices)

## How to re-enable for testing

In `styles.css`, remove or comment out:

```css
#export-btn { display: none !important; }
```

Then reload the page — the 📥 button reappears in the header.

## Files

- `ExportState.js` — data model, 215 lines
- `ExportController.js` — workflow orchestrator, 205 lines
- `AreaSelector.js` — Step-1 modal + drawing tools, 360 lines
- `LayoutDesigner.js` — Step-2 full-screen designer, 570 lines
- `PrintMapRenderer.js` — offscreen Leaflet rasterizer, 330 lines
- `ExportEngine.js` — format compositors + downloader, 510 lines

Design spec: `docs/specs/2026-04-06-print-export-feature-design.md`
Implementation plan: `docs/plans/2026-04-06-print-export-feature-plan.md`
