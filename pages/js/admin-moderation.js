// Admin Moderation Dashboard
class ModerationDashboard {
    constructor() {
        this.currentTab = 'flagged';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStats();
        this.loadContent();
    }

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(e.target.closest('[data-tab]').dataset.tab);
            });
        });
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.classList.remove('bg-accent');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('bg-accent');

        // Show/hide content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.add('hidden');
        });
        document.getElementById(tabName).classList.remove('hidden');

        this.currentTab = tabName;
        this.loadContent();
    }

    async loadStats() {
        try {
            const response = await fetch('/api/admin/moderation/stats');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('pending-count').textContent = data.stats.pending || 0;
                document.getElementById('flagged-count').textContent = data.stats.flagged || 0;
                document.getElementById('reports-count').textContent = data.stats.reports || 0;
                document.getElementById('banned-count').textContent = data.stats.banned || 0;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadContent() {
        const contentDiv = document.getElementById(`${this.currentTab}-content`);
        
        try {
            const response = await fetch(`/api/admin/moderation/${this.currentTab}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderContent(contentDiv, data.items || []);
            } else {
                this.showError(contentDiv, data.error || 'Failed to load content');
            }
        } catch (error) {
            console.error('Error loading content:', error);
            this.showError(contentDiv, 'Network error occurred');
        }
    }

    renderContent(container, items) {
        if (items.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = items.map(item => {
            switch (this.currentTab) {
                case 'flagged':
                    return this.renderFlaggedItem(item);
                case 'reports':
                    return this.renderReportItem(item);
                case 'recent':
                    return this.renderRecentItem(item);
                case 'banned':
                    return this.renderBannedItem(item);
                default:
                    return '';
            }
        }).join('');
    }

    renderFlaggedItem(item) {
        return `
            <div class="border border-border rounded-lg p-4 bg-background">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="text-lg">${this.getContentIcon(item.type)}</span>
                        <span class="font-medium">${this.escapeHtml(item.title || 'Untitled')}</span>
                        <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">${item.type}</span>
                    </div>
                    <div class="text-xs text-muted-foreground">
                        ${this.formatDate(item.flagged_at)}
                    </div>
                </div>
                <p class="text-sm text-muted-foreground mb-3">${this.escapeHtml(item.reason || 'No reason provided')}</p>
                <div class="flex justify-between items-center">
                    <div class="text-xs text-muted-foreground">
                        By: ${this.escapeHtml(item.username || 'Unknown')}
                    </div>
                    <div class="space-x-2">
                        <button class="btn btn-sm btn-secondary" onclick="moderation.approveContent(${item.id})">
                            ✅ Approve
                        </button>
                        <button class="btn btn-sm btn-destructive" onclick="moderation.removeContent(${item.id})">
                            ❌ Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderReportItem(item) {
        return `
            <div class="border border-border rounded-lg p-4 bg-background">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="text-lg">📋</span>
                        <span class="font-medium">Report #${item.id}</span>
                        <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">${item.category}</span>
                    </div>
                    <div class="text-xs text-muted-foreground">
                        ${this.formatDate(item.created_at)}
                    </div>
                </div>
                <p class="text-sm text-muted-foreground mb-3">${this.escapeHtml(item.description)}</p>
                <div class="flex justify-between items-center">
                    <div class="text-xs text-muted-foreground">
                        Reported by: ${this.escapeHtml(item.reporter_username)}
                    </div>
                    <div class="space-x-2">
                        <button class="btn btn-sm btn-secondary" onclick="moderation.resolveReport(${item.id}, 'dismissed')">
                            ✅ Dismiss
                        </button>
                        <button class="btn btn-sm btn-destructive" onclick="moderation.resolveReport(${item.id}, 'action_taken')">
                            ⚠️ Take Action
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentItem(item) {
        return `
            <div class="border border-border rounded-lg p-4 bg-background">
                <div class="flex justify-between items-start">
                    <div class="flex items-center space-x-2">
                        <span class="text-lg">${this.getContentIcon(item.type)}</span>
                        <span class="font-medium">${this.escapeHtml(item.title || 'Activity')}</span>
                        <span class="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">${item.action}</span>
                    </div>
                    <div class="text-xs text-muted-foreground">
                        ${this.formatDate(item.created_at)}
                    </div>
                </div>
                <p class="text-sm text-muted-foreground mt-2">
                    By: ${this.escapeHtml(item.username || 'Unknown')}
                </p>
            </div>
        `;
    }

    renderBannedItem(item) {
        return `
            <div class="border border-border rounded-lg p-4 bg-background">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="text-lg">🔒</span>
                        <span class="font-medium">${this.escapeHtml(item.username)}</span>
                        <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Banned</span>
                    </div>
                    <div class="text-xs text-muted-foreground">
                        ${this.formatDate(item.banned_at)}
                    </div>
                </div>
                <p class="text-sm text-muted-foreground mb-3">${this.escapeHtml(item.reason || 'No reason provided')}</p>
                <div class="flex justify-between items-center">
                    <div class="text-xs text-muted-foreground">
                        By: ${this.escapeHtml(item.banned_by_username)}
                    </div>
                    <div class="space-x-2">
                        <button class="btn btn-sm btn-secondary" onclick="moderation.unbanUser(${item.user_id})">
                            🔓 Unban
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyState() {
        const messages = {
            flagged: { icon: '🎉', text: 'No flagged content to review!' },
            reports: { icon: '✅', text: 'No active reports to review!' },
            recent: { icon: '📝', text: 'No recent activity to display!' },
            banned: { icon: '🎉', text: 'No banned users!' }
        };

        const message = messages[this.currentTab] || { icon: '📝', text: 'No content available' };
        
        return `
            <div class="text-center py-8 text-muted-foreground">
                <div class="text-4xl mb-2">${message.icon}</div>
                <p>${message.text}</p>
            </div>
        `;
    }

    getContentIcon(type) {
        const icons = {
            'segment': '📝',
            'comment': '💬',
            'media': '🎬',
            'branch': '🌳',
            'user': '👤'
        };
        return icons[type] || '📄';
    }

    showError(container, message) {
        container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <div class="text-4xl mb-2">❌</div>
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    }

    // Action methods
    async approveContent(id) {
        if (!confirm('Are you sure you want to approve this content?')) return;
        
        try {
            const response = await fetch(`/api/admin/moderation/approve/${id}`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                this.loadContent();
                this.loadStats();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error approving content:', error);
            alert('Network error occurred');
        }
    }

    async removeContent(id) {
        if (!confirm('Are you sure you want to remove this content?')) return;
        
        try {
            const response = await fetch(`/api/admin/moderation/remove/${id}`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                this.loadContent();
                this.loadStats();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error removing content:', error);
            alert('Network error occurred');
        }
    }

    async resolveReport(id, action) {
        if (!confirm(`Are you sure you want to ${action === 'dismissed' ? 'dismiss' : 'take action on'} this report?`)) return;
        
        try {
            const response = await fetch(`/api/admin/moderation/resolve/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });
            const data = await response.json();
            
            if (data.success) {
                this.loadContent();
                this.loadStats();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error resolving report:', error);
            alert('Network error occurred');
        }
    }

    async unbanUser(userId) {
        if (!confirm('Are you sure you want to unban this user?')) return;
        
        try {
            const response = await fetch(`/api/admin/moderation/unban/${userId}`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                this.loadContent();
                this.loadStats();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error unbanning user:', error);
            alert('Network error occurred');
        }
    }

    // Utility methods
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.moderation = new ModerationDashboard();
});