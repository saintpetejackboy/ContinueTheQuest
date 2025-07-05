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
            this.pendingFile = null;
            this.segmentTaggingSystem = null;

            if (!this.branchId || !this.container) {
                console.error('BranchPage: Missing branch ID or container');
                return;
            }
            
            // Set global reference for upload handlers
            window.branchPage = this;
            
            this.init();
        }

        async init() {
            await this.fetchBranch();
            await this.fetchUserProfile();
            await this.fetchAIModels();
            await this.fetchAIStatus();
            await this.fetchSegments();
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
                    this.currentUserId = d.id;
                }
            } catch (e) {
                console.error('BranchPage: user profile error', e);
                this.userCredits = 0;
            }
        }

        async fetchAIModels() {
            try {
                const res = await fetch('/api/ai/models.php');
                if (res.ok) {
                    const d = await res.json();
                    this.aiModels = d.models || [];
                } else {
                    this.aiModels = [];
                }
            } catch (e) {
                console.error('BranchPage: AI models error', e);
                this.aiModels = [];
            }
        }

        async fetchAIStatus() {
            try {
                const res = await fetch('/api/ai/status.php');
                if (res.ok) {
                    const d = await res.json();
                    this.aiStatus = d;
                } else {
                    this.aiStatus = { api_key_configured: false };
                }
            } catch (e) {
                console.error('BranchPage: AI status error', e);
                this.aiStatus = { api_key_configured: false };
            }
        }

        async fetchSegments() {
            try {
                const res = await fetch(`/api/segments/list.php?branch_id=${this.branchId}`);
                if (res.ok) {
                    const d = await res.json();
                    this.segments = d.segments || [];
                } else {
                    this.segments = [];
                }
            } catch (e) {
                console.error('BranchPage: segments error', e);
                this.segments = [];
            }
        }

        renderView() {
            const b = this.branch;
            let html = `<div class="space-y-4">`;
            html += `<h1 class="text-3xl font-bold">${escapeHTML(b.title)}</h1>`;
            html += `<div class="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Created by</span>
                ${b.author_avatar ? `<img src="/uploads/users/${b.created_by}/avatars/${b.author_avatar}" alt="${escapeHTML(b.author)}" class="w-6 h-6 rounded-full object-cover">` : ''}
                <span>${escapeHTML(b.author)}</span>
                <span>on ${new Date(b.created_at).toLocaleDateString()}</span>
            </div>`;
            html += `<div class="flex flex-wrap gap-2">`;
            this.tags.forEach(t => {
                html += `<a href="?page=genre&id=${t.id}" class="px-2 py-1 bg-muted rounded text-xs">${escapeHTML(t.name)}</a>`;
            });
            html += `</div>`;
            
            // Branch cover image section
            html += `<div class="mt-4">`;
            if (b.cover_image) {
                html += `<div class="relative inline-block">`;
                html += `<img src="/uploads/users/${b.created_by}/images/${b.cover_image}" alt="Branch cover" class="max-w-sm max-h-64 rounded-lg object-cover">`;
                if (this.canEdit) {
                    html += `<button id="remove-cover-btn" class="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90">×</button>`;
                }
                html += `</div>`;
            } else if (this.canEdit) {
                html += `<div class="border-2 border-dashed border-border rounded-lg p-4 w-64 h-40 flex flex-col items-center justify-center cursor-pointer hover:border-primary" id="upload-cover-zone">`;
                html += `<svg class="w-8 h-8 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">`;
                html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>`;
                html += `</svg>`;
                html += `<span class="text-sm text-muted-foreground">Add cover image</span>`;
                html += `<input type="file" id="cover-upload" accept="image/*" class="hidden">`;
                html += `</div>`;
            }
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
            
            // Add Segment button (consistent with Media page layout)
            html += `<div class="mt-6 flex space-x-2" id="segment-actions">`;
            if (this.userLoggedIn) {
                html += `<button id="add-segment-btn" class="btn-primary">📝 Add Story Segment</button>`;
            } else {
                html += `<div id="join-segment-container"></div>`;
            }
            html += `</div>`;
            
            // Add Segment form (hidden by default, right under button)
            html += `<div id="add-segment-form" class="mt-4 border rounded-lg p-4 space-y-4 hidden">`;
            html += `<h2 class="text-xl font-semibold">Add Story Segment</h2>`;
            html += `<p class="text-sm text-muted-foreground">Provide a title, description, order, and upload your text or generate automatically. AI-created segments WILL be tagged as "AI-Assisted".</p>`;
            html += `<div>
                    <label for="segment-title" class="block text-sm font-medium text-muted-foreground mb-1">Segment Title</label>
                    <input type="text" id="segment-title" class="form-input w-full mb-2" placeholder="Chapter title...">
                </div>`;
            html += `<div>
                    <label for="segment-description" class="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                    <textarea id="segment-description" rows="3" class="form-textarea w-full mb-1" placeholder="Brief description of what happens in this segment... (Required for AI generation - 100 characters minimum)"></textarea>
                    <div class="flex justify-between text-xs text-muted-foreground">
                        <span id="description-requirement">Required for AI generation: 100 characters minimum</span>
                        <span id="description-counter">0 characters</span>
                    </div>
                </div>`;
            html += this.canEdit ? `<div>
                    <label for="segment-order" class="block text-sm font-medium text-muted-foreground mb-1">Order Index</label>
                    <input type="number" id="segment-order" class="form-input w-full mb-2" value="1" min="1">
                </div>` : '';
            
            // Image upload section
            html += `<div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">Segment Image (Optional)</label>
                    <div id="image-upload-zone" class="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary mb-2">
                        <div class="space-y-2">
                            <svg class="mx-auto h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <div class="text-sm text-muted-foreground">
                                <label for="segment-image" class="font-medium text-primary hover:text-primary/80 cursor-pointer">Click to upload image</label> or drag and drop
                            </div>
                            <p class="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF; max size 5MB.</p>
                        </div>
                        <input type="file" id="segment-image" accept="image/*" class="hidden">
                    </div>
                    <div id="image-preview" class="mb-2"></div>
                </div>`;
            
            html += `<div id="story-upload-zone" class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary">
                <div class="space-y-2">
                    <svg class="mx-auto h-12 w-12 text-muted-foreground" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div class="text-sm text-muted-foreground">
                        <label for="story-file" class="font-medium text-primary hover:text-primary/80 cursor-pointer">Click to upload text</label> or drag and drop
                    </div>
                    <p class="text-xs text-muted-foreground">Supported file types: .txt, .md (Markdown); max size 500 KB.</p>
                </div>
                <input type="file" id="story-file" accept=".txt,.md" class="hidden">
            </div>`;
            // Tags section
            html += `<div>
                    <label class="block text-sm font-medium text-muted-foreground mb-2">Tags (Optional)</label>
                    <div class="space-y-2">
                        <div class="flex space-x-2">
                            <input type="text" id="segment-tag-input" class="form-input flex-1" placeholder="Add tags (genre, theme, etc.)...">
                            <button type="button" id="add-segment-tag-btn" class="btn-secondary btn-sm">Add</button>
                        </div>
                        <div id="segment-tag-suggestions" class="hidden bg-card border rounded-lg shadow-lg max-h-32 overflow-y-auto"></div>
                        <div id="segment-selected-tags" class="flex flex-wrap gap-2 min-h-[1rem]"></div>
                        <p class="text-xs text-muted-foreground">Existing tags are free. New tags cost 1 credit each.</p>
                    </div>
                </div>`;
            
            html += `<div id="story-previews" class="mt-2"></div>`;
            html += `<button id="generate-story-btn" class="btn btn-outline w-full">Generate with AI</button>`;
            html += `</div>`;
            
            // Segments section (moved here to be right under the Add button)
            if (this.segments && this.segments.length > 0) {
                html += `<div class="mt-6">`;
                html += `<h2 class="text-2xl font-semibold mb-4">Story Segments</h2>`;
                html += `<div class="space-y-4">`;
                
                this.segments.forEach(segment => {
                    html += `<div class="border rounded-lg p-4 bg-card">`;
                    html += `<div class="flex items-start justify-between mb-2">`;
                    html += `<div class="flex-1">`;
                    html += `<h3 class="text-lg font-medium">${escapeHTML(segment.title)}</h3>`;
                    if (segment.description) {
                        html += `<p class="text-sm mt-1"><strong>${escapeHTML(segment.description)}</strong></p>`;
                    }
                    
                    // Display segment image if exists
                    if (segment.image_path) {
                        html += `<div class="mt-2">`;
                        html += `<img src="/uploads/users/${segment.created_by}/${segment.image_path}" alt="Segment image" class="max-w-sm max-h-32 rounded object-cover">`;
                        html += `</div>`;
                    }
                    html += `<div class="flex items-center space-x-2 text-sm text-muted-foreground mt-1">`;
                    html += `<span>by</span>`;
                    if (segment.author_avatar) {
                        html += `<img src="/uploads/users/${segment.created_by}/avatars/${segment.author_avatar}" alt="${escapeHTML(segment.author)}" class="w-4 h-4 rounded-full object-cover">`;
                    }
                    html += `<span>${escapeHTML(segment.author)}</span>`;
                    html += `<span>•</span>`;
                    html += `<span>${new Date(segment.created_at).toLocaleDateString()}</span>`;
                    if (this.canEdit || segment.can_edit) {
                        html += `<span>•</span>`;
                        html += `<span>Order: ${segment.order_index}</span>`;
                    }
                    html += `</div>`;
                    html += `</div>`;
                    html += `<div class="flex items-center space-x-2">`;
                    html += `<div class="flex items-center space-x-1">`;
                    html += `<button class="vote-segment-btn btn-ghost btn-sm p-1" data-segment-id="${segment.id}" data-vote="1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                        </svg>
                    </button>`;
                    html += `<span class="text-sm font-medium segment-vote-score" data-segment-id="${segment.id}">${segment.vote_score}</span>`;
                    html += `<button class="vote-segment-btn btn-ghost btn-sm p-1" data-segment-id="${segment.id}" data-vote="-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>`;
                    html += `</div>`;
                    html += `<div class="flex items-center space-x-2">`;
                    html += `<button class="btn-ghost btn-sm" onclick="window.branchPage.readSegment(${segment.id})">Read</button>`;
                    
                    // Add edit/delete buttons for creators and admins
                    if (this.userLoggedIn && (this.userIsAdmin || segment.created_by === this.currentUserId)) {
                        html += `<button class="btn-ghost btn-sm text-muted-foreground hover:text-foreground" onclick="window.branchPage.editSegment(${segment.id})" title="Edit segment">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>`;
                        html += `<button class="btn-ghost btn-sm text-muted-foreground hover:text-destructive" onclick="window.branchPage.deleteSegment(${segment.id})" title="Delete segment">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>`;
                    }
                    
                    html += `</div>`;
                    html += `</div>`;
                    html += `</div>`;
                    
                    // Tags
                    if (segment.tags && segment.tags.length > 0) {
                        html += `<div class="flex flex-wrap gap-2 mt-2">`;
                        segment.tags.forEach(tag => {
                            const tagClass = tag.is_mandatory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground';
                            const title = tag.is_mandatory ? 'Mandatory tag (cannot be removed)' : 'User tag';
                            html += `<span class="px-2 py-1 rounded text-xs ${tagClass}" title="${title}">${escapeHTML(tag.name)}</span>`;
                        });
                        html += `</div>`;
                    }
                    
                    // Comment section for this segment (only show if there are comments)
                    if (segment.comment_count > 0) {
                        html += `<div class="mt-4 border-t pt-4">`;
                        html += `<div class="flex items-center justify-between mb-3">`;
                        html += `<h4 class="text-sm font-medium">Comments (${segment.comment_count})</h4>`;
                        html += `<button class="btn-ghost btn-sm toggle-segment-comments" data-segment-id="${segment.id}">Show Comments</button>`;
                        html += `</div>`;
                        html += `<div id="segment-comments-${segment.id}" class="hidden"></div>`;
                        html += `</div>`;
                    }
                    
                    html += `</div>`;
                });
                
                html += `</div>`;
                html += `</div>`;
            }
            
            html += `<div id="comment-thread" class="mt-8"></div>`;
            html += `<div id="generate-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden z-50">`;
            html += `<div class="bg-card rounded-lg p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">`;
            html += `<h3 class="text-xl font-semibold">Generate Story Segment</h3>`;
            html += `<p class="text-xs text-muted-foreground">Default AI prompt based on Media & Branch info:</p>`;
            html += `<pre id="generate-debug" class="p-3 bg-muted rounded text-sm font-mono max-h-32 overflow-auto"></pre>`;
            html += `<label for="generate-model" class="block text-sm font-medium">Model</label>`;
            html += `<select id="generate-model" class="form-select w-full">`;
            this.aiModels.forEach(model => {
                html += `<option value="${model.name}" data-cost="${model.cost_per_use}">${model.name}${model.description ? ' - ' + model.description : ''}</option>`;
            });
            html += `</select>`;
            html += `<div class="flex justify-between items-center text-sm">`;
            html += `<span>Cost Estimate: <strong id="generate-cost">---</strong> credits</span>`;
            html += `<span>Your Credits: <strong id="user-credits-gen">${this.userCredits}</strong></span>`;
            html += `</div>`;
            // Check AI availability and show appropriate warnings
            const aiUnavailable = !this.aiStatus.api_key_configured || !this.aiStatus.api_key_valid;
            if (aiUnavailable) {
                if (this.userIsAdmin) {
                    html += `<div class="p-3 bg-destructive/10 border border-destructive rounded text-sm">
                        <p class="font-medium text-destructive">⚠️ Admin Notice</p>
                        <p class="text-destructive text-xs mt-1">${this.aiStatus.admin_message || 'AI generation is not available.'}</p>
                    </div>`;
                } else {
                    html += `<div class="p-3 bg-muted border rounded text-sm">
                        <p class="text-muted-foreground">🤖 AI Processing is currently offline. Please contact an administrator.</p>
                    </div>`;
                }
            }
            html += `<div id="storage-info" class="p-3 bg-muted/50 rounded text-sm">
                <div class="flex justify-between">
                    <span>Storage Available:</span>
                    <span id="available-storage">Loading...</span>
                </div>
                <div class="flex justify-between">
                    <span>Estimated AI Content Size:</span>
                    <span id="estimated-size">~3KB</span>
                </div>
            </div>`;
            html += `<p class="text-xs text-muted-foreground">AI-generated segments WILL be automatically tagged with "AI" and model name.</p>`;
            html += `<div class="flex space-x-2">`;
            html += `<button id="generate-submit" class="btn-primary flex-1" ${aiUnavailable ? 'disabled' : ''}>Generate</button>`;
            html += `<button id="generate-cancel" class="btn-secondary flex-1">Cancel</button>`;
            html += `</div>`;
            html += `</div></div>`;
            html += `</div>`;
            
            // Segment reader modal
            html += `<div id="segment-reader-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden z-50">`;
            html += `<div class="bg-card rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">`;
            html += `<div class="flex items-center justify-between p-4 border-b">`;
            html += `<div class="flex items-center space-x-4">`;
            html += `<h3 id="segment-title-modal" class="text-xl font-semibold">Loading...</h3>`;
            html += `<div class="flex items-center space-x-2">`;
            html += `<button id="prev-segment-btn" class="btn-ghost btn-sm" title="Previous segment">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
            </button>`;
            html += `<span id="segment-position" class="text-sm text-muted-foreground">1 of 1</span>`;
            html += `<button id="next-segment-btn" class="btn-ghost btn-sm" title="Next segment">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>`;
            html += `</div>`;
            html += `</div>`;
            html += `<div class="flex items-center space-x-2">`;
            html += `<div class="flex items-center space-x-1">`;
            html += `<button id="reader-vote-up" class="btn-ghost btn-sm p-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
            </button>`;
            html += `<span id="reader-vote-score" class="text-sm font-medium">0</span>`;
            html += `<button id="reader-vote-down" class="btn-ghost btn-sm p-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>`;
            html += `</div>`;
            html += `<button id="close-segment-reader" class="btn-ghost btn-sm">×</button>`;
            html += `</div>`;
            html += `</div>`;
            html += `<div class="flex-1 overflow-auto p-6">`;
            html += `<div id="segment-content" class="prose max-w-none">Loading content...</div>`;
            html += `<div class="mt-8 pt-8 border-t">`;
            html += `<div class="flex items-center justify-between mb-4">`;
            html += `<h4 class="text-lg font-semibold">Comments</h4>`;
            html += `<button id="toggle-reader-comments" class="btn-ghost btn-sm">Show Comments</button>`;
            html += `</div>`;
            html += `<div id="reader-comments" class="hidden"></div>`;
            html += `</div>`;
            html += `</div>`;
            html += `</div>`;
            html += `</div>`;
            
            this.container.innerHTML = html;
            
            // Initialize tagging system for segments
            this.initializeSegmentTagging();
        }

        initializeSegmentTagging() {
            // Load tagging system script if not already loaded
            if (typeof TaggingSystem === 'undefined') {
                const script = document.createElement('script');
                script.src = '/pages/js/tagging-system.js';
                script.onload = () => {
                    this.setupSegmentTagging();
                };
                document.head.appendChild(script);
            } else {
                this.setupSegmentTagging();
            }
        }

        setupSegmentTagging() {
            if (this.segmentTaggingSystem) {
                // Clean up existing system
                this.segmentTaggingSystem = null;
            }
            
            try {
                this.segmentTaggingSystem = new TaggingSystem({
                    inputSelector: '#segment-tag-input',
                    suggestionsSelector: '#segment-tag-suggestions', 
                    selectedTagsSelector: '#segment-selected-tags',
                    addButtonSelector: '#add-segment-tag-btn',
                    onTagsChanged: (tags) => {
                        this.selectedSegmentTags = tags;
                    }
                });
            } catch (error) {
                console.error('Failed to initialize segment tagging system:', error);
            }
        }

        bindEvents() {
            // Voting buttons for branch
            this.container.querySelectorAll('.vote-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    const val = parseInt(btn.dataset.vote, 10);
                    this.handleVote(val);
                });
            });
            
            // Voting buttons for segments
            this.container.querySelectorAll('.vote-segment-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    const segmentId = parseInt(btn.dataset.segmentId, 10);
                    const val = parseInt(btn.dataset.vote, 10);
                    this.handleSegmentVote(segmentId, val);
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
            // Add Segment button
            const addSegmentBtn = this.container.querySelector('#add-segment-btn');
            if (addSegmentBtn) addSegmentBtn.addEventListener('click', () => this.toggleAddSegmentForm());
            
            // Description character counter
            const descriptionEl = this.container.querySelector('#segment-description');
            if (descriptionEl) {
                descriptionEl.addEventListener('input', (e) => this.updateDescriptionCounter(e.target.value));
            }
            
            // AI generation modal
            const genOpen = this.container.querySelector('#generate-story-btn');
            if (genOpen) genOpen.addEventListener('click', () => this.validateAndOpenGenerateModal());
            
            // Segment reader modal
            const closeReader = this.container.querySelector('#close-segment-reader');
            if (closeReader) closeReader.addEventListener('click', () => this.closeSegmentReader());
            
            // Reader comments toggle
            const toggleReaderComments = this.container.querySelector('#toggle-reader-comments');
            if (toggleReaderComments) toggleReaderComments.addEventListener('click', () => this.toggleReaderComments());
            
            // Navigation buttons
            const prevBtn = this.container.querySelector('#prev-segment-btn');
            const nextBtn = this.container.querySelector('#next-segment-btn');
            if (prevBtn) prevBtn.addEventListener('click', () => this.navigateSegment(-1));
            if (nextBtn) nextBtn.addEventListener('click', () => this.navigateSegment(1));
            
            // Keyboard navigation for segment reader
            this.setupKeyboardNavigation();
            
            // Segment comment toggle buttons
            this.container.querySelectorAll('.toggle-segment-comments').forEach(btn => {
                btn.addEventListener('click', e => {
                    const segmentId = parseInt(btn.dataset.segmentId, 10);
                    this.toggleSegmentComments(segmentId);
                });
            });
            
            // Cover image upload
            const coverUploadZone = this.container.querySelector('#upload-cover-zone');
            const coverInput = this.container.querySelector('#cover-upload');
            if (coverUploadZone && coverInput) {
                coverUploadZone.addEventListener('click', () => coverInput.click());
                coverInput.addEventListener('change', e => this.handleCoverUpload(e));
            }
            
            // Cover image remove
            const removeCoverBtn = this.container.querySelector('#remove-cover-btn');
            if (removeCoverBtn) {
                removeCoverBtn.addEventListener('click', () => this.removeCoverImage());
            }
            
            // Segment image upload
            const segmentImageZone = this.container.querySelector('#image-upload-zone');
            const segmentImageInput = this.container.querySelector('#segment-image');
            if (segmentImageZone && segmentImageInput) {
                segmentImageZone.addEventListener('click', () => segmentImageInput.click());
                segmentImageZone.addEventListener('dragover', e => { e.preventDefault(); segmentImageZone.classList.add('border-primary'); });
                segmentImageZone.addEventListener('dragleave', e => { e.preventDefault(); segmentImageZone.classList.remove('border-primary'); });
                segmentImageZone.addEventListener('drop', e => {
                    e.preventDefault(); 
                    segmentImageZone.classList.remove('border-primary');
                    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                    if (files.length) this.handleSegmentImageUpload({ target: { files } });
                });
                segmentImageInput.addEventListener('change', e => this.handleSegmentImageUpload(e));
            }
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

        async handleSegmentVote(segmentId, value) {
            try {
                const res = await fetch('/api/votes/create.php', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ target_type: 'segment', target_id: segmentId, vote_value: value })
                });
                const data = await res.json();
                if (data.success) {
                    const el = this.container.querySelector(`.segment-vote-score[data-segment-id="${segmentId}"]`);
                    if (el) el.textContent = data.score;
                }
            } catch (err) {
                console.error('Segment vote failed', err);
            }
        }

        async handleStoryFile(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Validate file type
            const allowedTypes = ['text/plain', 'text/markdown'];
            if (!allowedTypes.includes(file.type)) {
                alert('Invalid file type. Only .txt and .md files are allowed.');
                return;
            }
            
            // Validate file size
            const maxSize = 500 * 1024; // 500KB
            if (file.size > maxSize) {
                alert('File too large. Maximum size is 500KB.');
                return;
            }
            
            // Check storage quota
            try {
                const storageRes = await fetch('/api/users/storage.php');
                const storageData = await storageRes.json();
                
                if (file.size > storageData.available_bytes) {
                    alert(`Insufficient storage space. File requires ${this.formatBytes(file.size)} but only ${storageData.formatted.available} available.`);
                    return;
                }
                
                // Show file preview
                this.showFilePreview(file, storageData);
                
            } catch (err) {
                console.error('Storage check failed:', err);
                alert('Failed to check storage quota. Please try again.');
            }
        }

        showFilePreview(file, storageData) {
            const previewEl = this.container.querySelector('#story-previews');
            
            // Read file for preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const preview = content.length > 150 ? content.substring(0, 150) + '...' : content;
                
                previewEl.innerHTML = `
                    <div class="border rounded p-3 bg-muted/50">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-medium">${escapeHTML(file.name)}</span>
                            <button class="btn-ghost btn-sm" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                        </div>
                        <div class="text-xs text-muted-foreground space-y-1">
                            <div>Size: ${this.formatBytes(file.size)}</div>
                            <div>Storage: ${storageData.formatted.used} / ${storageData.formatted.quota} used (${storageData.used_percentage}%)</div>
                            <div>Available: ${storageData.formatted.available}</div>
                        </div>
                        <div class="mt-2 p-2 bg-background rounded text-xs">
                            <div class="font-medium text-foreground mb-1">Preview Synopsis:</div>
                            <div class="text-muted-foreground">${escapeHTML(preview)}</div>
                        </div>
                        <button class="btn-primary btn-sm mt-2 w-full" onclick="window.branchPage.uploadStoryFile()">Upload Segment</button>
                    </div>
                `;
            };
            reader.readAsText(file);
            
            // Store file for upload
            this.pendingFile = file;
        }

        async uploadStoryFile() {
            if (!this.pendingFile) {
                alert('No file selected.');
                return;
            }
            
            const titleEl = this.container.querySelector('#segment-title');
            const descriptionEl = this.container.querySelector('#segment-description');
            const orderEl = this.container.querySelector('#segment-order');
            
            const title = titleEl?.value?.trim();
            const description = descriptionEl?.value?.trim() || '';
            
            if (!title) {
                alert('Please enter a segment title.');
                titleEl?.focus();
                return;
            }
            
            const formData = new FormData();
            formData.append('file', this.pendingFile);
            formData.append('branch_id', this.branchId);
            formData.append('title', title);
            formData.append('description', description);
            
            // Add segment image if selected
            if (this.pendingSegmentImage) {
                formData.append('image', this.pendingSegmentImage);
            }
            
            if (orderEl && this.canEdit) {
                formData.append('order_index', orderEl.value || 1);
            }
            
            // Add tags if any are selected
            if (this.selectedSegmentTags && this.selectedSegmentTags.length > 0) {
                formData.append('tags', JSON.stringify(this.selectedSegmentTags));
            }
            
            try {
                const res = await fetch('/api/segments/upload.php', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await res.json();
                
                if (data.success) {
                    alert(`Segment uploaded successfully! ${data.credits_used > 0 ? `Credits used: ${data.credits_used}` : ''}`);
                    
                    // Clear form
                    titleEl.value = '';
                    descriptionEl.value = '';
                    if (orderEl) orderEl.value = '1';
                    this.container.querySelector('#story-previews').innerHTML = '';
                    this.container.querySelector('#story-file').value = '';
                    this.pendingFile = null;
                    
                    // Clear tags
                    if (this.segmentTaggingSystem) {
                        this.segmentTaggingSystem.clearAllTags();
                    }
                    this.selectedSegmentTags = [];
                    
                    // Refresh page or update segments list
                    location.reload();
                } else {
                    alert('Upload failed: ' + data.error);
                }
                
            } catch (err) {
                console.error('Upload failed:', err);
                alert('Upload failed. Please try again.');
            }
        }

        formatBytes(bytes, precision = 2) {
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let i = 0;
            
            while (bytes > 1024 && i < units.length - 1) {
                bytes /= 1024;
                i++;
            }
            
            return Math.round(bytes * Math.pow(10, precision)) / Math.pow(10, precision) + ' ' + units[i];
        }

        /**
         * Open the AI generation modal, set up prompt and cost.
         */
        async openGenerateModal() {
            const modal = this.container.querySelector('#generate-modal');
            const debug = modal.querySelector('#generate-debug');
            const costEl = modal.querySelector('#generate-cost');
            const creditsEl = modal.querySelector('#user-credits-gen');
            const modelSelect = modal.querySelector('#generate-model');
            const availableStorageEl = modal.querySelector('#available-storage');
            const estimatedSizeEl = modal.querySelector('#estimated-size');
            const submitBtn = modal.querySelector('#generate-submit');
            
            // Build default prompt (will be enhanced with title/description later)
            const titleEl = this.container.querySelector('#segment-title');
            const descriptionEl = this.container.querySelector('#segment-description');
            const title = titleEl?.value?.trim() || '[Title Missing]';
            const description = descriptionEl?.value?.trim() || '[Description Missing]';
            
            const prompt = `Write a Hollywood-caliber story segment for "${this.branch.media_title}" - a ${this.branch.branch_type} continuation. ` +
                           `Branch: "${this.branch.title}". Branch context: ${this.branch.summary}. ` +
                           `This segment is titled "${title}" and should focus on: ${description}. ` +
                           `Write compelling, professional prose in the style of the original work. ` +
                           `Output only the story content - no introduction, commentary, or explanatory text.`;
            debug.textContent = prompt;
            creditsEl.textContent = this.userCredits;
            
            // Load storage information
            try {
                const storageRes = await fetch('/api/users/storage.php');
                const storageData = await storageRes.json();
                
                if (storageData.success) {
                    availableStorageEl.textContent = storageData.formatted.available;
                    
                    // Estimate AI content size (3KB rounded up)
                    const estimatedBytes = 3072; // 3KB
                    const availableBytes = storageData.available_bytes;
                    
                    estimatedSizeEl.textContent = '~3KB';
                    
                    // Check if user has enough space
                    if (estimatedBytes > availableBytes) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = 'Insufficient Storage';
                        availableStorageEl.classList.add('text-destructive');
                        estimatedSizeEl.classList.add('text-destructive');
                    } else {
                        availableStorageEl.classList.remove('text-destructive');
                        estimatedSizeEl.classList.remove('text-destructive');
                    }
                } else {
                    availableStorageEl.textContent = 'Unknown';
                }
            } catch (err) {
                console.error('Failed to load storage info:', err);
                availableStorageEl.textContent = 'Error';
            }
            
            // Set initial cost based on first model
            this.updateGenerationCost();
            
            modal.classList.remove('hidden');
            
            // Bind modal buttons and events
            modal.querySelector('#generate-cancel').addEventListener('click', () => this.closeGenerateModal());
            modal.querySelector('#generate-submit').addEventListener('click', () => this.submitGenerate(prompt));
            modelSelect.addEventListener('change', () => this.updateGenerationCost());
        }

        updateGenerationCost() {
            const modal = this.container.querySelector('#generate-modal');
            const costEl = modal.querySelector('#generate-cost');
            const modelSelect = modal.querySelector('#generate-model');
            
            if (modelSelect && modelSelect.selectedOptions.length > 0) {
                const cost = modelSelect.selectedOptions[0].dataset.cost || 1;
                costEl.textContent = cost;
            }
        }

        /**
         * Close the AI generation modal and cleanup.
         */
        closeGenerateModal() {
            const modal = this.container.querySelector('#generate-modal');
            if (modal) modal.classList.add('hidden');
        }

        /**
         * Submit the AI generation request.
         */
        async submitGenerate(prompt) {
            if (!this.aiStatus.api_key_configured || !this.aiStatus.api_key_valid) {
                alert('AI generation is not available.');
                return;
            }
            
            const modal = this.container.querySelector('#generate-modal');
            const modelSelect = modal.querySelector('#generate-model');
            const titleEl = this.container.querySelector('#segment-title');
            const descriptionEl = this.container.querySelector('#segment-description');
            const orderEl = this.container.querySelector('#segment-order');
            const submitBtn = modal.querySelector('#generate-submit');
            
            const selectedModel = modelSelect.value;
            const title = titleEl?.value?.trim();
            const description = descriptionEl?.value?.trim() || '';
            
            if (!title) {
                alert('Please enter a segment title.');
                titleEl?.focus();
                return;
            }
            
            if (!selectedModel) {
                alert('Please select an AI model.');
                return;
            }
            
            const cost = parseInt(modelSelect.selectedOptions[0].dataset.cost || 1);
            if (this.userCredits < cost) {
                alert(`Insufficient credits. Need ${cost} credits but only have ${this.userCredits}.`);
                return;
            }
            
            // Disable submit button
            submitBtn.disabled = true;
            submitBtn.textContent = 'Generating...';
            
            try {
                // Enhanced prompt with description
                let enhancedPrompt = prompt;
                if (description) {
                    enhancedPrompt += ` The user has provided this specific description for this segment: "${description}". ` +
                                     `Use this to guide the specific content and direction of this segment.`;
                }
                
                const requestData = {
                    branch_id: this.branchId,
                    title: title,
                    description: description,
                    model: selectedModel,
                    prompt: enhancedPrompt,
                    tags: [] // User can add additional tags later
                };
                
                if (orderEl && this.canEdit) {
                    requestData.order_index = parseInt(orderEl.value || 1);
                }
                
                const res = await fetch('/api/ai/generate.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });
                
                const data = await res.json();
                
                if (data.success) {
                    alert(`Story generated successfully! Credits used: ${data.credits_used}\nMandatory tags added: ${data.mandatory_tags.join(', ')}`);
                    
                    // Clear form and close modal
                    titleEl.value = '';
                    descriptionEl.value = '';
                    if (orderEl) orderEl.value = '1';
                    this.closeGenerateModal();
                    
                    // Update user credits
                    this.userCredits -= data.credits_used;
                    
                    // Refresh page to show new segment
                    location.reload();
                } else {
                    alert('AI generation failed: ' + data.error);
                }
                
            } catch (err) {
                console.error('AI generation failed:', err);
                alert('AI generation failed. Please try again.');
            } finally {
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.textContent = 'Generate';
            }
        }

        async readSegment(segmentId) {
            const modal = this.container.querySelector('#segment-reader-modal');
            const titleEl = modal.querySelector('#segment-title-modal');
            const contentEl = modal.querySelector('#segment-content');
            const voteScoreEl = modal.querySelector('#reader-vote-score');
            const voteUpBtn = modal.querySelector('#reader-vote-up');
            const voteDownBtn = modal.querySelector('#reader-vote-down');
            
            // Store current segment ID for voting and comments
            this.currentSegmentId = segmentId;
            this.currentReaderSegmentId = segmentId;
            
            // Find current segment index for navigation
            this.currentSegmentIndex = this.segments.findIndex(s => s.id == segmentId);
            this.updateNavigationState();
            
            // Show modal with loading state
            modal.classList.remove('hidden');
            titleEl.textContent = 'Loading...';
            contentEl.innerHTML = 'Loading content...';
            voteScoreEl.textContent = '0';
            
            // Set up vote button handlers
            voteUpBtn.onclick = () => this.handleSegmentVoteInReader(segmentId, 1);
            voteDownBtn.onclick = () => this.handleSegmentVoteInReader(segmentId, -1);
            
            // Reset reader comments
            const readerComments = modal.querySelector('#reader-comments');
            const toggleBtn = modal.querySelector('#toggle-reader-comments');
            if (readerComments && toggleBtn) {
                readerComments.classList.add('hidden');
                readerComments.removeAttribute('data-loaded');
                toggleBtn.textContent = 'Show Comments';
            }
            
            try {
                const res = await fetch(`/api/segments/content.php?id=${segmentId}`);
                const data = await res.json();
                
                if (data.success) {
                    titleEl.textContent = data.segment.title;
                    
                    // Get current vote score from segments list
                    const segmentData = this.segments.find(s => s.id == segmentId);
                    if (segmentData) {
                        voteScoreEl.textContent = segmentData.vote_score;
                    }
                    
                    // Render content based on file type
                    if (data.file_type === 'md') {
                        // Simple markdown rendering
                        let content = escapeHTML(data.content);
                        // Basic markdown formatting
                        content = content.replace(/^# (.+)$/gm, '<h1>$1</h1>');
                        content = content.replace(/^## (.+)$/gm, '<h2>$1</h2>');
                        content = content.replace(/^### (.+)$/gm, '<h3>$1</h3>');
                        content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                        content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');
                        content = content.replace(/\n\n/g, '</p><p>');
                        content = '<p>' + content + '</p>';
                        contentEl.innerHTML = content;
                    } else {
                        // Plain text
                        const content = escapeHTML(data.content).replace(/\n/g, '<br>');
                        contentEl.innerHTML = `<div class="whitespace-pre-wrap">${content}</div>`;
                    }
                } else {
                    contentEl.innerHTML = `<p class="text-destructive">Error loading content: ${data.error}</p>`;
                }
                
            } catch (err) {
                console.error('Failed to load segment:', err);
                contentEl.innerHTML = `<p class="text-destructive">Failed to load content. Please try again.</p>`;
            }
        }

        async handleSegmentVoteInReader(segmentId, value) {
            try {
                const res = await fetch('/api/votes/create.php', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ target_type: 'segment', target_id: segmentId, vote_value: value })
                });
                const data = await res.json();
                if (data.success) {
                    // Update reader modal vote score
                    const readerScoreEl = this.container.querySelector('#reader-vote-score');
                    if (readerScoreEl) readerScoreEl.textContent = data.score;
                    
                    // Update segment list vote score
                    const listScoreEl = this.container.querySelector(`.segment-vote-score[data-segment-id="${segmentId}"]`);
                    if (listScoreEl) listScoreEl.textContent = data.score;
                    
                    // Update segments data
                    const segmentData = this.segments.find(s => s.id == segmentId);
                    if (segmentData) {
                        segmentData.vote_score = data.score;
                    }
                }
            } catch (err) {
                console.error('Segment vote failed', err);
            }
        }

        closeSegmentReader() {
            const modal = this.container.querySelector('#segment-reader-modal');
            if (modal) modal.classList.add('hidden');
        }

        async toggleSegmentComments(segmentId) {
            const commentsContainer = this.container.querySelector(`#segment-comments-${segmentId}`);
            const toggleBtn = this.container.querySelector(`.toggle-segment-comments[data-segment-id="${segmentId}"]`);
            
            if (!commentsContainer || !toggleBtn) return;
            
            if (commentsContainer.classList.contains('hidden')) {
                // Show comments - load them if not already loaded
                commentsContainer.classList.remove('hidden');
                toggleBtn.textContent = 'Hide Comments';
                
                if (!commentsContainer.hasAttribute('data-loaded')) {
                    await this.loadSegmentComments(segmentId);
                    commentsContainer.setAttribute('data-loaded', 'true');
                }
            } else {
                // Hide comments
                commentsContainer.classList.add('hidden');
                toggleBtn.textContent = 'Show Comments';
            }
        }

        async loadSegmentComments(segmentId) {
            const commentsContainer = this.container.querySelector(`#segment-comments-${segmentId}`);
            if (!commentsContainer) return;
            
            try {
                commentsContainer.innerHTML = '<div class="text-sm text-muted-foreground">Loading comments...</div>';
                
                const response = await fetch(`/api/comments/get.php?target_type=segment&target_id=${segmentId}&sort=new`);
                const data = await response.json();
                
                if (data.comments && data.comments.length > 0) {
                    let html = '<div class="space-y-3">';
                    
                    data.comments.forEach(comment => {
                        const avatarUrl = comment.avatar_url || '/img/default-avatar.png';
                        const username = comment.is_anonymous ? 'Anonymous' : (comment.username || 'User');
                        const timeAgo = this.formatTimeAgo(comment.created_at);
                        
                        html += `<div class="border-l-2 border-muted pl-4 py-2">`;
                        html += `<div class="flex items-center space-x-2 mb-1">`;
                        if (!comment.is_anonymous) {
                            html += `<img src="${avatarUrl}" alt="${username}" class="w-6 h-6 rounded-full">`;
                        }
                        html += `<span class="text-sm font-medium">${escapeHTML(username)}</span>`;
                        html += `<span class="text-xs text-muted-foreground">${timeAgo}</span>`;
                        html += `<span class="text-xs text-muted-foreground">${comment.vote_score} points</span>`;
                        html += `</div>`;
                        html += `<div class="text-sm">${escapeHTML(comment.body)}</div>`;
                        html += `</div>`;
                    });
                    
                    html += '</div>';
                    
                    // Add comment form if user is logged in
                    if (this.userLoggedIn) {
                        html += `<div class="mt-4 pt-4 border-t">`;
                        html += `<textarea id="new-comment-${segmentId}" class="form-textarea w-full mb-2" rows="3" placeholder="Add a comment..."></textarea>`;
                        html += `<button class="btn-primary btn-sm" onclick="window.branchPage.submitSegmentComment(${segmentId})">Post Comment</button>`;
                        html += `</div>`;
                    }
                    
                    commentsContainer.innerHTML = html;
                } else {
                    let html = '<div class="text-sm text-muted-foreground">No comments yet.</div>';
                    
                    // Add comment form if user is logged in
                    if (this.userLoggedIn) {
                        html += `<div class="mt-4 pt-4 border-t">`;
                        html += `<textarea id="new-comment-${segmentId}" class="form-textarea w-full mb-2" rows="3" placeholder="Be the first to comment..."></textarea>`;
                        html += `<button class="btn-primary btn-sm" onclick="window.branchPage.submitSegmentComment(${segmentId})">Post Comment</button>`;
                        html += `</div>`;
                    }
                    
                    commentsContainer.innerHTML = html;
                }
            } catch (error) {
                console.error('Failed to load segment comments:', error);
                commentsContainer.innerHTML = '<div class="text-sm text-destructive">Failed to load comments.</div>';
            }
        }

        async submitSegmentComment(segmentId) {
            const commentEl = this.container.querySelector(`#new-comment-${segmentId}`);
            if (!commentEl) return;
            
            const body = commentEl.value.trim();
            if (!body) {
                alert('Please enter a comment.');
                return;
            }
            
            try {
                const response = await fetch('/api/comments/create.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        target_type: 'segment',
                        target_id: segmentId,
                        body: body
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    // Clear the comment form
                    commentEl.value = '';
                    
                    // Reload the comments to show the new one
                    const commentsContainer = this.container.querySelector(`#segment-comments-${segmentId}`);
                    if (commentsContainer) {
                        commentsContainer.removeAttribute('data-loaded');
                        await this.loadSegmentComments(segmentId);
                    }
                } else {
                    alert('Failed to post comment: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Failed to submit comment:', error);
                alert('Failed to post comment. Please try again.');
            }
        }

        async toggleReaderComments() {
            if (!this.currentReaderSegmentId) return;
            
            const modal = this.container.querySelector('#segment-reader-modal');
            const commentsContainer = modal.querySelector('#reader-comments');
            const toggleBtn = modal.querySelector('#toggle-reader-comments');
            
            if (!commentsContainer || !toggleBtn) return;
            
            if (commentsContainer.classList.contains('hidden')) {
                // Show comments - load them if not already loaded
                commentsContainer.classList.remove('hidden');
                toggleBtn.textContent = 'Hide Comments';
                
                if (!commentsContainer.hasAttribute('data-loaded')) {
                    await this.loadReaderComments();
                    commentsContainer.setAttribute('data-loaded', 'true');
                }
            } else {
                // Hide comments
                commentsContainer.classList.add('hidden');
                toggleBtn.textContent = 'Show Comments';
            }
        }

        async loadReaderComments() {
            if (!this.currentReaderSegmentId) return;
            
            const modal = this.container.querySelector('#segment-reader-modal');
            const commentsContainer = modal.querySelector('#reader-comments');
            if (!commentsContainer) return;
            
            try {
                commentsContainer.innerHTML = '<div class="text-sm text-muted-foreground">Loading comments...</div>';
                
                const response = await fetch(`/api/comments/get.php?target_type=segment&target_id=${this.currentReaderSegmentId}&sort=new`);
                const data = await response.json();
                
                if (data.comments && data.comments.length > 0) {
                    let html = '<div class="space-y-4">';
                    
                    data.comments.forEach(comment => {
                        const avatarUrl = comment.avatar_url || '/img/default-avatar.png';
                        const username = comment.is_anonymous ? 'Anonymous' : (comment.username || 'User');
                        const timeAgo = this.formatTimeAgo(comment.created_at);
                        
                        html += `<div class="border rounded-lg p-4 bg-card">`;
                        html += `<div class="flex items-center space-x-3 mb-2">`;
                        if (!comment.is_anonymous) {
                            html += `<img src="${avatarUrl}" alt="${username}" class="w-8 h-8 rounded-full">`;
                        }
                        html += `<div class="flex-1">`;
                        html += `<div class="flex items-center space-x-2">`;
                        html += `<span class="font-medium">${escapeHTML(username)}</span>`;
                        html += `<span class="text-xs text-muted-foreground">${timeAgo}</span>`;
                        html += `<span class="text-xs text-muted-foreground">${comment.vote_score} points</span>`;
                        html += `</div>`;
                        html += `</div>`;
                        html += `</div>`;
                        html += `<div class="text-sm">${escapeHTML(comment.body)}</div>`;
                        html += `</div>`;
                    });
                    
                    html += '</div>';
                    
                    // Add comment form if user is logged in
                    if (this.userLoggedIn) {
                        html += `<div class="mt-6 p-4 border rounded-lg bg-muted/50">`;
                        html += `<h5 class="font-medium mb-3">Add a comment</h5>`;
                        html += `<textarea id="new-reader-comment" class="form-textarea w-full mb-3" rows="3" placeholder="Share your thoughts..."></textarea>`;
                        html += `<button class="btn-primary btn-sm" onclick="window.branchPage.submitReaderComment()">Post Comment</button>`;
                        html += `</div>`;
                    }
                    
                    commentsContainer.innerHTML = html;
                } else {
                    let html = '<div class="text-center text-muted-foreground py-8">No comments yet.</div>';
                    
                    // Add comment form if user is logged in
                    if (this.userLoggedIn) {
                        html += `<div class="mt-6 p-4 border rounded-lg bg-muted/50">`;
                        html += `<h5 class="font-medium mb-3">Be the first to comment</h5>`;
                        html += `<textarea id="new-reader-comment" class="form-textarea w-full mb-3" rows="3" placeholder="Share your thoughts..."></textarea>`;
                        html += `<button class="btn-primary btn-sm" onclick="window.branchPage.submitReaderComment()">Post Comment</button>`;
                        html += `</div>`;
                    }
                    
                    commentsContainer.innerHTML = html;
                }
            } catch (error) {
                console.error('Failed to load reader comments:', error);
                commentsContainer.innerHTML = '<div class="text-sm text-destructive">Failed to load comments.</div>';
            }
        }

        async submitReaderComment() {
            if (!this.currentReaderSegmentId) return;
            
            const commentEl = this.container.querySelector('#new-reader-comment');
            if (!commentEl) return;
            
            const body = commentEl.value.trim();
            if (!body) {
                alert('Please enter a comment.');
                return;
            }
            
            try {
                const response = await fetch('/api/comments/create.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        target_type: 'segment',
                        target_id: this.currentReaderSegmentId,
                        body: body
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    // Clear the comment form
                    commentEl.value = '';
                    
                    // Reload the comments to show the new one
                    const modal = this.container.querySelector('#segment-reader-modal');
                    const commentsContainer = modal.querySelector('#reader-comments');
                    if (commentsContainer) {
                        commentsContainer.removeAttribute('data-loaded');
                        await this.loadReaderComments();
                    }
                } else {
                    alert('Failed to post comment: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Failed to submit reader comment:', error);
                alert('Failed to post comment. Please try again.');
            }
        }

        async handleCoverUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                alert('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
                return;
            }
            
            // Validate file size (5MB max)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                alert('File too large. Maximum size is 5MB.');
                return;
            }
            
            try {
                // Check storage quota
                const storageRes = await fetch('/api/users/storage.php');
                const storageData = await storageRes.json();
                
                if (file.size > storageData.available_bytes) {
                    alert(`Insufficient storage space. File requires ${this.formatBytes(file.size)} but only ${storageData.formatted.available} available.`);
                    return;
                }
                
                // Upload the image
                const formData = new FormData();
                formData.append('image', file);
                formData.append('branch_id', this.branchId);
                
                const uploadRes = await fetch('/api/branches/upload-cover.php', {
                    method: 'POST',
                    body: formData
                });
                
                const uploadData = await uploadRes.json();
                if (uploadData.success) {
                    // Refresh the page to show the new cover
                    location.reload();
                } else {
                    alert('Failed to upload cover image: ' + (uploadData.error || 'Unknown error'));
                }
                
            } catch (err) {
                console.error('Cover upload failed:', err);
                alert('Failed to upload cover image. Please try again.');
            }
        }

        async removeCoverImage() {
            if (!confirm('Are you sure you want to remove the cover image?')) {
                return;
            }
            
            try {
                const res = await fetch('/api/branches/remove-cover.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ branch_id: this.branchId })
                });
                
                const data = await res.json();
                if (data.success) {
                    // Refresh the page to show the change
                    location.reload();
                } else {
                    alert('Failed to remove cover image: ' + (data.error || 'Unknown error'));
                }
                
            } catch (err) {
                console.error('Remove cover failed:', err);
                alert('Failed to remove cover image. Please try again.');
            }
        }

        async handleSegmentImageUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                alert('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
                return;
            }
            
            // Validate file size (5MB max)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                alert('File too large. Maximum size is 5MB.');
                return;
            }
            
            try {
                // Check storage quota
                const storageRes = await fetch('/api/users/storage.php');
                const storageData = await storageRes.json();
                
                if (file.size > storageData.available_bytes) {
                    alert(`Insufficient storage space. File requires ${this.formatBytes(file.size)} but only ${storageData.formatted.available} available.`);
                    return;
                }
                
                // Store the pending image for upload with segment
                this.pendingSegmentImage = file;
                
                // Show image preview
                this.showSegmentImagePreview(file);
                
            } catch (err) {
                console.error('Image processing failed:', err);
                alert('Failed to process image. Please try again.');
            }
        }

        showSegmentImagePreview(file) {
            const previewEl = this.container.querySelector('#image-preview');
            if (!previewEl) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                previewEl.innerHTML = `
                    <div class="border rounded p-3 bg-muted/50">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-medium">${escapeHTML(file.name)}</span>
                            <button class="btn-ghost btn-sm" onclick="this.parentElement.parentElement.parentElement.remove(); window.branchPage.pendingSegmentImage = null;">×</button>
                        </div>
                        <div class="text-xs text-muted-foreground mb-2">
                            Size: ${this.formatBytes(file.size)}
                        </div>
                        <img src="${e.target.result}" alt="Preview" class="max-w-full max-h-32 rounded">
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        }

        updateNavigationState() {
            const modal = this.container.querySelector('#segment-reader-modal');
            const prevBtn = modal.querySelector('#prev-segment-btn');
            const nextBtn = modal.querySelector('#next-segment-btn');
            const positionEl = modal.querySelector('#segment-position');
            
            if (!this.segments || this.segments.length === 0) return;
            
            const currentPos = this.currentSegmentIndex + 1;
            const totalSegments = this.segments.length;
            
            // Update position indicator
            if (positionEl) {
                positionEl.textContent = `${currentPos} of ${totalSegments}`;
            }
            
            // Enable/disable navigation buttons
            if (prevBtn) {
                prevBtn.disabled = this.currentSegmentIndex <= 0;
                prevBtn.classList.toggle('opacity-50', this.currentSegmentIndex <= 0);
            }
            
            if (nextBtn) {
                nextBtn.disabled = this.currentSegmentIndex >= totalSegments - 1;
                nextBtn.classList.toggle('opacity-50', this.currentSegmentIndex >= totalSegments - 1);
            }
        }

        navigateSegment(direction) {
            if (!this.segments || this.segments.length === 0) return;
            
            const newIndex = this.currentSegmentIndex + direction;
            
            // Check bounds
            if (newIndex < 0 || newIndex >= this.segments.length) return;
            
            // Get the new segment
            const newSegment = this.segments[newIndex];
            if (!newSegment) return;
            
            // Load the new segment
            this.readSegment(newSegment.id);
        }

        setupKeyboardNavigation() {
            // Remove existing keyboard handler if it exists
            if (this.keyboardHandler) {
                document.removeEventListener('keydown', this.keyboardHandler);
            }
            
            this.keyboardHandler = (e) => {
                const modal = this.container.querySelector('#segment-reader-modal');
                
                // Only handle keyboard navigation when segment reader is open
                if (!modal || modal.classList.contains('hidden')) return;
                
                // Don't interfere with typing in comment boxes
                if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
                
                switch (e.key) {
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        e.preventDefault();
                        this.navigateSegment(-1);
                        break;
                    case 'ArrowRight':
                    case 'ArrowDown':
                        e.preventDefault();
                        this.navigateSegment(1);
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.closeSegmentReader();
                        break;
                }
            };
            
            document.addEventListener('keydown', this.keyboardHandler);
        }

        formatTimeAgo(dateString) {
            const now = new Date();
            const date = new Date(dateString);
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
        }

        toggleAddSegmentForm() {
            const form = this.container.querySelector('#add-segment-form');
            const btn = this.container.querySelector('#add-segment-btn');
            
            if (form.classList.contains('hidden')) {
                form.classList.remove('hidden');
                btn.textContent = '❌ Cancel';
            } else {
                form.classList.add('hidden');
                btn.textContent = '📝 Add Story Segment';
                
                // Clear form fields
                const titleEl = this.container.querySelector('#segment-title');
                const descEl = this.container.querySelector('#segment-description');
                const orderEl = this.container.querySelector('#segment-order');
                const previewEl = this.container.querySelector('#story-previews');
                const fileEl = this.container.querySelector('#story-file');
                const imageEl = this.container.querySelector('#segment-image');
                const imagePreviewEl = this.container.querySelector('#image-preview');
                
                if (titleEl) titleEl.value = '';
                if (descEl) {
                    descEl.value = '';
                    this.updateDescriptionCounter('');
                }
                if (orderEl) orderEl.value = '1';
                if (previewEl) previewEl.innerHTML = '';
                if (fileEl) fileEl.value = '';
                if (imageEl) imageEl.value = '';
                if (imagePreviewEl) imagePreviewEl.innerHTML = '';
                this.pendingFile = null;
                this.pendingSegmentImage = null;
                
                // Clear tags
                if (this.segmentTaggingSystem) {
                    this.segmentTaggingSystem.clearAllTags();
                }
                this.selectedSegmentTags = [];
            }
        }

        updateDescriptionCounter(text) {
            const counter = this.container.querySelector('#description-counter');
            const requirement = this.container.querySelector('#description-requirement');
            
            if (!counter) return;
            
            const length = text.length;
            counter.textContent = `${length} characters`;
            
            if (length >= 100) {
                counter.classList.remove('text-destructive');
                counter.classList.add('text-success');
                requirement.textContent = 'Ready for AI generation ✓';
                requirement.classList.remove('text-muted-foreground');
                requirement.classList.add('text-success');
            } else {
                counter.classList.remove('text-success');
                counter.classList.add('text-destructive');
                requirement.textContent = `Required for AI generation: ${100 - length} more characters needed`;
                requirement.classList.remove('text-success');
                requirement.classList.add('text-muted-foreground');
            }
        }

        validateAndOpenGenerateModal() {
            const titleEl = this.container.querySelector('#segment-title');
            const descriptionEl = this.container.querySelector('#segment-description');
            
            const title = titleEl?.value?.trim() || '';
            const description = descriptionEl?.value?.trim() || '';
            
            if (!title) {
                alert('Please enter a segment title before generating AI content.');
                titleEl?.focus();
                return;
            }
            
            if (description.length < 100) {
                alert(`Description must be at least 100 characters for AI generation. Current length: ${description.length} characters.`);
                descriptionEl?.focus();
                return;
            }
            
            this.openGenerateModal();
        }

        async editSegment(segmentId) {
            // Find the segment data
            const segment = this.segments.find(s => s.id == segmentId);
            if (!segment) {
                alert('Segment not found.');
                return;
            }
            
            // Simple edit functionality - prompt for new title and description
            const newTitle = prompt('Edit segment title:', segment.title);
            if (newTitle === null) return; // User cancelled
            
            if (!newTitle.trim()) {
                alert('Title cannot be empty.');
                return;
            }
            
            const newDescription = prompt('Edit segment description:', segment.description || '');
            if (newDescription === null) return; // User cancelled
            
            try {
                const response = await fetch('/api/segments/update.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        segment_id: segmentId,
                        title: newTitle.trim(),
                        description: newDescription.trim()
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    // Refresh the page to show updates
                    location.reload();
                } else {
                    alert('Failed to update segment: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Failed to update segment:', error);
                alert('Failed to update segment. Please try again.');
            }
        }

        async deleteSegment(segmentId) {
            // Find the segment data
            const segment = this.segments.find(s => s.id == segmentId);
            if (!segment) {
                alert('Segment not found.');
                return;
            }
            
            if (!confirm(`Are you sure you want to delete the segment "${segment.title}"? This action cannot be undone.`)) {
                return;
            }
            
            try {
                const response = await fetch('/api/segments/delete.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        segment_id: segmentId
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    // Refresh the page to show updates
                    location.reload();
                } else {
                    alert('Failed to delete segment: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Failed to delete segment:', error);
                alert('Failed to delete segment. Please try again.');
            }
        }

        cleanup() {
            // Remove keyboard event handler
            if (this.keyboardHandler) {
                document.removeEventListener('keydown', this.keyboardHandler);
                this.keyboardHandler = null;
            }
        }
    }

    // Export
    window.BranchPage = BranchPage;
})();