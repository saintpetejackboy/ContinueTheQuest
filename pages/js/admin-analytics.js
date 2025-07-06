// Admin Analytics Dashboard
class AnalyticsDashboard {
    constructor() {
        this.init();
    }

    init() {
        this.loadOverviewStats();
        this.loadTopCreators();
        this.loadPopularContent();
        this.loadRecentActivity();
        this.loadEngagementMetrics();
        this.loadUserRetention();
    }

    async loadOverviewStats() {
        try {
            const response = await fetch('/api/admin/analytics/overview');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('total-users').textContent = data.stats.total_users || 0;
                document.getElementById('active-users').textContent = data.stats.active_users || 0;
                document.getElementById('total-content').textContent = data.stats.total_content || 0;
                document.getElementById('engagement-rate').textContent = (data.stats.engagement_rate || 0) + '%';
            }
        } catch (error) {
            console.error('Error loading overview stats:', error);
        }
    }

    async loadTopCreators() {
        const container = document.getElementById('top-creators');
        
        try {
            const response = await fetch('/api/admin/analytics/top-creators');
            const data = await response.json();
            
            if (data.success && data.creators.length > 0) {
                container.innerHTML = data.creators.map((creator, index) => `
                    <div class="flex items-center justify-between p-2 rounded hover:bg-accent">
                        <div class="flex items-center space-x-2">
                            <div class="text-sm font-medium">${index + 1}.</div>
                            <div class="text-sm">${escapeHtml(creator.username)}</div>
                        </div>
                        <div class="text-sm text-muted-foreground">${creator.content_count} items</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = this.getEmptyState('👤', 'No creators found');
            }
        } catch (error) {
            console.error('Error loading top creators:', error);
            container.innerHTML = this.getErrorState('Failed to load creators');
        }
    }

    async loadPopularContent() {
        const container = document.getElementById('popular-content');
        
        try {
            const response = await fetch('/api/admin/analytics/popular-content');
            const data = await response.json();
            
            if (data.success && data.content.length > 0) {
                container.innerHTML = data.content.map((item, index) => `
                    <div class="p-2 rounded hover:bg-accent">
                        <div class="flex items-center space-x-2 mb-1">
                            <div class="text-sm font-medium">${index + 1}.</div>
                            <div class="text-sm">${this.getContentIcon(item.type)}</div>
                            <div class="text-sm font-medium">${escapeHtml(item.title)}</div>
                        </div>
                        <div class="text-xs text-muted-foreground ml-6">
                            ${item.views || 0} views • ${item.comments || 0} comments
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = this.getEmptyState('📝', 'No content found');
            }
        } catch (error) {
            console.error('Error loading popular content:', error);
            container.innerHTML = this.getErrorState('Failed to load content');
        }
    }

    async loadRecentActivity() {
        const container = document.getElementById('recent-activity');
        
        try {
            const response = await fetch('/api/admin/analytics/recent-activity');
            const data = await response.json();
            
            if (data.success && data.activity.length > 0) {
                container.innerHTML = data.activity.map(item => `
                    <div class="p-2 rounded hover:bg-accent">
                        <div class="flex items-center space-x-2 mb-1">
                            <div class="text-sm">${this.getActivityIcon(item.action)}</div>
                            <div class="text-sm">${escapeHtml(item.username)}</div>
                        </div>
                        <div class="text-xs text-muted-foreground ml-6">
                            ${item.action} • ${this.formatDate(item.created_at)}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = this.getEmptyState('📊', 'No recent activity');
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            container.innerHTML = this.getErrorState('Failed to load activity');
        }
    }

    async loadEngagementMetrics() {
        try {
            const response = await fetch('/api/admin/analytics/engagement');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('total-comments').textContent = data.metrics.total_comments || 0;
                document.getElementById('total-media').textContent = data.metrics.total_media || 0;
                document.getElementById('total-tags').textContent = data.metrics.total_tags || 0;
            }
        } catch (error) {
            console.error('Error loading engagement metrics:', error);
        }
    }

    async loadUserRetention() {
        try {
            const response = await fetch('/api/admin/analytics/retention');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('new-users-7d').textContent = data.retention.new_users_7d || 0;
                document.getElementById('returning-users').textContent = data.retention.returning_users || 0;
                
                const newUsersTrend = data.retention.new_users_trend || 0;
                const returningTrend = data.retention.returning_trend || 0;
                
                document.getElementById('new-users-trend').textContent = 
                    (newUsersTrend >= 0 ? '+' : '') + newUsersTrend + '%';
                document.getElementById('returning-trend').textContent = 
                    (returningTrend >= 0 ? '+' : '') + returningTrend + '%';
                
                // Update trend colors
                document.getElementById('new-users-trend').className = 
                    'text-sm ' + (newUsersTrend >= 0 ? 'text-green-600' : 'text-red-600');
                document.getElementById('returning-trend').className = 
                    'text-sm ' + (returningTrend >= 0 ? 'text-green-600' : 'text-red-600');
            }
        } catch (error) {
            console.error('Error loading user retention:', error);
        }
    }

    getContentIcon(type) {
        const icons = {
            'segment': '📝',
            'comment': '💬',
            'media': '🎬',
            'branch': '🌳',
            'tag': '🏷️'
        };
        return icons[type] || '📄';
    }

    getActivityIcon(action) {
        const icons = {
            'created_segment': '📝',
            'created_comment': '💬',
            'created_media': '🎬',
            'created_branch': '🌳',
            'created_tag': '🏷️',
            'login': '🔑',
            'register': '👋'
        };
        return icons[action] || '📊';
    }

    getEmptyState(icon, message) {
        return `
            <div class="text-center py-8 text-muted-foreground">
                <div class="text-2xl mb-2">${icon}</div>
                <p class="text-sm">${message}</p>
            </div>
        `;
    }

    getErrorState(message) {
        return `
            <div class="text-center py-8 text-red-500">
                <div class="text-2xl mb-2">❌</div>
                <p class="text-sm">${escapeHtml(message)}</p>
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
        
        return date.toLocaleDateString();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnalyticsDashboard();
});