// /pages/js/admin-users.js
// Advanced User Management System for Admin Panel

class AdminUserManager {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.currentPage = 1;
        this.perPage = 25;
        this.totalPages = 1;
        this.searchTimeout = null;
        this.sortField = 'username';
        this.sortOrder = 'asc';
        this.currentFilter = '';
        this.selectedUsers = new Set();
        
        console.log('AdminUserManager initialized');
        this.init();
    }
    
    async init() {
        try {
            await this.loadUsers();
            this.setupEventListeners();
            this.applyFilters();
            this.renderUsers();
            this.hideLoading();
        } catch (error) {
            console.error('Failed to initialize AdminUserManager:', error);
            this.showError('Failed to load user management system');
        }
    }
    
    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users.php');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Handle different response formats
            if (Array.isArray(data)) {
                this.users = data;
            } else if (data && data.users && Array.isArray(data.users)) {
                this.users = data.users;
            } else if (data && typeof data === 'object') {
                this.users = Object.values(data);
            } else {
                this.users = [];
            }
            
            console.log(`Loaded ${this.users.length} users`);
            this.updateTotalUsersDisplay();
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.users = [];
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
                    this.renderUsers();
                }, 300);
            });
        }
        
        // Sort controls
        const sortField = document.getElementById('sort-field');
        const sortOrder = document.getElementById('sort-order');
        if (sortField) {
            sortField.addEventListener('change', () => {
                this.sortField = sortField.value;
                this.applyFilters();
                this.renderUsers();
            });
        }
        if (sortOrder) {
            sortOrder.addEventListener('change', () => {
                this.sortOrder = sortOrder.value;
                this.applyFilters();
                this.renderUsers();
            });
        }
        
        // Filter controls
        const userFilter = document.getElementById('user-filter');
        if (userFilter) {
            userFilter.addEventListener('change', () => {
                this.currentFilter = userFilter.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderUsers();
            });
        }
        
        // Per page control
        const perPageSelect = document.getElementById('per-page');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', () => {
                this.perPage = parseInt(perPageSelect.value);
                this.currentPage = 1;
                this.applyFilters();
                this.renderUsers();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'f':
                        e.preventDefault();
                        searchInput?.focus();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshUsers();
                        break;
                }
            }
        });
    }
    
    applyFilters() {
        let filtered = [...this.users];
        
        // Apply search filter
        const searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(user => 
                (user.username || '').toLowerCase().includes(searchTerm) ||
                (user.email || '').toLowerCase().includes(searchTerm) ||
                (user.display_name || '').toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply category filter
        if (this.currentFilter) {
            filtered = filtered.filter(user => {
                switch (this.currentFilter) {
                    case 'admin':
                        return user.is_admin;
                    case 'regular':
                        return !user.is_admin;
                    case 'inactive':
                        return this.isUserInactive(user);
                    case 'high-credits':
                        return (user.credits || 0) > 10;
                    case 'low-credits':
                        return (user.credits || 0) <= 2;
                    case 'high-storage':
                        return this.getStoragePercentage(user) > 50;
                    default:
                        return true;
                }
            });
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            let aVal = a[this.sortField];
            let bVal = b[this.sortField];
            
            // Handle different data types
            if (this.sortField === 'created_at' || this.sortField === 'last_active') {
                aVal = new Date(aVal || 0);
                bVal = new Date(bVal || 0);
            } else if (this.sortField === 'credits' || this.sortField === 'storage_used') {
                aVal = parseFloat(aVal || 0);
                bVal = parseFloat(bVal || 0);
            } else {
                aVal = String(aVal || '').toLowerCase();
                bVal = String(bVal || '').toLowerCase();
            }
            
            if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        this.filteredUsers = filtered;
        this.totalPages = Math.ceil(filtered.length / this.perPage);
        this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
        
        this.updateResultsInfo();
    }
    
    renderUsers() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        
        const startIndex = (this.currentPage - 1) * this.perPage;
        const endIndex = startIndex + this.perPage;
        const pageUsers = this.filteredUsers.slice(startIndex, endIndex);
        
        if (pageUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-muted-foreground">
                        No users found matching your criteria.
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = pageUsers.map(user => this.renderUserRow(user)).join('');
        }
        
        this.updatePagination();
    }
    
    renderUserRow(user) {
        const storagePercentage = this.getStoragePercentage(user);
        const isInactive = this.isUserInactive(user);
        
        return `
            <tr class="hover:bg-muted/50 transition-colors">
                <td class="px-4 py-3">
                    <div class="flex items-center space-x-3">
                        ${user.avatar ? 
                            `<img src="/uploads/users/${user.id}/avatars/${user.avatar}" class="w-8 h-8 rounded-full object-cover" alt="${this.escapeHtml(user.username)}">` :
                            `<div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                                ${(user.username || 'U').charAt(0).toUpperCase()}
                            </div>`
                        }
                        <div>
                            <div class="font-medium text-foreground">${this.escapeHtml(user.username || 'Unknown')}</div>
                            ${user.display_name ? `<div class="text-sm text-muted-foreground">${this.escapeHtml(user.display_name)}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm text-foreground">${this.escapeHtml(user.email || 'No email')}</div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center space-x-2">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_admin ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            isInactive ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }">
                            ${user.is_admin ? '👑 Admin' : isInactive ? '😴 Inactive' : '✅ Active'}
                        </span>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center space-x-2">
                        <span class="text-sm font-medium text-foreground">${user.credits || 0}</span>
                        <button onclick="showCreditModal(${user.id}, '${this.escapeHtml(user.username || 'Unknown')}')" 
                                class="btn-ghost btn-xs">
                            ⚙️
                        </button>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="space-y-1">
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-muted-foreground">${this.formatBytes(user.storage_used || 0)}</span>
                            <span class="text-muted-foreground">${storagePercentage}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ${
                                storagePercentage > 80 ? 'shadow-lg shadow-red-500/50' : 'shadow-lg shadow-blue-500/50'
                            }" style="width: ${Math.min(storagePercentage, 100)}%"></div>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm text-muted-foreground">
                        ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm text-muted-foreground">
                        ${user.last_active ? this.formatRelativeTime(user.last_active) : 'Never'}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center space-x-2">
                        <button onclick="showUserDetails(${user.id})" 
                                class="btn-ghost btn-xs" title="View Details">
                            👁️
                        </button>
                        <button onclick="editUser(${user.id})" 
                                class="btn-ghost btn-xs" title="Edit User">
                            ✏️
                        </button>
                        ${user.id !== 42 ? `
                            <button onclick="toggleAdmin(${user.id}, '${this.escapeHtml(user.username || 'Unknown')}', ${user.is_admin})" 
                                    class="btn-ghost btn-xs" title="${user.is_admin ? 'Remove Admin' : 'Make Admin'}">
                                ${user.is_admin ? '👤' : '👑'}
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }
    
    updateTotalUsersDisplay() {
        const totalUsersEl = document.getElementById('total-users');
        if (totalUsersEl) {
            totalUsersEl.textContent = this.users.length;
        }
    }
    
    updateResultsInfo() {
        const resultsInfo = document.getElementById('results-info');
        if (resultsInfo) {
            resultsInfo.textContent = `${this.filteredUsers.length} users`;
        }
    }
    
    updatePagination() {
        const paginationInfo = document.getElementById('pagination-info');
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (paginationInfo) {
            const startIndex = (this.currentPage - 1) * this.perPage + 1;
            const endIndex = Math.min(startIndex + this.perPage - 1, this.filteredUsers.length);
            paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${this.filteredUsers.length} users`;
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
    
    hideLoading() {
        const loading = document.getElementById('loading-indicator');
        const content = document.getElementById('users-content');
        
        if (loading) loading.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    }
    
    showError(message) {
        const content = document.getElementById('users-content');
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
    getStoragePercentage(user) {
        const used = parseFloat(user.storage_used || 0);
        const quota = parseFloat(user.storage_quota || 1073741824); // 1GB default
        return Math.round((used / quota) * 100);
    }
    
    isUserInactive(user) {
        if (!user.last_active) return true;
        const lastActive = new Date(user.last_active);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastActive < thirtyDaysAgo;
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    cleanup() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        // Remove event listeners if needed
        document.removeEventListener('keydown', this.handleKeyboard);
    }
}

// Global functions for onclick handlers
window.refreshUsers = async function() {
    if (window.adminUserManager) {
        await window.adminUserManager.loadUsers();
        window.adminUserManager.applyFilters();
        window.adminUserManager.renderUsers();
    }
};

window.changePage = function(direction) {
    if (window.adminUserManager) {
        const newPage = window.adminUserManager.currentPage + direction;
        if (newPage >= 1 && newPage <= window.adminUserManager.totalPages) {
            window.adminUserManager.currentPage = newPage;
            window.adminUserManager.renderUsers();
        }
    }
};

window.showUserDetails = function(userId) {
    const user = window.adminUserManager?.users.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('user-details-modal');
    const content = document.getElementById('user-details-content');
    
    if (modal && content) {
        content.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center space-x-4">
                    ${user.avatar ? 
                        `<img src="/uploads/users/${user.id}/avatars/${user.avatar}" class="w-16 h-16 rounded-full object-cover">` :
                        `<div class="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                            ${(user.username || 'U').charAt(0).toUpperCase()}
                        </div>`
                    }
                    <div>
                        <h4 class="text-lg font-semibold">${window.adminUserManager.escapeHtml(user.username || 'Unknown')}</h4>
                        ${user.display_name ? `<p class="text-muted-foreground">${window.adminUserManager.escapeHtml(user.display_name)}</p>` : ''}
                        <p class="text-sm text-muted-foreground">${window.adminUserManager.escapeHtml(user.email || 'No email')}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_admin ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }">
                            ${user.is_admin ? '👑 Admin' : '✅ Active'}
                        </span>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">Credits</label>
                        <div class="text-lg font-semibold">${user.credits || 0}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">Storage Used</label>
                        <div class="text-sm">${window.adminUserManager.formatBytes(user.storage_used || 0)} / ${window.adminUserManager.formatBytes(user.storage_quota || 1073741824)}</div>
                        <div class="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 mt-1">
                            <div class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style="width: ${window.adminUserManager.getStoragePercentage(user)}%"></div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">Member Since</label>
                        <div class="text-sm">${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</div>
                    </div>
                </div>
                
                <div class="flex space-x-3 pt-4">
                    <button onclick="editUser(${user.id})" class="btn-primary">
                        Edit User
                    </button>
                    <button onclick="showCreditModal(${user.id}, '${window.adminUserManager.escapeHtml(user.username || 'Unknown')}')" class="btn-secondary">
                        Adjust Credits
                    </button>
                    <button onclick="closeUserModal()" class="btn-ghost">
                        Close
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    }
};

window.closeUserModal = function() {
    const modal = document.getElementById('user-details-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.showCreditModal = function(userId, username) {
    const modal = document.getElementById('credit-modal');
    const content = document.getElementById('credit-modal-content');
    
    if (modal && content) {
        content.innerHTML = `
            <div class="space-y-4">
                <p class="text-muted-foreground">Adjust credits for <strong>${window.adminUserManager.escapeHtml(username)}</strong></p>
                <div>
                    <label for="credit-amount" class="block text-sm font-medium text-muted-foreground mb-2">Amount (positive to add, negative to subtract)</label>
                    <input type="number" id="credit-amount" class="form-input w-full" placeholder="Enter amount..." autofocus>
                </div>
                <div class="flex space-x-3">
                    <button onclick="applyCreditChange(${userId}, '${window.adminUserManager.escapeHtml(username)}')" class="btn-primary">
                        Update Credits
                    </button>
                    <button onclick="closeCreditModal()" class="btn-ghost">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        
        // Focus the input
        setTimeout(() => {
            document.getElementById('credit-amount')?.focus();
        }, 100);
    }
};

window.closeCreditModal = function() {
    const modal = document.getElementById('credit-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.applyCreditChange = async function(userId, username) {
    const amountInput = document.getElementById('credit-amount');
    const amount = parseInt(amountInput?.value || 0);
    
    if (amount === 0) {
        alert('Please enter a non-zero amount');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'adjust_credits',
                user_id: userId,
                amount: amount
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert(`Credits ${amount > 0 ? 'added to' : 'subtracted from'} ${username} successfully!`);
            window.closeCreditModal();
            window.refreshUsers();
        } else {
            alert('Failed to update credits: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Credit adjustment failed:', error);
        alert('Failed to update credits. Please try again.');
    }
};

window.toggleAdmin = async function(userId, username, isCurrentlyAdmin) {
    const action = isCurrentlyAdmin ? 'remove admin privileges from' : 'grant admin privileges to';
    if (!confirm(`Are you sure you want to ${action} ${username}?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'toggle_admin',
                user_id: userId,
                make_admin: !isCurrentlyAdmin
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert(`${username} ${isCurrentlyAdmin ? 'is no longer an admin' : 'is now an admin'}!`);
            window.refreshUsers();
        } else {
            alert('Failed to update admin status: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Admin toggle failed:', error);
        alert('Failed to update admin status. Please try again.');
    }
};

// Additional quick action functions
window.bulkCreditAdjustment = function() {
    alert('Bulk credit adjustment feature coming soon!');
};

window.exportUserList = function() {
    const users = window.adminUserManager?.filteredUsers || [];
    const csv = 'Username,Email,Status,Credits,Storage Used,Joined\n' + 
        users.map(user => [
            user.username || '',
            user.email || '',
            user.is_admin ? 'Admin' : 'User',
            user.credits || 0,
            window.adminUserManager.formatBytes(user.storage_used || 0),
            user.created_at ? new Date(user.created_at).toLocaleDateString() : ''
        ].join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-export.csv';
    a.click();
    URL.revokeObjectURL(url);
};

window.showUserAnalytics = function() {
    alert('User analytics feature coming soon!');
};

window.showInactiveUsers = function() {
    const userFilter = document.getElementById('user-filter');
    if (userFilter) {
        userFilter.value = 'inactive';
        userFilter.dispatchEvent(new Event('change'));
    }
};

window.editUser = function(userId) {
    alert(`Edit user ${userId} feature coming soon!`);
};

// Export the class
window.AdminUserManager = AdminUserManager;