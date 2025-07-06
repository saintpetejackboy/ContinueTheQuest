/**
 * Admin Overview Dashboard JavaScript
 */

class AdminOverview {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadSystemStatus();
        await this.loadRecentActivity();
        this.startPolling();
    }

    async loadSystemStatus() {
        try {
            // Load health status
            const health = await fetch('/api/health.php');
            const healthData = await health.json();
            
            document.getElementById('system-status').textContent = healthData.status.toUpperCase();
            document.getElementById('system-status').className = 
                `text-2xl font-bold ${healthData.status === 'ok' ? 'text-green-500' : 'text-yellow-500'}`;

            // Mock some other stats (you can implement real endpoints)
            document.getElementById('security-events').textContent = Math.floor(Math.random() * 50);
            document.getElementById('active-users').textContent = Math.floor(Math.random() * 100);
            document.getElementById('cache-hit-rate').textContent = Math.floor(Math.random() * 30 + 70) + '%';
            
        } catch (error) {
            console.error('Error loading system status:', error);
            document.getElementById('system-status').textContent = 'ERROR';
            document.getElementById('system-status').className = 'text-2xl font-bold text-red-500';
        }
    }

    async loadRecentActivity() {
        const activities = [
            { icon: '👤', text: 'New user registration', time: '2 minutes ago' },
            { icon: '🛡️', text: 'Security scan completed', time: '5 minutes ago' },
            { icon: '💾', text: 'Database backup created', time: '1 hour ago' },
            { icon: '🔄', text: 'Git log updated', time: '2 hours ago' },
            { icon: '📊', text: 'Analytics data refreshed', time: '3 hours ago' }
        ];

        const container = document.getElementById('recent-activity');
        container.innerHTML = activities.map(activity => `
            <div class="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div class="flex items-center space-x-3">
                    <span class="text-xl">${activity.icon}</span>
                    <span>${escapeHtml(activity.text)}</span>
                </div>
                <span class="text-sm text-muted-foreground">${escapeHtml(activity.time)}</span>
            </div>
        `).join('');
    }

    startPolling() {
        // Refresh system status every 30 seconds
        setInterval(() => {
            this.loadSystemStatus();
        }, 30000);
    }
}

// Quick action functions
async function clearCache() {
    if (!confirm('Are you sure you want to clear all cache?')) return;
    
    try {
        const response = await secureAPIRequest('/api/admin/cache/clear', {
            method: 'POST'
        });
        
        if (response.ok) {
            showNotification('Cache cleared successfully', 'success');
        } else {
            throw new Error('Failed to clear cache');
        }
    } catch (error) {
        showNotification('Error clearing cache: ' + error.message, 'error');
    }
}

async function runBackup() {
    if (!confirm('Create a new backup? This may take a few moments.')) return;
    
    try {
        const response = await secureAPIRequest('/api/admin/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'database' })
        });
        
        if (response.ok) {
            showNotification('Backup initiated successfully', 'success');
        } else {
            throw new Error('Failed to initiate backup');
        }
    } catch (error) {
        showNotification('Error creating backup: ' + error.message, 'error');
    }
}

async function refreshGitLog() {
    try {
        const response = await secureAPIRequest('/api/admin/github/refresh', {
            method: 'POST'
        });
        
        if (response.ok) {
            showNotification('Git log refreshed successfully', 'success');
        } else {
            throw new Error('Failed to refresh git log');
        }
    } catch (error) {
        showNotification('Error refreshing git log: ' + error.message, 'error');
    }
}

function viewSecurityLog() {
    window.open('/logs/security.log', '_blank');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    } text-white`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminOverview();
});