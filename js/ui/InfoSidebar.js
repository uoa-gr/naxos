/**
 * InfoSidebar - Manages the right sidebar with legend, info, and credits.
 * Handles toggle visibility, close button, and mobile outside-click behavior.
 */
export class InfoSidebar {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.sidebar = null;
        this.closeBtn = null;
        this.toggleBtn = null;
    }

    init() {
        this.sidebar = document.getElementById('sidebar-right');
        this.closeBtn = document.getElementById('sidebar-right-close');
        this.toggleBtn = document.getElementById('right-sidebar-toggle');

        // Also wire the mobile toggle
        const mobileToggle = document.getElementById('mobile-info-toggle');

        // Wire close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        // Wire header toggle button
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }

        // Wire mobile toggle
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => this.toggle());
        }

        // On mobile: close on outside click
        document.addEventListener('click', (e) => {
            if (window.innerWidth > 768) return;
            if (!this.sidebar || !this.sidebar.classList.contains('active')) return;
            if (this.sidebar.contains(e.target)) return;
            if (this.toggleBtn && this.toggleBtn.contains(e.target)) return;
            if (mobileToggle && mobileToggle.contains(e.target)) return;
            this.close();
        });

        // Listen for event bus toggle requests
        this.eventBus.on('sidebar:right:toggle', () => this.toggle());
        this.eventBus.on('sidebar:right:open', () => this.open());
        this.eventBus.on('sidebar:right:close', () => this.close());

        return true;
    }

    open() {
        if (this.sidebar) {
            this.sidebar.classList.add('active');
        }
    }

    close() {
        if (this.sidebar) {
            this.sidebar.classList.remove('active');
        }
    }

    toggle() {
        if (this.sidebar) {
            this.sidebar.classList.toggle('active');
        }
    }
}
