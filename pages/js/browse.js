// pages/js/browse.js

window.browsePage = {
  init() {
    this.cacheElements();
    this.bindEvents();
    this.genreFilter = this.getGenreIdFromURL();
    this.loadMedia();
  },

  cacheElements() {
    this.searchInput = document.getElementById('search');
    this.sortSelect = document.getElementById('sort');
    this.skeletonEl = document.getElementById('skeleton');
    this.resultsEl = document.getElementById('results');
  },

  bindEvents() {
    this.onSearch = debounce(this.loadMedia.bind(this), 300);
    if (this.searchInput) {
      this.searchInput.addEventListener('input', this.onSearch);
    }
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', this.loadMedia.bind(this));
    }
  },

  getGenreIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'genre') {
      return params.get('id');
    }
    return null;
  },

  async loadMedia() {
    const q = this.searchInput ? this.searchInput.value.trim() : '';
    const sort = this.sortSelect ? this.sortSelect.value : 'new';
    const url = new URL('/api/index.php', window.location.origin);
    url.searchParams.set('endpoint', 'search');
    url.searchParams.set('sort', sort);
    if (q.length) url.searchParams.set('q', q);
    if (this.genreFilter) url.searchParams.set('genre_id', this.genreFilter);
    try {
      const res = await fetch(url.href);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      this.renderResults(data.results || []);
    } catch (err) {
      console.error('Error loading media:', err);
      if (this.resultsEl) {
        this.resultsEl.innerHTML = '<p class="text-center text-destructive">Error loading media.</p>';
        this.resultsEl.classList.remove('hidden');
      }
      if (this.skeletonEl) {
        this.skeletonEl.classList.add('hidden');
      }
    }
  },

  renderResults(items) {
    if (this.skeletonEl) {
      this.skeletonEl.classList.add('hidden');
    }
    if (!this.resultsEl) return;
    this.resultsEl.innerHTML = '';
    if (!items.length) {
      this.resultsEl.innerHTML = '<p class="text-center text-muted-foreground">No media found.</p>';
    } else {
      this.resultsEl.innerHTML = items.map(item => this.renderCard(item)).join('');
    }
    this.resultsEl.classList.remove('hidden');
  },

  renderCard(item) {
    const title = escapeHTML(item.title || '');
    const descRaw = item.description || '';
    const desc = escapeHTML(descRaw).substring(0, 100) + (descRaw.length > 100 ? '...' : '');
    const coverPath = item.cover_image
      ? `/uploads/users/${item.created_by}/images/${item.cover_image}`
      : '/img/bookie-cartoon.webp';
    const url = `?page=media&id=${item.id}`;
    return `
      <div class="card">
        <a href="${url}">
          <div class="h-48 bg-background rounded-lg mb-4 overflow-hidden">
            <img src="${coverPath}" alt="${title}" class="w-full h-full object-cover">
          </div>
          <h3 class="text-lg font-semibold mb-2">${title}</h3>
          <p class="text-muted-foreground text-sm">${desc}</p>
        </a>
      </div>
    `;
  },

  cleanup() {
    if (this.searchInput) {
      this.searchInput.removeEventListener('input', this.onSearch);
    }
  }
};

window.browsePage.init();

// Utility to escape HTML
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[tag]));
}