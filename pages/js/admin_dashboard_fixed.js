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
        let users = [];
        if (usersRes.ok) {
            const usersData = await usersRes.json();
            console.log('Raw users data:', usersData);
            console.log('Users data type:', typeof usersData);
            
            // Handle different response formats
            if (Array.isArray(usersData)) {
                users = usersData;
            } else if (usersData && usersData.users && Array.isArray(usersData.users)) {
                users = usersData.users;
            } else if (usersData && typeof usersData === 'object') {
                // If it's an object, convert to array
                users = Object.values(usersData);
            }
        }
        
        console.log('Users loaded:', users.length, users);
        
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
                
                <!-- User Management Section -->
                <div class="bg-card p-6 rounded-lg shadow-md border border-border mb-8">
                    <h3 class="text-xl font-semibold mb-4 text-primary">👥 User Management</h3>
                    <div class="space-y-4 max-h-96 overflow-y-auto">
                        ${users.length > 0 ? users.map(user => `
                            <div class="p-4 bg-muted rounded-lg border border-border">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 class="font-medium text-foreground flex items-center gap-2">
                                            ${user.username || 'Unknown User'}
                                            ${user.is_admin ? '<span class="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">ADMIN</span>' : ''}
                                            ${user.is_banned ? '<span class="px-2 py-1 text-xs bg-red-500 text-white rounded">BANNED</span>' : ''}
                                        </h4>
                                        <p class="text-sm text-muted-foreground">${user.email || 'No email'}</p>
                                        <p class="text-xs text-muted-foreground">Joined: ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-sm font-medium text-primary">${(user.credits || 0).toLocaleString()} credits</p>
                                        <p class="text-xs text-muted-foreground">ID: ${user.id}</p>
                                    </div>
                                </div>
                                
                                <!-- Storage Usage Bar -->
                                <div class="mb-3">
                                    <div class="flex justify-between text-sm mb-1">
                                        <span class="text-muted-foreground">Storage Used</span>
                                        <span class="text-foreground">${formatBytes(user.storage_used || 0)} / ${formatBytes(user.quota || 1048576)}</span>
                                    </div>
                                    <div class="w-full bg-border rounded-full h-2">
                                        <div class="h-2 rounded-full ${(user.storage_used || 0) / (user.quota || 1048576) > 0.8 ? 'bg-red-500' : (user.storage_used || 0) / (user.quota || 1048576) > 0.6 ? 'bg-yellow-500' : 'bg-green-500'}" 
                                             style="width: ${Math.min(100, ((user.storage_used || 0) / (user.quota || 1048576)) * 100)}%"></div>
                                    </div>
                                </div>
                                
                                <!-- User Actions -->
                                <div class="flex flex-wrap gap-2">
                                    <button onclick="adjustCredits(${user.id}, '${user.username || 'Unknown'}')" 
                                            class="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/80">
                                        💰 Credits
                                    </button>
                                    <button onclick="adjustQuota(${user.id}, '${user.username || 'Unknown'}', ${user.quota || 1048576})" 
                                            class="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">
                                        💾 Storage
                                    </button>
                                    <button onclick="toggleBan(${user.id}, '${user.username || 'Unknown'}', ${user.is_banned || false})" 
                                            class="px-3 py-1 text-xs ${user.is_banned ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded">
                                        ${user.is_banned ? '✅ Unban' : '🚫 Ban'}
                                    </button>
                                    ${!user.is_admin ? 
                                        '<button onclick="toggleAdmin(' + user.id + ', \'' + (user.username || 'Unknown') + '\', false)" class="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600">👑 Make Admin</button>' : 
                                        (user.id !== 42 ? '<button onclick="toggleAdmin(' + user.id + ', \'' + (user.username || 'Unknown') + '\', true)" class="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600">👤 Remove Admin</button>' : '')
                                    }
                                </div>
                            </div>
                        `).join('') : '<p class="text-muted-foreground">No users found or unable to load users.</p>'}
                    </div>
                </div>
                
                <!-- Storage & Tags -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    
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

// User management functions
window.adjustCredits = async function(userId, username) {
    const amount = prompt(`Adjust credits for ${username}.\nEnter amount (positive to add, negative to subtract):`);
    if (amount === null || amount === '') return;
    
    try {
        const response = await fetch('/api/admin/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'adjust_credits', user_id: userId, amount: parseInt(amount) })
        });
        
        if (response.ok) {
            alert(`Credits updated for ${username}`);
            loadAdminDashboard(); // Refresh
        } else {
            alert('Failed to update credits');
        }
    } catch (error) {
        alert('Error updating credits: ' + error.message);
    }
};

window.adjustQuota = async function(userId, username, currentQuota) {
    const quota = prompt(`Adjust storage quota for ${username}.\nCurrent: ${formatBytes(currentQuota)}\nEnter new quota in bytes:`, currentQuota);
    if (quota === null || quota === '') return;
    
    try {
        const response = await fetch('/api/admin/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'adjust_quota', user_id: userId, quota: parseInt(quota) })
        });
        
        if (response.ok) {
            alert(`Storage quota updated for ${username}`);
            loadAdminDashboard(); // Refresh
        } else {
            alert('Failed to update quota');
        }
    } catch (error) {
        alert('Error updating quota: ' + error.message);
    }
};

window.toggleBan = async function(userId, username, currentlyBanned) {
    const action = currentlyBanned ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} ${username}?`)) return;
    
    try {
        const response = await fetch('/api/admin/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_ban', user_id: userId })
        });
        
        if (response.ok) {
            alert(`User ${username} has been ${action}ned`);
            loadAdminDashboard(); // Refresh
        } else {
            alert(`Failed to ${action} user`);
        }
    } catch (error) {
        alert(`Error ${action}ning user: ` + error.message);
    }
};

window.toggleAdmin = async function(userId, username, currentlyAdmin) {
    const action = currentlyAdmin ? 'remove admin privileges from' : 'grant admin privileges to';
    if (!confirm(`Are you sure you want to ${action} ${username}?`)) return;
    
    try {
        const response = await fetch('/api/admin/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_admin', user_id: userId })
        });
        
        if (response.ok) {
            alert(`Admin privileges updated for ${username}`);
            loadAdminDashboard(); // Refresh
        } else {
            alert('Failed to update admin privileges');
        }
    } catch (error) {
        alert('Error updating admin privileges: ' + error.message);
    }
};

function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes > 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return bytes.toFixed(1) + ' ' + units[i];
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