console.log('STARTING ADMIN DASHBOARD - DIRECT APPROACH');

// Direct execution - no classes, no router dependencies
async function loadAdminDashboard() {
    console.log('Loading admin dashboard...');
    
    // Get elements
    const loading = document.getElementById('loading-indicator');
    const content = document.getElementById('dashboard-content');
    
    if (!loading || !content) {
        console.error('Required elements not found');
        return;
    }
    
    try {
        // Fetch data
        console.log('Fetching stats...');
        const response = await fetch('/api/admin/stats.php');
        const stats = await response.json();
        console.log('Stats loaded:', Object.keys(stats));
        
        // Hide loading
        loading.style.display = 'none';
        
        // Show content with force
        content.className = '';
        content.style.cssText = 'display: block !important; visibility: visible !important;';
        
        // Fetch users for management
        console.log('Fetching users...');
        const usersRes = await fetch('/api/admin/users.php');
        const users = usersRes.ok ? await usersRes.json() : [];
        
        console.log('Users loaded:', users.length);
        
        // Create dashboard HTML using Tailwind classes
        content.innerHTML = `
            <div class="w-full max-w-7xl mx-auto py-8 px-4">
                <h1 class="text-3xl font-bold mb-6 text-primary">📊 Admin Dashboard</h1>
                
                <!-- Overview Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h3 class="text-lg font-semibold mb-2 text-primary">System Info</h3>
                        <p class="text-muted-foreground">Uptime: <span class="text-foreground font-medium">${stats.system.uptime}</span></p>
                        <p class="text-muted-foreground">Files: <span class="text-foreground font-medium">${stats.system.total_files_in_uploads}</span></p>
                    </div>
                    
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h3 class="text-lg font-semibold mb-2 text-primary">Users</h3>
                        <p class="text-muted-foreground">Total: <span class="text-foreground font-medium">${stats.users.total}</span></p>
                        <p class="text-muted-foreground">Admins: <span class="text-foreground font-medium">${stats.users.admins}</span></p>
                        <p class="text-muted-foreground">Credits: <span class="text-foreground font-medium">${stats.users.total_credits.toLocaleString()}</span></p>
                    </div>
                    
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h3 class="text-lg font-semibold mb-2 text-primary">Content</h3>
                        <p class="text-muted-foreground">Media: <span class="text-foreground font-medium">${stats.media.total}</span></p>
                        <p class="text-muted-foreground">Branches: <span class="text-foreground font-medium">${stats.branches.total}</span></p>
                        <p class="text-muted-foreground">Segments: <span class="text-foreground font-medium">${stats.segments.total}</span></p>
                        <p class="text-muted-foreground">Comments: <span class="text-foreground font-medium">${stats.comments.total}</span></p>
                    </div>
                    
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h3 class="text-lg font-semibold mb-2 text-primary">Engagement</h3>
                        <p class="text-muted-foreground">Total Votes: <span class="text-foreground font-medium">${stats.votes.total}</span></p>
                        <p class="text-muted-foreground">Upvotes: <span class="text-green-500 font-medium">${stats.votes.upvotes}</span></p>
                        <p class="text-muted-foreground">Downvotes: <span class="text-red-500 font-medium">${stats.votes.downvotes}</span></p>
                        <p class="text-muted-foreground">Tags: <span class="text-foreground font-medium">${stats.tags.total}</span></p>
                    </div>
                </div>
                
                <!-- Top Content Section -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h3 class="text-xl font-semibold mb-4 text-primary">🏆 Top Rated Content</h3>
                        
                        ${topMedia ? `
                        <div class="mb-4 p-3 bg-muted rounded-lg border-l-4 border-l-primary">
                            <h4 class="font-medium text-foreground">📺 Top Media</h4>
                            <p class="text-sm text-muted-foreground">${topMedia.title || 'Untitled'}</p>
                            <p class="text-xs text-primary">Score: ${topMedia.vote_score} | Type: ${topMedia.type}</p>
                        </div>
                        ` : '<p class="text-muted-foreground mb-4">No media found</p>'}
                        
                        ${topBranch ? `
                        <div class="mb-4 p-3 bg-muted rounded-lg border-l-4 border-l-secondary">
                            <h4 class="font-medium text-foreground">🌳 Top Branch</h4>
                            <p class="text-sm text-muted-foreground">${topBranch.title || 'Untitled'}</p>
                            <p class="text-xs text-primary">Score: ${topBranch.vote_score} | Type: ${topBranch.branch_type}</p>
                        </div>
                        ` : '<p class="text-muted-foreground mb-4">No branches found</p>'}
                        
                        ${topSegment ? `
                        <div class="mb-4 p-3 bg-muted rounded-lg border-l-4 border-l-accent">
                            <h4 class="font-medium text-foreground">📝 Top Segment</h4>
                            <p class="text-sm text-muted-foreground">${topSegment.title || 'Untitled'}</p>
                            <p class="text-xs text-primary">Score: ${topSegment.vote_score}</p>
                        </div>
                        ` : '<p class="text-muted-foreground mb-4">No segments found</p>'}
                        
                        ${topComment ? `
                        <div class="p-3 bg-muted rounded-lg border-l-4 border-l-green-500">
                            <h4 class="font-medium text-foreground">💬 Top Comment</h4>
                            <p class="text-sm text-muted-foreground">${topComment.content ? topComment.content.substring(0, 100) + (topComment.content.length > 100 ? '...' : '') : 'No content'}</p>
                            <p class="text-xs text-primary">Score: ${topComment.vote_score}</p>
                        </div>
                        ` : '<p class="text-muted-foreground">No comments found</p>'}
                    </div>
                    
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h3 class="text-xl font-semibold mb-4 text-primary">🤖 AI Models (${stats.ai_models.length})</h3>
                        <div class="space-y-3 max-h-80 overflow-y-auto">
                            ${stats.ai_models.map(model => `
                                <div class="p-3 bg-muted rounded-lg">
                                    <div class="flex justify-between items-start mb-1">
                                        <strong class="text-foreground">${model.name}</strong>
                                        <span class="text-primary font-medium">${model.cost_per_use} credits</span>
                                    </div>
                                    <p class="text-sm text-muted-foreground">${model.description}</p>
                                    <span class="inline-block mt-1 px-2 py-1 text-xs rounded ${model.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
                                        ${model.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Storage & Tags -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h3 class="text-xl font-semibold mb-4 text-primary">💾 Storage Usage</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Total Allocated:</span>
                                <span class="text-foreground font-medium">${formatBytes(stats.storage.total_allocated_bytes)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Used:</span>
                                <span class="text-foreground font-medium">${formatBytes(stats.storage.total_used_bytes)}</span>
                            </div>
                            <div class="w-full bg-muted rounded-full h-2">
                                <div class="bg-primary h-2 rounded-full" style="width: ${Math.min(100, (stats.storage.total_used_bytes / stats.storage.total_allocated_bytes) * 100)}%"></div>
                            </div>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div class="text-muted-foreground">Images: <span class="text-foreground">${formatBytes(stats.storage.breakdown.images)}</span></div>
                                <div class="text-muted-foreground">Avatars: <span class="text-foreground">${formatBytes(stats.storage.breakdown.avatars)}</span></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h3 class="text-xl font-semibold mb-4 text-primary">🏷️ Popular Tags</h3>
                        <div class="flex flex-wrap gap-2">
                            ${stats.tags.top_10.map(tag => `
                                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary text-primary-foreground">
                                    ${tag.name} <span class="ml-1 bg-primary-foreground/20 px-1.5 py-0.5 rounded-full text-xs">${tag.count}</span>
                                </span>
                            `).join('')}
                        </div>
                        <div class="mt-4 text-sm text-muted-foreground">
                            <span class="text-foreground font-medium">${stats.tags.genres}</span> genre tags out of <span class="text-foreground font-medium">${stats.tags.total}</span> total
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        function formatBytes(bytes) {
            const units = ['B', 'KB', 'MB', 'GB'];
            let i = 0;
            while (bytes > 1024 && i < units.length - 1) {
                bytes /= 1024;
                i++;
            }
            return bytes.toFixed(1) + ' ' + units[i];
        }
        
        console.log('Dashboard rendered successfully!');
        
    } catch (error) {
        console.error('Error:', error);
        content.innerHTML = `<div style="color: red; text-align: center; padding: 40px; background: white; border: 3px solid red;">Error: ${error.message}</div>`;
        content.style.display = 'block';
        loading.style.display = 'none';
    }
}

// Execute immediately when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAdminDashboard);
} else {
    loadAdminDashboard();
}

// Also try after a short delay in case of router interference
setTimeout(loadAdminDashboard, 100);
setTimeout(loadAdminDashboard, 500);
setTimeout(loadAdminDashboard, 1000);