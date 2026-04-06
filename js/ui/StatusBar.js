/**
 * StatusBar - Displays feature count and map title in the bottom bar
 */
export class StatusBar {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.el = null;
    }

    init() {
        this.el = document.getElementById('status-bar');
        if (!this.el) {
            console.warn('StatusBar: #status-bar element not found');
            return;
        }

        // Show initial state
        this.update(0);

        // React to visible-points changes
        this.stateManager.subscribe('visiblePoints', (count) => {
            this.update(count);
        });

        // Also listen for explicit status update events
        this.eventBus.on('status:update', (payload) => {
            if (payload && typeof payload.count === 'number') {
                this.update(payload.count);
            }
        });
    }

    /**
     * Update the status bar text
     * @param {number} count - number of visible features
     */
    update(count = 0) {
        if (!this.el) return;
        this.el.textContent = count + ' features visible | Geomorphological Map of Naxos 1:50,000';
    }
}
