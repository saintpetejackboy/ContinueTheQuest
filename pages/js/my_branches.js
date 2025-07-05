// pages/js/my_branches.js

window.myBranchesPage = {
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadBranches();
    },

    cacheElements() {
        this.searchInput = document.getElementById('search');
        this.sortSelect = document.getElementById('sort');
        this.resultsEl = document.getElementById('results');
    },

    bindEvents() {
        this.onSearch = debounce(this.loadBranches.bind(this), 300);
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.onSearch);
        }
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', this.loadBranches.bind(this));
        }
    },

    async loadBranches() {
        const q = this.searchInput ? this.searchInput.value.trim() : '';
        const sort = this.sortSelect ? this.sortSelect.value : 'new';
        const url = new URL('/api/users/my_branches.php', window.location.origin);
        url.searchParams.set('sort', sort);
        if (q.length) url.searchParams.set('q', q);

        try {
            const res = await fetch(url.href);
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            this.renderResults(data.branches || []);
        } catch (err) {
            console.error('Error loading my branches:', err);
            if (this.resultsEl) {
                this.resultsEl.innerHTML = '<p class="text-center text-destructive">Error loading your branches.</p>';
            }
        }
    },

    renderResults(items) {
        if (!this.resultsEl) return;
        this.resultsEl.innerHTML = '';
        if (!items.length) {
            this.resultsEl.innerHTML = '<p class="text-center text-muted-foreground">You haven\'t created any branches yet.</p>';
        } else {
            this.resultsEl.innerHTML = items.map(item => this.renderCard(item)).join('');
        }
    },

    renderCard(item) {
        const title = escapeHTML(item.title || '');
        const summary = escapeHTML(item.summary || '').substring(0, 100) + (item.summary.length > 100 ? '...' : '');
        
        let coverPath = '/img/bookie-cartoon.webp'; // default
        if (item.display_image) {
            coverPath = `/uploads/users/${item.created_by}/images/${item.display_image}`;
        }
        
        const url = `?page=branch&id=${item.id}`;
        return `
            <div class="card">
                <a href="${url}">
                    <div class="h-48 bg-background rounded-lg mb-4 overflow-hidden">
                        <img src="${coverPath}" alt="${title}" class="w-full h-full object-cover" onerror="this.src='/img/bookie-cartoon.webp'">
                    </div>
                    <h3 class="text-lg font-semibold mb-2">${title}</h3>
                    <p class="text-muted-foreground text-sm">${summary}</p>
                </a>
                <div class="flex items-center justify-between mt-4 text-sm text-muted-foreground">
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

window.myBranchesPage.init();

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