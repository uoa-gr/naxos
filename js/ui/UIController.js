/**
 * UIController - General UI wiring: toggle buttons, keyboard shortcuts.
 */
export class UIController {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
    }

    init() {
        // Wire header toggle buttons
        document.getElementById('left-sidebar-toggle')?.addEventListener('click', () => {
            this.eventBus.emit('sidebar:toggle-left');
        });
        document.getElementById('right-sidebar-toggle')?.addEventListener('click', () => {
            this.eventBus.emit('sidebar:toggle-right');
        });

        // ESC key closes sidebars on mobile
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.eventBus.emit('sidebar:close-all');
            }
        });

        return true;
    }
}
