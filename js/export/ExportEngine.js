/**
 * ExportEngine - composes the final export file from exportState + map canvas.
 *
 * Input:  exportState (page, elements, output, layers) + mapCanvas (from PrintMapRenderer)
 * Output: triggers a browser download of the composed file.
 *
 * Four format paths:
 *   - pdf:  vector via jsPDF, with embedded map raster, vector text + primitives
 *   - png:  full-page canvas composite, transparent -> PNG blob
 *   - jpeg: full-page canvas composite, white background -> JPEG blob
 *   - svg:  inline SVG document, map as embedded image href, text as <text>
 */
import { LAYERS } from '../data/LayerConfig.js';
import { assetUrl } from '../data/DataManager.js';
import { buildFilename } from './ExportState.js';

export class ExportEngine {
    /**
     * Main entry point. Composes the file and triggers a browser download.
     * Returns void.
     */
    async export(exportState, mapCanvas) {
        const filename = buildFilename(exportState);
        const format = exportState.output.format;

        let blob;
        if (format === 'pdf') {
            blob = await this._exportPdf(exportState, mapCanvas);
        } else if (format === 'svg') {
            blob = await this._exportSvg(exportState, mapCanvas);
        } else {
            // png / jpeg
            blob = await this._exportRaster(exportState, mapCanvas, format);
        }
        this._triggerDownload(blob, filename);
    }

    // =========================================================================
    //  Raster (PNG / JPEG) path
    // =========================================================================

    async _exportRaster(exportState, mapCanvas, format) {
        const canvas = await this._composeCanvas(exportState, mapCanvas);
        return new Promise((resolve, reject) => {
            const mime = format === 'png' ? 'image/png' : 'image/jpeg';
            const quality = format === 'jpeg' ? exportState.output.quality : undefined;
            canvas.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error('canvas.toBlob failed')),
                mime,
                quality,
            );
        });
    }

    /**
     * Compose the full page onto a single canvas. Shared PNG/JPEG path.
     */
    async _composeCanvas(exportState, mapCanvas) {
        const { page, elements } = exportState;
        const mmToPx = page.dpi / 25.4;
        const W = Math.round(page.widthMm * mmToPx);
        const H = Math.round(page.heightMm * mmToPx);

        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        for (const el of elements) {
            if (!el.visible) continue;
            const x = el.x * mmToPx;
            const y = el.y * mmToPx;
            const w = el.w * mmToPx;
            const h = el.h * mmToPx;
            switch (el.type) {
                case 'map':         ctx.drawImage(mapCanvas, x, y, w, h); break;
                case 'title':
                case 'subtitle':
                case 'date':
                case 'credits':     this._drawText(ctx, el, x, y, w, h, mmToPx); break;
                case 'legend':      await this._drawLegend(ctx, el, exportState, x, y, w, h, mmToPx); break;
                case 'scalebar':    this._drawScaleBar(ctx, el, exportState, x, y, w, h, mmToPx); break;
                case 'north-arrow': this._drawNorthArrow(ctx, x, y, w, h); break;
                case 'logo':        await this._drawLogo(ctx, el, x, y, w, h); break;
            }
        }
        return canvas;
    }

    _drawText(ctx, el, x, y, w, h, mmToPx) {
        const fontSizePx = (el.fontSize || 12) * mmToPx / 3.78;
        const fontWeight = el.fontWeight || 400;
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.font = `${fontWeight} ${fontSizePx}px Inter, sans-serif`;
        ctx.textBaseline = 'top';
        const align = el.align || 'left';
        ctx.textAlign = align;
        const cx = align === 'center' ? x + w / 2 : (align === 'right' ? x + w : x);

        ctx.fillText(el.text || '', cx, y);
        if (el.textGr) {
            ctx.font = `${Math.max(300, fontWeight - 100)} ${fontSizePx * 0.75}px Inter, sans-serif`;
            ctx.fillStyle = '#555';
            ctx.fillText(el.textGr, cx, y + fontSizePx * 1.1);
        }
        ctx.restore();
    }

    async _drawLegend(ctx, el, exportState, x, y, w, h, mmToPx) {
        ctx.save();
        ctx.strokeStyle = '#999';
        ctx.lineWidth = Math.max(1, mmToPx * 0.2);
        ctx.strokeRect(x, y, w, h);

        const padding = 4 * mmToPx / 3.78;
        let cy = y + padding;

        // Title
        const titleFontPx = (el.fontSize || 10) * mmToPx / 3.78 * 1.2;
        ctx.fillStyle = '#000';
        ctx.font = `600 ${titleFontPx}px Inter, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(el.title || 'Legend', x + padding, cy);
        cy += titleFontPx * 1.4;

        // Collect visible legend entries from exportState.layers
        const entries = [];
        for (const [layerId, visibleSet] of Object.entries(exportState.layers)) {
            const config = LAYERS[layerId];
            if (!config || !config.legendEntries) continue;
            config.legendEntries.forEach((entry, idx) => {
                if (!visibleSet.has(idx)) return;
                entries.push({ entry, config });
            });
        }

        const rowFontPx = (el.fontSize || 9) * mmToPx / 3.78;
        const swatchSize = rowFontPx * 1.3;
        const rowHeight = swatchSize + 4;

        for (const { entry, config } of entries) {
            if (cy + rowHeight > y + h - padding) break;
            const sx = x + padding;
            const sy = cy;

            if (entry.symbolIcon) {
                try {
                    const img = await this._loadImage(assetUrl('symbols/' + entry.symbolIcon));
                    ctx.drawImage(img, sx, sy, swatchSize, swatchSize);
                } catch (_) { /* skip missing icon */ }
            } else if (entry.style && entry.style.fillColor && entry.style.fillColor !== 'transparent') {
                ctx.fillStyle = entry.style.fillColor;
                ctx.fillRect(sx, sy, swatchSize, swatchSize);
                ctx.strokeStyle = entry.style.color || '#999';
                ctx.strokeRect(sx, sy, swatchSize, swatchSize);
            } else if (entry.style && entry.style.color) {
                ctx.strokeStyle = entry.style.color;
                ctx.lineWidth = Math.max(1, (entry.style.weight || 1) * mmToPx / 3.78);
                ctx.beginPath();
                ctx.moveTo(sx, sy + swatchSize / 2);
                ctx.lineTo(sx + swatchSize, sy + swatchSize / 2);
                ctx.stroke();
            }

            ctx.fillStyle = '#000';
            ctx.font = `400 ${rowFontPx}px Inter, sans-serif`;
            ctx.fillText(entry.label || '', sx + swatchSize + 4, sy);
            if (entry.labelGr) {
                ctx.fillStyle = '#666';
                ctx.font = `300 ${rowFontPx * 0.85}px Inter, sans-serif`;
                ctx.fillText(entry.labelGr, sx + swatchSize + 4, sy + rowFontPx * 0.95);
            }
            cy += rowHeight;
        }
        ctx.restore();
    }

    _drawScaleBar(ctx, el, exportState, x, y, w, h, mmToPx) {
        ctx.save();
        // Compute real-world distance covered by the bar width
        const [west, south, east] = exportState.area.bbox;
        const mapEl = exportState.elements.find(e => e.type === 'map');
        const mapWidthMeters = this._haversineMeters(south, west, south, east);
        const barMeters = mapWidthMeters * (el.w / mapEl.w);

        // Round to a nice 1/2/5 * 10^n value
        const pow = Math.pow(10, Math.floor(Math.log10(barMeters)));
        const niceSteps = [1, 2, 5, 10];
        let niceMeters = pow;
        for (const s of niceSteps) {
            if (s * pow <= barMeters) niceMeters = s * pow;
        }
        const niceRatio = niceMeters / barMeters;
        const actualBarPx = w * niceRatio;

        const barH = h * 0.35;
        const yBar = y + h - barH;
        ctx.fillStyle = '#000';
        ctx.fillRect(x, yBar, actualBarPx, barH);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, yBar, actualBarPx, barH);

        const label = niceMeters >= 1000
            ? `${(niceMeters / 1000).toFixed(niceMeters % 1000 === 0 ? 0 : 1)} km`
            : `${niceMeters.toFixed(0)} m`;
        ctx.fillStyle = '#000';
        ctx.font = `500 ${(h - barH) * 0.7}px Inter, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText(label, x, y);
        ctx.restore();
    }

    _haversineMeters(lat1, lon1, lat2, lon2) {
        const R = 6378137;
        const toRad = (d) => d * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) ** 2 +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    _drawNorthArrow(ctx, x, y, w, h) {
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        const cx = x + w / 2;
        const arrowH = h * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx - w * 0.3, y + arrowH);
        ctx.lineTo(cx + w * 0.3, y + arrowH);
        ctx.closePath();
        ctx.fill();
        ctx.font = `bold ${h * 0.22}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('N', cx, y + h);
        ctx.restore();
    }

    async _drawLogo(ctx, el, x, y, w, h) {
        try {
            const img = await this._loadImage(assetUrl(el.src));
            ctx.drawImage(img, x, y, w, h);
        } catch (_) { /* skip on failure */ }
    }

    _loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('image load failed: ' + url));
            img.src = url;
        });
    }

    // =========================================================================
    //  PDF path (jsPDF)
    // =========================================================================

    async _exportPdf(exportState, mapCanvas) {
        const { page, elements } = exportState;
        const jsPDF = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDF) throw new Error('jsPDF not loaded');

        const doc = new jsPDF({
            orientation: page.orientation,
            unit: 'mm',
            format: [page.widthMm, page.heightMm],
            compress: true,
        });

        for (const el of elements) {
            if (!el.visible) continue;
            switch (el.type) {
                case 'map':
                    doc.addImage(mapCanvas, 'PNG', el.x, el.y, el.w, el.h, undefined, 'FAST');
                    break;
                case 'title':
                case 'subtitle':
                case 'date':
                case 'credits':
                    this._pdfDrawText(doc, el);
                    break;
                case 'logo':
                    await this._pdfDrawLogo(doc, el);
                    break;
                case 'legend':
                    await this._pdfDrawLegend(doc, el, exportState);
                    break;
                case 'scalebar':
                    this._pdfDrawScaleBar(doc, el, exportState);
                    break;
                case 'north-arrow':
                    this._pdfDrawNorth(doc, el);
                    break;
            }
        }
        return doc.output('blob');
    }

    _pdfDrawText(doc, el) {
        doc.setFont('helvetica', el.fontWeight && el.fontWeight >= 600 ? 'bold' : 'normal');
        doc.setFontSize(el.fontSize || 12);
        doc.setTextColor(0, 0, 0);
        const align = el.align || 'left';
        const tx = align === 'center' ? el.x + el.w / 2 :
                   align === 'right'  ? el.x + el.w : el.x;
        const ty = el.y + (el.fontSize || 12) * 0.35;
        doc.text(el.text || '', tx, ty, { align });
        if (el.textGr) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize((el.fontSize || 12) * 0.75);
            doc.setTextColor(85, 85, 85);
            doc.text(el.textGr, tx, ty + (el.fontSize || 12) * 0.5, { align });
        }
    }

    async _pdfDrawLogo(doc, el) {
        try {
            const img = await this._loadImage(assetUrl(el.src));
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            doc.addImage(canvas, 'PNG', el.x, el.y, el.w, el.h);
        } catch (_) { /* skip */ }
    }

    async _pdfDrawLegend(doc, el, exportState) {
        doc.setDrawColor(153, 153, 153);
        doc.setLineWidth(0.2);
        doc.rect(el.x, el.y, el.w, el.h);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(el.fontSize || 10);
        doc.setTextColor(0, 0, 0);
        let cy = el.y + 4;
        doc.text(el.title || 'Legend', el.x + 3, cy);
        cy += (el.fontSize || 10) * 0.55;

        doc.setFont('helvetica', 'normal');
        const rowFontPt = (el.fontSize || 9) * 0.9;
        doc.setFontSize(rowFontPt);
        const rowH = rowFontPt * 0.5;
        const swatchMm = rowFontPt * 0.4;

        for (const [layerId, visibleSet] of Object.entries(exportState.layers)) {
            const cfg = LAYERS[layerId];
            if (!cfg || !cfg.legendEntries) continue;
            for (let i = 0; i < cfg.legendEntries.length; i++) {
                if (!visibleSet.has(i)) continue;
                if (cy + rowH > el.y + el.h - 3) break;
                const entry = cfg.legendEntries[i];
                const sx = el.x + 3;
                const sy = cy;

                if (entry.style && entry.style.fillColor && entry.style.fillColor !== 'transparent') {
                    const rgb = this._parseColor(entry.style.fillColor);
                    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
                    doc.rect(sx, sy - swatchMm, swatchMm, swatchMm, 'F');
                } else if (entry.style && entry.style.color) {
                    const rgb = this._parseColor(entry.style.color);
                    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
                    doc.setLineWidth(entry.style.weight || 0.5);
                    doc.line(sx, sy - swatchMm / 2, sx + swatchMm, sy - swatchMm / 2);
                }
                doc.setTextColor(0, 0, 0);
                doc.text(entry.label || '', sx + swatchMm + 1.5, sy);
                if (entry.labelGr) {
                    doc.setTextColor(102, 102, 102);
                    doc.setFontSize(rowFontPt * 0.85);
                    doc.text(entry.labelGr, sx + swatchMm + 1.5, sy + rowH * 0.7);
                    doc.setFontSize(rowFontPt);
                }
                cy += rowH * 1.2;
            }
        }
    }

    _pdfDrawScaleBar(doc, el, exportState) {
        const [west, south, east] = exportState.area.bbox;
        const mapEl = exportState.elements.find(e => e.type === 'map');
        const mapWidthMeters = this._haversineMeters(south, west, south, east);
        const barMeters = mapWidthMeters * (el.w / mapEl.w);

        const pow = Math.pow(10, Math.floor(Math.log10(barMeters)));
        const niceSteps = [1, 2, 5, 10];
        let niceMeters = pow;
        for (const s of niceSteps) if (s * pow <= barMeters) niceMeters = s * pow;
        const actualBarMm = el.w * (niceMeters / barMeters);

        const barH = el.h * 0.35;
        const yBar = el.y + el.h - barH;
        doc.setFillColor(0, 0, 0);
        doc.rect(el.x, yBar, actualBarMm, barH, 'F');

        const label = niceMeters >= 1000
            ? `${(niceMeters / 1000).toFixed(niceMeters % 1000 === 0 ? 0 : 1)} km`
            : `${niceMeters.toFixed(0)} m`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Math.max(6, (el.h - barH) * 2.5));
        doc.setTextColor(0, 0, 0);
        doc.text(label, el.x, el.y + (el.h - barH) * 0.9);
    }

    _pdfDrawNorth(doc, el) {
        const cx = el.x + el.w / 2;
        const arrowH = el.h * 0.7;
        doc.setFillColor(0, 0, 0);
        doc.triangle(cx, el.y, cx - el.w * 0.3, el.y + arrowH, cx + el.w * 0.3, el.y + arrowH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(6, el.h * 0.6));
        doc.text('N', cx, el.y + el.h - 0.5, { align: 'center' });
    }

    _parseColor(s) {
        if (!s) return [0, 0, 0];
        if (s[0] === '#') {
            if (s.length === 4) {
                return [
                    parseInt(s[1] + s[1], 16),
                    parseInt(s[2] + s[2], 16),
                    parseInt(s[3] + s[3], 16),
                ];
            }
            return [
                parseInt(s.slice(1, 3), 16),
                parseInt(s.slice(3, 5), 16),
                parseInt(s.slice(5, 7), 16),
            ];
        }
        const m = s.match(/rgba?\(([^)]+)\)/);
        if (m) {
            const parts = m[1].split(',').map(p => parseFloat(p.trim()));
            return [parts[0] | 0, parts[1] | 0, parts[2] | 0];
        }
        return [0, 0, 0];
    }

    // =========================================================================
    //  SVG path
    // =========================================================================

    async _exportSvg(exportState, mapCanvas) {
        const { page, elements } = exportState;
        const W = page.widthMm;
        const H = page.heightMm;
        const mapDataUrl = mapCanvas.toDataURL('image/png');

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">`;
        svg += `<rect width="${W}" height="${H}" fill="#ffffff"/>`;

        for (const el of elements) {
            if (!el.visible) continue;
            if (el.type === 'map') {
                svg += `<image x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" href="${mapDataUrl}"/>`;
            } else if (el.type === 'title' || el.type === 'subtitle' || el.type === 'date' || el.type === 'credits') {
                const align = el.align === 'center' ? 'middle' :
                              el.align === 'right'  ? 'end' : 'start';
                const tx = align === 'middle' ? el.x + el.w / 2 :
                           align === 'end'    ? el.x + el.w : el.x;
                const fs = (el.fontSize || 12) * 0.35;
                svg += `<text x="${tx}" y="${el.y + fs}" font-family="Inter, sans-serif" font-size="${fs}" font-weight="${el.fontWeight || 400}" text-anchor="${align}" fill="#000">${this._xmlEscape(el.text || '')}</text>`;
                if (el.textGr) {
                    svg += `<text x="${tx}" y="${el.y + fs * 2.1}" font-family="Inter, sans-serif" font-size="${fs * 0.75}" font-weight="300" text-anchor="${align}" fill="#555">${this._xmlEscape(el.textGr)}</text>`;
                }
            }
            // legend, scalebar, north-arrow, logo omitted in SVG output (documented out-of-scope for this task)
        }
        svg += '</svg>';
        return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    }

    _xmlEscape(s) {
        return String(s).replace(/[<>&"']/g, (c) => ({
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            '\'': '&apos;',
        }[c]));
    }

    // =========================================================================
    //  Download trigger
    // =========================================================================

    _triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
