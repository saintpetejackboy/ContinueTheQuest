// /pages/js/admin-logs.js
// Admin Logs Management System

class AdminLogsManager {
    constructor() {
        this.logs = [];
        this.filteredLogs = [];
        this.currentPage = 1;
        this.perPage = 50;
        this.totalPages = 1;
        this.searchTimeout = null;
        this.statistics = {
            total: 0,
            errors: 0,
            warnings: 0,
            backups: 0
        };
        
        console.log('AdminLogsManager initialized');
        this.init();
    }
    
    async init() {
        try {
            await this.loadLogs();
            this.setupEventListeners();
            this.applyFilters();
            this.renderLogs();
            this.updateStatistics();
            this.hideLoading();
        } catch (error) {
            console.error('Failed to initialize AdminLogsManager:', error);
            this.showError('Failed to load logs system');
        }
    }
    
    async loadLogs() {
        try {
            const response = await fetch('/api/admin/logs.php');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && Array.isArray(data.logs)) {
                this.logs = data.logs;
                this.statistics = data.statistics || this.statistics;
            } else {
                this.logs = [];
                this.statistics = { total: 0, errors: 0, warnings: 0, backups: 0 };
            }
            
            console.log(`Loaded ${this.logs.length} log entries`);
            
        } catch (error) {
            console.error('Error loading logs:', error);
            this.logs = [];
            this.statistics = { total: 0, errors: 0, warnings: 0, backups: 0 };
            throw error;
        }
    }
    
    setupEventListeners() {
        // Search input with debounce
        const searchInput = document.getElementById('search-filter');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.currentPage = 1;
                    this.applyFilters();
                    this.renderLogs();
                }, 300);
            });
        }
        
        // Filter controls
        const typeFilter = document.getElementById('log-type-filter');
        const levelFilter = document.getElementById('log-level-filter');
        const dateRangeFilter = document.getElementById('date-range-filter');
        
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.currentPage = 1;
                this.applyFilters();
                this.renderLogs();
            });
        }
        
        if (levelFilter) {
            levelFilter.addEventListener('change', () => {
                this.currentPage = 1;
                this.applyFilters();
                this.renderLogs();
            });
        }
        
        if (dateRangeFilter) {
            dateRangeFilter.addEventListener('change', () => {
                this.currentPage = 1;
                this.applyFilters();
                this.renderLogs();
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
                        this.refreshLogs();
                        break;
                }
            }
            
            // ESC key to close modals
            if (e.key === 'Escape') {
                this.closeLogDetailsModal();
            }
        });
    }
    
    applyFilters() {
        let filtered = [...this.logs];
        
        // Apply search filter
        const searchTerm = document.getElementById('search-filter')?.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(log => 
                (log.message || '').toLowerCase().includes(searchTerm) ||
                (log.source || '').toLowerCase().includes(searchTerm) ||
                (log.type || '').toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply type filter
        const typeFilter = document.getElementById('log-type-filter')?.value;
        if (typeFilter) {
            filtered = filtered.filter(log => log.type === typeFilter);
        }
        
        // Apply level filter
        const levelFilter = document.getElementById('log-level-filter')?.value;
        if (levelFilter) {
            filtered = filtered.filter(log => log.level === levelFilter);
        }
        
        // Apply date range filter
        const dateRangeFilter = document.getElementById('date-range-filter')?.value;
        if (dateRangeFilter) {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filtered = filtered.filter(log => {
                const logDate = new Date(log.timestamp);
                
                switch (dateRangeFilter) {
                    case 'today':
                        return logDate >= startOfDay;
                    case 'yesterday':
                        const yesterday = new Date(startOfDay);
                        yesterday.setDate(yesterday.getDate() - 1);
                        const dayBefore = new Date(yesterday);
                        dayBefore.setDate(dayBefore.getDate() - 1);
                        return logDate >= dayBefore && logDate < yesterday;
                    case 'week':
                        const weekAgo = new Date(startOfDay);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return logDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(startOfDay);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return logDate >= monthAgo;
                    default:
                        return true;
                }
            });
        }
        
        // Sort by timestamp (newest first)
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        this.filteredLogs = filtered;
        this.totalPages = Math.ceil(filtered.length / this.perPage);
        this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
        
        this.updateResultsInfo();
    }
    
    renderLogs() {
        const tbody = document.getElementById('logs-table-body');
        const emptyState = document.getElementById('empty-state');
        const table = tbody?.closest('.bg-card');
        
        if (!tbody || !emptyState || !table) return;
        
        const startIndex = (this.currentPage - 1) * this.perPage;
        const endIndex = startIndex + this.perPage;
        const pageLogs = this.filteredLogs.slice(startIndex, endIndex);
        
        if (this.filteredLogs.length === 0) {
            table.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            table.classList.remove('hidden');
            emptyState.classList.add('hidden');
            
            tbody.innerHTML = pageLogs.map(log => this.renderLogRow(log)).join('');
        }
        
        this.updatePagination();
    }
    
    renderLogRow(log) {
        const levelColors = {
            'error': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            'warning': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'info': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'debug': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
        };
        
        const typeIcons = {
            'backup': '💾',
            'error': '🔴',
            'deploy': '🚀',
            'credits': '💰',
            'moderation': '🛡️'
        };
        
        const levelClass = levelColors[log.level] || levelColors.info;
        const typeIcon = typeIcons[log.type] || '📝';
        
        const formattedTime = new Date(log.timestamp).toLocaleString();
        const truncatedMessage = this.truncateText(log.message || 'No message', 100);
        
        return `
            <tr class="border-b border-border hover:bg-muted/50 transition-colors">
                <td class="px-4 py-3 text-sm text-muted-foreground">
                    ${formattedTime}
                </td>
                <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${levelClass}">
                        ${log.level || 'info'}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <span class="inline-flex items-center space-x-1">
                        <span>${typeIcon}</span>
                        <span class="text-sm text-foreground">${log.type || 'unknown'}</span>
                    </span>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm text-foreground">${this.escapeHtml(truncatedMessage)}</div>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                    ${this.escapeHtml(log.source || 'unknown')}
                </td>
                <td class="px-4 py-3">
                    <button onclick="showLogDetails(${log.id || 0})" 
                            class="btn-ghost btn-xs" title="View Details">
                        👁️
                    </button>
                </td>
            </tr>
        `;
    }
    
    updateResultsInfo() {
        const resultsInfo = document.getElementById('results-info');
        if (resultsInfo) {
            resultsInfo.textContent = `${this.filteredLogs.length} logs`;
        }
    }
    
    updatePagination() {
        const paginationInfo = document.getElementById('pagination-info');
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (paginationInfo) {
            const startIndex = (this.currentPage - 1) * this.perPage + 1;
            const endIndex = Math.min(startIndex + this.perPage - 1, this.filteredLogs.length);
            paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${this.filteredLogs.length} logs`;
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
        const totalEl = document.getElementById('total-logs');
        const errorEl = document.getElementById('error-count');
        const warningEl = document.getElementById('warning-count');
        const backupEl = document.getElementById('backup-count');
        
        if (totalEl) totalEl.textContent = this.statistics.total;
        if (errorEl) errorEl.textContent = this.statistics.errors;
        if (warningEl) warningEl.textContent = this.statistics.warnings;
        if (backupEl) backupEl.textContent = this.statistics.backups;
    }
    
    showLogDetails(logId) {
        const log = this.logs.find(l => l.id === logId);
        if (!log) return;
        
        const modal = document.getElementById('log-details-modal');
        const content = document.getElementById('log-details-content');
        
        if (modal && content) {
            content.innerHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-muted-foreground mb-1">Timestamp</label>
                            <p class="text-foreground">${new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-muted-foreground mb-1">Level</label>
                            <p class="text-foreground">${log.level || 'info'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-muted-foreground mb-1">Type</label>
                            <p class="text-foreground">${log.type || 'unknown'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-muted-foreground mb-1">Source</label>
                            <p class="text-foreground">${log.source || 'unknown'}</p>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-muted-foreground mb-1">Message</label>
                        <div class="bg-muted p-3 rounded-lg">
                            <pre class="text-sm text-foreground whitespace-pre-wrap">${this.escapeHtml(log.message || 'No message')}</pre>
                        </div>
                    </div>
                    
                    ${log.stack_trace ? `
                        <div>
                            <label class="block text-sm font-medium text-muted-foreground mb-1">Stack Trace</label>
                            <div class="bg-muted p-3 rounded-lg">
                                <pre class="text-sm text-foreground whitespace-pre-wrap">${this.escapeHtml(log.stack_trace)}</pre>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${log.context ? `
                        <div>
                            <label class="block text-sm font-medium text-muted-foreground mb-1">Context</label>
                            <div class="bg-muted p-3 rounded-lg">
                                <pre class="text-sm text-foreground whitespace-pre-wrap">${this.escapeHtml(JSON.stringify(log.context, null, 2))}</pre>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            modal.classList.remove('hidden');
        }
    }
    
    closeLogDetailsModal() {
        const modal = document.getElementById('log-details-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    async refreshLogs() {
        await this.loadLogs();
        this.applyFilters();
        this.renderLogs();
        this.updateStatistics();
    }
    
    async clearLogs() {
        if (!confirm('Are you sure you want to clear old logs? This will remove log entries older than 30 days.')) {
            return;
        }
        
        try {
            const response = await fetch('/api/admin/logs.php', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({action: 'clear_old'})
            });
            
            const data = await response.json();
            if (data.success) {
                await this.refreshLogs();
                alert(`Successfully cleared ${data.cleared_count || 0} old log entries`);
            } else {
                alert('Failed to clear logs: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Clear logs failed:', error);
            alert('Failed to clear logs. Please try again.');
        }
    }
    
    exportLogs() {
        const logs = this.filteredLogs || [];
        const csv = 'Timestamp,Level,Type,Source,Message\n' + 
            logs.map(log => [
                new Date(log.timestamp).toISOString(),
                log.level || 'info',
                log.type || 'unknown',
                log.source || 'unknown',
                (log.message || '').replace(/"/g, '""')
            ].map(field => `"${field}"`).join(',')).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    hideLoading() {
        const loading = document.getElementById('loading-indicator');
        const content = document.getElementById('logs-content');
        
        if (loading) loading.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    }
    
    showError(message) {
        const content = document.getElementById('logs-content');
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
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    cleanup() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }
}

// Global functions for onclick handlers
window.showLogDetails = function(logId) {
    if (window.adminLogsManager) {
        window.adminLogsManager.showLogDetails(logId);
    }
};

window.closeLogDetailsModal = function() {
    if (window.adminLogsManager) {
        window.adminLogsManager.closeLogDetailsModal();
    }
};

window.changePage = function(direction) {
    if (window.adminLogsManager) {
        const newPage = window.adminLogsManager.currentPage + direction;
        if (newPage >= 1 && newPage <= window.adminLogsManager.totalPages) {
            window.adminLogsManager.currentPage = newPage;
            window.adminLogsManager.renderLogs();
        }
    }
};

window.refreshLogs = function() {
    if (window.adminLogsManager) {
        window.adminLogsManager.refreshLogs();
    }
};

window.clearLogs = function() {
    if (window.adminLogsManager) {
        window.adminLogsManager.clearLogs();
    }
};

window.exportLogs = function() {
    if (window.adminLogsManager) {
        window.adminLogsManager.exportLogs();
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    window.adminLogsManager = new AdminLogsManager();
});

// Export the class
window.AdminLogsManager = AdminLogsManager;