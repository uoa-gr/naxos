/**
 * ExportState - data model for the print/export feature.
 *
 * A single plain-object `exportState` is passed between ExportController,
 * AreaSelector, LayoutDesigner, PrintMapRenderer, and ExportEngine.
 * All modules read from and write to this shape; factories below keep
 * the shape consistent.
 *
 * All dimensions are in MILLIMETERS. Pixels are computed at render time
 * via (mm * dpi / 25.4).
 */

export const PAGE_PRESETS = {
    A0:      { widthMm: 841,   heightMm: 1189,  defaultOrientation: 'portrait'  },
    A1:      { widthMm: 594,   heightMm: 841,   defaultOrientation: 'portrait'  },
    A2:      { widthMm: 420,   heightMm: 594,   defaultOrientation: 'portrait'  },
    A3:      { widthMm: 297,   heightMm: 420,   defaultOrientation: 'landscape' },
    A4:      { widthMm: 210,   heightMm: 297,   defaultOrientation: 'landscape' },
    A5:      { widthMm: 148,   heightMm: 210,   defaultOrientation: 'landscape' },
    Letter:  { widthMm: 215.9, heightMm: 279.4, defaultOrientation: 'landscape' },
    Legal:   { widthMm: 215.9, heightMm: 355.6, defaultOrientation: 'landscape' },
    Tabloid: { widthMm: 279.4, heightMm: 431.8, defaultOrientation: 'landscape' },
};

export const DPI_PRESETS = {
    Screen: 96,
    Print:  200,
    High:   300,
};

export const OUTPUT_FORMATS = ['pdf', 'png', 'jpeg', 'svg'];

/**
 * Normalize page dimensions so that widthMm >= heightMm for landscape,
 * widthMm <= heightMm for portrait. Returns a new object.
 */
export function applyOrientation(widthMm, heightMm, orientation) {
    const long = Math.max(widthMm, heightMm);
    const short = Math.min(widthMm, heightMm);
    return orientation === 'landscape'
        ? { widthMm: long, heightMm: short }
        : { widthMm: short, heightMm: long };
}

/**
 * Default element positions for a given page size (in mm, relative to
 * page top-left). Called whenever page size or orientation changes.
 * Assumes a 10 mm page margin.
 */
export function defaultElementPositions(page) {
    const W = page.widthMm;
    const H = page.heightMm;
    const margin = 10;

    // Reserve vertical bands
    const headerH  = 18;
    const titleY   = 8;
    const creditsH = 8;
    const creditsY = H - margin - creditsH;

    // Legend column on the right - 30% of width, min 60mm
    const legendW  = Math.max(60, W * 0.3);
    const legendX  = W - margin - legendW;
    const legendY  = margin + headerH;
    const legendH  = creditsY - legendY - 4;

    // Map area fills the remaining inner area
    const mapX = margin;
    const mapY = margin + headerH;
    const mapW = legendX - margin - 4;
    const mapH = legendY + legendH - mapY;

    return {
        el_map:        { x: mapX, y: mapY,            w: mapW,           h: mapH },
        el_title:      { x: margin, y: titleY,        w: W - 2 * margin, h: 8 },
        el_subtitle:   { x: margin, y: titleY + 8,    w: W - 2 * margin, h: 6 },
        el_logo_nkua:  { x: margin, y: 4,             w: 20, h: 13 },
        el_logo_eagme: { x: W - margin - 20, y: 4,    w: 20, h: 13 },
        el_legend:     { x: legendX, y: legendY,      w: legendW, h: legendH },
        el_scale:      { x: mapX, y: mapY + mapH - 8, w: 60, h: 6 },
        el_north:      { x: mapX + mapW - 14, y: mapY + 2, w: 10, h: 12 },
        el_date:       { x: legendX, y: creditsY - 8, w: legendW, h: 5 },
        el_credits:    { x: margin, y: creditsY,      w: W - 2 * margin, h: creditsH },
    };
}

function makeElement(id, type, pos, extra = {}) {
    return {
        id,
        type,
        x: pos.x,
        y: pos.y,
        w: pos.w,
        h: pos.h,
        visible: true,
        mandatory: false,
        ...extra,
    };
}

/**
 * Build a fresh exportState with A4 landscape defaults and all 10
 * default elements positioned for that page.
 */
export function createExportState({ person = 'NKUA' } = {}) {
    const page = {
        preset: 'A4',
        widthMm: 297,
        heightMm: 210,
        orientation: 'landscape',
        dpi: 200,
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
    };
    const positions = defaultElementPositions(page);
    const today = new Date().toISOString().slice(0, 10);

    return {
        area: { type: 'whole-island', bbox: null, shape: null },

        page,

        output: {
            format: 'pdf',
            quality: 0.92,
            person,
        },

        layers: {},   // layerId -> Set<entryIndex>; populated by ExportController.openWorkflow

        elements: [
            makeElement('el_map', 'map', positions.el_map, { mandatory: true }),
            makeElement('el_logo_nkua', 'logo', positions.el_logo_nkua, {
                mandatory: true,
                src: 'images/nkua_logo_en.jpg',
            }),
            makeElement('el_logo_eagme', 'logo', positions.el_logo_eagme, {
                mandatory: true,
                src: 'images/eagme_logo_en.png',
            }),
            makeElement('el_title', 'title', positions.el_title, {
                text: 'Geomorphological Map of Naxos',
                textGr: '\u0393\u03B5\u03C9\u03BC\u03BF\u03C1\u03C6\u03BF\u03BB\u03BF\u03B3\u03B9\u03BA\u03CC\u03C2 \u03A7\u03AC\u03C1\u03C4\u03B7\u03C2 \u039D\u03AC\u03BE\u03BF\u03C5',
                fontSize: 16,
                fontWeight: 600,
                align: 'center',
            }),
            makeElement('el_subtitle', 'subtitle', positions.el_subtitle, {
                text: 'Naxos Sheet \u00B7 1:50,000',
                fontSize: 10,
                align: 'center',
            }),
            makeElement('el_legend', 'legend', positions.el_legend, {
                title: 'Legend',
                titleGr: '\u03A5\u03C0\u03CC\u03BC\u03BD\u03B7\u03BC\u03B1',
                fontSize: 9,
                columns: 1,
            }),
            makeElement('el_scale', 'scalebar', positions.el_scale, { unit: 'metric' }),
            makeElement('el_north', 'north-arrow', positions.el_north, { style: 'simple' }),
            makeElement('el_date', 'date', positions.el_date, {
                text: today,
                fontSize: 8,
                align: 'right',
            }),
            makeElement('el_credits', 'credits', positions.el_credits, {
                mandatory: true,
                text: 'Evelpidou, N., Saitis, G., Spyrou, E., Zananiri, I., Zervakou, A., & Liaskos, A. Detailed geomorphological mapping of Naxos island, Greece, at 1:50,000 scale. Journal of Maps (in press). Webmap developed by A. Liaskos.',
                fontSize: 7,
                align: 'center',
            }),
        ],

        status: 'idle',
    };
}

/**
 * Rebuild element positions to the defaults for the current page.
 * Used when the user changes page size/orientation. Only elements
 * that have never been manually moved get reset (tracked via
 * `element._customized` flag) when `onlyUncustomized` is true.
 */
export function resetElementPositions(exportState, onlyUncustomized = true) {
    const positions = defaultElementPositions(exportState.page);
    for (const el of exportState.elements) {
        if (onlyUncustomized && el._customized) continue;
        const p = positions[el.id];
        if (!p) continue;
        el.x = p.x;
        el.y = p.y;
        el.w = p.w;
        el.h = p.h;
        if (!onlyUncustomized) el._customized = false;
    }
}

function sanitizeField(s) {
    if (!s) return '';
    return String(s).trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '');
}

/**
 * Build the suggested filename from state.
 * Pattern: Naxos_Geomorphological_Map-{Person}-YYYYMMDD.{ext}
 */
export function buildFilename(exportState) {
    const person = sanitizeField(exportState.output.person) || 'NKUA';
    const d = new Date();
    const ymd = d.getFullYear().toString() +
                String(d.getMonth() + 1).padStart(2, '0') +
                String(d.getDate()).padStart(2, '0');
    return `Naxos_Geomorphological_Map-${person}-${ymd}.${exportState.output.format}`;
}
