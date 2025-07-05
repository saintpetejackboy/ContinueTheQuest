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
            
            // Segments section
            if (this.segments && this.segments.length > 0) {
                html += `<div class="mt-8 border-t pt-8">`;
                html += `<h2 class="text-2xl font-semibold mb-4">Story Segments</h2>`;
                html += `<div class="space-y-4">`;
                
                this.segments.forEach(segment => {
                    html += `<div class="border rounded-lg p-4 bg-card">`;
                    html += `<div class="flex items-start justify-between mb-2">`;
                    html += `<div class="flex-1">`;
                    html += `<h3 class="text-lg font-medium">${escapeHTML(segment.title)}</h3>`;
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
                    html += `<span class="text-sm font-medium">${segment.vote_score}</span>`;
                    html += `<button class="btn-ghost btn-sm" onclick="window.branchPage.readSegment(${segment.id})">Read</button>`;
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
                    
                    html += `</div>`;
                });
                
                html += `</div>`;
                html += `</div>`;
            }
            
            html += `<div id="comment-thread" class="mt-8"></div>`;
            html += `<div class="mt-8 border-t pt-4 space-y-4">`;
            html += `<h2 class="text-xl font-semibold">Add Story Segment</h2>`;
            html += `<p class="text-sm text-muted-foreground">Provide a title, order, and upload your text or generate automatically. AI-created segments require the "AI-Assisted" tag.</p>`;
            html += `<div>
                    <label for="segment-title" class="block text-sm font-medium text-muted-foreground mb-1">Segment Title</label>
                    <input type="text" id="segment-title" class="form-input w-full mb-2" placeholder="Chapter title...">
                </div>`;
            html += this.canEdit ? `<div>
                    <label for="segment-order" class="block text-sm font-medium text-muted-foreground mb-1">Order Index</label>
                    <input type="number" id="segment-order" class="form-input w-full mb-2" value="1" min="1">
                </div>` : '';
            html += `<div id="story-upload-zone" class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary">
                <div class="space-y-2">
                    <svg class="mx-auto h-12 w-12 text-muted-foreground" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div class="text-sm text-muted-foreground">
                        <label for="story-file" class="font-medium text-primary hover:text-primary/80 cursor-pointer">Click to upload text</label> or drag and drop
                    </div>
                    <p class="text-xs text-muted-foreground">Supported file types: .txt, .md (Markdown); max size 500 KB.</p>
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
            this.aiModels.forEach(model => {
                html += `<option value="${model.name}" data-cost="${model.cost_per_use}">${model.name}${model.description ? ' - ' + model.description : ''}</option>`;
            });
            html += `</select>`;
            html += `<div class="flex justify-between items-center text-sm">`;
            html += `<span>Cost Estimate: <strong id="generate-cost">---</strong> credits</span>`;
            html += `<span>Your Credits: <strong id="user-credits-gen">${this.userCredits}</strong></span>`;
            html += `</div>`;
            if (!this.aiStatus.api_key_configured) {
                if (this.userIsAdmin) {
                    html += `<div class="p-3 bg-destructive/10 border border-destructive rounded text-sm">
                        <p class="font-medium text-destructive">⚠️ Admin Notice</p>
                        <p class="text-destructive text-xs mt-1">${this.aiStatus.admin_message || 'OpenAI API key is not configured.'}</p>
                    </div>`;
                } else {
                    html += `<div class="p-3 bg-muted border rounded text-sm">
                        <p class="text-muted-foreground">AI generation is currently unavailable. Please contact an administrator.</p>
                    </div>`;
                }
            }
            html += `<p class="text-xs text-destructive">Segments generated by AI must be tagged "AI-Assisted".</p>`;
            html += `<div class="flex space-x-2">`;
            html += `<button id="generate-submit" class="btn-primary flex-1" ${!this.aiStatus.api_key_configured ? 'disabled' : ''}>Generate</button>`;
            html += `<button id="generate-cancel" class="btn-secondary flex-1">Cancel</button>`;
            html += `</div>`;
            html += `</div></div>`;
            html += `</div>`;
            
            // Segment reader modal
            html += `<div id="segment-reader-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden z-50">`;
            html += `<div class="bg-card rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">`;
            html += `<div class="flex items-center justify-between p-4 border-b">`;
            html += `<h3 id="segment-title-modal" class="text-xl font-semibold">Loading...</h3>`;
            html += `<button id="close-segment-reader" class="btn-ghost btn-sm">×</button>`;
            html += `</div>`;
            html += `<div class="flex-1 overflow-auto p-6">`;
            html += `<div id="segment-content" class="prose max-w-none">Loading content...</div>`;
            html += `</div>`;
            html += `</div>`;
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
            
            // Segment reader modal
            const closeReader = this.container.querySelector('#close-segment-reader');
            if (closeReader) closeReader.addEventListener('click', () => this.closeSegmentReader());
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
            previewEl.innerHTML = `
                <div class="border rounded p-3 bg-muted/50">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium">${file.name}</span>
                        <button class="btn-ghost btn-sm" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                    </div>
                    <div class="text-xs text-muted-foreground space-y-1">
                        <div>Size: ${this.formatBytes(file.size)}</div>
                        <div>Storage: ${storageData.formatted.used} / ${storageData.formatted.quota} used (${storageData.used_percentage}%)</div>
                        <div>Available: ${storageData.formatted.available}</div>
                    </div>
                    <button class="btn-primary btn-sm mt-2 w-full" onclick="window.branchPage.uploadStoryFile()">Upload Segment</button>
                </div>
            `;
            
            // Store file for upload
            this.pendingFile = file;
        }

        async uploadStoryFile() {
            if (!this.pendingFile) {
                alert('No file selected.');
                return;
            }
            
            const titleEl = this.container.querySelector('#segment-title');
            const orderEl = this.container.querySelector('#segment-order');
            
            const title = titleEl?.value?.trim();
            if (!title) {
                alert('Please enter a segment title.');
                titleEl?.focus();
                return;
            }
            
            const formData = new FormData();
            formData.append('file', this.pendingFile);
            formData.append('branch_id', this.branchId);
            formData.append('title', title);
            
            if (orderEl && this.canEdit) {
                formData.append('order_index', orderEl.value || 1);
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
                    if (orderEl) orderEl.value = '1';
                    this.container.querySelector('#story-previews').innerHTML = '';
                    this.container.querySelector('#story-file').value = '';
                    this.pendingFile = null;
                    
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
        openGenerateModal() {
            const modal = this.container.querySelector('#generate-modal');
            const debug = modal.querySelector('#generate-debug');
            const costEl = modal.querySelector('#generate-cost');
            const creditsEl = modal.querySelector('#user-credits-gen');
            const modelSelect = modal.querySelector('#generate-model');
            
            // Build default prompt
            const prompt = `You will contribute a short story to the ${this.branch.branch_type} continuation of "${this.branch.media_title}". ` +
                           `The branch is titled "${this.branch.title}". Keep it concise and professional. ` +
                           `Here is the user-provided summary: ${this.branch.summary}. ` +
                           `Respond with only the full story text (no code or JSON), do not reveal you are an AI. ` +
                           `Write in the style of a Hollywood-caliber fanfic writer.`;
            debug.textContent = prompt;
            creditsEl.textContent = this.userCredits;
            
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
            if (!this.aiStatus.api_key_configured) {
                alert('AI generation is not available.');
                return;
            }
            
            const modal = this.container.querySelector('#generate-modal');
            const modelSelect = modal.querySelector('#generate-model');
            const titleEl = this.container.querySelector('#segment-title');
            const orderEl = this.container.querySelector('#segment-order');
            const submitBtn = modal.querySelector('#generate-submit');
            
            const selectedModel = modelSelect.value;
            const title = titleEl?.value?.trim();
            
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
                const requestData = {
                    branch_id: this.branchId,
                    title: title,
                    model: selectedModel,
                    prompt: prompt,
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
            
            // Show modal with loading state
            modal.classList.remove('hidden');
            titleEl.textContent = 'Loading...';
            contentEl.innerHTML = 'Loading content...';
            
            try {
                const res = await fetch(`/api/segments/content.php?id=${segmentId}`);
                const data = await res.json();
                
                if (data.success) {
                    titleEl.textContent = data.segment.title;
                    
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

        closeSegmentReader() {
            const modal = this.container.querySelector('#segment-reader-modal');
            if (modal) modal.classList.add('hidden');
        }

        cleanup() {
            // Placeholder for cleanup logic if needed
        }
    }

    // Export
    window.BranchPage = BranchPage;
})();