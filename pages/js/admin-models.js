// /pages/js/admin-models.js
// AI Models Management System for Admin Panel

class AdminModelsManager {
    constructor() {
        this.models = [];
        this.filteredModels = [];
        this.searchTimeout = null;
        this.editingModelId = null;
        
        console.log('AdminModelsManager initialized');
        this.init();
    }
    
    async init() {
        try {
            await this.loadModels();
            this.setupEventListeners();
            this.applyFilters();
            this.renderModels();
            this.updateStatistics();
            this.hideLoading();
        } catch (error) {
            console.error('Failed to initialize AdminModelsManager:', error);
            this.showError('Failed to load AI models management system');
        }
    }
    
    async loadModels() {
        try {
            const response = await fetch('/api/admin/ai-models.php');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && Array.isArray(data.models)) {
                this.models = data.models;
            } else {
                this.models = [];
            }
            
            console.log(`Loaded ${this.models.length} AI models`);
            
        } catch (error) {
            console.error('Error loading AI models:', error);
            this.models = [];
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
                    this.renderModels();
                }, 300);
            });
        }
        
        // Filter controls
        const statusFilter = document.getElementById('status-filter');
        const sortBy = document.getElementById('sort-by');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.applyFilters();
                this.renderModels();
            });
        }
        
        if (sortBy) {
            sortBy.addEventListener('change', () => {
                this.applyFilters();
                this.renderModels();
            });
        }
        
        // Model form submission
        const modelForm = document.getElementById('model-form');
        if (modelForm) {
            modelForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveModel();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.showAddModelModal();
                        break;
                    case 'f':
                        e.preventDefault();
                        searchInput?.focus();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshModels();
                        break;
                }
            }
            
            // ESC key to close modals
            if (e.key === 'Escape') {
                this.closeModelModal();
                this.closeDeleteModal();
            }
        });
    }
    
    applyFilters() {
        let filtered = [...this.models];
        
        // Apply search filter
        const searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(model => 
                (model.name || '').toLowerCase().includes(searchTerm) ||
                (model.description || '').toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply status filter
        const statusFilter = document.getElementById('status-filter')?.value;
        if (statusFilter) {
            filtered = filtered.filter(model => {
                switch (statusFilter) {
                    case 'active':
                        return model.is_active;
                    case 'inactive':
                        return !model.is_active;
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
            } else if (sortBy === 'cost_per_use') {
                aVal = parseFloat(aVal || 0);
                bVal = parseFloat(bVal || 0);
                return aVal - bVal; // Cheapest first for costs
            } else {
                aVal = String(aVal || '').toLowerCase();
                bVal = String(bVal || '').toLowerCase();
                return aVal.localeCompare(bVal);
            }
        });
        
        this.filteredModels = filtered;
    }
    
    renderModels() {
        const tbody = document.getElementById('models-table-body');
        const emptyState = document.getElementById('empty-state');
        const table = tbody?.closest('.bg-card');
        
        if (!tbody || !emptyState || !table) return;
        
        if (this.filteredModels.length === 0) {
            table.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            table.classList.remove('hidden');
            emptyState.classList.add('hidden');
            
            tbody.innerHTML = this.filteredModels.map(model => this.renderModelRow(model)).join('');
        }
        
        this.updateTotalModelsDisplay();
    }
    
    renderModelRow(model) {
        const statusClass = model.is_active ? 
            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            
        const statusIcon = model.is_active ? '✅' : '🚫';
        const statusText = model.is_active ? 'Active' : 'Inactive';
        
        return `
            <tr class="hover:bg-muted/50 transition-colors">
                <td class="px-4 py-3">
                    <div>
                        <div class="font-medium text-foreground">${escapeHtml(model.name || 'Unnamed Model')}</div>
                        <div class="text-sm text-muted-foreground">ID: ${model.id}</div>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm text-foreground max-w-xs">
                        ${model.description ? escapeHtml(model.description) : '<span class="text-muted-foreground italic">No description</span>'}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${statusIcon} ${statusText}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center space-x-2">
                        <span class="text-sm font-medium text-foreground">${model.cost_per_use || 0}</span>
                        <span class="text-xs text-muted-foreground">credits</span>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm text-muted-foreground">
                        ${model.created_at ? new Date(model.created_at).toLocaleDateString() : 'Unknown'}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center space-x-2">
                        <button onclick="editModel(${model.id})" 
                                class="btn-ghost btn-xs" title="Edit Model">
                            ✏️
                        </button>
                        <button onclick="toggleModelStatus(${model.id}, ${model.is_active})" 
                                class="btn-ghost btn-xs" title="${model.is_active ? 'Deactivate' : 'Activate'} Model">
                            ${model.is_active ? '🚫' : '✅'}
                        </button>
                        <button onclick="deleteModel(${model.id}, '${escapeHtml(model.name || 'Unnamed Model')}')" 
                                class="btn-ghost btn-xs text-destructive hover:text-destructive" title="Delete Model">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    updateTotalModelsDisplay() {
        const totalModelsEl = document.getElementById('total-models');
        if (totalModelsEl) {
            totalModelsEl.textContent = this.models.length;
        }
    }
    
    updateStatistics() {
        const activeCount = this.models.filter(m => m.is_active).length;
        const inactiveCount = this.models.filter(m => !m.is_active).length;
        const avgCost = this.models.length > 0 ? 
            Math.round(this.models.reduce((sum, m) => sum + (m.cost_per_use || 0), 0) / this.models.length) : 0;
        
        const activeCountEl = document.getElementById('active-models-count');
        const inactiveCountEl = document.getElementById('inactive-models-count');
        const avgCostEl = document.getElementById('avg-cost');
        
        if (activeCountEl) activeCountEl.textContent = activeCount;
        if (inactiveCountEl) inactiveCountEl.textContent = inactiveCount;
        if (avgCostEl) avgCostEl.textContent = avgCost;
    }
    
    showAddModelModal() {
        this.editingModelId = null;
        const modal = document.getElementById('model-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('model-form');
        
        if (modal && title && form) {
            title.textContent = 'Add New AI Model';
            form.reset();
            document.getElementById('model-id').value = '';
            document.getElementById('model-active').checked = true;
            modal.classList.remove('hidden');
            
            // Focus the name input
            setTimeout(() => {
                document.getElementById('model-name')?.focus();
            }, 100);
        }
    }
    
    editModel(modelId) {
        const model = this.models.find(m => m.id === modelId);
        if (!model) return;
        
        this.editingModelId = modelId;
        const modal = document.getElementById('model-modal');
        const title = document.getElementById('modal-title');
        
        if (modal && title) {
            title.textContent = 'Edit AI Model';
            
            // Populate form fields
            document.getElementById('model-id').value = model.id;
            document.getElementById('model-name').value = model.name || '';
            document.getElementById('model-description').value = model.description || '';
            document.getElementById('model-cost').value = model.cost_per_use || 1;
            document.getElementById('model-active').checked = Boolean(model.is_active);
            
            modal.classList.remove('hidden');
            
            // Focus the name input
            setTimeout(() => {
                document.getElementById('model-name')?.focus();
            }, 100);
        }
    }
    
    closeModelModal() {
        const modal = document.getElementById('model-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.editingModelId = null;
        }
    }
    
    async saveModel() {
        const modelId = document.getElementById('model-id').value;
        const name = document.getElementById('model-name').value.trim();
        const description = document.getElementById('model-description').value.trim();
        const costPerUse = parseInt(document.getElementById('model-cost').value);
        const isActive = document.getElementById('model-active').checked;
        
        if (!name) {
            alert('Model name is required');
            document.getElementById('model-name')?.focus();
            return;
        }
        
        if (isNaN(costPerUse) || costPerUse < 0) {
            alert('Please enter a valid cost per use (0 or positive number)');
            document.getElementById('model-cost')?.focus();
            return;
        }
        
        const saveBtn = document.getElementById('save-model-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }
        
        try {
            const response = await fetch('/api/admin/ai-models.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: modelId ? 'update' : 'create',
                    id: modelId || undefined,
                    name: name,
                    description: description,
                    cost_per_use: costPerUse,
                    is_active: isActive
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.closeModelModal();
                await this.refreshModels();
                alert(modelId ? 'Model updated successfully!' : 'Model created successfully!');
            } else {
                alert('Failed to save model: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Save model failed:', error);
            alert('Failed to save model. Please try again.');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Model';
            }
        }
    }
    
    async toggleModelStatus(modelId, currentStatus) {
        const action = currentStatus ? 'deactivate' : 'activate';
        if (!confirm(`Are you sure you want to ${action} this AI model?`)) {
            return;
        }
        
        try {
            const response = await fetch('/api/admin/ai-models.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'toggle_status',
                    id: modelId,
                    is_active: !currentStatus
                })
            });
            
            const data = await response.json();
            if (data.success) {
                await this.refreshModels();
                alert(`Model ${action}d successfully!`);
            } else {
                alert(`Failed to ${action} model: ` + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Toggle model status failed:', error);
            alert(`Failed to ${action} model. Please try again.`);
        }
    }
    
    deleteModel(modelId, modelName) {
        const modal = document.getElementById('delete-modal');
        const message = document.getElementById('delete-message');
        const confirmBtn = document.getElementById('confirm-delete-btn');
        
        if (modal && message && confirmBtn) {
            message.textContent = `Are you sure you want to delete the AI model "${modelName}"? This action cannot be undone.`;
            
            // Remove any existing click listeners and add new one
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            newConfirmBtn.addEventListener('click', () => this.confirmDelete(modelId));
            
            modal.classList.remove('hidden');
        }
    }
    
    closeDeleteModal() {
        const modal = document.getElementById('delete-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    async confirmDelete(modelId) {
        const confirmBtn = document.getElementById('confirm-delete-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Deleting...';
        }
        
        try {
            const response = await fetch('/api/admin/ai-models.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'delete',
                    id: modelId
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.closeDeleteModal();
                await this.refreshModels();
                alert('Model deleted successfully!');
            } else {
                alert('Failed to delete model: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Delete model failed:', error);
            alert('Failed to delete model. Please try again.');
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Delete Model';
            }
        }
    }
    
    async refreshModels() {
        await this.loadModels();
        this.applyFilters();
        this.renderModels();
        this.updateStatistics();
    }
    
    hideLoading() {
        const loading = document.getElementById('loading-indicator');
        const content = document.getElementById('models-content');
        
        if (loading) loading.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    }
    
    showError(message) {
        const content = document.getElementById('models-content');
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
window.showAddModelModal = function() {
    if (window.adminModelsManager) {
        window.adminModelsManager.showAddModelModal();
    }
};

window.editModel = function(modelId) {
    if (window.adminModelsManager) {
        window.adminModelsManager.editModel(modelId);
    }
};

window.deleteModel = function(modelId, modelName) {
    if (window.adminModelsManager) {
        window.adminModelsManager.deleteModel(modelId, modelName);
    }
};

window.toggleModelStatus = function(modelId, currentStatus) {
    if (window.adminModelsManager) {
        window.adminModelsManager.toggleModelStatus(modelId, currentStatus);
    }
};

window.closeModelModal = function() {
    if (window.adminModelsManager) {
        window.adminModelsManager.closeModelModal();
    }
};

window.closeDeleteModal = function() {
    if (window.adminModelsManager) {
        window.adminModelsManager.closeDeleteModal();
    }
};

window.refreshModels = function() {
    if (window.adminModelsManager) {
        window.adminModelsManager.refreshModels();
    }
};

// Export the class
window.AdminModelsManager = AdminModelsManager;