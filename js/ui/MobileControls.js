/**
 * MobileControls - Handles mobile sidebar behavior (open, close, toggle).
 */
export class MobileControls {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
    }

    init() {
        const leftSidebar = document.getElementById('sidebar-left');
        const rightSidebar = document.getElementById('sidebar-right');
        const mainContent = document.querySelector('.main-content');
        const mapInstance = () => window.app?.mapManager?.getMap();

        const isMobile = () => window.innerWidth <= 768;

        const refreshMap = () => setTimeout(() => mapInstance()?.invalidateSize(), 320);

        const toggleLeft = () => {
            if (isMobile()) {
                rightSidebar.classList.remove('active');
                leftSidebar.classList.toggle('active');
                refreshMap();
            } else {
                mainContent.classList.toggle('left-collapsed');
                refreshMap();
            }
        };

        const toggleRight = () => {
            if (isMobile()) {
                leftSidebar.classList.remove('active');
                rightSidebar.classList.toggle('active');
                refreshMap();
            } else {
                mainContent.classList.toggle('right-collapsed');
                refreshMap();
            }
        };

        const closeAll = () => {
            if (isMobile()) {
                leftSidebar.classList.remove('active');
                rightSidebar.classList.remove('active');
            } else {
                mainContent.classList.remove('left-collapsed');
                mainContent.classList.remove('right-collapsed');
                setTimeout(() => mapInstance()?.invalidateSize(), 260);
            }
        };

        // Mobile bar buttons
        document.getElementById('mobile-filters-toggle')?.addEventListener('click', toggleLeft);
        document.getElementById('mobile-info-toggle')?.addEventListener('click', toggleRight);

        // In-sidebar close buttons (visible on both mobile and desktop)
        document.getElementById('sidebar-left-close')?.addEventListener('click', () => {
            if (isMobile()) {
                leftSidebar.classList.remove('active');
            } else {
                mainContent.classList.add('left-collapsed');
                setTimeout(() => mapInstance()?.invalidateSize(), 260);
            }
        });
        document.getElementById('sidebar-right-close')?.addEventListener('click', () => {
            if (isMobile()) {
                rightSidebar.classList.remove('active');
            } else {
                mainContent.classList.add('right-collapsed');
                setTimeout(() => mapInstance()?.invalidateSize(), 260);
            }
        });

        // EventBus (header toggles fire these)
        this.eventBus.on('sidebar:toggle-left', toggleLeft);
        this.eventBus.on('sidebar:toggle-right', toggleRight);
        this.eventBus.on('sidebar:close-all', closeAll);

        return true;
    }
}
