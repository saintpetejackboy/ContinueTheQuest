// Simple router for loading page content
// assets/js/router.js
const Router = {
  init() {
    window.addEventListener('popstate', () => this.loadPage());
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="?page="]');
      if (!a) return;
      e.preventDefault();
      history.pushState(null, '', a.href);
      this.loadPage();
    });
    this.loadPage();
  },

  async loadPage() {
    const content = document.getElementById('content');
    if (!content) return;
    
    const page = new URLSearchParams(location.search).get('page') || 'home';
    
    // Update navigation highlighting
    this.updateNav(page);
    
    // Clean up any previous page resources
    this._cleanupCurrentPage();

    try {
      const res = await fetch(`pages/${page}.html`);
      if (!res.ok) throw new Error('not found');

      // Inject the HTML (link & script tags will be parsed)
      content.innerHTML = await res.text();
      
      // Run any inline scripts
      this._runInlineScripts(content);
      
      // Scroll to top
      window.scrollTo(0, 0);
      
      // Update document title
      const pageTitle = content.querySelector('h1')?.textContent || page.charAt(0).toUpperCase() + page.slice(1);
      document.title = `${pageTitle} | ContinueThe.Quest`;
      
    } catch (error) {
      console.error('Page loading error:', error);
      content.innerHTML = `
        <div class="py-16 text-center">
          <h1 class="text-4xl font-bold">404</h1>
          <p class="mt-4 text-gray-400">Page not found.</p>
          <a href="?page=home" class="mt-6 inline-block px-6 py-3 bg-blue-600 rounded">Go Home</a>
        </div>
      `;
    }
  },

  updateNav(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
      const linkPage = new URLSearchParams(link.getAttribute('href')).get('page');
      if (linkPage === page) {
        link.classList.add('font-medium');
      } else {
        link.classList.remove('font-medium');
      }
    });
  },
  
  _cleanupCurrentPage() {
    // Call cleanup method if available on current page
    if (window.homePage?.cleanup) window.homePage.cleanup();
    // Add other page cleanup methods as they're implemented
  },

  // <script> tags injected via innerHTML won't execute automatically,
  // so we move them out and re-append them to trigger execution.
  _runInlineScripts(container) {
    container.querySelectorAll('script').forEach(old => {
      const s = document.createElement('script');
      if (old.src) s.src = old.src;
      else s.textContent = old.textContent;
      document.body.appendChild(s);
      old.remove();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Router.init());