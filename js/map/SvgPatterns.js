/**
 * SvgPatterns - manages SVG <pattern> definitions used as polygon fills.
 *
 * Patterns are inserted into a single <defs> element appended to Leaflet's
 * SVG overlay container, then referenced by polygons via fill="url(#id)".
 */
import { assetUrl } from '../data/DataManager.js';

export class SvgPatterns {
    constructor(map) {
        this.map = map;
        this.defs = null;
        this.registered = new Set();
    }

    init() {
        const svg = this.map.getRenderer({ padding: 0.5 })?._container
                    || this.map.getPanes().overlayPane.querySelector('svg');
        if (!svg) {
            setTimeout(() => this.init(), 100);
            return;
        }

        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.insertBefore(defs, svg.firstChild);
        }
        this.defs = defs;

        this.registerAllPatterns();
    }

    registerAllPatterns() {
        // Image-based pattern tiles — all with subtle tinted backgrounds for visibility
        this.addImagePattern('pattern-hum', assetUrl('symbols/pattern_hum.png'), 50, 50, 'rgba(180,160,120,0.45)');
        this.addImagePattern('pattern-tafoni', assetUrl('symbols/pattern_tafoni.png'), 32, 32, 'rgba(200,180,150,0.5)');
        this.addImagePattern('pattern-tor', assetUrl('symbols/pattern_tor.png'), 48, 48, 'rgba(170,150,120,0.45)');
        this.addImagePattern('pattern-tombolo-dot', assetUrl('symbols/pattern_tombolo_dot.png'), 32, 32, 'rgba(254,250,188,0.7)');
        this.addImagePattern('pattern-tombolo', assetUrl('symbols/pattern_tombolo_dot.png'), 32, 32, '#fefabc');
        this.addImagePattern('pattern-submerged-tombolo', assetUrl('symbols/pattern_tombolo_dot.png'), 32, 32, '#fefabc');
        this.addImagePattern('pattern-colluvium', assetUrl('symbols/colluvium_pattern.png'), 24, 24, 'rgba(255,235,180,0.55)');
        this.addImagePattern('pattern-sand-dunes', assetUrl('symbols/pattern_sand_dunes.png'), 76, 80, 'rgba(255,240,180,0.6)');
        this.addImagePattern('pattern-artificial-lake', assetUrl('symbols/pattern_artificial_lake.png'), 24, 24, 'rgba(80,140,200,0.6)');

        // Hatch line patterns — with translucent backgrounds for visibility
        this.addHatchPattern('hatch-dense', { angle: 0, separation: 4, color: '#000', strokeWidth: 1, background: 'rgba(120,120,120,0.35)' });
        this.addHatchPattern('hatch-horizontal-brown', { angle: 0, separation: 5, color: '#8B4513', strokeWidth: 1, background: 'rgba(180,140,90,0.4)' });
        this.addHatchPattern('hatch-horizontal', { angle: 0, separation: 5, color: '#000', strokeWidth: 0.8, background: 'rgba(254,250,188,0.55)' });
        this.addCrosshatchPattern('crosshatch', { separation: 6, color: '#000', strokeWidth: 0.6, background: 'rgba(204,235,255,0.55)' });

        // Dot patterns — bigger dots, larger spacing, with tinted backgrounds
        this.addDotPattern('dots-red', { color: '#e60000', radius: 1.5, spacing: 10, background: 'rgba(255,200,200,0.4)' });
        this.addDotPattern('dots-black', { color: '#000', radius: 1.2, spacing: 9, background: 'rgba(200,200,200,0.4)' });
        this.addDotPattern('dots-orange', { color: '#ff7f00', radius: 1.5, spacing: 8, background: 'rgba(255,220,170,0.55)' });

        // Specialty
        this.addMarshPattern('marsh');
        this.addKarrenPattern('karren-glyphs');
    }

    addImagePattern(id, href, width, height, background = null) {
        if (this.registered.has(id)) return;
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', id);
        pattern.setAttribute('x', '0');
        pattern.setAttribute('y', '0');
        pattern.setAttribute('width', width);
        pattern.setAttribute('height', height);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');

        if (background) {
            const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bg.setAttribute('width', width);
            bg.setAttribute('height', height);
            bg.setAttribute('fill', background);
            pattern.appendChild(bg);
        }

        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('href', href);
        image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
        image.setAttribute('x', '0');
        image.setAttribute('y', '0');
        image.setAttribute('width', width);
        image.setAttribute('height', height);
        pattern.appendChild(image);

        this.defs.appendChild(pattern);
        this.registered.add(id);
    }

    addHatchPattern(id, { angle = 0, separation = 4, color = '#000', strokeWidth = 0.5, background = null }) {
        if (this.registered.has(id)) return;
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', id);
        pattern.setAttribute('x', '0');
        pattern.setAttribute('y', '0');
        pattern.setAttribute('width', separation);
        pattern.setAttribute('height', separation);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');
        pattern.setAttribute('patternTransform', `rotate(${angle})`);

        if (background) {
            const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bg.setAttribute('width', separation);
            bg.setAttribute('height', separation);
            bg.setAttribute('fill', background);
            pattern.appendChild(bg);
        }

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '0');
        line.setAttribute('y1', '0');
        line.setAttribute('x2', '0');
        line.setAttribute('y2', separation);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', strokeWidth);
        pattern.appendChild(line);

        this.defs.appendChild(pattern);
        this.registered.add(id);
    }

    addCrosshatchPattern(id, { separation = 4, color = '#000', strokeWidth = 0.4, background = null }) {
        if (this.registered.has(id)) return;
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', id);
        pattern.setAttribute('width', separation);
        pattern.setAttribute('height', separation);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');

        if (background) {
            const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bg.setAttribute('width', separation);
            bg.setAttribute('height', separation);
            bg.setAttribute('fill', background);
            pattern.appendChild(bg);
        }

        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', '0');
        line1.setAttribute('y1', '0');
        line1.setAttribute('x2', separation);
        line1.setAttribute('y2', separation);
        line1.setAttribute('stroke', color);
        line1.setAttribute('stroke-width', strokeWidth);
        pattern.appendChild(line1);

        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', '0');
        line2.setAttribute('y1', separation);
        line2.setAttribute('x2', separation);
        line2.setAttribute('y2', '0');
        line2.setAttribute('stroke', color);
        line2.setAttribute('stroke-width', strokeWidth);
        pattern.appendChild(line2);

        this.defs.appendChild(pattern);
        this.registered.add(id);
    }

    addDotPattern(id, { color = '#000', radius = 0.8, spacing = 7, background = null }) {
        if (this.registered.has(id)) return;
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', id);
        pattern.setAttribute('width', spacing);
        pattern.setAttribute('height', spacing);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');

        if (background) {
            const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bg.setAttribute('width', spacing);
            bg.setAttribute('height', spacing);
            bg.setAttribute('fill', background);
            pattern.appendChild(bg);
        }

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', spacing / 2);
        circle.setAttribute('cy', spacing / 2);
        circle.setAttribute('r', radius);
        circle.setAttribute('fill', color);
        pattern.appendChild(circle);

        this.defs.appendChild(pattern);
        this.registered.add(id);
    }

    addMarshPattern(id) {
        if (this.registered.has(id)) return;
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', id);
        pattern.setAttribute('width', 20);
        pattern.setAttribute('height', 16);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', 20);
        bg.setAttribute('height', 16);
        bg.setAttribute('fill', '#ffffff');
        pattern.appendChild(bg);

        for (const [x, y] of [[2, 4], [10, 4], [6, 10], [14, 10]]) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', y);
            line.setAttribute('x2', x + 4);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', '#1a4d1a');
            line.setAttribute('stroke-width', 0.6);
            pattern.appendChild(line);
        }

        this.defs.appendChild(pattern);
        this.registered.add(id);
    }

    addKarrenPattern(id) {
        if (this.registered.has(id)) return;
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', id);
        pattern.setAttribute('width', 17);
        pattern.setAttribute('height', 11);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');

        for (const x of [2, 8, 14]) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', 2);
            line.setAttribute('x2', x);
            line.setAttribute('y2', 9);
            line.setAttribute('stroke', '#3a2a1a');
            line.setAttribute('stroke-width', 0.6);
            pattern.appendChild(line);
        }

        this.defs.appendChild(pattern);
        this.registered.add(id);
    }
}
