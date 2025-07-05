// /pages/js/branch.js
// Manages the Branch detail page: details, comments, and story creation UI.
// Utility to escape HTML entities
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

(function() {
    /**
     * Main class for the branch page.
     */
    class BranchPage {
        constructor() {
            this.branchId = parseInt(new URLSearchParams(window.location.search).get('id'), 10);
            this.container = document.getElementById('branch-container');
            this.userLoggedIn = false;
            this.userIsAdmin = false;
            this.commentThread = null;

            if (!this.branchId || !this.container) {
                console.error('BranchPage: Missing branch ID or container');
                return;
            }
            this.init();
        }

        async init() {
            await this.fetchBranch();
            await this.fetchUserProfile();
            if (!this.branch) return;
            this.renderView();
            this.bindEvents();
            if (typeof CommentThread !== 'undefined') {
                this.commentThread = new CommentThread({
                    containerSelector: '#comment-thread',
                    targetType: 'branch',
                    targetId: this.branchId,
                    defaultSort: 'new',
                    userLoggedIn: this.userLoggedIn,
                    isAdmin: this.userIsAdmin,
                    maxDepth: 3,
                    autoExpandAll: true
                });
            }
        }

        async fetchBranch() {
            try {
                const res = await fetch(`/api/branches/get.php?id=${this.branchId}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Fetch failed');
                this.branch = data.branch;
                this.tags = data.tags || [];
                this.canEdit = data.can_edit;
            } catch (err) {
                console.error('BranchPage: fetch error', err);
                this.container.innerHTML = `<p class="text-destructive">Error loading branch: ${err.message}</p>`;
                this.branch = null;
            }
        }

        async fetchUserProfile() {
            try {
                const res = await fetch('/api/users/profile.php');
                if (res.ok) {
                    const d = await res.json();
                    this.userLoggedIn = true;
                    this.userIsAdmin = Boolean(d.is_admin);
                }
            } catch (e) {
                console.error('BranchPage: user profile error', e);
            }
        }

        renderView() {
            const b = this.branch;
            let html = `<div class="space-y-4">`;
            html += `<h1 class="text-3xl font-bold">${escapeHTML(b.title)}</h1>`;
            html += `<div class="text-sm text-muted-foreground">Created by ${escapeHTML(b.author)} on ${new Date(b.created_at).toLocaleDateString()}</div>`;
            html += `<div class="flex flex-wrap gap-2">`;
            this.tags.forEach(t => {
                html += `<a href="?page=genre&id=${t.id}" class="px-2 py-1 bg-muted rounded text-xs">${h(t.name)}</a>`;
            });
            html += `</div>`;
            html += `<p class="mt-4">${escapeHTML(b.summary)}</p>`;
            html += `<div class="flex items-center space-x-4 mt-4">`;
            html += `<button data-vote="1" class="vote-btn btn btn-ghost btn-sm">Upvote</button>`;
            html += `<span id="branch-vote-score">${b.vote_score}</span>`;
            html += `<button data-vote="-1" class="vote-btn btn btn-ghost btn-sm">Downvote</button>`;
            html += `</div>`;
            html += `<div id="comment-thread" class="mt-8"></div>`;
            html += `<div class="mt-8 border-t pt-4">`;
            html += `<h2 class="text-xl font-semibold mb-2">Add Story</h2>`;
            html += `<p class="text-sm text-muted-foreground mb-4">Upload a text file or generate with AI.</p>`;
            html += `<input type="file" id="story-file" accept=".txt,.md" class="mb-4" />`;
            html += `<button id="generate-story-btn" class="btn btn-outline">Generate it for me!</button>`;
            html += `</div>`;
            html += `</div>`;
            this.container.innerHTML = html;
        }

        bindEvents() {
            // Voting
            this.container.querySelectorAll('.vote-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    const val = parseInt(btn.dataset.vote, 10);
                    this.handleVote(val);
                });
            });
            // Story file input
            const fileInput = this.container.querySelector('#story-file');
            if (fileInput) {
                fileInput.addEventListener('change', e => this.handleStoryFile(e));
            }
            // AI generation stub
            const genBtn = this.container.querySelector('#generate-story-btn');
            if (genBtn) genBtn.addEventListener('click', () => this.handleGenerateStory());
        }

        async handleVote(value) {
            try {
                const res = await fetch('/api/votes/create.php', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ target_type: 'branch', target_id: this.branchId, vote_value: value })
                });
                const data = await res.json();
                if (data.success) {
                    const el = this.container.querySelector('#branch-vote-score');
                    if (el) el.textContent = data.score;
                }
            } catch (err) {
                console.error('Branch vote failed', err);
            }
        }

        handleStoryFile(e) {
            const file = e.target.files[0];
            if (!file) return;
            // TODO: validate size/quota and upload
            alert(`Selected file: ${file.name}`);
        }

        handleGenerateStory() {
            // TODO: integrate OpenAI request, deduct credits, store result
            alert('AI story generation coming soon!');
        }

        cleanup() {
            // Placeholder for cleanup logic if needed
        }
    }

    // Export
    window.BranchPage = BranchPage;
})();