// Wrap the entire file content in an IIFE to control scope
(function() {
    // Utility to escape HTML - moved inside the IIFE for encapsulation
    function escapeHTML(str) {
        if (typeof str !== 'string') return ''; // Handle non-string inputs
        return str.replace(/[&<>"']/g, tag => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[tag]));
    }

    class MediaPage {
        constructor() {
            this.mediaId = parseInt(new URLSearchParams(window.location.search).get('id'), 10);
            this.container = document.getElementById('media-container');
            this.userLoggedIn = false;
            this.userIsAdmin = false;
            this.mediaTagging = null; // Initialize tagging system instance

            if (!this.mediaId || !this.container) {
                if (this.container) {
                    this.container.innerHTML = '<p class="text-destructive">Invalid media ID.</p>';
                }
                console.error("MediaPage: Invalid media ID or container not found.");
                return; // Stop execution if essential elements are missing
            }

            console.log(`MediaPage: Instance created for media ID ${this.mediaId}`);
            this.init(); // Call init immediately on construction
        }

        /**
         * Initializes or re-initializes the page state and renders content.
         * This method can be called multiple times safely, for example, when
         * navigating to a new media ID on the same page route.
         */
        async init() {
            console.log(`MediaPage: Initializing data for media ID ${this.mediaId}`);
            await this.fetchMedia();
            await this.fetchUserProfile();
            if (!this.media) return;
            this.renderView();
            this.bindEvents();
            if (!this.userLoggedIn) this.loadJoinButtons();

            // Initialize CommentThread and let it handle its own lifecycle
            if (typeof CommentThread !== 'undefined') {
                if (this.commentThread?.cleanup) this.commentThread.cleanup();
                this.commentThread = new CommentThread({
                    containerSelector: '#comment-thread',
                    targetType: 'media',
                    targetId: this.mediaId,
                    userLoggedIn: this.userLoggedIn,
                    isAdmin: this.userIsAdmin,
                    autoExpandAll: true // Keep threads expanded
                });
            }
            
            this.loadBranches();
        }

        async fetchMedia() {
            try {
                const resp = await fetch(`/api/media/get.php?id=${this.mediaId}`);
                if (!resp.ok) {
                    // Try to parse error message from response if available
                    const errorText = await resp.text();
                    throw new Error(`Failed to load media: ${resp.status} - ${errorText}`);
                }
                const data = await resp.json();
                this.media = data.media;
            } catch (err) {
                console.error('MediaPage: Error fetching media:', err);
                if (this.container) {
                    this.container.innerHTML = `<p class="text-destructive">Error loading media: ${err.message}.</p>`;
                }
                this.media = null; // Ensure media is null on failure
            }
        }

        async fetchUserProfile() {
            try {
                const resp = await fetch('/api/users/profile.php');
                if (resp.ok) {
                    const data = await resp.json();
                    this.userLoggedIn = true;
                    this.userIsAdmin = Boolean(data.is_admin);
                } else {
                    this.userLoggedIn = false;
                    this.userIsAdmin = false;
                }
            } catch (err) {
                console.error('MediaPage: Error fetching user profile:', err);
                this.userLoggedIn = false;
                this.userIsAdmin = false;
            }
        }

        async loadJoinButtons() {
            try {
                const frag = await fetch('/pages/frag/join-button.php').then(r => r.text());
                const branchSlot = this.container.querySelector('#join-branch-container');
                if (branchSlot) branchSlot.innerHTML = frag;
                const commentSlot = this.container.querySelector('#join-comment-container');
                if (commentSlot) commentSlot.innerHTML = frag;
            } catch (err) {
                console.error('MediaPage: Failed to load join button fragment', err);
            }
        }

        /**
         * Renders the main media details view.
         * This completely replaces the content of `this.container`.
         */
        renderView() {
            const m = this.media;
            let html = `<div class="space-y-4">`;

            // Header
            html += `<h1 class="text-3xl font-bold">${escapeHTML(m.title)}</h1>`;
            html += `<div class="flex items-center space-x-2">`;
            if (m.author_avatar) {
                html += `<img src="${m.author_avatar}" class="w-8 h-8 rounded-full">`;
            }
            html += `<span class="font-medium">${escapeHTML(m.author)}</span>`;
            html += `<span class="text-sm text-muted-foreground">${new Date(m.created_at).toLocaleString()}</span>`;
            html += `</div>`;
            
            // Tags section
            html += `<div id="media-tags" class="flex flex-wrap gap-2">`;
            html += this.renderTagsHtml(m.tags, m.can_edit);
            html += `</div>`;
            if (m.can_edit) {
                html += `
                <div id="media-add-tag-area" class="relative mt-2">
                  <input type="text" id="media-new-tag" class="form-input w-full pr-16 text-sm" placeholder="Add tag..." autocomplete="off" />
                  <button id="media-add-tag-btn" class="btn btn-ghost btn-sm absolute top-1 right-1">➕ Add</button>
                  <div id="media-tag-suggestions" class="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg hidden max-h-48 overflow-y-auto"></div>
                  <div id="media-selected-tags" class="mt-2 flex flex-wrap gap-2"></div>
                </div>
                `;
            }
            
            // Vote section
            html += `<div class="flex items-center space-x-4 mt-4">`;
            html += `
                <button data-vote="1" class="vote-btn btn btn-ghost btn-sm p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    </svg>
                </button>
                <span id="media-vote-score" class="font-medium">${m.vote_score}</span>
                <button data-vote="-1" class="vote-btn btn btn-ghost btn-sm p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            `;
            html += `</div>`;

            // Cover Image
            if (m.cover_image) {
                html += `
                    <div class="mt-4 relative text-center">
                        <img src="/uploads/users/${m.created_by}/images/${m.cover_image}" class="w-full max-w-md mx-auto max-h-40 object-cover rounded">
                        ${(m.can_edit_owner || this.userIsAdmin)
                            ? `<button id="remove-cover-btn" class="btn btn-ghost btn-xs p-1 absolute top-1 right-1 text-red-600 bg-white/90 hover:bg-white shadow-sm rounded">&times;</button>`
                            : ''}
                    </div>
                `;
            }

            // Description
            html += `<p class="mt-4">${escapeHTML(m.description || '')}</p>`;

            // Image Gallery
            if (m.images && m.images.length) {
                html += `<div class="card p-4 mt-4"><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">`;
                m.images.forEach(img => {
                    const src = `/uploads/users/${m.created_by}/images/${img.file_name}`;
                    html += `<div class="relative group" data-image-id="${img.id}">`;
                    if (img.hidden) {
                        html += `<div class="absolute inset-0 bg-black/70 flex items-center justify-center text-white z-20 rounded">
                            <span class="text-sm font-medium">Hidden</span>
                        </div>`;
                    }
                    html += `<img src="${src}" class="w-full rounded h-48 object-cover">`;
                    html += `
                        <div class="absolute top-2 right-2 flex flex-col items-center space-y-1 z-30 text-white" style="text-shadow: 1px 1px 3px rgba(0,0,0,0.7);">
                            <button data-img-id="${img.id}" data-vote="1" class="img-vote-btn btn btn-ghost btn-xs p-1 bg-black/80 hover:bg-black shadow-sm rounded">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                            </button>
                            <span class="text-xs px-1.5 py-0.5 rounded font-medium image-vote-score">${img.vote_score}</span>
                            <button data-img-id="${img.id}" data-vote="-1" class="img-vote-btn btn btn-ghost btn-xs p-1 bg-black/80 hover:bg-black shadow-sm rounded">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            ${m.can_edit_owner ? `<button data-img-id="${img.id}" class="remove-image-btn btn btn-ghost btn-xs p-1 bg-black/80 hover:bg-black shadow-sm rounded" title="Remove Image">❌</button>` : ''}
                            ${this.userIsAdmin ? `<button data-img-id="${img.id}" data-action="${img.hidden ? 'unhide' : 'hide'}" class="toggle-image-visibility-btn btn btn-ghost btn-xs p-1 bg-black/80 hover:bg-black shadow-sm rounded" title="${img.hidden ? 'Unhide Image' : 'Hide Image'}">👁️</button>` : ''}
                        </div>
                    `;
                    html += `</div>`;
                });
                html += `</div></div>`;
            }

            // Branches section
            html += `<div id="media-branches" class="mt-6">`;
            html += `<h2 class="text-xl font-semibold mb-4">Branches</h2>`;
            html += `<div id="media-branches-list" class="space-y-4">`;
            html += `</div>`;

            // "Add Branch" button
            html += `<div class="mt-6 flex space-x-2" id="branch-actions">`;
            if (this.userLoggedIn) {
                html += `<button id="add-branch-btn" class="btn-primary">🌿 Add Branch</button>`;
            } else {
                html += `<div id="join-branch-container"></div>`;
            }
            html += `</div>`;

            // Comments section
            if (!this.userLoggedIn) {
                html += `<div id="join-comment-container" class="mb-4"></div>`;
            }
            html += `<div id="comment-thread" class="mt-8"></div>`;

            // Branch Modal
            html += `<div id="branch-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden z-50">`;
            html += `<div class="bg-card rounded-lg p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">`;
            html += `<h3 class="text-xl font-semibold">Add a New Branch</h3>`;
            html += `<p class="text-sm text-muted-foreground">Choose the type of branch and provide details below. Please check existing branches to avoid duplicates.</p>`;
            html += `<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">`;
            html += `
                <label class="relative flex flex-col items-center p-4 border border-border rounded-lg cursor-pointer bg-card
                                hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary
                                has-[:checked]:text-primary-foreground has-[:checked]:ring-2 has-[:checked]:ring-offset-1
                                has-[:checked]:ring-primary has-[:checked]:shadow-inner transition-all">
                    <input type="radio" name="branch-type" value="after" class="sr-only" checked>
                    <span class="text-lg font-medium">🌿 After</span>
                    <span class="text-xs mt-1">Continue the story after the original ending (most common).</span>
                </label>
            `;
            html += `
                <label class="relative flex flex-col items-center p-4 border border-border rounded-lg cursor-pointer bg-card
                                hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary
                                has-[:checked]:text-primary-foreground has-[:checked]:ring-2 has-[:checked]:ring-offset-1
                                has-[:checked]:ring-primary has-[:checked]:shadow-inner transition-all">
                    <input type="radio" name="branch-type" value="before" class="sr-only">
                    <span class="text-lg font-medium">📜 Before</span>
                    <span class="text-xs mt-1">Prequel or events leading up to the original story.</span>
                </label>
            `;
            html += `
                <label class="relative flex flex-col items-center p-4 border border-border rounded-lg cursor-pointer bg-card
                                hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary
                                has-[:checked]:text-primary-foreground has-[:checked]:ring-2 has-[:checked]:ring-offset-1
                                has-[:checked]:ring-primary has-[:checked]:shadow-inner transition-all">
                    <input type="radio" name="branch-type" value="other" class="sr-only">
                    <span class="text-lg font-medium">🎭 Alternate</span>
                    <span class="text-xs mt-1">Non-canon or fan-fiction variations of the original story.</span>
                </label>
            `;
            html += `</div>`;
            html += `<div>`;
            html += `<label for="branch-title" class="block text-sm font-medium text-muted-foreground mb-1">Branch Title</label>`;
            html += `<input type="text" id="branch-title" class="form-input w-full" placeholder="A descriptive title for this branch...">`;
            html += `</div>`;
            html += `<div>`;
            html += `<label for="branch-summary" class="block text-sm font-medium text-muted-foreground mb-1">Summary</label>`;
            html += `<textarea id="branch-summary" rows="3" class="form-textarea w-full" placeholder="Brief summary of what this branch covers..."></textarea>`;
            html += `</div>`;
            html += `<div>`;
            html += `<label for="branch-source" class="block text-sm font-medium text-muted-foreground mb-1">Source Type</label>`;
            html += `<select id="branch-source" class="form-select w-full">`;
            html += `<option value="book">Book</option>`;
            html += `<option value="movie">Movie</option>`;
            html += `<option value="tv_show">TV Show</option>`;
            html += `<option value="game">Game</option>`;
            html += `<option value="comic_book">Comic Book</option>`;
            html += `<option value="other">Other</option>`;
            html += `</select>`;
            html += `<p class="text-xs text-muted-foreground mt-1">Source types should be managed via a dynamic table in the future (TODO: Admin GUI for source types).</p>`;
            html += `</div>`;
            html += `<div class="flex justify-end space-x-2">`;
            html += `<button id="branch-cancel-btn" class="btn-secondary">Cancel</button>`;
            html += `<button id="branch-submit-btn" class="btn-primary">Create Branch</button>`;
            html += `</div>`;
            html += `</div></div>`;

            html += `</div>`; // Close main div
            this.container.innerHTML = html;
        }

        /**
         * Renders only the media tags section.
         * @param {Array} tags - Array of tag objects.
         * @param {boolean} canEdit - Whether the user can edit tags.
         */
        renderTagsHtml(tags, canEdit) {
            let tagsHtml = '';
            (tags || []).forEach(tag => {
                tagsHtml += `<span class="px-2 py-1 text-xs bg-muted rounded flex items-center space-x-1">
                    <a href="?page=genre&id=${tag.id}" class="flex-1">${escapeHTML(tag.name)}</a>
                    ${canEdit ? `<button data-tag-name="${escapeHTML(tag.name)}" class="remove-media-tag-btn text-red-500 hover:text-red-700">&times;</button>` : ''}
                </span>`;
            });
            // This function is for generating HTML, not updating DOM directly
            return tagsHtml; 
        }

        /**
         * Binds all event listeners for the media page.
         * Ensures old listeners are removed before new ones are added to prevent duplicates.
         */
        bindEvents() {
            // Cleanup existing listeners before re-binding to prevent duplicates
            this.cleanupEventListeners();

            // Store references to event handlers to allow easy removal later
            this._voteHandler = (e) => this.handleVote('media', this.mediaId, parseInt(e.currentTarget.dataset.vote, 10));
            this._imgVoteHandler = (e) => this.handleVote('image', parseInt(e.currentTarget.dataset.imgId, 10), parseInt(e.currentTarget.dataset.vote, 10));
            this._removeImageHandler = (e) => this.removeImage(parseInt(e.currentTarget.dataset.imgId, 10));
            this._toggleImageVisibilityHandler = (e) => this.toggleImageVisibility(parseInt(e.currentTarget.dataset.imgId, 10), e.currentTarget.dataset.action);
            this._removeCoverHandler = () => this.removeCover();
            this._postCommentHandler = () => this.postComment();
            this._addBranchHandler = () => this.container.querySelector('#branch-modal').classList.remove('hidden');
            this._closeBranchHandler = () => this.container.querySelector('#branch-modal').classList.add('hidden');

            // Bind new listeners
            this.container.querySelectorAll('.vote-btn').forEach(btn => {
                btn.addEventListener('click', this._voteHandler);
            });
            this.container.querySelectorAll('.img-vote-btn').forEach(btn => {
                btn.addEventListener('click', this._imgVoteHandler);
            });
            this.container.querySelectorAll('.remove-image-btn').forEach(btn => {
                btn.addEventListener('click', this._removeImageHandler);
            });
            this.container.querySelectorAll('.toggle-image-visibility-btn').forEach(btn => {
                btn.addEventListener('click', this._toggleImageVisibilityHandler);
            });
            const removeCoverBtn = this.container.querySelector('#remove-cover-btn');
            if (removeCoverBtn) removeCoverBtn.addEventListener('click', this._removeCoverHandler);
            const cbtn = this.container.querySelector('#submit-comment-btn');
            if (cbtn) cbtn.addEventListener('click', this._postCommentHandler);
            const branchBtn = this.container.querySelector('#add-branch-btn');
            if (branchBtn) branchBtn.addEventListener('click', this._addBranchHandler);
            const cancelBranch = this.container.querySelector('#branch-cancel-btn');
            if (cancelBranch) cancelBranch.addEventListener('click', () => this.container.querySelector('#branch-modal').classList.add('hidden'));
            const submitBranch = this.container.querySelector('#branch-submit-btn');
            if (submitBranch) submitBranch.addEventListener('click', () => this.handleBranchSubmit());

            // Media tag management via TaggingSystem
            if (this.media.can_edit) {
                // Only create a new TaggingSystem instance if one doesn't exist or if media ID changed
                if (!this.mediaTagging || this.mediaTagging.options.inputSelector !== '#media-new-tag') {
                    // Destroy previous instance if it was from a different config
                    if (this.mediaTagging) this.mediaTagging.destroy(); 
                    let firstTagInit = true;
                    this.mediaTagging = new TaggingSystem({
                        inputSelector: '#media-new-tag',
                        suggestionsSelector: '#media-tag-suggestions',
                        selectedTagsSelector: '#media-selected-tags',
                        addButtonSelector: '#media-add-tag-btn',
                        onTagsChanged: (tags) => {
                            if (firstTagInit) { firstTagInit = false; return; }
                            this.updateMediaTags(tags);
                        }
                    });
                }
                // Always set tags when binding events (after renderView)
                this.mediaTagging.setTags(this.media.tags.map(t => ({ name: t.name, existing: true })));

                // Re-bind click handlers for remove tag buttons dynamically rendered in renderTags()
                this.container.querySelectorAll('.remove-media-tag-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const tagName = e.currentTarget.dataset.tagName;
                        this.mediaTagging.removeTag(tagName); // Use TaggingSystem's method
                    });
                });
            }
        }

        /**
         * Cleans up event listeners to prevent memory leaks, especially when re-rendering.
         */
        cleanupEventListeners() {
            // Remove general vote listeners
            this.container.querySelectorAll('.vote-btn').forEach(btn => {
                if (this._voteHandler) btn.removeEventListener('click', this._voteHandler);
            });
            // Remove image vote listeners
            this.container.querySelectorAll('.img-vote-btn').forEach(btn => {
                if (this._imgVoteHandler) btn.removeEventListener('click', this._imgVoteHandler);
            });
            // Remove image action listeners
            this.container.querySelectorAll('.remove-image-btn').forEach(btn => {
                if (this._removeImageHandler) btn.removeEventListener('click', this._removeImageHandler);
            });
        // Branch form buttons
        const cancelBranch = this.container.querySelector('#branch-cancel-btn');
        if (cancelBranch) cancelBranch.removeEventListener('click', () => {});
        const submitBranch = this.container.querySelector('#branch-submit-btn');
        if (submitBranch) submitBranch.removeEventListener('click', () => {});
            this.container.querySelectorAll('.toggle-image-visibility-btn').forEach(btn => {
                if (this._toggleImageVisibilityHandler) btn.removeEventListener('click', this._toggleImageVisibilityHandler);
            });
            // Remove cover button listener
            const removeCoverBtn = this.container.querySelector('#remove-cover-btn');
            if (removeCoverBtn && this._removeCoverHandler) removeCoverBtn.removeEventListener('click', this._removeCoverHandler);
            // Remove comment submission listener
            const cbtn = this.container.querySelector('#submit-comment-btn');
            if (cbtn && this._postCommentHandler) cbtn.removeEventListener('click', this._postCommentHandler);
            // Remove branch modal listeners
            const branchBtn = this.container.querySelector('#add-branch-btn');
            if (branchBtn && this._addBranchHandler) branchBtn.removeEventListener('click', this._addBranchHandler);
            const closeBranch = this.container.querySelector('#close-branch-modal');
            if (closeBranch && this._closeBranchHandler) closeBranch.removeEventListener('click', this._closeBranchHandler);

            // Comment specific listeners (these are re-bound in loadComments, but ensure they are removed here too)
            this.container.querySelectorAll('.comment-vote-btn').forEach(btn => {
                if (this._commentVoteHandler) btn.removeEventListener('click', this._commentVoteHandler);
            });
            this.container.querySelectorAll('.hide-comment-btn').forEach(btn => {
                if (this._toggleCommentVisibilityHandler) btn.removeEventListener('click', this._toggleCommentVisibilityHandler);
            });

            // Tagging system specific listeners (handled by TaggingSystem's destroy method)
            this.container.querySelectorAll('.remove-media-tag-btn').forEach(btn => {
                // These are dynamically added, ensure their specific handlers are removed
                // The TaggingSystem handles its own internal event listeners
            });
        }


        async handleVote(type, id, value) {
            try {
                const res = await fetch('/api/votes/create.php', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({target_type:type, target_id:id, vote_value:value})
                });
                if (!res.ok) throw new Error('Vote API call failed');
                const data = await res.json();
                if (data.success) {
                    if (type === 'media') {
                        const mediaVoteScore = this.container.querySelector('#media-vote-score');
                        if (mediaVoteScore) mediaVoteScore.textContent = data.score;
                    } else if (type === 'image') {
                        // Find the specific image vote score element and update it
                        const imgScoreElement = this.container.querySelector(`div[data-image-id="${id}"] .image-vote-score`);
                        if (imgScoreElement) {
                            imgScoreElement.textContent = data.score;
                        }
                    } else if (type === 'comment') {
                        // Find the specific comment vote score element and update it
                        const commentScoreElement = this.container.querySelector(`button[data-comment-id="${id}"][data-vote="${value}"]`).nextElementSibling;
                        if (commentScoreElement) {
                            commentScoreElement.textContent = data.score;
                        }
                    }
                } else {
                    console.warn('Vote not successful:', data.message || 'Unknown error');
                    // Optionally show a notification to the user
                    if (window.notify) window.notify.warning(data.message || 'Could not cast vote.');
                }
            } catch (err) {
                console.error('Vote failed', err);
                if (window.notify) window.notify.error('Failed to cast vote.');
            }
        }

        async removeImage(imgId) {
            try {
                const form = new FormData();
                form.append('id', this.mediaId);
                form.append('title', this.media.title); // Retain existing data
                form.append('description', this.media.description || ''); // Retain existing data
                form.append('tags', JSON.stringify(this.media.tags.map(t => t.name))); // Retain existing tags
                form.append('removed_images', JSON.stringify([imgId]));
                
                const res = await fetch('/api/media/update.php', { method: 'POST', body: form });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || 'Failed to remove image');

                // Remove the image element from the DOM directly
                const imgElementToRemove = this.container.querySelector(`div[data-image-id="${imgId}"]`);
                if (imgElementToRemove) {
                    imgElementToRemove.remove();
                    // Update the local media object by filtering out the removed image
                    this.media.images = this.media.images.filter(img => img.id !== imgId);
                    if (this.media.cover_image && this.media.cover_image === imgElementToRemove.querySelector('img').src.split('/').pop()) {
                        this.media.cover_image = null; // Clear cover_image if it was the one removed
                        const coverSection = this.container.querySelector('.mt-4.relative.text-center');
                        if (coverSection) coverSection.remove();
                    }
                    if (window.notify) window.notify.success('Image removed successfully!');
                } else {
                    console.warn('MediaPage: Image element not found for removal:', imgId);
                }
            } catch (err) {
                console.error('Remove image failed', err);
                if (window.notify) window.notify.error('Failed to remove image.');
            }
        }

        async toggleImageVisibility(imgId, action) {
            try {
                const res = await fetch('/api/media/hide-image.php', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ id: imgId, action })
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update image visibility');

                // Update the UI directly
                const imageContainer = this.container.querySelector(`div[data-image-id="${imgId}"]`);
                if (imageContainer) {
                    const hiddenOverlay = imageContainer.querySelector('.absolute.inset-0.bg-black\\/70');
                    const toggleButton = imageContainer.querySelector(`.toggle-image-visibility-btn[data-img-id="${imgId}"]`);
                    
                    if (action === 'hide') {
                        if (!hiddenOverlay) {
                            const overlay = document.createElement('div');
                            overlay.className = 'absolute inset-0 bg-black/70 flex items-center justify-center text-white z-20 rounded';
                            overlay.innerHTML = '<span class="text-sm font-medium">Hidden</span>';
                            imageContainer.prepend(overlay);
                        }
                        if (toggleButton) {
                            toggleButton.dataset.action = 'unhide';
                            toggleButton.title = 'Unhide Image';
                        }
                        if (window.notify) window.notify.info('Image hidden.');
                    } else { // action === 'unhide'
                        if (hiddenOverlay) {
                            hiddenOverlay.remove();
                        }
                        if (toggleButton) {
                            toggleButton.dataset.action = 'hide';
                            toggleButton.title = 'Hide Image';
                        }
                        if (window.notify) window.notify.info('Image unhidden.');
                    }
                    // Update the hidden status in the local media object for consistency
                    const img = this.media.images.find(i => i.id === imgId);
                    if (img) img.hidden = (action === 'hide');
                }
            } catch (err) {
                console.error('Toggle image visibility failed', err);
                if (window.notify) window.notify.error('Failed to toggle image visibility.');
            }
        }

    async removeCover() {
        if (this.media.cover_image) {
            try {
                const form = new FormData();
                form.append('id', this.mediaId);
                const res = await fetch('/api/media/clear-cover.php', { method: 'POST', body: form });
                if (!res.ok) throw new Error('Failed to clear cover');
                await this.init();
            } catch (err) {
                console.error('Clear cover failed', err);
            }
        } else {
            alert('No cover image to remove');
        }
    }

    /**
     * Handles submission of the new branch form. Stub for future API integration.
     */
    async handleBranchSubmit() {
        const modal = this.container.querySelector('#branch-modal');
        const branchType = modal.querySelector('input[name="branch-type"]:checked')?.value;
        const title = modal.querySelector('#branch-title')?.value.trim();
        const summary = modal.querySelector('#branch-summary')?.value.trim();
        const source = modal.querySelector('#branch-source')?.value;
        if (!branchType || !title) {
            alert('Please select a branch type and enter a title.');
            return;
        }
        try {
            const resp = await fetch('/api/branches/create.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    media_id: this.mediaId,
                    branch_type: branchType,
                    source_type: source,
                    title: title,
                    summary: summary
                })
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.error || 'Failed to create branch');
            }
            modal.classList.add('hidden');
            this.loadBranches();
        } catch (err) {
            alert(err.message || 'Error creating branch');
        }
    }

    /**
     * Fetch and render the list of branches for this media.
     */
    async loadBranches() {
        try {
            const res = await fetch(`/api/branches/list.php?media_id=${this.mediaId}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load branches');
            const listEl = this.container.querySelector('#media-branches-list');
            if (!listEl) return;
            if (!data.branches.length) {
                listEl.innerHTML = '<p class="text-muted-foreground text-center py-4">No branches have been created for this media yet.</p>';
                return;
            }
            listEl.innerHTML = data.branches.map(b => {
                const coverPath = b.display_image ? `/uploads/users/${b.created_by}/images/${b.display_image}` : '/img/bookie-cartoon.webp';
                return `
                <div class="card flex flex-col md:flex-row gap-4 p-4 hover:border-primary/50 transition-all">
                    <a href="?page=branch&id=${b.id}" class="block md:w-1/3 flex-shrink-0">
                        <img src="${coverPath}" alt="${escapeHTML(b.title)}" class="w-full h-48 object-cover rounded-lg" onerror="this.src='/img/bookie-cartoon.webp'">
                    </a>
                    <div class="flex-grow">
                        <a href="?page=branch&id=${b.id}" class="block">
                            <h3 class="text-xl font-bold text-primary hover:underline">${escapeHTML(b.title)}</h3>
                        </a>
                        <div class="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <img src="/uploads/users/${b.created_by}/avatars/${b.author_avatar}" class="w-6 h-6 rounded-full" onerror="this.src='/img/user-avatar.png'">
                            <span>${escapeHTML(b.author)}</span>
                            <span>&bull;</span>
                            <span>${new Date(b.created_at).toLocaleDateString()}</span>
                        </div>
                        <p class="text-muted-foreground text-sm mt-2">${escapeHTML(b.summary)}</p>
                        <div class="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                            <div class="flex items-center gap-4">
                                <div class="flex items-center gap-1" title="Vote Score">
                                    <span>📈</span>
                                    <span>${b.vote_score}</span>
                                </div>
                                <div class="flex items-center gap-1" title="Segments">
                                    <span>📜</span>
                                    <span>${b.segment_count}</span>
                                </div>
                                <div class="flex items-center gap-1" title="Comments">
                                    <span>💬</span>
                                    <span>${b.comment_count}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="badge badge-outline">${escapeHTML(b.branch_type)}</span>
                                <span class="badge badge-outline">${escapeHTML(b.source_type)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `}).join('');
        } catch (err) {
            console.error('MediaPage: loadBranches error', err);
        }
    }

        async updateMediaTags(tagData) {
            try {
                // tagData: { all: [...], existing: [...], new: [...] }
                const form = new FormData();
                form.append('id', this.mediaId);
                form.append('title', this.media.title);
                form.append('description', this.media.description || '');
                form.append('tags', JSON.stringify(tagData.all));
                form.append('removed_images', JSON.stringify([])); // No images removed in this operation
                
                const res = await fetch('/api/media/update.php', { method: 'POST', body: form });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update media tags');
                
                // Update the local media object's tags to reflect changes
                this.media.tags = tagData.all.map(tagName => ({ name: tagName, id: null })); // Simplified, ID not needed for client-side display
                
                // Re-render only the tags section
                const tagsContainer = this.container.querySelector('#media-tags');
                if (tagsContainer) {
                    tagsContainer.innerHTML = this.renderTagsHtml(this.media.tags, this.media.can_edit);
                    // Re-bind event listeners for newly rendered remove tag buttons
                    tagsContainer.querySelectorAll('.remove-media-tag-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const tagName = e.currentTarget.dataset.tagName;
                            this.mediaTagging.removeTag(tagName); 
                        });
                    });
                }
                if (window.notify) window.notify.success('Tags updated successfully!');
            } catch (err) {
                console.error('Update media tags failed', err);
                if (window.notify) window.notify.error('Failed to update media tags.');
            }
        }

        async loadComments() {
            try {
                const res = await fetch(`/api/comments/get.php?target_type=media&target_id=${this.mediaId}`);
                if (!res.ok) throw new Error('Failed to load comments');
                const data = await res.json();
                
                const placeholder = this.container.querySelector('#comments-placeholder');
                const list = this.container.querySelector('#comments-list');
                
                if (placeholder) placeholder.classList.add('hidden');
                if (list) list.classList.remove('hidden');

                if (!data.comments || !data.comments.length) {
                    list.innerHTML = '<p class="text-muted-foreground">No comments yet.</p>';
                } else {
                    list.innerHTML = data.comments.map(c => `
                        <div class="border-b border-border py-2 ${c.hidden ? 'opacity-50' : ''}" data-comment-id="${c.id}">
                            <div class="flex items-center space-x-2 mb-1">
                                <span class="font-medium">${c.is_anonymous ? 'Anonymous' : escapeHTML(c.username || '')}</span>
                                <span class="text-sm text-muted-foreground">${new Date(c.created_at).toLocaleString()}</span>
                                ${this.userIsAdmin ? `<button data-comment-id="${c.id}" data-action="${c.hidden ? 'unhide' : 'hide'}" class="hide-comment-btn btn btn-ghost btn-xs p-1 text-yellow-500 ml-auto">${c.hidden ? 'Unhide' : 'Hide'}</button>` : ''}
                            </div>
                            <p>${escapeHTML(c.body)}</p>
                            <div class="flex items-center space-x-3 text-sm mt-2">
                                <button data-comment-id="${c.id}" data-vote="1" class="comment-vote-btn btn btn-ghost btn-xs p-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>
                                <span class="comment-vote-score">${c.vote_score}</span>
                                <button data-comment-id="${c.id}" data-vote="-1" class="comment-vote-btn btn btn-ghost btn-xs p-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `).join('');

                    // Bind comment vote and hide/unhide events
                    this._commentVoteHandler = (e) => this.handleVote('comment', parseInt(e.currentTarget.dataset.commentId, 10), parseInt(e.currentTarget.dataset.vote, 10));
                    this._toggleCommentVisibilityHandler = (e) => this.toggleCommentVisibility(parseInt(e.currentTarget.dataset.commentId, 10), e.currentTarget.dataset.action);

                    list.querySelectorAll('.comment-vote-btn').forEach(btn => {
                        btn.addEventListener('click', this._commentVoteHandler);
                    });
                    list.querySelectorAll('.hide-comment-btn').forEach(btn => {
                        btn.addEventListener('click', this._toggleCommentVisibilityHandler);
                    });
                }
            } catch (err) {
                console.error('Load comments failed', err);
                const list = this.container.querySelector('#comments-list');
                const placeholder = this.container.querySelector('#comments-placeholder');
                if (list) {
                    list.innerHTML = '<p class="text-destructive">Error loading comments.</p>';
                    list.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
                if (window.notify) window.notify.error('Failed to load comments.');
            }
        }

        async postComment() {
            const textarea = this.container.querySelector('#comment-body');
            const body = textarea.value.trim();
            if (!body) {
                if (window.notify) window.notify.warning('Comment cannot be empty.');
                return;
            }
            try {
                const res = await fetch('/api/comments/create.php', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({target_type:'media', target_id:this.mediaId, body})
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || 'Failed to post comment');
                
                textarea.value = ''; // Clear the textarea
                await this.loadComments(); // Reload comments to show the new one
                if (window.notify) window.notify.success('Comment posted successfully!');
            } catch (err) {
                console.error('Post comment failed', err);
                if (window.notify) window.notify.error('Failed to post comment.');
            }
        }

        async toggleCommentVisibility(commentId, action) {
            try {
                const res = await fetch('/api/comments/hide.php', { // Assuming a hide/unhide API for comments
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ id: commentId, action })
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update comment visibility');
                
                // Update UI for the specific comment
                const commentElement = this.container.querySelector(`div[data-comment-id="${commentId}"]`);
                if (commentElement) {
                    const toggleButton = commentElement.querySelector('.hide-comment-btn');
                    if (action === 'hide') {
                        commentElement.classList.add('opacity-50');
                        if (toggleButton) {
                            toggleButton.dataset.action = 'unhide';
                            toggleButton.textContent = 'Unhide';
                        }
                        if (window.notify) window.notify.info('Comment hidden.');
                    } else {
                        commentElement.classList.remove('opacity-50');
                        if (toggleButton) {
                            toggleButton.dataset.action = 'hide';
                            toggleButton.textContent = 'Hide';
                        }
                        if (window.notify) window.notify.info('Comment unhidden.');
                    }
                }
            } catch (err) {
                console.error('Toggle comment visibility failed', err);
                if (window.notify) window.notify.error('Failed to toggle comment visibility.');
            }
        }

        /**
         * Public cleanup method called by the Router when navigating away from this page.
         */
        cleanup() {
            console.log(`MediaPage: Cleaning up instance for media ID ${this.mediaId}`);
            // Remove all event listeners added by this instance
            this.cleanupEventListeners();

            // Destroy the TaggingSystem instance to clean up its event listeners and DOM elements
            if (this.mediaTagging) {
                this.mediaTagging.destroy();
                this.mediaTagging = null;
            }
            // Clear instance properties to help garbage collection
            this.media = null;
            this.container = null;
            // Any other specific cleanup like clearing timeouts/intervals etc.
        }
    }

    // Expose MediaPage class globally if other modules might need it
    window.MediaPage = MediaPage;

    // Instantiate MediaPage and register it with the Router's pageManagers.
    // This ensures only one instance manages the current page and is properly cleaned up.
    // Check if Router exists before trying to register.
    if (window.Router) {
        // We ensure a new instance is created and managed by the router on each load
        // to handle cases where the mediaId in the URL changes.
        const mediaPageInstance = new MediaPage();

        // Register this instance with the Router for lifecycle management
        window.Router.pageManagers.media = { // 'media' matches the 'page' parameter in the URL
            cleanup: () => {
                if (mediaPageInstance && typeof mediaPageInstance.cleanup === 'function') {
                    mediaPageInstance.cleanup();
                }
            }
        };
        console.log("MediaPage: Registered with Router's pageManagers.");
    } else {
        console.debug("MediaPage: Router not found. MediaPage will not be managed for navigation cleanup.");
        // If router isn't present (e.g., direct page load), instantiate anyway
        new MediaPage();
    }

})(); // End of IIFE