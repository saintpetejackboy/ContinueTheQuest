# ContinueTheQuest — Project Structure

## 🗂 Directory Overview

```
continuethequest/
├── api/              # RESTful endpoints (admin, auth, media, etc.)
├── assets/           # Static assets (js/, css/)
├── db/               # SQL schema
├── favicons/         # Site icons and manifest
├── img/              # Misc images
├── includes/         # PHP includes/utilities
├── logs/             # Log files (.gitignored)
├── node_modules/     # NPM dependencies
├── pages/            # Frontend views (HTML/JS/CSS)
│   ├── admin/        # Admin-specific views
│   ├── js/           # Page-specific JS
│   └── frag/         # Header, footer, menu (modular PHP)
├── scripts/          # Maintenance/dev tools
├── test-data/        # Dev/test fixtures (.gitignored)
├── uploads/          # User files by ID (.gitignored)
├── vendor/           # Composer packages (PHP)
├── .env              # Local config
├── index.php         # App entry point
├── bootstrap.php     # Runtime initializer
├── input.css         # Tailwind source
├── output.css        # Compiled CSS (.gitignored)
├── tailwind.config.js# Tailwind config
└── misc files        # 404.html, .gitignore, package.json, router.js, etc.
```


## 🧠 Architecture Summary

### Frontend

* **Single entrypoint** (`index.php`) with dynamic page loading
* **Router-based navigation** using query params (`?page=xyz`)
* **Reusable fragments** in `pages/frag/` for header, footer, menu
* **Tailwind CSS**, dark theme-first with a toggle

### Backend

* **Procedural PHP**, fast and readable
* **Modular API structure** under `/api/`
* **MariaDB** for storage, with normalized schema
* **Uploads stored** per-user in filesystem

### JavaScript

* `core.js`: global utilities, theme, menu, etc.
* `router.js`: handles SPA-like navigation
* Per-page JS optionally loaded (`pages/js/`)

---

## 🛠 Developer Notes

* **Add a new page**: create `pages/[page].html` + optional `js/`, `css/`
* **Add API**: extend `api/index.php` or add a file under `api/[module]/`
* **Tailwind**: modify `input.css` and rebuild via `npm run build-css` (optional)

---

## 📄 Relevant SQL

-- Table structure for table `admin_moderation`


CREATE TABLE `admin_moderation` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `device_hash` varchar(255) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `backup_endpoints`

CREATE TABLE `backup_endpoints` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL,
  `encrypted_credentials` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `backup_logs`

CREATE TABLE `backup_logs` (
  `id` int(11) NOT NULL,
  `schedule_id` int(11) NOT NULL,
  `started_at` datetime NOT NULL,
  `finished_at` datetime NOT NULL,
  `success` tinyint(1) NOT NULL,
  `output` text DEFAULT NULL,
  `error_message` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table structure for table `backup_schedules`

CREATE TABLE `backup_schedules` (
  `id` int(11) NOT NULL,
  `endpoint_id` int(11) NOT NULL,
  `backup_type` enum('code','database','both') NOT NULL DEFAULT 'both',
  `frequency` enum('hourly','daily','weekly','monthly') NOT NULL DEFAULT 'daily',
  `last_run_at` datetime DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table structure for table `branches`

CREATE TABLE `branches` (
  `id` int(11) NOT NULL,
  `media_id` int(11) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `summary` text DEFAULT NULL,
  `branch_type` enum('before','after','other') DEFAULT NULL,
  `source_type` enum('book','show','movie','other') DEFAULT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `vote_score` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table structure for table `comments`

CREATE TABLE `comments` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `target_type` enum('media','branch','segment','comment') NOT NULL,
  `target_id` int(11) NOT NULL,
  `body` text NOT NULL,
  `is_anonymous` tinyint(1) NOT NULL DEFAULT 0,
  `vote_score` int(11) NOT NULL DEFAULT 0,
  `hidden` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table structure for table `credits_log`


CREATE TABLE `credits_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `change_amount` int(11) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `related_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table structure for table `media`

CREATE TABLE `media` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `vote_score` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



--
-- Table structure for table `media_images`
--

CREATE TABLE `media_images` (
  `id` int(11) NOT NULL,
  `media_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `vote_score` int(11) NOT NULL DEFAULT 0,
  `hidden` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



--
-- Table structure for table `segments`
--

CREATE TABLE `segments` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `markdown_body` longtext DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `vote_score` int(11) DEFAULT 0,
  `order_index` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



--
-- Table structure for table `submissions`
--

CREATE TABLE `submissions` (
  `id` int(11) NOT NULL,
  `type` enum('notify','contact') NOT NULL COMMENT 'notify = early-access form; contact = message form',
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `consent` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = user consented',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



--
-- Table structure for table `tags`
--

CREATE TABLE `tags` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `is_genre` tinyint(1) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



--
-- Table structure for table `tag_links`
--

CREATE TABLE `tag_links` (
  `id` int(11) NOT NULL,
  `tag_id` int(11) DEFAULT NULL,
  `target_type` enum('media','branch','segment') DEFAULT NULL,
  `target_id` int(11) DEFAULT NULL,
  `tagged_by` int(11) DEFAULT NULL,
  `tagged_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_admin` tinyint(1) DEFAULT 0,
  `is_banned` tinyint(1) DEFAULT 0,
  `credits` int(11) DEFAULT 0,
  `sort_preference` enum('new','hot','rising','popular') DEFAULT 'new',
  `created_at` datetime DEFAULT current_timestamp(),
  `last_active_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `quota` bigint(20) DEFAULT 1048576,
  `bio` text DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `passphrase_hash` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



--
-- Table structure for table `user_passkeys`
--

CREATE TABLE `user_passkeys` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `credential_id` varbinary(255) NOT NULL,
  `public_key` blob NOT NULL,
  `sign_count` int(10) UNSIGNED NOT NULL,
  `transports` varchar(255) DEFAULT NULL,
  `attestation_type` varchar(255) NOT NULL DEFAULT 'none',
  `aaguid` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_used_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



--
-- Table structure for table `votes`
--

CREATE TABLE `votes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `target_type` enum('media','branch','segment','comment','image') NOT NULL,
  `target_id` int(11) NOT NULL,
  `vote_value` tinyint(4) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/////////////


/// this is router.js that you can't see from another directory:
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