// pages/js/my_segments.js

window.mySegmentsPage = {
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadSegments();
    },

    cacheElements() {
        this.searchInput = document.getElementById('search');
        this.sortSelect = document.getElementById('sort');
        this.resultsEl = document.getElementById('results');
    },

    bindEvents() {
        this.onSearch = debounce(this.loadSegments.bind(this), 300);
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.onSearch);
        }
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', this.loadSegments.bind(this));
        }
    },

    async loadSegments() {
        const q = this.searchInput ? this.searchInput.value.trim() : '';
        const sort = this.sortSelect ? this.sortSelect.value : 'new';
        const url = new URL('/api/users/my_segments.php', window.location.origin);
        url.searchParams.set('sort', sort);
        if (q.length) url.searchParams.set('q', q);

        try {
            const res = await fetch(url.href);
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            this.renderResults(data.segments || []);
        } catch (err) {
            console.error('Error loading my segments:', err);
            if (this.resultsEl) {
                this.resultsEl.innerHTML = '<p class="text-center text-destructive">Error loading your segments.</p>';
            }
        }
    },

    renderResults(items) {
        if (!this.resultsEl) return;
        this.resultsEl.innerHTML = '';
        if (!items.length) {
            this.resultsEl.innerHTML = '<p class="text-center text-muted-foreground">You haven\'t created any segments yet.</p>';
        } else {
            this.resultsEl.innerHTML = items.map(item => this.renderCard(item)).join('');
        }
    },

    renderCard(item) {
        const title = escapeHTML(item.title || '');
                const description = escapeHTML(item.description || '').substring(0, 100) + ((item.description || '').length > 100 ? '...' : '');
        
        let coverPath = '/img/bookie-cartoon.webp'; // default
        if (item.image_path) {
            coverPath = `/uploads/users/${item.created_by}/images/${item.image_path}`;
        }
        
        const url = `?page=segment&id=${item.id}`;
        return `
            <div class="card">
                <a href="${url}">
                    <div class="h-48 bg-background rounded-lg mb-4 overflow-hidden">
                        <img src="${coverPath}" alt="${title}" class="w-full h-full object-cover" onerror="this.src='/img/bookie-cartoon.webp'">
                    </div>
                    <h3 class="text-lg font-semibold mb-2">${title}</h3>
                    <p class="text-muted-foreground text-sm">${description}</p>
                </a>
                <div class="flex items-center justify-between mt-4 text-sm text-muted-foreground">
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

window.mySegmentsPage.init();

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