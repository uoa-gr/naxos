/**
 * SvgPatterns - manages SVG <pattern> definitions used as polygon fills.
 *
 * Patterns are inserted into a single <defs> element appended to Leaflet's
 * SVG overlay container, then referenced by polygons via fill="url(#id)".
 */
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
        // Image-based pattern tiles
        this.addImagePattern('pattern-hum', 'assets/symbols/pattern_hum.png', 50, 50);
        this.addImagePattern('pattern-tafoni', 'assets/symbols/pattern_tafoni.png', 32, 32);
        this.addImagePattern('pattern-tor', 'assets/symbols/pattern_tor.png', 48, 48);
        this.addImagePattern('pattern-tombolo-dot', 'assets/symbols/pattern_tombolo_dot.png', 32, 32);
        this.addImagePattern('pattern-tombolo', 'assets/symbols/pattern_tombolo_dot.png', 32, 32, '#fefabc');
        this.addImagePattern('pattern-submerged-tombolo', 'assets/symbols/pattern_tombolo_dot.png', 32, 32, '#fefabc');
        this.addImagePattern('pattern-colluvium', 'assets/symbols/colluvium_pattern.png', 24, 24);
        this.addImagePattern('pattern-sand-dunes', 'assets/symbols/pattern_sand_dunes.png', 76, 80);
        this.addImagePattern('pattern-artificial-lake', 'assets/symbols/pattern_artificial_lake.png', 24, 24);

        // Hatch line patterns
        this.addHatchPattern('hatch-dense', { angle: 0, separation: 2, color: '#000', strokeWidth: 0.6 });
        this.addHatchPattern('hatch-horizontal-brown', { angle: 90, separation: 4, color: '#8B4513', strokeWidth: 0.6 });
        this.addHatchPattern('hatch-horizontal', { angle: 90, separation: 3, color: '#000', strokeWidth: 0.5 });
        this.addCrosshatchPattern('crosshatch', { separation: 4, color: '#000', strokeWidth: 0.4 });

        // Dot patterns
        this.addDotPattern('dots-red', { color: '#e60000', radius: 0.8, spacing: 8 });
        this.addDotPattern('dots-black', { color: '#000', radius: 0.7, spacing: 7 });
        this.addDotPattern('dots-orange', { color: '#ffa500', radius: 0.9, spacing: 6 });

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

    addHatchPattern(id, { angle = 0, separation = 4, color = '#000', strokeWidth = 0.5 }) {
        if (this.registered.has(id)) return;
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', id);
        pattern.setAttribute('x', '0');
        pattern.setAttribute('y', '0');
        pattern.setAttribute('width', separation);
        pattern.setAttribute('height', separation);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');
        pattern.setAttribute('patternTransform', `rotate(${angle})`);

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

    addCrosshatchPattern(id, { separation = 4, color = '#000', strokeWidth = 0.4 }) {
        if (this.registered.has(id)) return;
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', id);
        pattern.setAttribute('width', separation);
        pattern.setAttribute('height', separation);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');

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

    addDotPattern(id, { color = '#000', radius = 0.8, spacing = 7 }) {
        if (this.registered.has(id)) return;
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', id);
        pattern.setAttribute('width', spacing);
        pattern.setAttribute('height', spacing);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');

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
