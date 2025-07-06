// /pages/js/admin-tags.js
// Tag Management System for Admin Panel

class AdminTagsManager {
    constructor() {
        this.tags = [];
        this.filteredTags = [];
        this.currentPage = 1;
        this.perPage = 25;
        this.totalPages = 1;
        this.searchTimeout = null;
        this.selectedTags = new Set();
        this.editingTagId = null;
        
        console.log('AdminTagsManager initialized');
        this.init();
    }
    
    async init() {
        try {
            await this.loadTags();
            this.setupEventListeners();
            this.applyFilters();
            this.renderTags();
            this.updateStatistics();
            this.hideLoading();
        } catch (error) {
            console.error('Failed to initialize AdminTagsManager:', error);
            this.showError('Failed to load tag management system');
        }
    }
    
    async loadTags() {
        try {
            const response = await fetch('/api/admin/tags.php');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && Array.isArray(data.tags)) {
                this.tags = data.tags;
            } else {
                this.tags = [];
            }
            
            console.log(`Loaded ${this.tags.length} tags`);
            
        } catch (error) {
            console.error('Error loading tags:', error);
            this.tags = [];
            throw error;
        }
    }
    
    setupEventListeners() {
        // Search input with debounce
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.applyFilters();
                    this.renderTags();
                }, 300);
            });
        }
        
        // Filter controls
        const typeFilter = document.getElementById('type-filter');
        const usageFilter = document.getElementById('usage-filter');
        const sortBy = document.getElementById('sort-by');
        
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.currentPage = 1;
                this.applyFilters();
                this.renderTags();
            });
        }
        
        if (usageFilter) {
            usageFilter.addEventListener('change', () => {
                this.currentPage = 1;
                this.applyFilters();
                this.renderTags();
            });
        }
        
        if (sortBy) {
            sortBy.addEventListener('change', () => {
                this.applyFilters();
                this.renderTags();
            });
        }
        
        // Select all checkbox
        const selectAll = document.getElementById('select-all');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }
        
        // Tag form submission
        const tagForm = document.getElementById('tag-form');
        if (tagForm) {
            tagForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTag();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.showAddTagModal();
                        break;
                    case 'f':
                        e.preventDefault();
                        searchInput?.focus();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshTags();
                        break;
                }
            }
            
            // ESC key to close modals
            if (e.key === 'Escape') {
                this.closeTagModal();
                this.closeDeleteModal();
            }
        });
    }
    
    applyFilters() {
        let filtered = [...this.tags];
        
        // Apply search filter
        const searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(tag => 
                (tag.name || '').toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply type filter
        const typeFilter = document.getElementById('type-filter')?.value;
        if (typeFilter) {
            filtered = filtered.filter(tag => {
                switch (typeFilter) {
                    case 'genre':
                        return tag.is_genre;
                    case 'regular':
                        return !tag.is_genre;
                    default:
                        return true;
                }
            });
        }
        
        // Apply usage filter
        const usageFilter = document.getElementById('usage-filter')?.value;
        if (usageFilter) {
            filtered = filtered.filter(tag => {
                const usage = tag.usage_count || 0;
                switch (usageFilter) {
                    case 'unused':
                        return usage === 0;
                    case 'low':
                        return usage >= 1 && usage <= 5;
                    case 'medium':
                        return usage >= 6 && usage <= 20;
                    case 'high':
                        return usage >= 21;
                    default:
                        return true;
                }
            });
        }
        
        // Apply sorting
        const sortBy = document.getElementById('sort-by')?.value || 'name';
        filtered.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            // Handle different data types
            if (sortBy === 'created_at') {
                aVal = new Date(aVal || 0);
                bVal = new Date(bVal || 0);
                return bVal - aVal; // Newest first for dates
            } else if (sortBy === 'usage_count') {
                aVal = parseFloat(aVal || 0);
                bVal = parseFloat(bVal || 0);
                return bVal - aVal; // Highest usage first
            } else {
                aVal = String(aVal || '').toLowerCase();
                bVal = String(bVal || '').toLowerCase();
                return aVal.localeCompare(bVal);
            }
        });
        
        this.filteredTags = filtered;
        this.totalPages = Math.ceil(filtered.length / this.perPage);
        this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
        
        this.updateResultsInfo();
    }
    
    renderTags() {
        const tbody = document.getElementById('tags-table-body');
        const emptyState = document.getElementById('empty-state');
        const table = tbody?.closest('.bg-card');
        
        if (!tbody || !emptyState || !table) return;
        
        const startIndex = (this.currentPage - 1) * this.perPage;
        const endIndex = startIndex + this.perPage;
        const pageTags = this.filteredTags.slice(startIndex, endIndex);
        
        if (this.filteredTags.length === 0) {
            table.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            table.classList.remove('hidden');
            emptyState.classList.add('hidden');
            
            tbody.innerHTML = pageTags.map(tag => this.renderTagRow(tag)).join('');
        }
        
        this.updatePagination();
        this.updateTotalTagsDisplay();
    }
    
    renderTagRow(tag) {
        const statusClass = tag.is_genre ? 
            'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            
        const statusIcon = tag.is_genre ? '🏷️' : '📌';
        const statusText = tag.is_genre ? 'Genre' : 'Regular';
        
        const usageCount = tag.usage_count || 0;
        const usageBadgeClass = usageCount === 0 ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                               usageCount <= 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                               usageCount <= 20 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                               'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        
        return `
            <tr class="hover:bg-muted/50 transition-colors">
                <td class="px-4 py-3">
                    <input type="checkbox" class="tag-checkbox form-checkbox" value="${tag.id}" 
                           onchange="toggleTagSelection(${tag.id}, this.checked)">
                </td>
                <td class="px-4 py-3">
                    <div class="font-medium text-foreground">${escapeHtml(tag.name || 'Unnamed Tag')}</div>
                    <div class="text-sm text-muted-foreground">ID: ${tag.id}</div>
                </td>
                <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${statusIcon} ${statusText}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${usageBadgeClass}">
                        ${usageCount} uses
                    </span>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm text-foreground space-y-1">
                        <div>Media: ${tag.media_count || 0}</div>
                        <div>Branches: ${tag.branch_count || 0}</div>
                        <div>Segments: ${tag.segment_count || 0}</div>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm text-muted-foreground">
                        ${tag.created_at ? new Date(tag.created_at).toLocaleDateString() : 'Unknown'}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center space-x-2">
                        <button onclick="editTag(${tag.id})" 
                                class="btn-ghost btn-xs" title="Edit Tag">
                            ✏️
                        </button>
                        <button onclick="toggleGenreStatus(${tag.id}, ${tag.is_genre})" 
                                class="btn-ghost btn-xs" title="${tag.is_genre ? 'Remove from Genre' : 'Mark as Genre'}">
                            ${tag.is_genre ? '📌' : '🏷️'}
                        </button>
                        <button onclick="deleteTag(${tag.id}, '${escapeHtml(tag.name || 'Unnamed Tag')}')" 
                                class="btn-ghost btn-xs text-destructive hover:text-destructive" title="Delete Tag">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    updateTotalTagsDisplay() {
        const totalTagsEl = document.getElementById('total-tags');
        if (totalTagsEl) {
            totalTagsEl.textContent = this.tags.length;
        }
    }
    
    updateResultsInfo() {
        const resultsInfo = document.getElementById('results-info');
        if (resultsInfo) {
            resultsInfo.textContent = `${this.filteredTags.length} tags`;
        }
    }
    
    updatePagination() {
        const paginationInfo = document.getElementById('pagination-info');
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (paginationInfo) {
            const startIndex = (this.currentPage - 1) * this.perPage + 1;
            const endIndex = Math.min(startIndex + this.perPage - 1, this.filteredTags.length);
            paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${this.filteredTags.length} tags`;
        }
        
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        }
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }
    }
    
    updateStatistics() {
        const genreCount = this.tags.filter(t => t.is_genre).length;
        const regularCount = this.tags.filter(t => !t.is_genre).length;
        const unusedCount = this.tags.filter(t => (t.usage_count || 0) === 0).length;
        const mostUsedCount = this.tags.length > 0 ? 
            Math.max(...this.tags.map(t => t.usage_count || 0)) : 0;
        
        const genreCountEl = document.getElementById('genre-tags-count');
        const regularCountEl = document.getElementById('regular-tags-count');
        const mostUsedCountEl = document.getElementById('most-used-count');
        const unusedCountEl = document.getElementById('unused-tags-count');
        
        if (genreCountEl) genreCountEl.textContent = genreCount;
        if (regularCountEl) regularCountEl.textContent = regularCount;
        if (mostUsedCountEl) mostUsedCountEl.textContent = mostUsedCount;
        if (unusedCountEl) unusedCountEl.textContent = unusedCount;
    }
    
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.tag-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const tagId = parseInt(checkbox.value);
            if (checked) {
                this.selectedTags.add(tagId);
            } else {
                this.selectedTags.delete(tagId);
            }
        });
    }
    
    showAddTagModal() {
        this.editingTagId = null;
        const modal = document.getElementById('tag-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('tag-form');
        const usageInfo = document.getElementById('tag-usage-info');
        
        if (modal && title && form && usageInfo) {
            title.textContent = 'Add New Tag';
            form.reset();
            document.getElementById('tag-id').value = '';
            document.getElementById('tag-is-genre').checked = false;
            usageInfo.classList.add('hidden');
            modal.classList.remove('hidden');
            
            // Focus the name input
            setTimeout(() => {
                document.getElementById('tag-name')?.focus();
            }, 100);
        }
    }
    
    editTag(tagId) {
        const tag = this.tags.find(t => t.id === tagId);
        if (!tag) return;
        
        this.editingTagId = tagId;
        const modal = document.getElementById('tag-modal');
        const title = document.getElementById('modal-title');
        const usageInfo = document.getElementById('tag-usage-info');
        const usageBreakdown = document.getElementById('usage-breakdown');
        
        if (modal && title && usageInfo && usageBreakdown) {
            title.textContent = 'Edit Tag';
            
            // Populate form fields
            document.getElementById('tag-id').value = tag.id;
            document.getElementById('tag-name').value = tag.name || '';
            document.getElementById('tag-is-genre').checked = Boolean(tag.is_genre);
            
            // Show usage information
            usageInfo.classList.remove('hidden');
            usageBreakdown.innerHTML = `
                <div>Total uses: ${tag.usage_count || 0}</div>
                <div>Media: ${tag.media_count || 0}</div>
                <div>Branches: ${tag.branch_count || 0}</div>
                <div>Segments: ${tag.segment_count || 0}</div>
            `;
            
            modal.classList.remove('hidden');
            
            // Focus the name input
            setTimeout(() => {
                document.getElementById('tag-name')?.focus();
            }, 100);
        }
    }
    
    closeTagModal() {
        const modal = document.getElementById('tag-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.editingTagId = null;
        }
    }
    
    async saveTag() {
        const tagId = document.getElementById('tag-id').value;
        const name = document.getElementById('tag-name').value.trim().toLowerCase();
        const isGenre = document.getElementById('tag-is-genre').checked;
        
        if (!name) {
            alert('Tag name is required');
            document.getElementById('tag-name')?.focus();
            return;
        }
        
        const saveBtn = document.getElementById('save-tag-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }
        
        try {
            const response = await fetch('/api/admin/tags.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: tagId ? 'update' : 'create',
                    id: tagId || undefined,
                    name: name,
                    is_genre: isGenre
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.closeTagModal();
                await this.refreshTags();
                alert(tagId ? 'Tag updated successfully!' : 'Tag created successfully!');
            } else {
                alert('Failed to save tag: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Save tag failed:', error);
            alert('Failed to save tag. Please try again.');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Tag';
            }
        }
    }
    
    async toggleGenreStatus(tagId, currentStatus) {
        const action = currentStatus ? 'remove from genre' : 'mark as genre';
        if (!confirm(`Are you sure you want to ${action} this tag?`)) {
            return;
        }
        
        try {
            const response = await fetch('/api/admin/tags.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'toggle_genre',
                    id: tagId,
                    is_genre: !currentStatus
                })
            });
            
            const data = await response.json();
            if (data.success) {
                await this.refreshTags();
                alert(`Tag ${action}d successfully!`);
            } else {
                alert(`Failed to ${action} tag: ` + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Toggle genre status failed:', error);
            alert(`Failed to ${action} tag. Please try again.`);
        }
    }
    
    deleteTag(tagId, tagName) {
        const tag = this.tags.find(t => t.id === tagId);
        if (!tag) return;
        
        const modal = document.getElementById('delete-modal');
        const message = document.getElementById('delete-message');
        const usageWarning = document.getElementById('delete-usage-warning');
        const confirmBtn = document.getElementById('confirm-delete-btn');
        
        if (modal && message && usageWarning && confirmBtn) {
            message.textContent = `Are you sure you want to delete the tag "${tagName}"? This action cannot be undone.`;
            
            // Show usage warning if tag is being used
            if ((tag.usage_count || 0) > 0) {
                usageWarning.classList.remove('hidden');
            } else {
                usageWarning.classList.add('hidden');
            }
            
            // Remove any existing click listeners and add new one
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            newConfirmBtn.addEventListener('click', () => this.confirmDelete(tagId));
            
            modal.classList.remove('hidden');
        }
    }
    
    closeDeleteModal() {
        const modal = document.getElementById('delete-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    async confirmDelete(tagId) {
        const confirmBtn = document.getElementById('confirm-delete-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Deleting...';
        }
        
        try {
            const response = await fetch('/api/admin/tags.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'delete',
                    id: tagId
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.closeDeleteModal();
                await this.refreshTags();
                alert('Tag deleted successfully!');
            } else {
                alert('Failed to delete tag: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Delete tag failed:', error);
            alert('Failed to delete tag. Please try again.');
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Delete Tag';
            }
        }
    }
    
    async refreshTags() {
        await this.loadTags();
        this.applyFilters();
        this.renderTags();
        this.updateStatistics();
    }
    
    hideLoading() {
        const loading = document.getElementById('loading-indicator');
        const content = document.getElementById('tags-content');
        
        if (loading) loading.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    }
    
    showError(message) {
        const content = document.getElementById('tags-content');
        if (content) {
            content.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-destructive text-lg font-semibold mb-2">Error</div>
                    <div class="text-muted-foreground">${message}</div>
                    <button onclick="window.location.reload()" class="btn-primary mt-4">
                        Reload Page
                    </button>
                </div>
            `;
            content.classList.remove('hidden');
        }
        
        const loading = document.getElementById('loading-indicator');
        if (loading) loading.classList.add('hidden');
    }
    
    // Helper methods
    
    cleanup() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }
}

// Global functions for onclick handlers
window.showAddTagModal = function() {
    if (window.adminTagsManager) {
        window.adminTagsManager.showAddTagModal();
    }
};

window.editTag = function(tagId) {
    if (window.adminTagsManager) {
        window.adminTagsManager.editTag(tagId);
    }
};

window.deleteTag = function(tagId, tagName) {
    if (window.adminTagsManager) {
        window.adminTagsManager.deleteTag(tagId, tagName);
    }
};

window.toggleGenreStatus = function(tagId, currentStatus) {
    if (window.adminTagsManager) {
        window.adminTagsManager.toggleGenreStatus(tagId, currentStatus);
    }
};

window.toggleTagSelection = function(tagId, checked) {
    if (window.adminTagsManager) {
        if (checked) {
            window.adminTagsManager.selectedTags.add(tagId);
        } else {
            window.adminTagsManager.selectedTags.delete(tagId);
        }
    }
};

window.closeTagModal = function() {
    if (window.adminTagsManager) {
        window.adminTagsManager.closeTagModal();
    }
};

window.closeDeleteModal = function() {
    if (window.adminTagsManager) {
        window.adminTagsManager.closeDeleteModal();
    }
};

window.changePage = function(direction) {
    if (window.adminTagsManager) {
        const newPage = window.adminTagsManager.currentPage + direction;
        if (newPage >= 1 && newPage <= window.adminTagsManager.totalPages) {
            window.adminTagsManager.currentPage = newPage;
            window.adminTagsManager.renderTags();
        }
    }
};

window.refreshTags = function() {
    if (window.adminTagsManager) {
        window.adminTagsManager.refreshTags();
    }
};

// Additional quick action functions
window.exportTags = function() {
    const tags = window.adminTagsManager?.filteredTags || [];
    const csv = 'Name,Type,Usage Count,Media Count,Branch Count,Segment Count,Created\n' + 
        tags.map(tag => [
            tag.name || '',
            tag.is_genre ? 'Genre' : 'Regular',
            tag.usage_count || 0,
            tag.media_count || 0,
            tag.branch_count || 0,
            tag.segment_count || 0,
            tag.created_at ? new Date(tag.created_at).toLocaleDateString() : ''
        ].join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tags-export.csv';
    a.click();
    URL.revokeObjectURL(url);
};

window.bulkTagActions = function() {
    const selectedCount = window.adminTagsManager?.selectedTags.size || 0;
    if (selectedCount === 0) {
        alert('Please select some tags first');
        return;
    }
    alert(`Bulk actions for ${selectedCount} selected tags coming soon!`);
};

// Export the class
window.AdminTagsManager = AdminTagsManager;