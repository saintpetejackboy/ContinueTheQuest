// Admin Backup Management System
class BackupManager {
    constructor() {
        this.init();
    }

    init() {
        this.loadHistory();
        this.loadStorageInfo();
    }

    async createBackup(type) {
        const statusDiv = document.getElementById('backup-status');
        const statusText = document.getElementById('backup-status-text');
        
        statusDiv.style.display = 'block';
        statusText.textContent = `Creating ${type} backup...`;
        
        try {
            const response = await fetch('/api/admin/backup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type: type })
            });
            
            const data = await response.json();
            
            if (data.success) {
                statusText.textContent = 'Backup created successfully!';
                showToast('Backup created successfully!', 'success');
                
                // Hide status after 3 seconds and refresh history
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                    this.loadHistory();
                    this.loadStorageInfo();
                }, 3000);
            } else {
                throw new Error(data.error || 'Backup creation failed');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            statusText.textContent = 'Backup creation failed: ' + error.message;
            statusDiv.style.display = 'none';
            showToast('Backup creation failed: ' + error.message, 'error');
        }
    }

    async loadHistory() {
        const container = document.getElementById('backup-list');
        
        try {
            const response = await fetch('/api/admin/backup?limit=20');
            const data = await response.json();
            
            if (data.success && data.backups.length > 0) {
                container.innerHTML = data.backups.map(backup => this.renderBackupItem(backup)).join('');
                document.getElementById('backup-count').textContent = data.backups.length;
            } else {
                container.innerHTML = this.getEmptyState();
                document.getElementById('backup-count').textContent = '0';
            }
        } catch (error) {
            console.error('Error loading backup history:', error);
            container.innerHTML = this.getErrorState('Failed to load backup history');
        }
    }

    renderBackupItem(backup) {
        const statusColor = {
            'completed': 'text-green-600 bg-green-50',
            'in_progress': 'text-yellow-600 bg-yellow-50',
            'failed': 'text-red-600 bg-red-50'
        }[backup.status] || 'text-gray-600 bg-gray-50';

        const statusIcon = {
            'completed': '✅',
            'in_progress': '⏳',
            'failed': '❌'
        }[backup.status] || '❓';

        return `
            <div class="border border-border rounded-lg p-4 bg-background">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-3">
                        <div class="text-lg">${this.getBackupIcon(backup.backup_type)}</div>
                        <div>
                            <div class="font-medium">${escapeHtml(backup.filename)}</div>
                            <div class="text-sm text-muted-foreground">
                                ${backup.backup_type.charAt(0).toUpperCase() + backup.backup_type.slice(1)} Backup
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-xs px-2 py-1 rounded ${statusColor}">
                            ${statusIcon} ${backup.status}
                        </span>
                    </div>
                </div>
                
                <div class="flex justify-between items-center text-sm text-muted-foreground">
                    <div class="flex items-center space-x-4">
                        <span>📅 ${formatDate(backup.created_at)}</span>
                        ${backup.file_size ? `<span>📦 ${backup.file_size_formatted || formatFileSize(backup.file_size)}</span>` : ''}
                        ${backup.created_by_username ? `<span>👤 ${escapeHtml(backup.created_by_username)}</span>` : ''}
                    </div>
                    <div class="space-x-2">
                        ${backup.status === 'completed' ? `
                            <button onclick="backup.downloadBackup(${backup.id})" class="text-blue-600 hover:text-blue-800">
                                📥 Download
                            </button>
                        ` : ''}
                        <button onclick="backup.deleteBackup(${backup.id})" class="text-red-600 hover:text-red-800">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getBackupIcon(type) {
        const icons = {
            'database': '🗄️',
            'files': '📁',
            'full': '🎯'
        };
        return icons[type] || '💾';
    }

    getEmptyState() {
        return `
            <div class="text-center py-8 text-muted-foreground">
                <div class="text-3xl mb-2">💾</div>
                <p>No backups found</p>
                <p class="text-sm">Create your first backup using the buttons above</p>
            </div>
        `;
    }

    getErrorState(message) {
        return `
            <div class="text-center py-8 text-red-500">
                <div class="text-3xl mb-2">❌</div>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }

    async loadStorageInfo() {
        try {
            const response = await fetch('/api/admin/backup/storage-info');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('db-size').textContent = data.storage.database_size || 'Unknown';
                document.getElementById('files-size').textContent = data.storage.files_size || 'Unknown';
            }
        } catch (error) {
            console.error('Error loading storage info:', error);
            document.getElementById('db-size').textContent = 'Error';
            document.getElementById('files-size').textContent = 'Error';
        }
    }

    async downloadBackup(id) {
        try {
            // Open download in new window/tab
            window.open(`/api/admin/backup/download/${id}`, '_blank');
        } catch (error) {
            console.error('Error downloading backup:', error);
            showToast('Download failed: ' + error.message, 'error');
        }
    }

    async deleteBackup(id) {
        if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/backup/${id}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Backup deleted successfully', 'success');
                this.loadHistory();
                this.loadStorageInfo();
            } else {
                throw new Error(data.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting backup:', error);
            showToast('Delete failed: ' + error.message, 'error');
        }
    }

    refreshHistory() {
        showToast('Refreshing backup history...', 'info');
        this.loadHistory();
        this.loadStorageInfo();
    }
}

// Initialize backup manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.backup = new BackupManager();
});