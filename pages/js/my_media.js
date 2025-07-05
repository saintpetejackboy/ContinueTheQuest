// pages/js/my_media.js

window.myMediaPage = {
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadMedia();
    },

    cacheElements() {
        this.searchInput = document.getElementById('search');
        this.sortSelect = document.getElementById('sort');
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

    async loadMedia() {
        const q = this.searchInput ? this.searchInput.value.trim() : '';
        const sort = this.sortSelect ? this.sortSelect.value : 'new';
        const url = new URL('/api/users/my_media.php', window.location.origin);
        url.searchParams.set('sort', sort);
        if (q.length) url.searchParams.set('q', q);

        try {
            const res = await fetch(url.href);
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            this.renderResults(data.media || []);
        } catch (err) {
            console.error('Error loading my media:', err);
            if (this.resultsEl) {
                this.resultsEl.innerHTML = '<p class="text-center text-destructive">Error loading your media.</p>';
            }
        }
    },

    renderResults(items) {
        if (!this.resultsEl) return;
        this.resultsEl.innerHTML = '';
        if (!items.length) {
            this.resultsEl.innerHTML = '<p class="text-center text-muted-foreground">You haven\'t created any media yet.</p>';
        } else {
            this.resultsEl.innerHTML = items.map(item => this.renderCard(item)).join('');
        }
    },

    renderCard(item) {
        const title = escapeHTML(item.title || '');
        const descRaw = item.description || '';
        const desc = escapeHTML(descRaw).substring(0, 100) + (descRaw.length > 100 ? '...' : '');
        
        let coverPath = '/img/bookie-cartoon.webp'; // default
        if (item.cover_image) {
            coverPath = `/uploads/users/${item.created_by}/${ensureImagePath(item.cover_image)}`;
        }
        
        const url = `?page=media&id=${item.id}`;
        return `
            <div class="card">
                <a href="${url}">
                    <div class="h-48 bg-background rounded-lg mb-4 overflow-hidden">
                        <img src="${coverPath}" alt="${title}" class="w-full h-full object-cover" onerror="this.src='/img/bookie-cartoon.webp'">
                    </div>
                    <h3 class="text-lg font-semibold mb-2">${title}</h3>
                    <p class="text-muted-foreground text-sm">${desc}</p>
                </a>
                <div class="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                    <div class="flex items-center gap-2">
                        <span>🌳</span>
                        <span>${item.branch_count}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span>📜</span>
                        <span>${item.segment_count}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span>💬</span>
                        <span>${item.comment_count}</span>
                    </div>
                </div>
            </div>
        `;
    },

    cleanup() {
        if (this.searchInput) {
            this.searchInput.removeEventListener('input', this.onSearch);
        }
    }
};

window.myMediaPage.init();

// Utility to escape HTML
function ensureImagePath(path) {
    if (!path) return '';
    return path.startsWith('images/') ? path : 'images/' + path;
}

function escapeHTML(str) {
    return str.replace(/[&<>"']/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[tag]));
}

// Debounce utility
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