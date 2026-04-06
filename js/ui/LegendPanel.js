/**
 * LegendPanel - Renders the complete bilingual legend with symbol images
 * grouped by geomorphological environment, plus credits section.
 */
import { LAYERS, LAYER_GROUPS } from '../data/LayerConfig.js';

export class LegendPanel {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.legendContainer = null;
        this.creditsContainer = null;
    }

    init() {
        this.legendContainer = document.getElementById('legend-panel');
        this.creditsContainer = document.getElementById('credits-panel');

        if (this.creditsContainer) {
            // Order in the right sidebar:
            //   1. Title block (always visible)
            //   2. Project Info section (collapsible)
            //   3. Reference Maps section (collapsible)
            this._renderTitle();
            this._renderCredits();
            this.renderInsets();
        }
        if (this.legendContainer) {
            this._renderLegend();
        }

        return true;
    }

    /**
     * Create a collapsible section with a header toggle and a body container.
     * Returns the inner body element so callers can append their content into it.
     */
    _makeCollapsibleSection(label, labelGr, { expanded = true } = {}) {
        const section = document.createElement('div');
        section.className = 'legend-group';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'legend-group-toggle';
        toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');

        const arrow = document.createElement('span');
        arrow.className = 'legend-group-arrow';
        arrow.textContent = '\u25B8';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'legend-group-label';
        labelSpan.textContent = label;

        toggleBtn.appendChild(arrow);
        toggleBtn.appendChild(labelSpan);

        if (labelGr) {
            const labelGrSpan = document.createElement('span');
            labelGrSpan.className = 'legend-group-label-gr';
            labelGrSpan.textContent = labelGr;
            toggleBtn.appendChild(labelGrSpan);
        }

        const body = document.createElement('div');
        body.className = 'legend-group-items' + (expanded ? '' : ' collapsed');

        toggleBtn.addEventListener('click', () => {
            const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
            toggleBtn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
            body.classList.toggle('collapsed');
        });

        section.appendChild(toggleBtn);
        section.appendChild(body);
        return { section, body };
    }

    renderInsets() {
        const container = this.creditsContainer;
        if (!container) return;

        const { section, body } = this._makeCollapsibleSection(
            'Reference Maps',
            '\u03A7\u03AC\u03C1\u03C4\u03B5\u03C2 \u0391\u03BD\u03B1\u03C6\u03BF\u03C1\u03AC\u03C2',
            { expanded: false }
        );
        body.classList.add('inset-maps-body');

        const locDiv = document.createElement('div');
        locDiv.className = 'inset-map';
        const locImg = document.createElement('img');
        locImg.src = 'assets/images/location_inset.png';
        locImg.alt = 'Location of Naxos in Greece';
        locDiv.appendChild(locImg);
        body.appendChild(locDiv);

        const geoDiv = document.createElement('div');
        geoDiv.className = 'inset-map';
        const geoImg = document.createElement('img');
        geoImg.src = 'assets/images/geology_inset.png';
        geoImg.alt = 'Simplified geological map of Naxos';
        geoDiv.appendChild(geoImg);
        body.appendChild(geoDiv);

        container.appendChild(section);
    }

    // -----------------------------------------------------------------------
    //  Legend rendering
    // -----------------------------------------------------------------------

    _renderLegend() {
        // Build a map: groupId -> array of legend entries (with geomType info)
        const groupEntries = {};
        for (const group of LAYER_GROUPS) {
            groupEntries[group.id] = [];
        }

        for (const layer of Object.values(LAYERS)) {
            const groupId = layer.group;
            // Utility layers with group: null go into 'general' (Topography)
            const targetGroup = groupId || 'general';
            if (!groupEntries[targetGroup]) {
                groupEntries[targetGroup] = [];
            }
            for (const entry of layer.legendEntries) {
                groupEntries[targetGroup].push({
                    ...entry,
                    geomType: layer.geomType,
                });
            }
        }

        // Render each group in order
        const fragment = document.createDocumentFragment();
        for (const group of LAYER_GROUPS) {
            const entries = groupEntries[group.id];
            if (!entries || entries.length === 0) continue;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'legend-group';

            // Toggle button
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'legend-group-toggle';
            toggleBtn.setAttribute('aria-expanded', group.expanded ? 'true' : 'false');

            const arrow = document.createElement('span');
            arrow.className = 'legend-group-arrow';
            arrow.textContent = '\u25B8';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'legend-group-label';
            labelSpan.textContent = group.label;

            const labelGrSpan = document.createElement('span');
            labelGrSpan.className = 'legend-group-label-gr';
            labelGrSpan.textContent = group.labelGr;

            toggleBtn.appendChild(arrow);
            toggleBtn.appendChild(labelSpan);
            toggleBtn.appendChild(labelGrSpan);

            // Items container
            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'legend-group-items' + (group.expanded ? '' : ' collapsed');

            for (const entry of entries) {
                itemsDiv.appendChild(this._renderItem(entry));
            }

            // Toggle collapse behavior
            toggleBtn.addEventListener('click', () => {
                const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                toggleBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                itemsDiv.classList.toggle('collapsed');
            });

            groupDiv.appendChild(toggleBtn);
            groupDiv.appendChild(itemsDiv);
            fragment.appendChild(groupDiv);
        }

        this.legendContainer.appendChild(fragment);
    }

    _renderItem(entry) {
        const item = document.createElement('div');
        item.className = 'legend-item';

        // Swatch
        const swatch = document.createElement('span');
        swatch.className = 'legend-swatch';

        if (entry.symbolIcon) {
            // Point layer or line layer with a symbol icon — show image
            const img = document.createElement('img');
            img.src = 'assets/symbols/' + entry.symbolIcon;
            img.alt = '';
            img.width = 20;
            img.height = 20;
            swatch.appendChild(img);
        } else if (entry.patternIcon) {
            // Pattern-based polygon — show the pattern icon as a small image
            const img = document.createElement('img');
            img.src = 'assets/symbols/' + entry.patternIcon;
            img.alt = '';
            img.width = 20;
            img.height = 20;
            swatch.appendChild(img);
        } else if (entry.geomType === 'line' && entry.style) {
            // Line swatch — small SVG
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '24');
            svg.setAttribute('height', '12');
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', '6');
            line.setAttribute('x2', '24');
            line.setAttribute('y2', '6');
            line.setAttribute('stroke', entry.style.color || '#000');
            line.setAttribute('stroke-width', String(entry.style.weight || 2));
            if (entry.style.dashArray) {
                line.setAttribute('stroke-dasharray', entry.style.dashArray);
            }
            svg.appendChild(line);
            swatch.appendChild(svg);
        } else if (entry.geomType === 'polygon' && entry.style) {
            // Polygon swatch — colored rectangle
            const fillColor = entry.style.fillColor && entry.style.fillColor !== 'transparent'
                ? entry.style.fillColor
                : (entry.style.color || '#ccc');
            const borderColor = entry.style.color || '#6e6e6e';
            const rect = document.createElement('span');
            rect.className = 'swatch-rect';
            rect.style.background = fillColor;
            rect.style.border = '1px solid ' + borderColor;
            swatch.appendChild(rect);
        } else if (entry.patternType && entry.style) {
            // Pattern polygon with no icon — show a small colored rectangle with border
            const borderColor = entry.style.color || '#6e6e6e';
            const fillColor = entry.style.fillColor && entry.style.fillColor !== 'transparent'
                ? entry.style.fillColor
                : '#eee';
            const rect = document.createElement('span');
            rect.className = 'swatch-rect';
            rect.style.background = fillColor;
            rect.style.border = '1px solid ' + borderColor;
            swatch.appendChild(rect);
        } else {
            // Fallback — empty swatch (e.g. text-only labels like "Place names")
            const dash = document.createElement('span');
            dash.textContent = '\u2014';
            swatch.appendChild(dash);
        }

        // Labels
        const label = document.createElement('span');
        label.className = 'legend-label';
        label.textContent = entry.label || '';

        const labelGr = document.createElement('span');
        labelGr.className = 'legend-label-gr';
        labelGr.textContent = entry.labelGr || '';

        item.appendChild(swatch);
        item.appendChild(label);
        item.appendChild(labelGr);

        return item;
    }

    // -----------------------------------------------------------------------
    //  Credits rendering
    // -----------------------------------------------------------------------

    _renderTitle() {
        const titleSection = document.createElement('div');
        titleSection.className = 'credits-title-section';

        const h3 = document.createElement('h3');
        h3.className = 'credits-main-title';
        h3.appendChild(document.createTextNode('Geomorphological Map of Greece'));
        h3.appendChild(document.createElement('br'));
        h3.appendChild(document.createTextNode('\u0393\u03B5\u03C9\u03BC\u03BF\u03C1\u03C6\u03BF\u03BB\u03BF\u03B3\u03B9\u03BA\u03CC\u03C2 \u03A7\u03AC\u03C1\u03C4\u03B7\u03C2 \u0395\u03BB\u03BB\u03AC\u03B4\u03BF\u03C2'));
        titleSection.appendChild(h3);

        const subtitle = document.createElement('p');
        subtitle.className = 'credits-subtitle';
        subtitle.appendChild(document.createTextNode('Naxos Sheet \u2014 \u03A6\u03CD\u03BB\u03BB\u03BF \u039D\u03AC\u03BE\u03BF\u03C5'));
        subtitle.appendChild(document.createElement('br'));
        subtitle.appendChild(document.createTextNode('Scale 1:50,000'));
        titleSection.appendChild(subtitle);

        this.creditsContainer.appendChild(titleSection);
    }

    _renderCredits() {
        const { section: collapsible, body: section } = this._makeCollapsibleSection(
            'Project Info',
            '\u03A0\u03BB\u03B7\u03C1\u03BF\u03C6\u03BF\u03C1\u03AF\u03B5\u03C2',
            { expanded: false }
        );
        section.classList.add('credits-section');

        // Logos
        const logosDiv = document.createElement('div');
        logosDiv.className = 'credits-logos';
        const nkuaImg = document.createElement('img');
        nkuaImg.src = 'assets/images/nkua_logo_en.jpg';
        nkuaImg.alt = 'NKUA';
        nkuaImg.className = 'credit-logo';
        const eagmeImg = document.createElement('img');
        eagmeImg.src = 'assets/images/eagme_logo_en.png';
        eagmeImg.alt = 'HSGME';
        eagmeImg.className = 'credit-logo';
        logosDiv.appendChild(nkuaImg);
        logosDiv.appendChild(eagmeImg);
        section.appendChild(logosDiv);

        // Team info
        const teamDiv = document.createElement('div');
        teamDiv.className = 'credits-team';

        const teamEntries = [
            { bold: 'Project:', text: ' Contribution to the production of the Geomorphological Map of Greece' },
            { bold: 'Assigned Authority:', text: ' Hellenic Survey of Geology & Mineral Exploration (H.S.G.M.E.)' },
            { bold: 'Contractor:', text: ' National and Kapodistrian University of Athens (N.K.U.A.)' },
        ];

        for (const e of teamEntries) {
            const p = document.createElement('p');
            const strong = document.createElement('strong');
            strong.textContent = e.bold;
            p.appendChild(strong);
            p.appendChild(document.createTextNode(e.text));
            teamDiv.appendChild(p);
        }

        // Scientific Team heading
        const teamHeading = document.createElement('p');
        const teamStrong = document.createElement('strong');
        teamStrong.textContent = 'Scientific Team:';
        teamHeading.appendChild(teamStrong);
        teamDiv.appendChild(teamHeading);

        // Team list
        const ul = document.createElement('ul');
        const members = [
            'Dr. Dr. MSc Niki Evelpidou (Professor, N.K.U.A.)',
            'Dr. Irene Zananiri (H.S.G.M.E.)',
            'MSc Alexandra Zervakou (H.S.G.M.E.)',
            'Dr. Giannis Saitis (N.K.U.A.)',
            'MSc Evangelos Spyrou (N.K.U.A.)',
        ];
        for (const member of members) {
            const li = document.createElement('li');
            li.textContent = member;
            ul.appendChild(li);
        }
        teamDiv.appendChild(ul);

        // Publication year
        const pubYear = document.createElement('p');
        const pubStrong = document.createElement('strong');
        pubStrong.textContent = 'Publication year:';
        pubYear.appendChild(pubStrong);
        pubYear.appendChild(document.createTextNode(' 2025'));
        teamDiv.appendChild(pubYear);

        // Reference system
        const refP = document.createElement('p');
        refP.className = 'credits-ref';
        refP.textContent = "Reference System: EGSA'87 / WGS'84";
        teamDiv.appendChild(refP);

        section.appendChild(teamDiv);
        this.creditsContainer.appendChild(collapsible);
    }
}
