/**
 * LegendPanel - Renders the complete bilingual legend with symbol images
 * grouped by geomorphological environment, plus credits section.
 */
import { LAYERS, LAYER_GROUPS } from '../data/LayerConfig.js';
import { assetUrl } from '../data/DataManager.js';

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
            //   1. Project Info section (collapsible)
            //   2. Reference Maps section (collapsible)
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
        locImg.src = assetUrl('images/location_inset.png');
        locImg.alt = 'Location of Naxos in Greece';
        locDiv.appendChild(locImg);
        body.appendChild(locDiv);

        const geoDiv = document.createElement('div');
        geoDiv.className = 'inset-map';
        const geoImg = document.createElement('img');
        geoImg.src = assetUrl('images/geology_inset.png');
        geoImg.alt = 'Simplified geological map of Naxos';
        geoDiv.appendChild(geoImg);
        body.appendChild(geoDiv);

        container.appendChild(section);
    }

    // -----------------------------------------------------------------------
    //  Legend rendering
    // -----------------------------------------------------------------------

    _renderLegend() {
        // Wrap entire legend in a top-level collapsible (matches Project Info / Reference Maps)
        const { section: outerSection, body: outerBody } = this._makeCollapsibleSection(
            'Legend',
            '\u03A5\u03C0\u03CC\u03BC\u03BD\u03B7\u03BC\u03B1',
            { expanded: true }
        );
        outerBody.classList.add('legend-outer-body');

        // Build a map: groupId -> array of legend entries (with geomType info)
        const groupEntries = {};
        for (const group of LAYER_GROUPS) {
            groupEntries[group.id] = [];
        }

        for (const layer of Object.values(LAYERS)) {
            const groupId = layer.group;
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

        // Render each environment group inside the outer body
        for (const group of LAYER_GROUPS) {
            const entries = groupEntries[group.id];
            if (!entries || entries.length === 0) continue;

            const { section: groupSection, body: itemsDiv } = this._makeCollapsibleSection(
                group.label,
                group.labelGr,
                { expanded: group.expanded }
            );
            groupSection.classList.add('legend-subgroup');

            for (const entry of entries) {
                itemsDiv.appendChild(this._renderItem(entry));
            }

            outerBody.appendChild(groupSection);
        }

        this.legendContainer.appendChild(outerSection);
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
            img.src = assetUrl('symbols/' + entry.symbolIcon);
            img.alt = '';
            img.width = 20;
            img.height = 20;
            swatch.appendChild(img);
        } else if (entry.patternIcon) {
            // Pattern-based polygon — show the pattern icon as a small image
            const img = document.createElement('img');
            img.src = assetUrl('symbols/' + entry.patternIcon);
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

    _renderCredits() {
        const { section: collapsible, body: section } = this._makeCollapsibleSection(
            'Project Info',
            '\u03A0\u03BB\u03B7\u03C1\u03BF\u03C6\u03BF\u03C1\u03AF\u03B5\u03C2',
            { expanded: false }
        );
        section.classList.add('credits-section');

        // --- Map title card ---
        const titleCard = document.createElement('div');
        titleCard.className = 'project-card project-title-card';
        const projTitle = document.createElement('div');
        projTitle.className = 'project-card-title';
        projTitle.textContent = 'Geomorphological Map of Greece';
        const projTitleGr = document.createElement('div');
        projTitleGr.className = 'project-card-title-gr';
        projTitleGr.textContent = '\u0393\u03B5\u03C9\u03BC\u03BF\u03C1\u03C6\u03BF\u03BB\u03BF\u03B3\u03B9\u03BA\u03CC\u03C2 \u03A7\u03AC\u03C1\u03C4\u03B7\u03C2 \u0395\u03BB\u03BB\u03AC\u03B4\u03BF\u03C2';
        const projSheet = document.createElement('div');
        projSheet.className = 'project-card-sheet';
        projSheet.textContent = 'Naxos Sheet \u00B7 \u03A6\u03CD\u03BB\u03BB\u03BF \u039D\u03AC\u03BE\u03BF\u03C5 \u00B7 1:50,000';
        titleCard.appendChild(projTitle);
        titleCard.appendChild(projTitleGr);
        titleCard.appendChild(projSheet);
        section.appendChild(titleCard);

        // --- Description ---
        const descCard = document.createElement('div');
        descCard.className = 'project-card';
        const descLabel = document.createElement('div');
        descLabel.className = 'project-card-label';
        descLabel.textContent = 'Project \u00B7 \u0388\u03C1\u03B3\u03BF';
        const descText = document.createElement('div');
        descText.className = 'project-card-body';
        descText.textContent = 'Contribution to the production of the Geomorphological Map of Greece at a scale of 1:1,000,000 and to the pilot large-scale geomorphological mapping of the Naxos sheet.';
        descCard.appendChild(descLabel);
        descCard.appendChild(descText);
        section.appendChild(descCard);

        // --- Institutions ---
        const instCard = document.createElement('div');
        instCard.className = 'project-card';
        const instLabel = document.createElement('div');
        instLabel.className = 'project-card-label';
        instLabel.textContent = 'Institutions \u00B7 \u03A6\u03BF\u03C1\u03B5\u03AF\u03C2';
        instCard.appendChild(instLabel);

        const instList = document.createElement('div');
        instList.className = 'project-inst-list';
        for (const inst of [
            { role: 'Assigned Authority', name: 'H.S.G.M.E.', full: 'Hellenic Survey of Geology & Mineral Exploration' },
            { role: 'Contractor', name: 'N.K.U.A.', full: 'National and Kapodistrian University of Athens' },
        ]) {
            const row = document.createElement('div');
            row.className = 'project-inst-row';
            const role = document.createElement('div');
            role.className = 'project-inst-role';
            role.textContent = inst.role;
            const name = document.createElement('div');
            name.className = 'project-inst-name';
            name.textContent = inst.full;
            row.appendChild(role);
            row.appendChild(name);
            instList.appendChild(row);
        }
        instCard.appendChild(instList);
        section.appendChild(instCard);

        // --- Scientific Team ---
        const teamCard = document.createElement('div');
        teamCard.className = 'project-card';
        const teamLabel = document.createElement('div');
        teamLabel.className = 'project-card-label';
        teamLabel.textContent = 'Scientific Team \u00B7 \u0395\u03C0\u03B9\u03C3\u03C4\u03B7\u03BC\u03BF\u03BD\u03B9\u03BA\u03AE \u03BF\u03BC\u03AC\u03B4\u03B1';
        teamCard.appendChild(teamLabel);

        const teamList = document.createElement('ul');
        teamList.className = 'project-team-list';
        const members = [
            { name: 'Dr. Niki Evelpidou', role: 'Professor, N.K.U.A.' },
            { name: 'Dr. Irene Zananiri', role: 'H.S.G.M.E.' },
            { name: 'Alexandra Zervakou, MSc', role: 'H.S.G.M.E.' },
            { name: 'Dr. Giannis Saitis', role: 'N.K.U.A.' },
            { name: 'Evangelos Spyrou, MSc', role: 'N.K.U.A.' },
        ];
        for (const m of members) {
            const li = document.createElement('li');
            const n = document.createElement('span');
            n.className = 'team-name';
            n.textContent = m.name;
            const r = document.createElement('span');
            r.className = 'team-role';
            r.textContent = m.role;
            li.appendChild(n);
            li.appendChild(r);
            teamList.appendChild(li);
        }
        teamCard.appendChild(teamList);
        section.appendChild(teamCard);

        // --- Publication ---
        const meta = document.createElement('div');
        meta.className = 'project-meta';
        const year = document.createElement('span');
        year.textContent = 'Publication \u00B7 2025';
        meta.appendChild(year);
        section.appendChild(meta);

        this.creditsContainer.appendChild(collapsible);
    }
}
