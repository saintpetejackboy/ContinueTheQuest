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
    this.updateNav(page);
    this._cleanupCurrentPage();

    try {
      let res;

      // —— Special case: admin page only lives at /pages/admin/index.html
      if (page === 'admin') {
        res = await fetch(`/pages/admin/index.html`);
        if (!res.ok) throw new Error('admin not found');
      } else {
        // default behavior for all other pages
        res = await fetch(`/pages/${page}.html`);
        if (!res.ok) {
          res = await fetch(`/pages/${page}/index.html`);
          if (!res.ok) throw new Error('not found');
        }
      }

      content.innerHTML = await res.text();
      this._runInlineScripts(content);
      window.scrollTo(0, 0);

      const pageTitle =
        content.querySelector('h1')?.textContent ||
        page.charAt(0).toUpperCase() + page.slice(1);
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
      link.classList.toggle('font-medium', linkPage === page);
    });
  },
  
  _cleanupCurrentPage() {
    if (window.homePage?.cleanup) window.homePage.cleanup();
    // add other page-specific cleanup calls here
  },

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
