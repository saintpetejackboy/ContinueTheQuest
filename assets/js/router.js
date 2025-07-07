const Router = {
    /**
     * Stores references to page-specific managers for cleanup.
     * Keys will be page names (e.g., 'media'), values will be objects
     * with a 'cleanup' method.
     */
    pageManagers: {},

    /**
     * Initializes the router by setting up event listeners for navigation.
     */
    init() {
        // Listen for browser back/forward button events
        window.addEventListener('popstate', () => this.loadPage());

        // Intercept clicks on internal links to handle with pushState
        document.addEventListener('click', e => {
            const a = e.target.closest('a[href^="?page="]');
            // Ignore clicks if not an internal page link or if it has a target="_blank" etc.
            if (!a || a.target === '_blank' || e.ctrlKey || e.metaKey) return;
            
            e.preventDefault(); // Prevent default link navigation
            
            // Check if the link is to the current page. If so, just reload content
            // without pushing to history, unless parameters change.
            const currentUrl = new URL(window.location.href);
            const targetUrl = new URL(a.href);
            if (currentUrl.origin === targetUrl.origin &&
                currentUrl.pathname === targetUrl.pathname &&
                currentUrl.search === targetUrl.search) {
                // If it's the exact same URL, no need to pushState or reload
                // unless you have a specific reason (e.g., hash changes).
                // For now, we'll just return.
                return;
            }

            history.pushState(null, '', a.href); // Update browser history
            this.loadPage(); // Load the new page
        });

        // Load the initial page on first load
        this.loadPage();
    },

    /**
     * Loads the content of the requested page dynamically.
     */
    async loadPage() {
        const content = document.getElementById('content');
        if (!content) {
            console.error('Router: Content container element with ID "content" not found.');
            return;
        }
        
        // Determine the current page based on URL parameters
        const page = new URLSearchParams(location.search).get('page') || 'home';
        
        // Update navigation UI to reflect the active page
        this.updateNav(page);
        
        // Cleanup the previous page's JavaScript instance before loading new content
        this._cleanupCurrentPage();

        try {
            let res;

            // Handle special case for the 'admin' page (e.g., if its path is different)
            if (page === 'admin') {
                // Check if user is admin before loading admin page
                const authCheck = await fetch('/api/admin/auth-check.php');
                if (!authCheck.ok) {
                    // User is not admin, redirect to profile
                    window.location.href = '?page=profile';
                    return;
                }
                res = await fetch(`/pages/admin/index.html`);
                if (!res.ok) throw new Error(`Admin page not found at /pages/admin/index.html`);
            } else {
                // Default behavior for all other pages: try /pages/{page}.html or /pages/{page}/index.html
                res = await fetch(`/pages/${page}.html`);
                if (!res.ok) {
                    res = await fetch(`/pages/${page}/index.html`);
                    if (!res.ok) throw new Error(`Page not found at /pages/${page}.html or /pages/${page}/index.html`);
                }
            }

            // Set the fetched HTML content
            const htmlContent = await res.text();
            content.innerHTML = htmlContent;
            
            // Re-run inline scripts and dynamically loaded scripts
            // This is the critical part to fix the broken pages.
            this._runScriptsFromLoadedContent(content);

            // Scroll to the top of the page
            window.scrollTo(0, 0);

            // Set the document title based on the page content or default
            const pageTitleElement = content.querySelector('h1');
            const pageTitle = pageTitleElement 
                ? pageTitleElement.textContent 
                : page.charAt(0).toUpperCase() + page.slice(1); // Capitalize first letter
            document.title = `${pageTitle} | ContinueThe.Quest`;

        } catch (error) {
            console.error('Router: Page loading error:', error);
            // Display a 404 error page
            content.innerHTML = `
                <div class="py-16 text-center">
                    <h1 class="text-4xl font-bold text-destructive">404</h1>
                    <p class="mt-4 text-muted-foreground">Page not found.</p>
                    <a href="?page=home" class="mt-6 inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg shadow-md hover:bg-primary/90 transition-colors">Go Home</a>
                </div>
            `;
            document.title = `404 Not Found | ContinueThe.Quest`;
        }
    },

    /**
     * Updates the navigation links to highlight the active page.
     * @param {string} currentPage - The name of the current active page.
     */
    updateNav(currentPage) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const linkPage = new URLSearchParams(link.getAttribute('href')).get('page');
            link.classList.toggle('font-medium', linkPage === currentPage);
            link.classList.toggle('text-primary', linkPage === currentPage); // Example: add a highlight class
            link.classList.toggle('text-foreground', linkPage !== currentPage); // Example: default text color
        });
    },
    
    /**
     * Calls the cleanup method for the currently active page's JavaScript manager, if it exists.
     * This prevents memory leaks and ensures proper re-initialization on subsequent page loads.
     */
    _cleanupCurrentPage() {
        // Iterate through all registered page managers and call their cleanup methods
        for (const pageName in this.pageManagers) {
            if (Object.hasOwnProperty.call(this.pageManagers, pageName)) {
                const manager = this.pageManagers[pageName];
                if (manager && typeof manager.cleanup === 'function') {
                    manager.cleanup();
                    console.log(`Router: Cleanup called for ${pageName} page.`);
                }
                // Dereference the manager so it can be garbage collected
                delete this.pageManagers[pageName];
            }
        }
    },

    /**
     * Re-executes scripts found in the loaded HTML content.
     * This is crucial because innerHTML doesn't execute scripts.
     * We modify this to handle both inline and external scripts correctly.
     * @param {HTMLElement} container - The DOM element containing the new page content.
     */
    _runScriptsFromLoadedContent(container) {
        // Find all script tags within the newly loaded content
        const scripts = container.querySelectorAll('script');

        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');

            // Copy attributes from the old script tag to the new one
            for (const attr of oldScript.attributes) {
                newScript.setAttribute(attr.name, attr.value);
            }

            if (oldScript.src) {
                // External script: load it dynamically
                // We use a promise to ensure scripts are loaded in order, if async=false
                const promise = new Promise((resolve, reject) => {
                    newScript.onload = resolve;
                    newScript.onerror = () => {
                        console.error(`Failed to load external script: ${oldScript.src}`);
                        reject();
                    };
                    document.head.appendChild(newScript); // Append to head for better practice
                });
                // If the script is not async, wait for it to load
                if (!oldScript.hasAttribute('async')) {
                    // This is a simplified approach. For true synchronous loading
                    // with multiple non-async scripts, you'd need a queue.
                    // For typical page-level scripts, individual awaits are fine.
                    promise.catch(() => {}); // Catch to prevent unhandled promise rejection
                }
            } else {
                // Inline script: copy its content and execute immediately
                newScript.textContent = oldScript.textContent;
                document.body.appendChild(newScript); // Append to body (or head)
            }
            
            // Remove the old script tag from the DOM to avoid duplicates
            oldScript.remove();
        });
    }
};

// Initialize the router when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', () => Router.init());

// GLOBAL PAGE MANAGER REGISTRATION
// Pages can register their managers using this global object
// This is the key to solving the re-initialization problem.
// Each page's JS (e.g., media.js, home.js) should have a pattern like:
//
// (function() {
//    if (window.Router && window.Router.pageManagers.media) {
//        // Already initialized by router, likely navigating back to same page
//        // Or, it means media.js was included directly in HTML and router also tried.
//        // This block should ideally not be hit if router is handling all JS loading.
//        return;
//    }
//
//    class MediaPage { ... } // Your class definition
//    window.MediaPage = MediaPage; // Make it globally available if other modules depend on it
//
//    const mediaPageInstance = new MediaPage();
//    // Register with the router's pageManagers for cleanup
//    if (window.Router) {
//        window.Router.pageManagers.media = {
//            cleanup: () => {
//                if (mediaPageInstance && typeof mediaPageInstance.cleanup === 'function') {
//                    mediaPageInstance.cleanup();
//                }
//                // Dereference instance to allow garbage collection
//                // Note: The router itself will set this to null/delete
//                // window.mediaPageManager = null; // Only if you put it globally
//            }
//        };
//    }
// })();
//
// The 'media' key in window.Router.pageManagers.media should match the page name from the URL.
// So for ?page=media, it uses 'media'. For ?page=home, it uses 'home', etc.