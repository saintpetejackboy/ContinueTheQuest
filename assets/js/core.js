// Core JavaScript functionality for ContinueThe.Quest
// assets/js/core.js
// ============================================================================
// THEME MANAGEMENT SYSTEM
// ============================================================================

class ThemeManager {
    constructor() {
        this.themes = {
            light: 'light',
            dark: 'dark'
        };
        
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.init();
    }

    init() {
        // Apply theme immediately to prevent flash
        this.applyTheme(this.currentTheme, false);
        
        // Setup theme toggle when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupThemeToggle();
            });
        } else {
            this.setupThemeToggle();
        }
        
        // Listen for system theme changes
        this.setupSystemThemeListener();
    }

    setupThemeToggle() {
		
     // in ThemeManager.setupThemeToggle()
// in ThemeManager.init(), *instead* of getElementById(…) 
document.body.addEventListener('click', e => {
  if (e.target.closest('#theme-toggle')) {
    this.toggleTheme();
  }
});


    }

    setupSystemThemeListener() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', () => {
                // Only auto-switch if user hasn't manually set a preference
                if (!this.getStoredTheme()) {
                    this.currentTheme = this.getSystemTheme();
                    this.applyTheme(this.currentTheme);
                }
            });
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === this.themes.light ? this.themes.dark : this.themes.light;
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        this.storeTheme(theme);
        this.applyTheme(theme);
    }

    applyTheme(theme, animate = true) {
        const html = document.documentElement;
        
        // Add transition class for smooth theme switching
        if (animate) {
            html.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        }
        
        // Remove existing theme classes and add new one
        html.classList.remove('light', 'dark');
        html.classList.add(theme);
        
        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(theme);
        
        // Remove transition after animation completes
        if (animate) {
            setTimeout(() => {
                html.style.transition = '';
            }, 300);
        }
        
        // Dispatch theme change event for other components
        document.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme }
        }));
    }

    updateMetaThemeColor(theme) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const color = theme === 'dark' ? '#0f0f0f' : '#ffffff';
            metaThemeColor.setAttribute('content', color);
        }
    }

    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.themes.dark;
        }
        return this.themes.light;
    }

    getStoredTheme() {
        try {
            return localStorage.getItem('theme');
        } catch (e) {
            return null;
        }
    }

    storeTheme(theme) {
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            console.warn('Unable to store theme preference');
        }
    }

    // Public API
    getCurrentTheme() {
        return this.currentTheme;
    }

    isDarkMode() {
        return this.currentTheme === this.themes.dark;
    }
}

// ============================================================================
// MOBILE MENU SYSTEM
// ============================================================================

class MobileMenu {
    constructor() {
        this.menu = null;
        this.overlay = null;
        this.toggleButton = null;
        this.closeButton = null;
        this.isOpen = false;
        
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupElements();
            });
        } else {
            this.setupElements();
        }
    }

    setupElements() {
        this.menu = document.getElementById('mobile-menu');
        this.overlay = document.getElementById('menu-overlay');
        this.toggleButton = document.getElementById('menu-toggle');
        this.closeButton = document.getElementById('menu-close');

        if (!this.menu || !this.overlay || !this.toggleButton || !this.closeButton) {
            return; // Elements not found, skip setup
        }

        // Setup event listeners
        this.toggleButton.addEventListener('click', () => this.toggle());
        this.closeButton.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', () => this.close());

        // Close menu when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Close menu when clicking on nav links
        const navLinks = this.menu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.close();
            });
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (!this.menu || !this.overlay) return;
        
        this.isOpen = true;
        this.menu.classList.remove('-translate-x-full');
        this.overlay.classList.remove('hidden');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Focus management
        this.closeButton.focus();
    }

    close() {
        if (!this.menu || !this.overlay) return;
        
        this.isOpen = false;
        this.menu.classList.add('-translate-x-full');
        this.overlay.classList.add('hidden');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Return focus to toggle button
        this.toggleButton.focus();
    }
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.createContainer();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notifications';
        this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 5000) {
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);
        
        // Trigger enter animation
        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
        });

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }

        return notification;
    }

    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `
            transform translate-x-full opacity-0 transition-all duration-300 ease-in-out
            max-w-sm w-full bg-card border border-border rounded-lg shadow-lg p-4
            flex items-center gap-3
        `;

        const icon = this.getIcon(type);
        const iconColor = this.getIconColor(type);

        notification.innerHTML = `
            <div class="flex-shrink-0">
                <svg class="w-5 h-5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${icon}
                </svg>
            </div>
            <div class="flex-1 text-sm text-foreground">${message}</div>
            <button class="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors" onclick="this.parentElement.remove()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;

        return notification;
    }

    getIcon(type) {
        const icons = {
            success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
            error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
            warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 15c-.77.833.192 2.5 1.732 2.5z"/>',
            info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
        };
        return icons[type] || icons.info;
    }

    getIconColor(type) {
        const colors = {
            success: 'text-accent',
            error: 'text-destructive',
            warning: 'text-yellow-500',
            info: 'text-primary'
        };
        return colors[type] || colors.info;
    }

    remove(notification) {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// ============================================================================
// GENRES LOADER
// ============================================================================
class GenresLoader {
    constructor() {
        this.desktopMenu = document.getElementById('genre-menu');
        this.mobileMenu = document.getElementById('mobile-genre-menu');
    }

    async load() {
        let genres;
        try {
            const response = await fetch('/api/?endpoint=genres');
            const data = await response.json();
            if (data.genres && Array.isArray(data.genres)) {
                genres = data.genres;
            }
        } catch {
            console.warn('Could not load genres from API, using fallback data');
            try {
                const testResponse = await fetch('/test-data/genres.json');
                genres = await testResponse.json();
            } catch {
                console.error('Fallback genres fetch failed');
            }
        }

        if (!Array.isArray(genres)) {
            genres = [
                { id: 1, name: 'Science Fiction' },
                { id: 2, name: 'Fantasy' },
                { id: 3, name: 'Mystery' }
            ];
        }

        this.render(genres);
    }

    render(genres) {
        if (this.desktopMenu) {
            this.desktopMenu.innerHTML = genres.map(g =>
                `<a href="?page=genre&id=${g.id}" class="block px-4 py-2 hover:bg-gray-700 transition-colors">${g.name}</a>`
            ).join('');
        }
        if (this.mobileMenu) {
            this.mobileMenu.innerHTML = genres.map(g =>
                `<a href="?page=genre&id=${g.id}" class="block px-2 py-1 text-sm hover:text-blue-400 transition-colors">${g.name}</a>`
            ).join('');
        }
    }
}


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Smooth scroll to element
function scrollToElement(element, offset = 0) {
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

// Format date for display
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize core systems
let themeManager;
let mobileMenu;
let notifications;
let genresLoader;

// Initialize immediately for theme (to prevent flash)
themeManager = new ThemeManager();

// Initialize other systems when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCore);
} else {
    initializeCore();
}

function initializeCore() {
    // Initialize mobile menu
    mobileMenu = new MobileMenu();
    
    // Initialize notification system
    notifications = new NotificationSystem();
	
	 // Genres loader
    genresLoader = new GenresLoader();
    genresLoader.load().catch(e => console.error('Error loading genres:', e));
    
    // Setup global error handling
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
        notifications.error('An unexpected error occurred. Please try again.');
    });
    
    // Setup unhandled promise rejection handling
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        notifications.error('An unexpected error occurred. Please try again.');
    });
    
    console.log('Core systems initialized');
}

// ============================================================================
// GLOBAL API
// ============================================================================

// Export to global scope for use in other scripts
window.ContinueTheQuest = {
    theme: () => themeManager,
    menu: () => mobileMenu,
    notify: () => notifications,
	genres: () => genresLoader,
    utils: {
        debounce,
        throttle,
        isInViewport,
        scrollToElement,
        formatDate
    }
};

// Shorthand for notifications
window.notify = {
    success: (msg, duration) => notifications?.success(msg, duration),
    error: (msg, duration) => notifications?.error(msg, duration),
    warning: (msg, duration) => notifications?.warning(msg, duration),
    info: (msg, duration) => notifications?.info(msg, duration)
};