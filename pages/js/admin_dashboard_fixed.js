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
                    <div class="bg-gradient-to-br from-card to-card/50 p-6 rounded-lg shadow-md border border-border hover:shadow-lg transition-all duration-200">
                        <div class="flex items-center mb-3">
                            <div class="text-2xl mr-3">🖥️</div>
                            <h3 class="text-lg font-semibold text-primary">System Info</h3>
                        </div>
                        <p class="text-muted-foreground flex items-center gap-2"><span>⏱️</span> Uptime: <span class="text-foreground font-medium">${stats.system.uptime}</span></p>
                        <p class="text-muted-foreground flex items-center gap-2"><span>📁</span> Files: <span class="text-foreground font-medium">${stats.system.total_files_in_uploads}</span></p>
                    </div>
                    
                    <div class="bg-gradient-to-br from-card to-card/50 p-6 rounded-lg shadow-md border border-border hover:shadow-lg transition-all duration-200">
                        <div class="flex items-center mb-3">
                            <div class="text-2xl mr-3">👥</div>
                            <h3 class="text-lg font-semibold text-primary">Users</h3>
                        </div>
                        <p class="text-muted-foreground flex items-center gap-2"><span>👤</span> Total: <span class="text-foreground font-medium">${stats.users.total}</span></p>
                        <p class="text-muted-foreground flex items-center gap-2"><span>🛡️</span> Admins: <span class="text-foreground font-medium">${stats.users.admins}</span></p>
                        <p class="text-muted-foreground flex items-center gap-2"><span>💰</span> Credits: <span class="text-foreground font-medium">${stats.users.total_credits.toLocaleString()}</span></p>
                    </div>
                    
                    <div class="bg-gradient-to-br from-card to-card/50 p-6 rounded-lg shadow-md border border-border hover:shadow-lg transition-all duration-200">
                        <div class="flex items-center mb-3">
                            <div class="text-2xl mr-3">📚</div>
                            <h3 class="text-lg font-semibold text-primary">Content</h3>
                        </div>
                        <p class="text-muted-foreground flex items-center gap-2"><span>🎬</span> Media: <span class="text-foreground font-medium">${stats.media.total}</span></p>
                        <p class="text-muted-foreground flex items-center gap-2"><span>🌳</span> Branches: <span class="text-foreground font-medium">${stats.branches.total}</span></p>
                        <p class="text-muted-foreground flex items-center gap-2"><span>📝</span> Segments: <span class="text-foreground font-medium">${stats.segments.total}</span></p>
                        <p class="text-muted-foreground flex items-center gap-2"><span>💬</span> Comments: <span class="text-foreground font-medium">${stats.comments.total}</span></p>
                    </div>
                    
                    <div class="bg-gradient-to-br from-card to-card/50 p-6 rounded-lg shadow-md border border-border hover:shadow-lg transition-all duration-200">
                        <div class="flex items-center mb-3">
                            <div class="text-2xl mr-3">📊</div>
                            <h3 class="text-lg font-semibold text-primary">Engagement</h3>
                        </div>
                        <p class="text-muted-foreground flex items-center gap-2"><span>🗳️</span> Total Votes: <span class="text-foreground font-medium">${stats.votes.total}</span></p>
                        <p class="text-muted-foreground flex items-center gap-2"><span>👍</span> Upvotes: <span class="text-green-500 font-medium">${stats.votes.upvotes}</span></p>
                        <p class="text-muted-foreground">Downvotes: <span class="text-red-500 font-medium">${stats.votes.downvotes}</span></p>
                        <p class="text-muted-foreground">Tags: <span class="text-foreground font-medium">${stats.tags.total}</span></p>
                    </div>
                </div>
                
                <!-- User Management Section -->
                <div class="bg-card p-6 rounded-lg shadow-md border border-border mb-8">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-semibold text-primary">👥 User Management</h3>
                        <a href="?page=admin-users" class="btn-primary btn-sm">
                            🔧 Advanced User Management
                        </a>
                    </div>
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
                                        <span class="text-foreground">${formatBytes(user.space_used || 0)} / ${formatBytes(user.quota || 1048576)}</span>
                                    </div>
                                    <div class="w-full bg-border rounded-full h-3 shadow-inner">
                                        <div class="h-3 rounded-full transition-all duration-300 ${(user.space_used || 0) / (user.quota || 1048576) > 0.8 ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/50' : (user.space_used || 0) / (user.quota || 1048576) > 0.6 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-yellow-500/50' : 'bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/50'}" 
                                             style="width: ${Math.min(100, ((user.space_used || 0) / (user.quota || 1048576)) * 100)}%; box-shadow: 0 0 8px ${(user.space_used || 0) / (user.quota || 1048576) > 0.8 ? 'rgba(239, 68, 68, 0.6)' : (user.space_used || 0) / (user.quota || 1048576) > 0.6 ? 'rgba(245, 158, 11, 0.6)' : 'rgba(16, 185, 129, 0.6)'}"></div>
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
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-semibold text-primary">🤖 AI Models (${stats.ai_models.length})</h3>
                            <a href="?page=admin-models" class="btn-primary btn-sm">
                                ⚙️ Manage Models
                            </a>
                        </div>
                        <div class="space-y-3 max-h-80 overflow-y-auto">
                            ${stats.ai_models.map(model => `
                                <div class="p-3 bg-muted rounded-lg">
                                    <div class="flex justify-between items-start mb-1">
                                        <strong class="text-foreground">${model.name}</strong>
                                        <span class="text-primary font-medium">${model.cost_per_use} credits</span>
                                    </div>
                                    <p class="text-sm text-muted-foreground">${model.description}</p>
                                    <span class="inline-block mt-1 px-2 py-1 text-xs rounded font-medium ${model.is_active ? 'bg-green-500 text-white dark:bg-green-600 dark:text-white' : 'bg-red-500 text-white dark:bg-red-600 dark:text-white'}">
                                        ${model.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Submissions Section -->
                <div class="bg-card p-6 rounded-lg shadow-md border border-border mb-8">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-semibold text-primary">📧 Form Submissions</h3>
                        <button onclick="loadSubmissions()" class="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/80">🔄 Refresh</button>
                    </div>
                    <div class="mb-4 flex gap-4">
                        <input type="text" id="submissions-search" placeholder="Search submissions..." class="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                        <select id="submissions-type" class="px-3 py-2 border border-border rounded-md bg-background text-foreground">
                            <option value="">All Types</option>
                            <option value="notify">Launch Notifications</option>
                            <option value="contact">Contact Forms</option>
                        </select>
                    </div>
                    <div id="submissions-list" class="space-y-3 max-h-96 overflow-y-auto">
                        <p class="text-muted-foreground">Loading submissions...</p>
                    </div>
                    <div id="submissions-pagination" class="mt-4 flex justify-between items-center">
                        <span id="submissions-info" class="text-sm text-muted-foreground"></span>
                        <div class="flex gap-2">
                            <button id="submissions-prev" onclick="changeSubmissionsPage(-1)" class="px-3 py-1 text-xs border border-border rounded hover:bg-muted">Previous</button>
                            <button id="submissions-next" onclick="changeSubmissionsPage(1)" class="px-3 py-1 text-xs border border-border rounded hover:bg-muted">Next</button>
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
        
        // Load submissions after dashboard is rendered
        loadSubmissions();
        
        // Set up search functionality
        document.getElementById('submissions-search').addEventListener('input', debounce(loadSubmissions, 300));
        document.getElementById('submissions-type').addEventListener('change', loadSubmissions);
        
    } catch (error) {
        console.error('Error:', error);
        content.innerHTML = `<div style="color: red; text-align: center; padding: 40px; background: white; border: 3px solid red;">Error: ${error.message}</div>`;
        content.style.display = 'block';
        loading.style.display = 'none';
    }
}

// User management functions
window.adjustCredits = function(userId, username) {
    showCreditModal(userId, username);
};

function showCreditModal(userId, username) {
    // Remove existing modal if any
    const existingModal = document.getElementById('credit-modal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'credit-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-card p-6 rounded-lg shadow-xl border border-border max-w-md w-full mx-4">
            <h3 class="text-xl font-semibold mb-4 text-foreground">💰 Adjust Credits for ${username}</h3>
            <div class="mb-4">
                <label class="block text-sm font-medium text-muted-foreground mb-2">Amount (positive to add, negative to subtract)</label>
                <input type="number" id="credit-amount" class="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Enter amount..." autofocus>
            </div>
            <div class="flex gap-3 justify-end">
                <button onclick="closeCreditModal()" class="px-4 py-2 text-sm border border-border rounded-md text-muted-foreground hover:bg-muted">Cancel</button>
                <button onclick="applyCreditChange(${userId}, '${username}')" class="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/80">Update Credits</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus on input
    document.getElementById('credit-amount').focus();
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCreditModal();
    });
    
    // Close on Escape key
    document.addEventListener('keydown', handleCreditModalKeydown);
}

function closeCreditModal() {
    const modal = document.getElementById('credit-modal');
    if (modal) {
        modal.remove();
        document.removeEventListener('keydown', handleCreditModalKeydown);
    }
}

function handleCreditModalKeydown(e) {
    if (e.key === 'Escape') {
        closeCreditModal();
    } else if (e.key === 'Enter') {
        const userId = document.querySelector('#credit-modal button[onclick*="applyCreditChange"]').onclick.toString().match(/applyCreditChange\((\d+)/)[1];
        const username = document.querySelector('#credit-modal button[onclick*="applyCreditChange"]').onclick.toString().match(/applyCreditChange\(\d+, '([^']+)'/)[1];
        applyCreditChange(parseInt(userId), username);
    }
}

async function applyCreditChange(userId, username) {
    const amount = document.getElementById('credit-amount').value;
    if (!amount || amount === '') {
        document.getElementById('credit-amount').focus();
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'adjust_credits', user_id: userId, amount: parseInt(amount) })
        });
        
        if (response.ok) {
            closeCreditModal();
            showSuccessNotification(`Credits updated for ${username}`);
            loadAdminDashboard(); // Refresh
        } else {
            showErrorNotification('Failed to update credits');
        }
    } catch (error) {
        showErrorNotification('Error updating credits: ' + error.message);
    }
}

function showSuccessNotification(message) {
    showNotification(message, 'success');
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

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

// Submissions management - use conditional initialization to prevent redeclaration errors
if (typeof window.submissionsCurrentPage === 'undefined') {
    window.submissionsCurrentPage = 1;
}
if (typeof window.submissionsData === 'undefined') {
    window.submissionsData = null;
}

window.loadSubmissions = async function() {
    const search = document.getElementById('submissions-search')?.value || '';
    const type = document.getElementById('submissions-type')?.value || '';
    
    try {
        const params = new URLSearchParams({
            page: window.submissionsCurrentPage,
            limit: 20,
            q: search,
            type: type
        });
        
        const response = await fetch(`/api/admin/submissions.php?${params}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        window.submissionsData = await response.json();
        renderSubmissions();
        
    } catch (error) {
        console.error('Error loading submissions:', error);
        const listElement = document.getElementById('submissions-list');
        if (listElement) {
            listElement.innerHTML = '<p class="text-red-500">Error loading submissions: ' + error.message + '</p>';
        }
    }
};

function renderSubmissions() {
    const listElement = document.getElementById('submissions-list');
    const infoElement = document.getElementById('submissions-info');
    const prevButton = document.getElementById('submissions-prev');
    const nextButton = document.getElementById('submissions-next');
    
    if (!window.submissionsData || !listElement) return;
    
    if (window.submissionsData.submissions.length === 0) {
        listElement.innerHTML = '<p class="text-muted-foreground">No submissions found.</p>';
        if (infoElement) infoElement.textContent = 'No submissions';
        return;
    }
    
    listElement.innerHTML = window.submissionsData.submissions.map(submission => `
        <div class="p-4 bg-muted rounded-lg border border-border">
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                    <span class="px-2 py-1 text-xs rounded font-medium ${submission.type === 'notify' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}">
                        ${submission.type === 'notify' ? '🔔 Launch Notification' : '📧 Contact Form'}
                    </span>
                    <span class="text-sm text-muted-foreground">${submission.created_at_formatted}</span>
                </div>
                <button onclick="deleteSubmission(${submission.id})" class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">🗑️ Delete</button>
            </div>
            
            <div class="space-y-1">
                ${submission.name ? `<p class="text-sm"><span class="text-muted-foreground">Name:</span> <span class="text-foreground">${escapeHtml(submission.name)}</span></p>` : ''}
                <p class="text-sm"><span class="text-muted-foreground">Email:</span> <span class="text-foreground">${escapeHtml(submission.email)}</span></p>
                ${submission.subject ? `<p class="text-sm"><span class="text-muted-foreground">Subject:</span> <span class="text-foreground">${escapeHtml(submission.subject)}</span></p>` : ''}
                ${submission.message ? `<p class="text-sm"><span class="text-muted-foreground">Message:</span> <span class="text-foreground">${escapeHtml(submission.message)}</span></p>` : ''}
            </div>
        </div>
    `).join('');
    
    // Update pagination info
    if (infoElement) {
        const start = (window.submissionsCurrentPage - 1) * window.submissionsData.limit + 1;
        const end = Math.min(window.submissionsCurrentPage * window.submissionsData.limit, window.submissionsData.total);
        infoElement.textContent = `Showing ${start}-${end} of ${window.submissionsData.total} submissions`;
    }
    
    // Update pagination buttons
    if (prevButton) {
        prevButton.disabled = window.submissionsCurrentPage <= 1;
        prevButton.style.opacity = window.submissionsCurrentPage <= 1 ? '0.5' : '1';
    }
    if (nextButton) {
        const hasNext = window.submissionsCurrentPage * window.submissionsData.limit < window.submissionsData.total;
        nextButton.disabled = !hasNext;
        nextButton.style.opacity = hasNext ? '1' : '0.5';
    }
}

window.changeSubmissionsPage = function(direction) {
    const newPage = window.submissionsCurrentPage + direction;
    if (newPage >= 1 && (newPage - 1) * 20 < window.submissionsData.total) {
        window.submissionsCurrentPage = newPage;
        loadSubmissions();
    }
};

window.deleteSubmission = async function(submissionId) {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    
    try {
        const response = await fetch('/api/admin/submissions.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: submissionId })
        });
        
        if (response.ok) {
            showSuccessNotification('Submission deleted successfully');
            loadSubmissions(); // Refresh
        } else {
            showErrorNotification('Failed to delete submission');
        }
    } catch (error) {
        showErrorNotification('Error deleting submission: ' + error.message);
    }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

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