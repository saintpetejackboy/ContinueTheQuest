console.log('=== ADMIN DASHBOARD JS FILE LOADING ===');

(function() {
    console.log('=== INSIDE IIFE ===');
    
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, ch => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[ch]));
    }

    function ensureImagePath(path) {
        if (!path) return '';
        return path.startsWith('images/') ? path : 'images/' + path;
    }

    class AdminDashboard {
        constructor() {
            console.log('=== ADMIN DASHBOARD CONSTRUCTOR START ===');
            this.container = document.getElementById('admin-dashboard-container');
            this.loadingIndicator = document.getElementById('loading-indicator');
            this.dashboardContent = document.getElementById('dashboard-content');

            console.log('Elements found:', {
                container: !!this.container,
                loadingIndicator: !!this.loadingIndicator,
                dashboardContent: !!this.dashboardContent
            });

            if (!this.container) {
                console.error('AdminDashboard: Container not found.');
                return;
            }
            
            // Initial state: show loading, hide content
            if (this.loadingIndicator) this.loadingIndicator.classList.remove('hidden');
            if (this.dashboardContent) this.dashboardContent.classList.add('hidden');

            console.log('Starting initialization...');
            this.init();
        }

        async init() {
            console.log('AdminDashboard: Initializing...');
            console.log('AdminDashboard: Container element:', this.container);
            console.log('AdminDashboard: Loading indicator element:', this.loadingIndicator);
            console.log('AdminDashboard: Dashboard content element:', this.dashboardContent);
            
            try {
                await this.loadStats();
                if (this.stats) {
                    console.log('AdminDashboard: Stats loaded successfully, rendering dashboard...');
                    this.renderDashboard();
                    this.bindEvents();
                    this.showSuccess();
                    console.log('AdminDashboard: Initialization complete.');
                } else {
                    console.error('AdminDashboard: Stats is null/undefined after loadStats()');
                    this.showError('Failed to load dashboard data - stats object is null');
                }
            } catch (error) {
                console.error('AdminDashboard: Error during initialization:', error);
                this.showError('Dashboard initialization failed: ' + error.message);
            }
        }

        async loadStats() {
            console.log('=== LOADSTATS START ===');
            
            try {
                const res = await fetch('/api/admin/stats.php');
                console.log('FETCH SUCCESS - Status:', res.status);
                
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                
                this.stats = await res.json();
                console.log('JSON PARSED - Keys:', Object.keys(this.stats));
                
            } catch (error) {
                console.error('FETCH ERROR:', error.message);
                this.stats = null;
                this.showError('API Error: ' + error.message);
            }
        }

        renderDashboard() {
            console.log('AdminDashboard: Attempting to render dashboard...');
            console.log('AdminDashboard: Stats object:', this.stats);
            console.log('AdminDashboard: Stats object type:', typeof this.stats);
            
            if (!this.stats) {
                console.warn('AdminDashboard: No stats available to render.');
                this.showError('No stats data available to render');
                return;
            }
            
            console.log('AdminDashboard: Stats validation - checking required properties...');
            console.log('AdminDashboard: Has users?', !!this.stats.users);
            console.log('AdminDashboard: Has system?', !!this.stats.system);
            console.log('AdminDashboard: Has media?', !!this.stats.media);
            console.log('AdminDashboard: Has branches?', !!this.stats.branches);
            console.log('AdminDashboard: Has segments?', !!this.stats.segments);
            console.log('AdminDashboard: Has comments?', !!this.stats.comments);
            console.log('AdminDashboard: Has votes?', !!this.stats.votes);
            console.log('AdminDashboard: Has tags?', !!this.stats.tags);
            console.log('AdminDashboard: Has storage?', !!this.stats.storage);

            let html = `
                <h1 class="text-3xl font-bold mb-6">Admin Dashboard</h1>

                <!-- System Overview -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h2 class="text-lg font-semibold mb-2">System Uptime</h2>
                        <p class="text-2xl font-bold text-primary">${this.stats.system.uptime || 'N/A'}</p>
                    </div>
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h2 class="text-lg font-semibold mb-2">Total Files (Uploads)</h2>
                        <p class="text-2xl font-bold text-primary">${this.stats.system.total_files_in_uploads}</p>
                    </div>
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h2 class="text-lg font-semibold mb-2">Total Users</h2>
                        <p class="text-2xl font-bold text-primary">${this.stats.users.total}</p>
                    </div>
                </div>

                <!-- User Statistics -->
                <div class="bg-card p-6 rounded-lg shadow-md border border-border mb-8">
                    <h2 class="text-xl font-semibold mb-4">User Statistics</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <p class="text-muted-foreground">Admins:</p>
                            <p class="text-2xl font-bold">${this.stats.users.admins}</p>
                        </div>
                        <div>
                            <p class="text-muted-foreground">Banned:</p>
                            <p class="text-2xl font-bold">${this.stats.users.banned}</p>
                        </div>
                        <div>
                            <p class="text-muted-foreground">Total Credits:</p>
                            <p class="text-2xl font-bold">${this.stats.users.total_credits}</p>
                        </div>
                    </div>
                    <h3 class="text-lg font-semibold mb-2">User Growth (Monthly)</h3>
                    <canvas id="userGrowthChart"></canvas>
                </div>

                <!-- Content Statistics -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h2 class="text-xl font-semibold mb-4">Media Statistics</h2>
                        <p class="text-muted-foreground">Total Media:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.media.total}</p>
                        <p class="text-muted-foreground">Avg. Vote Score:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.media.avg_vote_score}</p>
                        <h3 class="text-lg font-semibold mb-2">Media Growth (Monthly)</h3>
                        <canvas id="mediaGrowthChart"></canvas>
                    </div>
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h2 class="text-xl font-semibold mb-4">Branch Statistics</h2>
                        <p class="text-muted-foreground">Total Branches:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.branches.total}</p>
                        <p class="text-muted-foreground">Avg. Vote Score:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.branches.avg_vote_score}</p>
                        <h3 class="text-lg font-semibold mb-2">Branches by Type</h3>
                        <canvas id="branchesByTypeChart"></canvas>
                        <h3 class="text-lg font-semibold mb-2 mt-4">Branch Growth (Monthly)</h3>
                        <canvas id="branchGrowthChart"></canvas>
                    </div>
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h2 class="text-xl font-semibold mb-4">Segment Statistics</h2>
                        <p class="text-muted-foreground">Total Segments:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.segments.total}</p>
                        <p class="text-muted-foreground">Avg. Vote Score:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.segments.avg_vote_score}</p>
                        <h3 class="text-lg font-semibold mb-2">Segment Growth (Monthly)</h3>
                        <canvas id="segmentGrowthChart"></canvas>
                    </div>
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h2 class="text-xl font-semibold mb-4">Comment Statistics</h2>
                        <p class="text-muted-foreground">Total Comments:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.comments.total}</p>
                        <p class="text-muted-foreground">Hidden Comments:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.comments.hidden}</p>
                        <p class="text-muted-foreground">Avg. Vote Score:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.comments.avg_vote_score}</p>
                        <h3 class="text-lg font-semibold mb-2">Comments by Target Type</h3>
                        <canvas id="commentsByTargetTypeChart"></canvas>
                        <h3 class="text-lg font-semibold mb-2 mt-4">Comment Growth (Monthly)</h3>
                        <canvas id="commentGrowthChart"></canvas>
                    </div>
                </div>

                <!-- Other Statistics -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h2 class="text-xl font-semibold mb-4">Vote Statistics</h2>
                        <p class="text-muted-foreground">Total Votes:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.votes.total}</p>
                        <p class="text-muted-foreground">Upvotes:</p>
                        <p class="text-2xl font-bold">${this.stats.votes.upvotes}</p>
                        <p class="text-muted-foreground">Downvotes:</p>
                        <p class="text-2xl font-bold">${this.stats.votes.downvotes}</p>
                    </div>
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h2 class="text-xl font-semibold mb-4">Tag Statistics</h2>
                        <p class="text-muted-foreground">Total Tags:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.tags.total}</p>
                        <p class="text-muted-foreground">Genre Tags:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.tags.genres}</p>
                        <h3 class="text-lg font-semibold mb-2">Top 10 Tags</h3>
                        <ul>
                            ${this.stats.tags.top_10.map(tag => `<li>${escapeHTML(tag.name)} (${tag.count})</li>`).join('')}
                        </ul>
                    </div>
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h2 class="text-xl font-semibold mb-4">AI Model Information</h2>
                        <div class="space-y-2">
                            ${this.stats.ai_models.map(model => `
                                <div class="border-b border-border pb-2">
                                    <p class="font-medium">${escapeHTML(model.name)}</p>
                                    <p class="text-sm text-muted-foreground">${escapeHTML(model.description || 'No description')}</p>
                                    <p class="text-xs text-muted-foreground">Active: ${model.is_active ? 'Yes' : 'No'}, Cost: ${model.cost_per_use} credits/use</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="bg-card p-6 rounded-lg shadow-md border border-border">
                        <h2 class="text-xl font-semibold mb-4">Submission Statistics</h2>
                        <p class="text-muted-foreground">Total Submissions:</p>
                        <p class="text-2xl font-bold mb-4">${this.stats.submissions.total}</p>
                        <h3 class="text-lg font-semibold mb-2">Submissions by Type</h3>
                        <ul>
                            ${this.stats.submissions.by_type.map(sub => `<li>${escapeHTML(sub.type)} (${sub.count})</li>`).join('')}
                        </ul>
                    </div>
                </div>

                <!-- Storage Statistics -->
                <div class="bg-card p-6 rounded-lg shadow-md border border-border mb-8">
                    <h2 class="text-xl font-semibold mb-4">Storage Statistics</h2>
                    <p class="text-muted-foreground">Total Allocated Quota:</p>
                    <p class="text-2xl font-bold mb-4">${this.formatBytes(this.stats.storage.total_allocated_bytes)}</p>
                    <p class="text-muted-foreground">Total Used Storage:</p>
                    <p class="text-2xl font-bold mb-4">${this.formatBytes(this.stats.storage.total_used_bytes)}</p>
                    <h3 class="text-lg font-semibold mb-2">Storage Breakdown</h3>
                    <ul>
                        <li>Avatars: ${this.formatBytes(this.stats.storage.breakdown.avatars)}</li>
                        <li>Images: ${this.formatBytes(this.stats.storage.breakdown.images)}</li>
                        <li>Texts: ${this.formatBytes(this.stats.storage.breakdown.texts)}</li>
                    </ul>
                </div>
            `;

            console.log('AdminDashboard: Setting dashboard content HTML...');
            this.dashboardContent.innerHTML = html;
            console.log('AdminDashboard: HTML content set, now rendering charts...');
            
            try {
                this.renderCharts();
                console.log('AdminDashboard: Charts rendered successfully');
            } catch (error) {
                console.error('AdminDashboard: Error rendering charts:', error);
                console.error('AdminDashboard: Chart error stack:', error.stack);
                this.showError('Error rendering charts: ' + error.message);
            }
        }

        bindEvents() {
            // No specific events for now, but this is where they would go.
        }

        formatBytes(bytes, precision = 2) {
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let i = 0;
            
            while (bytes > 1024 && i < units.length - 1) {
                bytes /= 1024;
                i++;
            }
            
            return `${bytes.toFixed(precision)} ${units[i]}`;
        }

        showError(message) {
            console.error('=== SHOWING ERROR ===', message);
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
            }
            if (this.dashboardContent) {
                this.dashboardContent.className = '';
                this.dashboardContent.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: static !important; z-index: 9999 !important;';
                this.dashboardContent.innerHTML = `<div style="color: red; text-align: center; padding: 40px; font-size: 20px; background: white; border: 3px solid red; position: relative; z-index: 10000;">${message}</div>`;
            }
        }

        showSuccess() {
            console.log('=== SHOWING SUCCESS ===');
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
            }
            if (this.dashboardContent) {
                this.dashboardContent.className = '';
                this.dashboardContent.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: static !important; z-index: 9999 !important;';
                this.dashboardContent.classList.remove('hidden');
            }
        }

        renderCharts() {
            console.log('AdminDashboard: Starting chart rendering...');
            console.log('AdminDashboard: Chart.js available?', typeof Chart !== 'undefined');
            
            if (typeof Chart === 'undefined') {
                console.error('AdminDashboard: Chart.js is not loaded!');
                this.showError('Chart.js library is not loaded');
                return;
            }
            
            // Set up Chart.js defaults for a futuristic theme
            Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
            Chart.defaults.color = '#e4e4e7'; // zinc-200
            Chart.defaults.borderColor = '#3f3f46'; // zinc-700
            Chart.defaults.backgroundColor = 'rgba(139, 92, 246, 0.1)'; // violet-500 with opacity

            // Create gradients for charts
            const createGradient = (ctx, color1, color2) => {
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, color1);
                gradient.addColorStop(1, color2);
                return gradient;
            };

            // Color palette for futuristic theme
            const colors = {
                primary: '#8b5cf6', // violet-500
                secondary: '#06b6d4', // cyan-500
                accent: '#f59e0b', // amber-500
                success: '#10b981', // emerald-500
                warning: '#f59e0b', // amber-500
                danger: '#ef4444', // red-500
                info: '#3b82f6', // blue-500
                purple: '#a855f7', // purple-500
                pink: '#ec4899', // pink-500
                indigo: '#6366f1', // indigo-500
            };

            // 1. User Growth Chart
            console.log('AdminDashboard: Rendering user growth chart...');
            this.renderUserGrowthChart(colors, createGradient);

            // 2. Media Growth Chart
            console.log('AdminDashboard: Rendering media growth chart...');
            this.renderMediaGrowthChart(colors, createGradient);

            // 3. Branch Growth Chart
            console.log('AdminDashboard: Rendering branch growth chart...');
            this.renderBranchGrowthChart(colors, createGradient);

            // 4. Segment Growth Chart
            console.log('AdminDashboard: Rendering segment growth chart...');
            this.renderSegmentGrowthChart(colors, createGradient);

            // 5. Comment Growth Chart
            console.log('AdminDashboard: Rendering comment growth chart...');
            this.renderCommentGrowthChart(colors, createGradient);

            // 6. Branches by Type Chart
            console.log('AdminDashboard: Rendering branches by type chart...');
            this.renderBranchesByTypeChart(colors);

            // 7. Comments by Target Type Chart
            console.log('AdminDashboard: Rendering comments by target type chart...');
            this.renderCommentsByTargetTypeChart(colors);

            // 8. Votes Distribution Chart
            console.log('AdminDashboard: Rendering votes chart...');
            this.renderVotesChart(colors);

            // 9. Storage Usage Chart
            console.log('AdminDashboard: Rendering storage chart...');
            this.renderStorageChart(colors);

            // 10. Combined Content Overview Chart
            console.log('AdminDashboard: Rendering content overview chart...');
            this.renderContentOverviewChart(colors);
        }

        renderUserGrowthChart(colors, createGradient) {
            console.log('AdminDashboard: renderUserGrowthChart called');
            const canvas = document.getElementById('userGrowthChart');
            console.log('AdminDashboard: userGrowthChart canvas element:', canvas);
            
            if (!canvas) {
                console.warn('AdminDashboard: userGrowthChart canvas not found');
                return;
            }
            
            const ctx = canvas.getContext('2d');
            console.log('AdminDashboard: userGrowthChart context:', ctx);
            
            if (!this.stats.users || !this.stats.users.growth) {
                console.warn('AdminDashboard: No user growth data available');
                return;
            }
            
            console.log('AdminDashboard: User growth data:', this.stats.users.growth);

            const labels = this.stats.users.growth.map(item => item.month);
            const data = this.stats.users.growth.map(item => item.count);
            
            console.log('AdminDashboard: User growth labels:', labels);
            console.log('AdminDashboard: User growth data:', data);

            try {
                const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'New Users',
                        data: data,
                        borderColor: colors.primary,
                        backgroundColor: createGradient(ctx, 'rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.05)'),
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: colors.primary,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(63, 63, 70, 0.3)',
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(63, 63, 70, 0.3)',
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: colors.primary,
                            borderWidth: 1,
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    }
                }
                });
                console.log('AdminDashboard: User growth chart created successfully:', chart);
            } catch (error) {
                console.error('AdminDashboard: Error creating user growth chart:', error);
                console.error('AdminDashboard: User growth chart error stack:', error.stack);
            }
        }

        renderMediaGrowthChart(colors, createGradient) {
            const ctx = document.getElementById('mediaGrowthChart')?.getContext('2d');
            if (!ctx || !this.stats.media.growth) return;

            const labels = this.stats.media.growth.map(item => item.month);
            const data = this.stats.media.growth.map(item => item.count);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'New Media',
                        data: data,
                        backgroundColor: createGradient(ctx, colors.secondary, 'rgba(6, 182, 212, 0.3)'),
                        borderColor: colors.secondary,
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(63, 63, 70, 0.3)',
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: colors.secondary,
                            borderWidth: 1,
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutBounce'
                    }
                }
            });
        }

        renderBranchGrowthChart(colors, createGradient) {
            const ctx = document.getElementById('branchGrowthChart')?.getContext('2d');
            if (!ctx || !this.stats.branches.growth) return;

            const labels = this.stats.branches.growth.map(item => item.month);
            const data = this.stats.branches.growth.map(item => item.count);

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'New Branches',
                        data: data,
                        borderColor: colors.success,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: colors.success,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(63, 63, 70, 0.3)',
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(63, 63, 70, 0.3)',
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: colors.success,
                            borderWidth: 1,
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }

        renderSegmentGrowthChart(colors, createGradient) {
            const ctx = document.getElementById('segmentGrowthChart')?.getContext('2d');
            if (!ctx || !this.stats.segments.growth) return;

            const labels = this.stats.segments.growth.map(item => item.month);
            const data = this.stats.segments.growth.map(item => item.count);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'New Segments',
                        data: data,
                        backgroundColor: createGradient(ctx, colors.warning, 'rgba(245, 158, 11, 0.3)'),
                        borderColor: colors.warning,
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(63, 63, 70, 0.3)',
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: colors.warning,
                            borderWidth: 1,
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutBounce'
                    }
                }
            });
        }

        renderCommentGrowthChart(colors, createGradient) {
            const ctx = document.getElementById('commentGrowthChart')?.getContext('2d');
            if (!ctx || !this.stats.comments.growth) return;

            const labels = this.stats.comments.growth.map(item => item.month);
            const data = this.stats.comments.growth.map(item => item.count);

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'New Comments',
                        data: data,
                        borderColor: colors.info,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: colors.info,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(63, 63, 70, 0.3)',
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(63, 63, 70, 0.3)',
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: colors.info,
                            borderWidth: 1,
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }

        renderBranchesByTypeChart(colors) {
            const ctx = document.getElementById('branchesByTypeChart')?.getContext('2d');
            if (!ctx || !this.stats.branches.by_type) return;

            const labels = this.stats.branches.by_type.map(item => item.branch_type);
            const data = this.stats.branches.by_type.map(item => item.count);
            const backgroundColors = [colors.primary, colors.secondary, colors.accent, colors.success, colors.warning, colors.danger, colors.info, colors.purple, colors.pink, colors.indigo];

            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColors.slice(0, labels.length),
                        borderColor: '#ffffff',
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#e4e4e7',
                                usePointStyle: true,
                                padding: 20,
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: colors.primary,
                            borderWidth: 1,
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }

        renderCommentsByTargetTypeChart(colors) {
            const ctx = document.getElementById('commentsByTargetTypeChart')?.getContext('2d');
            if (!ctx || !this.stats.comments.by_target_type) return;

            const labels = this.stats.comments.by_target_type.map(item => item.target_type);
            const data = this.stats.comments.by_target_type.map(item => item.count);
            const backgroundColors = [colors.info, colors.secondary, colors.accent, colors.success, colors.warning, colors.danger, colors.primary, colors.purple, colors.pink, colors.indigo];

            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColors.slice(0, labels.length),
                        borderColor: '#ffffff',
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#e4e4e7',
                                usePointStyle: true,
                                padding: 20,
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: colors.info,
                            borderWidth: 1,
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }

        renderVotesChart(colors) {
            // Add a new votes chart to the HTML first
            const votesSection = document.querySelector('.bg-card p:contains("Downvotes")');
            if (votesSection) {
                const chartContainer = document.createElement('div');
                chartContainer.innerHTML = '<h3 class="text-lg font-semibold mb-2 mt-4">Vote Distribution</h3><canvas id="votesChart"></canvas>';
                votesSection.parentElement.appendChild(chartContainer);
            }

            const ctx = document.getElementById('votesChart')?.getContext('2d');
            if (!ctx) return;

            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Upvotes', 'Downvotes'],
                    datasets: [{
                        data: [this.stats.votes.upvotes, this.stats.votes.downvotes],
                        backgroundColor: [colors.success, colors.danger],
                        borderColor: '#ffffff',
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#e4e4e7',
                                usePointStyle: true,
                                padding: 20,
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: colors.success,
                            borderWidth: 1,
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }

        renderStorageChart(colors) {
            // Add a new storage chart to the HTML first
            const storageSection = document.querySelector('h3:contains("Storage Breakdown")');
            if (storageSection) {
                const chartContainer = document.createElement('div');
                chartContainer.innerHTML = '<h3 class="text-lg font-semibold mb-2 mt-4">Storage Usage</h3><canvas id="storageChart"></canvas>';
                storageSection.parentElement.appendChild(chartContainer);
            }

            const ctx = document.getElementById('storageChart')?.getContext('2d');
            if (!ctx) return;

            const breakdown = this.stats.storage.breakdown;
            const labels = Object.keys(breakdown);
            const data = Object.values(breakdown);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
                    datasets: [{
                        label: 'Storage Used (bytes)',
                        data: data,
                        backgroundColor: [colors.primary, colors.secondary, colors.accent, colors.success],
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(63, 63, 70, 0.3)',
                            },
                            ticks: {
                                color: '#a1a1aa',
                                callback: function(value) {
                                    return this.formatBytes(value);
                                }.bind(this)
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: colors.primary,
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return this.formatBytes(context.parsed.y);
                                }.bind(this)
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutBounce'
                    }
                }
            });
        }

        renderContentOverviewChart(colors) {
            // Add a new overview chart at the top
            const overviewSection = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6.mb-8');
            if (overviewSection) {
                const chartContainer = document.createElement('div');
                chartContainer.className = 'bg-card p-6 rounded-lg shadow-md border border-border col-span-full';
                chartContainer.innerHTML = '<h2 class="text-xl font-semibold mb-4">Content Overview</h2><canvas id="contentOverviewChart"></canvas>';
                overviewSection.appendChild(chartContainer);
            }

            const ctx = document.getElementById('contentOverviewChart')?.getContext('2d');
            if (!ctx) return;

            new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['Users', 'Media', 'Branches', 'Segments', 'Comments', 'Tags'],
                    datasets: [{
                        label: 'Content Count',
                        data: [
                            this.stats.users.total,
                            this.stats.media.total,
                            this.stats.branches.total,
                            this.stats.segments.total,
                            this.stats.comments.total,
                            this.stats.tags.total
                        ],
                        borderColor: colors.primary,
                        backgroundColor: 'rgba(139, 92, 246, 0.2)',
                        pointBackgroundColor: colors.primary,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(63, 63, 70, 0.3)',
                            },
                            pointLabels: {
                                color: '#e4e4e7',
                            },
                            ticks: {
                                color: '#a1a1aa',
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: colors.primary,
                            borderWidth: 1,
                        }
                    },
                    animation: {
                        duration: 2500,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }

        cleanup() {
            console.log('AdminDashboard: Cleaning up...');
            // Destroy Chart.js instances to prevent memory leaks
            Chart.helpers.each(Chart.instances, function(instance){
                instance.destroy();
            });
            // Reset visibility for next load
            if (this.loadingIndicator) this.loadingIndicator.classList.remove('hidden');
            if (this.dashboardContent) this.dashboardContent.classList.add('hidden');
        }
    }

    // Expose AdminDashboard class globally for router to access
    window.AdminDashboard = AdminDashboard;

    // Instantiate AdminDashboard and register with Router
    // This will run when the script is loaded by the Router's _runScriptsFromLoadedContent
    if (window.Router) {
        window.Router.pageManagers.admin = {
            cleanup: () => {
                if (window.adminDashboardInstance && typeof window.adminDashboardInstance.cleanup === 'function') {
                    window.adminDashboardInstance.cleanup();
                }
                window.adminDashboardInstance = null; // Dereference
                // Reset visibility for next load
                const loadingIndicator = document.getElementById('loading-indicator');
                const dashboardContent = document.getElementById('dashboard-content');
                if (loadingIndicator) loadingIndicator.classList.remove('hidden');
                if (dashboardContent) dashboardContent.classList.add('hidden');
            }
        };
        // The router will call init() on the instance when the page is loaded via navigation
        // We instantiate here, and the router will manage its lifecycle.
        window.adminDashboardInstance = new AdminDashboard();
    } else {
        // Fallback for direct page load (not via router)
        document.addEventListener('DOMContentLoaded', () => {
            window.adminDashboardInstance = new AdminDashboard();
        });
    }
})();