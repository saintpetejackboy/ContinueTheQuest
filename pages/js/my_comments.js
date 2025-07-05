// pages/js/my_comments.js

window.myCommentsPage = {
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadComments();
    },

    cacheElements() {
        this.searchInput = document.getElementById('search');
        this.sortSelect = document.getElementById('sort');
        this.resultsEl = document.getElementById('results');
    },

    bindEvents() {
        this.onSearch = debounce(this.loadComments.bind(this), 300);
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.onSearch);
        }
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', this.loadComments.bind(this));
        }
    },

    async loadComments() {
        const q = this.searchInput ? this.searchInput.value.trim() : '';
        const sort = this.sortSelect ? this.sortSelect.value : 'new';
        const url = new URL('/api/users/my_comments.php', window.location.origin);
        url.searchParams.set('sort', sort);
        if (q.length) url.searchParams.set('q', q);

        try {
            const res = await fetch(url.href);
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            this.renderResults(data.comments || []);
        } catch (err) {
            console.error('Error loading my comments:', err);
            if (this.resultsEl) {
                this.resultsEl.innerHTML = '<p class="text-center text-destructive">Error loading your comments.</p>';
            }
        }
    },

    renderResults(items) {
        if (!this.resultsEl) return;
        this.resultsEl.innerHTML = '';
        if (!items.length) {
            this.resultsEl.innerHTML = '<p class="text-center text-muted-foreground">You haven\'t posted any comments yet.</p>';
        } else {
            this.resultsEl.innerHTML = items.map(item => this.renderComment(item)).join('');
        }
    },

    renderComment(item) {
        const body = escapeHTML(item.body || '');
        const targetLink = item.target_type === 'media' ? `?page=media&id=${item.target_id}` :
                           item.target_type === 'branch' ? `?page=branch&id=${item.target_id}` :
                           `?page=segment&id=${item.target_id}`;

        return `
            <div class="card p-4">
                <p class="text-muted-foreground text-sm mb-2">Comment on <a href="${targetLink}" class="text-primary hover:underline">${item.target_type} #${item.target_id}</a></p>
                <p class="mb-2">${body}</p>
                <div class="flex items-center text-sm text-muted-foreground">
                    <span>Posted: ${new Date(item.created_at).toLocaleDateString()}</span>
                    <span class="ml-4">Votes: ${item.vote_score}</span>
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

window.myCommentsPage.init();

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
