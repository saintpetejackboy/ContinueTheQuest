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
        
        // Create dashboard HTML
        content.innerHTML = `
            <div style="padding: 20px; background: #1a1a1a; color: white; border-radius: 8px;">
                <h1 style="font-size: 32px; margin-bottom: 20px; color: #8b5cf6;">🎉 Admin Dashboard</h1>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; border: 2px solid #8b5cf6;">
                        <h3 style="color: #06b6d4; margin-bottom: 10px;">System Info</h3>
                        <p>Uptime: ${stats.system.uptime}</p>
                        <p>Files: ${stats.system.total_files_in_uploads}</p>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; border: 2px solid #06b6d4;">
                        <h3 style="color: #10b981; margin-bottom: 10px;">Users</h3>
                        <p>Total: ${stats.users.total}</p>
                        <p>Admins: ${stats.users.admins}</p>
                        <p>Credits: ${stats.users.total_credits}</p>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; border: 2px solid #10b981;">
                        <h3 style="color: #f59e0b; margin-bottom: 10px;">Content</h3>
                        <p>Media: ${stats.media.total}</p>
                        <p>Branches: ${stats.branches.total}</p>
                        <p>Segments: ${stats.segments.total}</p>
                        <p>Comments: ${stats.comments.total}</p>
                    </div>
                    
                    <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; border: 2px solid #f59e0b;">
                        <h3 style="color: #ef4444; margin-bottom: 10px;">Engagement</h3>
                        <p>Total Votes: ${stats.votes.total}</p>
                        <p>Upvotes: ${stats.votes.upvotes}</p>
                        <p>Downvotes: ${stats.votes.downvotes}</p>
                        <p>Tags: ${stats.tags.total}</p>
                    </div>
                </div>
                
                <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #8b5cf6; margin-bottom: 15px;">AI Models (${stats.ai_models.length})</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                        ${stats.ai_models.map(model => `
                            <div style="background: #1a1a1a; padding: 10px; border-radius: 4px;">
                                <strong>${model.name}</strong> - ${model.cost_per_use} credits
                                <br><small>${model.description}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div style="background: #2a2a2a; padding: 20px; border-radius: 8px;">
                    <h3 style="color: #06b6d4; margin-bottom: 15px;">Top Tags</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${stats.tags.top_10.map(tag => `
                            <span style="background: #8b5cf6; color: white; padding: 5px 10px; border-radius: 20px; font-size: 14px;">
                                ${tag.name} (${tag.count})
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-top: 20px; text-align: center; color: #10b981; font-size: 18px;">
                    ✅ Admin Dashboard Successfully Loaded! ✅
                </div>
            </div>
        `;
        
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