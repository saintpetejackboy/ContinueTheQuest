// /pages/js/add-media.js
class AddMediaManager {
    constructor() {
        this.selectedFiles = [];
        this.tagSearchTimeout = null;
        this.titleCheckTimeout = null;
        this.coverImageIndex = 0;
        this.userCredits = 0;
        this.taggingSystem = null;
        
        this.init();
    }

    
    init() {
        this.setupEventListeners();
        this.setupTagSystem();
        this.loadUserCredits();
    }
    
    async loadUserCredits() {
        try {
            const response = await fetch('/api/users/profile.php');
            if (response.ok) {
                const data = await response.json();
                this.userCredits = data.credits || 0;
                this.userStorageUsed = data.space_used || 0;
                this.userStorageAvailable = data.space_available || 0;
                document.getElementById('user-credits').textContent = this.userCredits;
                document.getElementById('storage-used').textContent = this.formatFileSize(this.userStorageUsed);
                document.getElementById('storage-available').textContent = this.formatFileSize(this.userStorageAvailable);
                this.updateCostEstimate();
            }
        } catch (error) {
            console.error('Error loading user credits:', error);
        }
    }
    
    setupEventListeners() {
        const form = document.getElementById('add-media-form');
        const fileInput = document.getElementById('images');
        const uploadZone = document.getElementById('upload-zone');
        const description = document.getElementById('description');
        
        // Form submission
        form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // File input
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('border-primary', 'bg-primary/5');
        });
        
        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('border-primary', 'bg-primary/5');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('border-primary', 'bg-primary/5');
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('image/')
            );
            
            if (files.length > 0) {
                this.addFiles(files);
            }
        });
        
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Description character counter
        description.addEventListener('input', () => {
            const count = description.value.length;
            document.getElementById('description-count').textContent = count;
        });
        
        // Title uniqueness check and suggestion
        const titleInput = document.getElementById('title');
        const titleWarning = document.getElementById('title-warning');
        titleInput.addEventListener('input', () => {
            clearTimeout(this.titleCheckTimeout);
            const value = titleInput.value.trim();
            if (!value) {
                titleWarning.classList.add('hidden');
                return;
            }
            this.titleCheckTimeout = setTimeout(async () => {
                try {
                    const resp = await fetch(`/api/media/check-title.php?title=${encodeURIComponent(value)}`);
                    if (resp.ok) {
                        const result = await resp.json();
                        if (result.exists) {
                            titleWarning.innerHTML =
                                `Title already exists. <button type="button" id="use-suggested" class="underline">Use "${result.suggestion}"</button>`;
                            titleWarning.classList.remove('hidden');
                            document.getElementById('use-suggested').addEventListener('click', () => {
                                titleInput.value = result.suggestion;
                                titleWarning.classList.add('hidden');
                                titleInput.focus();
                            });
                        } else {
                            titleWarning.classList.add('hidden');
                        }
                    }
                } catch (err) {
                    console.error('Error checking title:', err);
                }
            }, 500);
        });
    }
    
    setupTagSystem() {
        // Initialize the modular tagging system
        this.taggingSystem = new TaggingSystem({
            inputSelector: '#tag-input',
            suggestionsSelector: '#tag-suggestions',
            selectedTagsSelector: '#selected-tags',
            addButtonSelector: '#add-tag-btn',
            onTagsChanged: (tags) => {
                this.selectedTags = new Set(tags.all);
                this.existingTags = new Map();
                tags.existing.forEach(tag => this.existingTags.set(tag, true));
                this.updateCostEstimate();
            }
        });
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }
    
    addFiles(files) {
        files.forEach(file => {
            if (this.validateFile(file)) {
                this.selectedFiles.push(file);
            }
        });
        
        this.renderImagePreviews();
        this.updateCostEstimate();
    }
    
    validateFile(file) {
        // Check file type
        if (!file.type.startsWith('image/')) {
            this.showError(`${file.name} is not an image file`);
            return false;
        }
        
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            this.showError(`${file.name} is too large (max 10MB)`);
            return false;
        }
        
        // Check if already added
        if (this.selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            this.showError(`${file.name} is already added`);
            return false;
        }
        
        return true;
    }
    
    renderImagePreviews() {
        const container = document.getElementById('image-previews');
        
        if (this.selectedFiles.length === 0) {
            container.classList.add('hidden');
            return;
        }
        
        container.classList.remove('hidden');
        container.innerHTML = '';
        
        // Track duplicate file names to give unique display names
        const nameCounts = {};
        this.selectedFiles.forEach((file, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'relative group';
            
            const img = document.createElement('img');
            img.className = 'w-full h-32 object-cover rounded-lg border border-border';
            img.src = URL.createObjectURL(file);
            
            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center';
            
            const controls = document.createElement('div');
            controls.className = 'flex gap-2';
            
            // Cover image button
            const coverBtn = document.createElement('button');
            coverBtn.type = 'button';
            coverBtn.className = `px-2 py-1 text-xs rounded ${index === this.coverImageIndex ? 'bg-primary text-primary-foreground' : 'bg-white text-black hover:bg-gray-200'}`;
            coverBtn.textContent = index === this.coverImageIndex ? 'Cover' : 'Set Cover';
            coverBtn.addEventListener('click', () => this.setCoverImage(index));
            
            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => this.removeFile(index));
            
            controls.appendChild(coverBtn);
            controls.appendChild(removeBtn);
            overlay.appendChild(controls);
            
            // File info with unique display name on duplicate names
            const info = document.createElement('div');
            info.className = 'mt-2 text-xs text-muted-foreground truncate';
            // Generate a unique display name if there are duplicates
            const originalName = file.name;
            const count = nameCounts[originalName] || 0;
            const parts = originalName.split('.');
            const ext = parts.length > 1 ? '.' + parts.pop() : '';
            const baseName = parts.join('.') || originalName;
            const displayName = count > 0 ? `${baseName} (${count})${ext}` : originalName;
            nameCounts[originalName] = count + 1;
            info.textContent = `${displayName} (${this.formatFileSize(file.size)})`;
            
            wrapper.appendChild(img);
            wrapper.appendChild(overlay);
            wrapper.appendChild(info);
            
            container.appendChild(wrapper);
        });
    }
    
    setCoverImage(index) {
        this.coverImageIndex = index;
        this.renderImagePreviews();
    }
    
    removeFile(index) {
        URL.revokeObjectURL(this.selectedFiles[index]);
        this.selectedFiles.splice(index, 1);
        
        // Adjust cover image index if necessary
        if (this.coverImageIndex >= index && this.coverImageIndex > 0) {
            this.coverImageIndex--;
        } else if (this.coverImageIndex >= this.selectedFiles.length) {
            this.coverImageIndex = Math.max(0, this.selectedFiles.length - 1);
        }
        
        this.renderImagePreviews();
        this.updateCostEstimate();
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    

    
    getSelectedBytes() {
        return this.selectedFiles.reduce((total, file) => total + file.size, 0);
    }

    updateCostEstimate() {
        // Estimate credits
        const baseCost = 1; // Creating media
        const tagCostData = this.taggingSystem
            ? this.taggingSystem.getCostEstimate()
            : { newTags: 0, totalCost: 0 };
        const totalCost = baseCost + tagCostData.totalCost;

        // Update credits UI
        const estimateEl = document.getElementById('estimated-credits');
        const breakdownEl = document.getElementById('cost-breakdown');
        const costContainerEl = document.getElementById('credits-estimate');
        estimateEl.textContent = totalCost;
        let breakdown = 'Media creation: 1 credit';
        if (tagCostData.newTags > 0) {
            breakdown += `, New tags: ${tagCostData.newTags} credits`;
        }
        breakdownEl.textContent = breakdown;
        costContainerEl.classList.remove('hidden');

        // Estimate storage
        const storageContainerEl = document.getElementById('storage-estimate');
        const storageEstimateEl = document.getElementById('estimated-storage');
        const storageBreakdownEl = document.getElementById('storage-breakdown');
        const selectedBytes = this.getSelectedBytes();
        if (this.selectedFiles.length === 0) {
            storageContainerEl.classList.add('hidden');
        } else {
            storageContainerEl.classList.remove('hidden');
            storageEstimateEl.textContent = this.formatFileSize(selectedBytes);
            storageBreakdownEl.textContent = `Available: ${this.formatFileSize(
                this.userStorageAvailable
            )}. After upload: ${this.formatFileSize(
                Math.max(this.userStorageAvailable - selectedBytes, 0)
            )}`;
        }

        // Update submit button state
        const submitBtn = document.getElementById('submit-button');
        const submitText = document.getElementById('submit-text');
        if (totalCost > this.userCredits) {
            submitBtn.disabled = true;
            submitText.textContent = `Insufficient Credits (Need ${totalCost})`;
            submitBtn.classList.add('opacity-50');
        } else if (selectedBytes > this.userStorageAvailable) {
            submitBtn.disabled = true;
            submitText.textContent = 'Insufficient Storage';
            submitBtn.classList.add('opacity-50');
        } else {
            submitBtn.disabled = false;
            submitText.textContent = `Create Media (${totalCost} credits)`;
            submitBtn.classList.remove('opacity-50');
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-button');
        const submitText = document.getElementById('submit-text');
        const submitSpinner = document.getElementById('submit-spinner');
        
        // Disable form
        submitBtn.disabled = true;
        submitText.textContent = 'Creating...';
        submitSpinner.classList.remove('hidden');
        
        this.hideMessages();
        
        try {
            const formData = new FormData();
            formData.append('title', document.getElementById('title').value.trim());
            formData.append('description', document.getElementById('description').value.trim());
            
            // Get tags from the tagging system
            const tagData = this.taggingSystem.getSelectedTags();
            formData.append('tags', JSON.stringify(tagData.all));
            formData.append('cover_image_index', this.coverImageIndex);
            
            // Add image files
            this.selectedFiles.forEach((file, index) => {
                formData.append('images[]', file);
            });
            
            const response = await fetch('/api/media/create.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showSuccess(`Media created successfully! Used ${result.credits_used} credits.`);
                
                // Reset form after short delay
                setTimeout(() => {
                    window.location.href = `?page=media&id=${result.id}`;
                }, 1500);
            } else {
                throw new Error(result.error || 'Failed to create media');
            }
            
        } catch (error) {
            console.error('Error creating media:', error);
            this.showError(error.message);
        } finally {
            // Re-enable form
            submitBtn.disabled = false;
            submitSpinner.classList.add('hidden');
            this.updateCostEstimate(); // This will set the correct button text
        }
    }
    
    showError(message) {
        const errorEl = document.getElementById('add-media-error');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        
        // Hide success message
        document.getElementById('add-media-success').classList.add('hidden');
    }
    
    showSuccess(message) {
        const successEl = document.getElementById('add-media-success');
        successEl.textContent = message;
        successEl.classList.remove('hidden');
        
        // Hide error message
        document.getElementById('add-media-error').classList.add('hidden');
    }
    
    hideMessages() {
        document.getElementById('add-media-error').classList.add('hidden');
        document.getElementById('add-media-success').classList.add('hidden');
    }
    
    // Cleanup method for router
    cleanup() {
        // Revoke all object URLs to prevent memory leaks
        this.selectedFiles.forEach(file => {
            if (file instanceof File) {
                URL.revokeObjectURL(file);
            }
        });
        
        // Clear timeouts
        if (this.tagSearchTimeout) {
            clearTimeout(this.tagSearchTimeout);
        }
        if (this.titleCheckTimeout) {
            clearTimeout(this.titleCheckTimeout);
        }
        
        // Cleanup tagging system
        if (this.taggingSystem) {
            this.taggingSystem.destroy();
        }
    }
}

// Initialize for router-loaded page
window.addMediaManager = new AddMediaManager();

// Cleanup for router
window.addMediaPage = {
    cleanup: () => {
        if (window.addMediaManager) {
            window.addMediaManager.cleanup();
        }
    }
};