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
                    this.userCredits = d.credits || 0;
                }
            } catch (e) {
                console.error('BranchPage: user profile error', e);
                this.userCredits = 0;
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
            html += `<div class="flex items-center space-x-2 mt-4">`;
            html += `<button data-vote="1" class="vote-btn btn btn-ghost btn-sm p-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
            </button>`;
            html += `<span id="branch-vote-score" class="font-medium">${b.vote_score}</span>`;
            html += `<button data-vote="-1" class="vote-btn btn btn-ghost btn-sm p-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>`;
            html += `</div>`;
            html += `<div id="comment-thread" class="mt-8"></div>`;
            html += `<div class="mt-8 border-t pt-4 space-y-4">`;
            html += `<h2 class="text-xl font-semibold">Add Story Segment</h2>`;
            html += `<p class="text-sm text-muted-foreground">Provide a title, order, and upload your text or generate automatically. AI-created segments require the "AI-Assisted" tag.</p>`;
            html += `<div>
                    <label for="segment-title" class="block text-sm font-medium text-muted-foreground mb-1">Segment Title</label>
                    <input type="text" id="segment-title" class="form-input w-full mb-2" placeholder="Chapter title...">
                </div>`;
            html += `<div>
                    <label for="segment-order" class="block text-sm font-medium text-muted-foreground mb-1">Order Index</label>
                    <input type="number" id="segment-order" class="form-input w-full mb-2" value="1" min="1">
                </div>`;
            html += `<div id="story-upload-zone" class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary">
                <div class="space-y-2">
                    <svg class="mx-auto h-12 w-12 text-muted-foreground" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div class="text-sm text-muted-foreground">
                        <label for="story-file" class="font-medium text-primary hover:text-primary/80 cursor-pointer">Click to upload text</label> or drag and drop
                    </div>
                    <p class="text-xs text-muted-foreground">TXT or MD up to 500KB</p>
                </div>
                <input type="file" id="story-file" accept=".txt,.md" class="hidden">
            </div>`;
            html += `<div id="story-previews" class="mt-2"></div>`;
            html += `<button id="generate-story-btn" class="btn btn-outline w-full">Generate with AI</button>`;
            html += `</div>`;
            html += `<div id="generate-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden z-50">`;
            html += `<div class="bg-card rounded-lg p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">`;
            html += `<h3 class="text-xl font-semibold">Generate Story Segment</h3>`;
            html += `<p class="text-xs text-muted-foreground">Default AI prompt based on Media & Branch info:</p>`;
            html += `<pre id="generate-debug" class="p-3 bg-muted rounded text-sm font-mono max-h-32 overflow-auto"></pre>`;
            html += `<label for="generate-model" class="block text-sm font-medium">Model</label>`;
            html += `<select id="generate-model" class="form-select w-full">`;
            html += `<option value="gpt-4">GPT-4</option>`;
            html += `<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>`;
            html += `</select>`;
            html += `<div class="flex justify-between items-center text-sm">`;
            html += `<span>Cost Estimate: <strong id="generate-cost">---</strong> credits</span>`;
            html += `<span>Your Credits: <strong id="user-credits-gen">${this.userCredits}</strong></span>`;
            html += `</div>`;
            html += `<p class="text-xs text-destructive">Segments generated by AI must be tagged "AI-Assisted".</p>`;
            html += `<div class="flex space-x-2">`;
            html += `<button id="generate-submit" class="btn-primary flex-1">Generate</button>`;
            html += `<button id="generate-cancel" class="btn-secondary flex-1">Cancel</button>`;
            html += `</div>`;
            html += `</div></div>`;
            html += `</div>`;
            this.container.innerHTML = html;
        }

        bindEvents() {
            // Voting buttons
            this.container.querySelectorAll('.vote-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    const val = parseInt(btn.dataset.vote, 10);
                    this.handleVote(val);
                });
            });
            // Story file drop/selection
            const uploadZone = this.container.querySelector('#story-upload-zone');
            const fileInput = this.container.querySelector('#story-file');
            if (uploadZone && fileInput) {
                uploadZone.addEventListener('click', () => fileInput.click());
                uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('border-primary'); });
                uploadZone.addEventListener('dragleave', e => { e.preventDefault(); uploadZone.classList.remove('border-primary'); });
                uploadZone.addEventListener('drop', e => {
                    e.preventDefault(); uploadZone.classList.remove('border-primary');
                    const files = Array.from(e.dataTransfer.files).filter(f => ['text/plain','text/markdown'].includes(f.type));
                    if (files.length) this.handleStoryFile({ target: { files } });
                });
                fileInput.addEventListener('change', e => this.handleStoryFile(e));
            }
            // AI generation modal
            const genOpen = this.container.querySelector('#generate-story-btn');
            if (genOpen) genOpen.addEventListener('click', () => this.openGenerateModal());
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

        /**
         * Open the AI generation modal, set up prompt and cost.
         */
        openGenerateModal() {
            const modal = this.container.querySelector('#generate-modal');
            const debug = modal.querySelector('#generate-debug');
            const costEl = modal.querySelector('#generate-cost');
            const creditsEl = modal.querySelector('#user-credits-gen');
            // Build default prompt
            const prompt = `Continue the story ${this.branch.branch_type} the branch titled "${this.branch.title}" under media ID ${this.branch.media_id}. Summary: ${this.branch.summary}`;
            debug.textContent = prompt;
            costEl.textContent = '---'; // TODO: calculate cost
            creditsEl.textContent = this.userCredits;
            modal.classList.remove('hidden');
            // Bind modal buttons
            modal.querySelector('#generate-cancel').addEventListener('click', () => this.closeGenerateModal());
            modal.querySelector('#generate-submit').addEventListener('click', () => this.submitGenerate(prompt));
        }

        /**
         * Close the AI generation modal and cleanup.
         */
        closeGenerateModal() {
            const modal = this.container.querySelector('#generate-modal');
            if (modal) modal.classList.add('hidden');
        }

        /**
         * Submit the AI generation request. Stub for future integration.
         */
        submitGenerate(prompt) {
            console.log('AI generate prompt:', prompt);
            alert('AI generation not yet implemented');
            this.closeGenerateModal();
        }

        cleanup() {
            // Placeholder for cleanup logic if needed
        }
    }

    // Export
    window.BranchPage = BranchPage;
})();