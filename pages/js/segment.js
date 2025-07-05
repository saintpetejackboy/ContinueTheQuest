// /pages/js/segment.js
// Manages the individual Segment detail page with improved readability

// Utility to escape HTML entities
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

(function() {
    /**
     * Main class for the segment page.
     */
    class SegmentPage {
        constructor() {
            this.segmentId = parseInt(new URLSearchParams(window.location.search).get('id'), 10);
            this.container = document.getElementById('segment-container');
            this.userLoggedIn = false;
            this.userIsAdmin = false;
            this.commentThread = null;
            this.taggingSystem = null;

            if (!this.segmentId || !this.container) {
                console.error('SegmentPage: Missing segment ID or container');
                return;
            }
            
            // Set global reference
            window.segmentPageManager = this;
            
            this.init();
        }

        async init() {
            await this.fetchSegment();
            await this.fetchUserProfile();
            if (!this.segment) return;
            this.renderView();
            this.bindEvents();
            if (typeof CommentThread !== 'undefined') {
                this.commentThread = new CommentThread({
                    containerSelector: '#comment-thread',
                    targetType: 'segment',
                    targetId: this.segmentId,
                    defaultSort: 'new',
                    userLoggedIn: this.userLoggedIn,
                    isAdmin: this.userIsAdmin,
                    maxDepth: 3,
                    autoExpandAll: true
                });
            }
        }

        async fetchSegment() {
            try {
                const res = await fetch(`/api/segments/get.php?id=${this.segmentId}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Fetch failed');
                this.segment = data.segment;
                this.tags = data.tags || [];
                this.content = data.content || '';
                this.fileType = data.file_type || 'txt';
                this.commentCount = data.comment_count || 0;
                this.canEdit = data.can_edit;
                this.navigation = data.navigation;
            } catch (err) {
                console.error('SegmentPage: fetch error', err);
                this.container.innerHTML = `<p class="text-destructive">Error loading segment: ${err.message}</p>`;
                this.segment = null;
            }
        }

        async fetchUserProfile() {
            try {
                const res = await fetch('/api/users/profile.php');
                if (res.ok) {
                    const d = await res.json();
                    this.userLoggedIn = true;
                    this.userIsAdmin = Boolean(d.is_admin);
                    this.currentUserId = d.id;
                }
            } catch (e) {
                console.error('SegmentPage: user profile error', e);
            }
        }

        renderView() {
            const s = this.segment;
            const nav = this.navigation;
            
            let html = `<div class="space-y-6">`;
            
            // Navigation breadcrumb and controls
            html += `<div class="border-b pb-4">`;
            html += `<nav class="text-sm text-muted-foreground mb-4">`;
            html += `<a href="?page=media&id=${s.media_id}" class="hover:text-foreground">${escapeHTML(s.media_title)}</a>`;
            html += ` → <a href="?page=branch&id=${s.branch_id}" class="hover:text-foreground">${escapeHTML(s.branch_title)}</a>`;
            html += ` → <span class="text-foreground">Story Segment</span>`;
            html += `</nav>`;
            
            // Segment navigation
            html += `<div class="flex items-center justify-between">`;
            html += `<div class="flex items-center space-x-4">`;
            html += `<button id="prev-segment-btn" class="btn-ghost btn-sm" ${!nav.prev_segment ? 'disabled' : ''} title="Previous segment">`;
            html += `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`;
            html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />`;
            html += `</svg> Previous`;
            html += `</button>`;
            html += `<span class="text-sm font-medium">${nav.current_position} of ${nav.total_segments}</span>`;
            html += `<button id="next-segment-btn" class="btn-ghost btn-sm" ${!nav.next_segment ? 'disabled' : ''} title="Next segment">`;
            html += `Next <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`;
            html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />`;
            html += `</svg>`;
            html += `</button>`;
            html += `</div>`;
            html += `<a href="?page=branch&id=${s.branch_id}" class="btn-ghost btn-sm">← Back to Branch</a>`;
            html += `</div>`;
            html += `</div>`;
            
            // Segment header
            html += `<div class="text-center space-y-4">`;
            html += `<h1 class="text-4xl font-bold leading-tight">${escapeHTML(s.title)}</h1>`;
            
            if (s.description) {
                html += `<p class="text-lg text-muted-foreground italic">${escapeHTML(s.description)}</p>`;
            }
            
            // Author and metadata
            html += `<div class="flex items-center justify-center space-x-4 text-sm text-muted-foreground">`;
            html += `<div class="flex items-center space-x-2">`;
            html += `<span>by</span>`;
            if (s.author_avatar) {
                html += `<img src="/uploads/users/${s.created_by}/avatars/${s.author_avatar}" alt="${escapeHTML(s.author)}" class="w-6 h-6 rounded-full object-cover">`;
            }
            html += `<span class="font-medium">${escapeHTML(s.author)}</span>`;
            html += `</div>`;
            html += `<span>•</span>`;
            html += `<span>${new Date(s.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>`;
            if (this.commentCount > 0) {
                html += `<span>•</span>`;
                html += `<span>${this.commentCount} comments</span>`;
            }
            html += `</div>`;
            
            // Voting and actions
            html += `<div class="flex items-center justify-center space-x-4">`;
            html += `<div class="flex items-center space-x-2">`;
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
            html += `<button id="download-story-btn" class="btn-ghost btn-sm">Download Branch</button>`;
            html += `<button id="fullscreen-btn" class="btn-ghost btn-sm">Fullscreen</button>`;
            html += `<button id="close-segment-reader" class="btn-ghost btn-sm">×</button>`;
            html += `</div>`;
            html += `</div>`;
            
            // Edit/Delete buttons for owners/admins
            if (this.userLoggedIn && (this.userIsAdmin || s.created_by === this.currentUserId)) {
                html += `<div class="flex items-center space-x-2">`;
                html += `<button id="edit-segment-btn" class="btn-ghost btn-sm" title="Edit segment">`;
                html += `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`;
                html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />`;
                html += `</svg> Edit`;
                html += `</button>`;
                html += `<button id="delete-segment-btn" class="btn-ghost btn-sm text-destructive hover:text-destructive" title="Delete segment">`;
                html += `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">`;
                html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />`;
                html += `</svg> Delete`;
                html += `</button>`;
                html += `</div>`;
            }
            html += `</div>`;
            html += `</div>`;
            
            // Segment image if exists
            if (s.image_path) {
                html += `<div class="text-center">`;
                html += `<img src="/uploads/users/${s.created_by}/${s.image_path}" alt="Segment illustration" class="max-w-full max-h-96 mx-auto rounded-lg shadow-lg object-cover">`;
                html += `</div>`;
            }
            
            // Tags section
            html += `<div class="space-y-3">`;
            html += `<div class="flex flex-wrap justify-center gap-2">`;
            if (this.tags && this.tags.length > 0) {
                this.tags.forEach(tag => {
                    const tagClass = tag.is_mandatory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80';
                    const title = tag.is_mandatory ? 'Mandatory tag (cannot be removed)' : 'User tag';
                    html += `<a href="?page=genre&id=${tag.id}" class="px-3 py-1 rounded-full text-sm ${tagClass}" title="${title}">${escapeHTML(tag.name)}</a>`;
                });
            } else {
                html += `<span class="text-muted-foreground text-sm">No tags</span>`;
            }
            html += `</div>`;
            
            // Tag editing interface for owners/admins
            if (this.userLoggedIn && (this.userIsAdmin || s.created_by === this.currentUserId)) {
                html += `<div class="text-center">`;
                html += `<button id="edit-tags-btn" class="btn-ghost btn-sm text-xs">Edit Tags</button>`;
                html += `</div>`;
                
                // Tags editing form (hidden by default)
                html += `<div id="edit-tags-form" class="mt-4 border rounded-lg p-4 space-y-3 hidden max-w-md mx-auto">`;
                html += `<h3 class="text-sm font-medium text-center">Edit Segment Tags</h3>`;
                html += `<div class="space-y-2">`;
                html += `<div class="flex space-x-2">`;
                html += `<input type="text" id="tag-input" class="form-input flex-1 text-sm" placeholder="Add tags...">`;
                html += `<button type="button" id="add-tag-btn" class="btn-secondary btn-sm">Add</button>`;
                html += `</div>`;
                html += `<div id="tag-suggestions" class="hidden bg-card border rounded-lg shadow-lg max-h-32 overflow-y-auto"></div>`;
                html += `<div id="selected-tags" class="flex flex-wrap gap-2 min-h-[1rem]"></div>`;
                html += `<p class="text-xs text-muted-foreground text-center">Existing tags are free. New tags cost 1 credit each.</p>`;
                html += `</div>`;
                html += `<div class="flex space-x-2">`;
                html += `<button id="save-tags-btn" class="btn-primary btn-sm">Save Tags</button>`;
                html += `<button id="cancel-tags-btn" class="btn-secondary btn-sm">Cancel</button>`;
                html += `</div>`;
                html += `</div>`;
            }
            html += `</div>`;
            
            // Main content area
            html += `<article class="prose prose-lg max-w-none mx-auto">`;
            html += `<div id="segment-content" class="text-foreground leading-relaxed">`;
            html += this.formatContent(this.content, this.fileType);
            html += `</div>`;
            html += `</article>`;
            
            // Comments section
            html += `<div id="comment-thread" class="mt-12 pt-8 border-t"></div>`;
            
            // Edit modal
            html += `<div id="edit-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden z-50">`;
            html += `<div class="bg-card rounded-lg p-6 w-full max-w-md space-y-4">`;
            html += `<h3 class="text-xl font-semibold">Edit Segment</h3>`;
            html += `<div>`;
            html += `<label for="edit-title" class="block text-sm font-medium mb-1">Title</label>`;
            html += `<input type="text" id="edit-title" class="form-input w-full" placeholder="Segment title...">`;
            html += `</div>`;
            html += `<div>`;
            html += `<label for="edit-description" class="block text-sm font-medium mb-1">Description</label>`;
            html += `<textarea id="edit-description" rows="3" class="form-textarea w-full" placeholder="Segment description..."></textarea>`;
            html += `</div>`;
            html += `<div>`;
            html += `<label for="edit-segment-image" class="block text-sm font-medium text-muted-foreground mb-1">Image (Optional)</label>`;
            html += `<input type="file" id="edit-segment-image" class="form-input w-full" accept="image/*">`;
            html += `<p class="text-xs text-muted-foreground mt-1">Upload a new image for this segment. Existing image will be replaced.</p>`;
            html += `<div id="current-segment-image-preview" class="mt-2"></div>`;
            html += `</div>`;
            html += `<div class="flex space-x-2">`;
            html += `<button id="save-edit-btn" class="btn-primary flex-1">Save Changes</button>`;
            html += `<button id="cancel-edit-btn" class="btn-secondary flex-1">Cancel</button>`;
            html += `</div>`;
            html += `</div>`;
            html += `</div>`;
            
            html += `</div>`;
            
            this.container.innerHTML = html;
            
            // Initialize tagging system if user can edit
            if (this.userLoggedIn && (this.userIsAdmin || s.created_by === this.currentUserId)) {
                this.initializeTagging();
            }
        }

        formatContent(content, fileType) {
            if (!content) return '<p class="text-muted-foreground italic">No content available.</p>';
            
            if (fileType === 'md') {
                // Enhanced markdown rendering with improved paragraph spacing
                let formatted = escapeHTML(content);
                
                // Headers
                formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-8 mb-4 first:mt-0">$1</h1>');
                formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-semibold mt-6 mb-3">$1</h2>');
                formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="text-xl font-medium mt-4 mb-2">$1</h3>');
                
                // Bold and italic
                formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
                formatted = formatted.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
                
                // Lists
                formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
                formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

                // Blockquotes
                formatted = formatted.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary pl-4 italic my-4">$1</blockquote>');

                // Code blocks (simple pre-wrap for now)
                formatted = formatted.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-lg overflow-x-auto my-4"><code class="text-sm language-$1">$2</code></pre>');
                formatted = formatted.replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');

                // Horizontal rule
                formatted = formatted.replace(/^-{3,}$/gm, '<hr class="my-8 border-t-2 border-border"/>');

                // Links
                formatted = formatted.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank">$1</a>');

                // Convert paragraphs with proper spacing
                const paragraphs = formatted.split('\n\n');
                const formattedParagraphs = paragraphs.map(para => {
                    if (para.trim() === '') return '';
                    // Don't wrap headers, lists, blockquotes, code blocks, or horizontal rules in paragraphs
                    if (para.trim().match(/^(<h[1-6]|<li|<blockquote|<pre|<hr)/)) return para.trim();
                    return `<p class="mb-6 leading-relaxed">${para.trim().replace(/\n/g, '<br>')}</p>`;
                }).filter(para => para !== '');
                
                return formattedParagraphs.join('\n');
            } else {
                // Plain text with enhanced formatting
                let formatted = escapeHTML(content);
                
                // Split into paragraphs and add proper spacing
                const paragraphs = formatted.split(/\n\s*\n/);
                const formattedParagraphs = paragraphs.map(para => {
                    const trimmed = para.trim();
                    if (trimmed === '') return '';
                    // Replace single line breaks with spaces, but preserve intentional breaks
                    const cleaned = trimmed.replace(/\n(?!\n)/g, ' ');
                    return `<p class="mb-6 leading-relaxed text-lg">${cleaned}</p>`;
                }).filter(para => para !== '');
                
                return formattedParagraphs.join('\n');
            }
        }

        bindEvents() {
            // Voting buttons
            this.container.querySelectorAll('.vote-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    const val = parseInt(btn.dataset.vote, 10);
                    this.handleVote(val);
                });
            });
            
            // Navigation buttons
            const prevBtn = this.container.querySelector('#prev-segment-btn');
            const nextBtn = modal.querySelector('#next-segment-btn');
            if (prevBtn) prevBtn.addEventListener('click', () => this.navigateSegment(-1));
            if (nextBtn) nextBtn.addEventListener('click', () => this.navigateSegment(1));

            // Download button
            const downloadBtn = modal.querySelector('#download-story-btn');
            if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadBranch());

            // Fullscreen button
            const fullscreenBtn = modal.querySelector('#fullscreen-btn');
            if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
            
            // Edit and delete buttons
            const editBtn = this.container.querySelector('#edit-segment-btn');
            const deleteBtn = this.container.querySelector('#delete-segment-btn');
            if (editBtn) editBtn.addEventListener('click', () => this.openEditModal());
            if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteSegment());
            
            // Edit modal buttons
            const saveEditBtn = this.container.querySelector('#save-edit-btn');
            const cancelEditBtn = this.container.querySelector('#cancel-edit-btn');
            if (saveEditBtn) saveEditBtn.addEventListener('click', () => this.saveSegmentEdit());
            if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => this.closeEditModal());
            
            // Tag editing buttons
            const editTagsBtn = this.container.querySelector('#edit-tags-btn');
            const saveTagsBtn = this.container.querySelector('#save-tags-btn');
            const cancelTagsBtn = this.container.querySelector('#cancel-tags-btn');
            if (editTagsBtn) editTagsBtn.addEventListener('click', () => this.toggleTagsForm());
            if (saveTagsBtn) saveTagsBtn.addEventListener('click', () => this.saveTags());
            if (cancelTagsBtn) cancelTagsBtn.addEventListener('click', () => this.cancelTagsEdit());
            
            // Keyboard navigation
            this.setupKeyboardNavigation();
        }

        async handleVote(value) {
            if (!this.userLoggedIn) {
                alert('Please log in to vote.');
                return;
            }

            try {
                const res = await fetch('/api/votes/create.php', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ target_type: 'segment', target_id: this.segmentId, vote_value: value })
                });
                const data = await res.json();
                if (data.success) {
                    const el = this.container.querySelector('#vote-score');
                    if (el) el.textContent = data.score;
                }
            } catch (err) {
                console.error('Vote failed', err);
            }
        }

        navigateToSegment(segmentId) {
            window.location.href = `?page=segment&id=${segmentId}`;
        }

        openEditModal() {
            const modal = this.container.querySelector('#edit-modal');
            const titleInput = this.container.querySelector('#edit-title');
            const descriptionInput = this.container.querySelector('#edit-description');
            const imageInput = modal.querySelector('#edit-segment-image');
            const currentImagePreview = modal.querySelector('#current-segment-image-preview');

            // Pre-fill with current values
            titleInput.value = this.segment.title || '';
            descriptionInput.value = this.segment.description || '';
            imageInput.value = ''; // Clear file input

            if (this.segment.image_path) {
                currentImagePreview.innerHTML = `
                    <img src="/uploads/users/${this.segment.created_by}/${this.segment.image_path}" class="w-32 h-32 object-cover rounded-lg mb-2">
                    <label class="flex items-center text-sm text-muted-foreground">
                        <input type="checkbox" id="remove-current-segment-image" class="mr-2">
                        Remove current image
                    </label>
                `;
            } else {
                currentImagePreview.innerHTML = '<p class="text-sm text-muted-foreground">No current image.</p>';
            }
            
            modal.classList.remove('hidden');
        }
        
        closeEditModal() {
            const modal = this.container.querySelector('#edit-modal');
            modal.classList.add('hidden');
            modal.querySelector('#edit-segment-image').value = ''; // Clear file input
            const removeCheckbox = modal.querySelector('#remove-current-segment-image');
            if (removeCheckbox) removeCheckbox.checked = false; // Uncheck remove option
        }
        
        async saveSegmentEdit() {
            const modal = this.container.querySelector('#edit-modal');
            const titleInput = modal.querySelector('#edit-title');
            const descriptionInput = modal.querySelector('#edit-description');
            const imageInput = modal.querySelector('#edit-segment-image');
            const removeCurrentImage = modal.querySelector('#remove-current-segment-image')?.checked || false;

            const title = titleInput.value.trim();
            const description = descriptionInput.value.trim();
            const imageFile = imageInput.files[0];
            
            if (!title) {
                alert('Title cannot be empty.');
                titleInput.focus();
                return;
            }
            
            const formData = new FormData();
            formData.append('segment_id', this.segmentId);
            formData.append('title', title);
            formData.append('description', description);
            if (imageFile) {
                formData.append('image', imageFile);
            }
            formData.append('remove_image', removeCurrentImage ? 'true' : 'false');

            try {
                const response = await fetch('/api/segments/update.php', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                if (data.success) {
                    this.closeEditModal();
                    location.reload();
                } else {
                    alert('Failed to update segment: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Failed to update segment:', error);
                alert('Failed to update segment. Please try again.');
            }
        }

        async deleteSegment() {
            if (!confirm(`Are you sure you want to delete the segment "${this.segment.title}"? This action cannot be undone.`)) {
                return;
            }
            
            try {
                const response = await fetch('/api/segments/delete.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        segment_id: this.segmentId
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    // Redirect back to branch
                    window.location.href = `?page=branch&id=${this.segment.branch_id}`;
                } else {
                    alert('Failed to delete segment: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Failed to delete segment:', error);
                alert('Failed to delete segment. Please try again.');
            }
        }

        setupKeyboardNavigation() {
            this.keyboardHandler = (e) => {
                // Don't interfere with typing
                if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
                
                switch (e.key) {
                    case 'ArrowLeft':
                        if (this.navigation.prev_segment) {
                            e.preventDefault();
                            this.navigateToSegment(this.navigation.prev_segment.id);
                        }
                        break;
                    case 'ArrowRight':
                        if (this.navigation.next_segment) {
                            e.preventDefault();
                            this.navigateToSegment(this.navigation.next_segment.id);
                        }
                        break;
                }
            };
            
            document.addEventListener('keydown', this.keyboardHandler);
        }

        initializeTagging() {
            this.loadTaggingSystemScript(() => {
                this.setupTagging();
            });
        }

        loadTaggingSystemScript(callback) {
            // Check if script is already loaded
            if (typeof TaggingSystem !== 'undefined') {
                callback();
                return;
            }
            
            // Check if script is already being loaded
            const existingScript = document.querySelector('script[src="/pages/js/tagging-system.js"]');
            if (existingScript) {
                existingScript.addEventListener('load', callback);
                return;
            }
            
            // Load the script
            const script = document.createElement('script');
            script.src = '/pages/js/tagging-system.js';
            script.onload = callback;
            script.onerror = () => {
                console.error('Failed to load tagging-system.js');
            };
            document.head.appendChild(script);
        }

        setupTagging() {
            if (this.taggingSystem) {
                this.taggingSystem = null;
            }
            
            try {
                this.taggingSystem = new TaggingSystem({
                    inputSelector: '#tag-input',
                    suggestionsSelector: '#tag-suggestions', 
                    selectedTagsSelector: '#selected-tags',
                    addButtonSelector: '#add-tag-btn',
                    onTagsChanged: (tags) => {
                        this.selectedTags = tags;
                    }
                });
                
                // Pre-populate with existing tags (excluding mandatory ones)
                if (this.tags && this.tags.length > 0) {
                    this.selectedTags = this.tags.filter(t => !t.is_mandatory).map(t => t.name);
                    this.taggingSystem.selectedTags = new Set(this.selectedTags);
                    this.taggingSystem.render();
                }
            } catch (error) {
                console.error('Failed to initialize tagging system:', error);
            }
        }

        toggleTagsForm() {
            const form = this.container.querySelector('#edit-tags-form');
            const btn = this.container.querySelector('#edit-tags-btn');
            
            if (form.classList.contains('hidden')) {
                form.classList.remove('hidden');
                btn.textContent = 'Cancel Edit';
                
                // Initialize tagging system when form is shown
                setTimeout(() => {
                    if (this.taggingSystem) {
                        this.taggingSystem.render();
                    }
                }, 100);
            } else {
                form.classList.add('hidden');
                btn.textContent = 'Edit Tags';
                this.cancelTagsEdit();
            }
        }

        async saveTags() {
            const tags = this.taggingSystem ? Array.from(this.taggingSystem.selectedTags) : [];
            
            try {
                const response = await fetch('/api/segments/update-tags.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        segment_id: this.segmentId,
                        tags: tags
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    alert(`Tags updated successfully! ${data.credits_used > 0 ? `Credits used: ${data.credits_used}` : ''}`);
                    
                    // Refresh page to show updated tags
                    location.reload();
                } else {
                    alert('Failed to update tags: ' + (data.error || 'Unknown error'));
                }
                
            } catch (error) {
                console.error('Failed to save tags:', error);
                alert('Failed to save tags. Please try again.');
            }
        }

        cancelTagsEdit() {
            const form = this.container.querySelector('#edit-tags-form');
            const btn = this.container.querySelector('#edit-tags-btn');
            
            form.classList.add('hidden');
            btn.textContent = 'Edit Tags';
            
            // Reset tags to original state
            if (this.taggingSystem && this.tags) {
                this.selectedTags = this.tags.filter(t => !t.is_mandatory).map(t => t.name);
                this.taggingSystem.selectedTags = new Set(this.selectedTags);
                this.taggingSystem.render();
            }
        }

        async downloadBranch() {
            try {
                // Fetch all segments for the current branch
                const res = await fetch(`/api/segments/list.php?branch_id=${this.segment.branch_id}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!data.success || !data.segments) throw new Error(data.error || 'Failed to load segments for download');

                let fullStoryContent = '';
                for (const seg of data.segments) {
                    // Fetch content for each segment
                    const contentRes = await fetch(`/api/segments/content.php?id=${seg.id}`);
                    if (!contentRes.ok) throw new Error(`HTTP ${contentRes.status}`);
                    const contentData = await contentRes.json();
                    if (!contentData.success || !contentData.content) throw new Error(contentData.error || 'Failed to load segment content');

                    fullStoryContent += `# ${seg.title}\n\n`;
                    if (seg.description) {
                        fullStoryContent += `*${seg.description}*\n\n`;
                    }
                    fullStoryContent += `${contentData.content}\n\n---\n\n`;
                }

                const branchTitle = escapeHTML(this.segment.branch_title || 'story').replace(/[^a-zA-Z0-9-_]/g, '');
                const filename = `${branchTitle}.md`;
                const blob = new Blob([fullStoryContent], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                if (window.notify) window.notify.success('Branch downloaded successfully!');

            } catch (err) {
                console.error('Download branch failed:', err);
                if (window.notify) window.notify.error('Failed to download branch.');
            }
        }

        toggleFullscreen() {
            const modal = this.container.querySelector('#segment-reader-modal');
            if (!modal) return;

            if (!document.fullscreenElement) {
                modal.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        }

        cleanup() {
            if (this.keyboardHandler) {
                document.removeEventListener('keydown', this.keyboardHandler);
                this.keyboardHandler = null;
            }
        }
    }

    // Export
    window.SegmentPage = SegmentPage;
})();