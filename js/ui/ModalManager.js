/**
 * ModalManager - Manages welcome modal and feature detail modal.
 *
 * Shows a welcome splash on first visit (per session) and displays
 * feature properties when a map feature is clicked.
 */
import { LAYERS } from '../data/LayerConfig.js';

export class ModalManager {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
    }

    init() {
        this.modal = document.getElementById('feature-modal');
        this.welcomeModal = document.getElementById('welcome-modal');

        // Close buttons
        this.modal?.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal('feature-modal'));
        this.welcomeModal?.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal('welcome-modal'));
        this.welcomeModal?.querySelector('#enter-webgis')?.addEventListener('click', () => this.closeModal('welcome-modal'));

        // Click outside to close
        [this.modal, this.welcomeModal].forEach(m => {
            m?.addEventListener('click', (e) => {
                if (e.target === m) this.closeModal(m.id);
            });
        });

        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
        });

        // Listen for feature clicks
        this.eventBus.on('feature:clicked', ({ feature, layerId }) => {
            this.showFeatureDetails(feature, layerId);
        });

        // Show welcome modal on first visit
        this.showWelcome();

        return true;
    }

    showWelcome() {
        // Show on every page load (no session memory).
        setTimeout(() => {
            this.welcomeModal?.classList.add('active');
        }, 350);
    }

    showFeatureDetails(feature, layerId) {
        const props = feature.properties || {};
        const detailsEl = this.modal?.querySelector('#feature-details');
        if (!detailsEl) return;

        // Clear previous content safely
        while (detailsEl.firstChild) {
            detailsEl.removeChild(detailsEl.firstChild);
        }

        // Resolve title and subtitle: prefer feature properties, fall back to layer label
        const layerConfig = LAYERS[layerId];
        const layerLabel = layerConfig?.label || 'Feature';
        const layerLabelGr = layerConfig?.labelGr || '';

        const titleText = props.DSC_En || props.Name_Eng || props.NAME || props.Name_ENG || layerLabel;
        const subtitleText = props.DSC_Gr || props.Name_GR || layerLabelGr;

        // Layer chip — small uppercase tag at the top showing which layer the feature belongs to
        if (layerConfig) {
            const chip = document.createElement('div');
            chip.className = 'feature-detail-layer-chip';
            chip.textContent = layerLabel + (layerLabelGr ? '  \u00B7  ' + layerLabelGr : '');
            detailsEl.appendChild(chip);
        }

        // Title
        const title = document.createElement('h3');
        title.className = 'feature-detail-title';
        title.textContent = titleText;
        detailsEl.appendChild(title);

        // Greek name
        if (subtitleText && subtitleText !== titleText) {
            const titleGr = document.createElement('p');
            titleGr.className = 'feature-detail-subtitle';
            titleGr.textContent = subtitleText;
            detailsEl.appendChild(titleGr);
        }

        // Key properties as a definition list
        const dl = document.createElement('dl');
        dl.className = 'feature-detail-props';

        const fields = [
            ['Environment', props.Env],
            ['Name', props.NAME || props.Name_ENG],
            ['Lithology', props.Lithology],
            ['Source', props.Source],
            ['Code', props.Code],
            ['Contour', props.Contour ? `${props.Contour}m` : null],
        ];

        fields.forEach(([label, value]) => {
            if (value && value !== '<Null>' && value !== 'None') {
                const dt = document.createElement('dt');
                dt.textContent = label;
                const dd = document.createElement('dd');
                dd.textContent = String(value);
                dl.appendChild(dt);
                dl.appendChild(dd);
            }
        });

        if (dl.children.length > 0) {
            detailsEl.appendChild(dl);
        }

        // Info text (if available)
        if (props.Info && props.Info !== '<Null>') {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'feature-detail-info';
            const infoLabel = document.createElement('strong');
            infoLabel.textContent = 'Description:';
            infoDiv.appendChild(infoLabel);
            const infoText = document.createElement('p');
            infoText.textContent = props.Info;
            infoDiv.appendChild(infoText);
            detailsEl.appendChild(infoDiv);
        }

        this.openModal('feature-modal');
    }

    openModal(id) {
        document.getElementById(id)?.classList.add('active');
    }

    closeModal(id) {
        document.getElementById(id)?.classList.remove('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
}
