// GitHub Project History Viewer
class GitHubLogViewer {
    constructor() {
        this.commits = [];
        this.filteredCommits = [];
        this.currentPage = 1;
        this.perPage = 20;
        this.totalPages = 1;
        this.init();
    }

    init() {
        this.loadCommits();
        this.bindEvents();
    }

    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', debounce(() => {
            this.filterCommits();
        }, 300));

        // Author filter
        const authorFilter = document.getElementById('author-filter');
        authorFilter.addEventListener('change', () => {
            this.filterCommits();
        });

        // Sort order
        const sortOrder = document.getElementById('sort-order');
        sortOrder.addEventListener('change', () => {
            this.filterCommits();
        });
    }

    async loadCommits() {
        try {
            const response = await fetch('/api/admin/github/commits');
            const data = await response.json();
            
            if (data.success) {
                this.commits = data.commits || [];
                this.updateStats();
                this.populateAuthorFilter();
                this.filterCommits();
            } else {
                this.showError('Failed to load commit history');
            }
        } catch (error) {
            console.error('Error loading commits:', error);
            this.showError('Network error occurred');
        }
    }

    updateStats() {
        document.getElementById('total-commits').textContent = this.commits.length;
        
        // Calculate contributors
        const uniqueAuthors = new Set(this.commits.map(commit => commit.author));
        document.getElementById('contributors').textContent = uniqueAuthors.size;
        
        // Calculate recent activity
        if (this.commits.length > 0) {
            const latestCommit = new Date(this.commits[0].date);
            const now = new Date();
            const daysDiff = Math.floor((now - latestCommit) / (1000 * 60 * 60 * 24));
            document.getElementById('recent-days').textContent = daysDiff + 'd';
            document.getElementById('last-update').textContent = formatDate(this.commits[0].date);
        }
    }

    populateAuthorFilter() {
        const authorFilter = document.getElementById('author-filter');
        const uniqueAuthors = [...new Set(this.commits.map(commit => commit.author))].sort();
        
        // Clear existing options except "All Authors"
        authorFilter.innerHTML = '<option value="">All Authors</option>';
        
        uniqueAuthors.forEach(author => {
            const option = document.createElement('option');
            option.value = author;
            option.textContent = `${this.getAuthorEmoji(author)} ${author}`;
            authorFilter.appendChild(option);
        });
    }

    getAuthorEmoji(author) {
        // Add emojis for different authors/contributors
        const authorEmojis = {
            'saintpetejackboy': '👨‍💻',
            'Claude': '🤖',
            'default': '👤'
        };
        
        return authorEmojis[author] || authorEmojis['default'];
    }

    filterCommits() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const selectedAuthor = document.getElementById('author-filter').value;
        const sortOrder = document.getElementById('sort-order').value;
        
        let filtered = this.commits.filter(commit => {
            const matchesSearch = commit.message.toLowerCase().includes(searchTerm) ||
                                  commit.body.toLowerCase().includes(searchTerm);
            const matchesAuthor = !selectedAuthor || commit.author === selectedAuthor;
            return matchesSearch && matchesAuthor;
        });
        
        // Sort commits
        filtered.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
        
        this.filteredCommits = filtered;
        this.currentPage = 1;
        this.updatePagination();
        this.renderCommits();
    }

    updatePagination() {
        this.totalPages = Math.ceil(this.filteredCommits.length / this.perPage);
        
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');
        
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= this.totalPages;
        pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }

    renderCommits() {
        const container = document.getElementById('commits-container');
        
        if (this.filteredCommits.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }
        
        const startIndex = (this.currentPage - 1) * this.perPage;
        const endIndex = startIndex + this.perPage;
        const pageCommits = this.filteredCommits.slice(startIndex, endIndex);
        
        container.innerHTML = pageCommits.map(commit => this.renderCommit(commit)).join('');
    }

    renderCommit(commit) {
        const commitDate = new Date(commit.date);
        const relativeTime = this.getRelativeTime(commitDate);
        const authorEmoji = this.getAuthorEmoji(commit.author);
        
        // Parse commit message for emojis and structure
        const messageEmoji = this.extractMessageEmoji(commit.message);
        const cleanMessage = commit.message.replace(/^[^\w\s]*\s*/, ''); // Remove leading emojis
        
        return `
            <div class="p-6 hover:bg-accent/50 transition-colors">
                <div class="flex items-start space-x-4">
                    <!-- Commit Info -->
                    <div class="flex-shrink-0">
                        <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span class="text-lg">${messageEmoji}</span>
                        </div>
                    </div>
                    
                    <!-- Commit Details -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-lg font-medium text-foreground leading-tight">
                                ${escapeHtml(cleanMessage)}
                            </h3>
                            <div class="flex items-center space-x-2 text-sm text-muted-foreground">
                                <span class="font-mono bg-muted px-2 py-1 rounded text-xs">
                                    ${commit.abbreviated_commit}
                                </span>
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span class="flex items-center space-x-1">
                                <span>${authorEmoji}</span>
                                <span>${escapeHtml(commit.author)}</span>
                            </span>
                            <span class="flex items-center space-x-1">
                                <span>📅</span>
                                <span>${relativeTime}</span>
                                <span class="text-xs">
                                    (${commitDate.toLocaleDateString()} ${commitDate.toLocaleTimeString()})
                                </span>
                            </span>
                        </div>
                        
                        ${commit.body ? `
                            <div class="mt-3 text-sm text-muted-foreground">
                                <details class="cursor-pointer">
                                    <summary class="hover:text-foreground">📝 Show details</summary>
                                    <div class="mt-2 pl-4 border-l-2 border-border">
                                        <pre class="whitespace-pre-wrap text-xs">${escapeHtml(commit.body)}</pre>
                                    </div>
                                </details>
                            </div>
                        ` : ''}
                        
                        <div class="mt-3 flex items-center space-x-4">
                            <button onclick="github.copyCommitHash('${commit.commit}')" 
                                    class="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                                <span>📋</span>
                                <span>Copy hash</span>
                            </button>
                            <a href="https://github.com/saintpetejackboy/ContinueTheQuest/commit/${commit.commit}" 
                               target="_blank" rel="noopener noreferrer"
                               class="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                                <span>🔗</span>
                                <span>View on GitHub</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    extractMessageEmoji(message) {
        // Extract first emoji from commit message, or use default
        const emojiMatch = message.match(/^([^\w\s]+)/);
        if (emojiMatch) {
            return emojiMatch[1].trim();
        }
        
        // Default emojis based on keywords
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) return '🐛';
        if (lowerMessage.includes('feat') || lowerMessage.includes('add')) return '✨';
        if (lowerMessage.includes('update') || lowerMessage.includes('improve')) return '⚡';
        if (lowerMessage.includes('docs') || lowerMessage.includes('readme')) return '📚';
        if (lowerMessage.includes('test')) return '🧪';
        if (lowerMessage.includes('refactor') || lowerMessage.includes('clean')) return '♻️';
        if (lowerMessage.includes('security')) return '🔒';
        if (lowerMessage.includes('performance')) return '🚀';
        
        return '📝'; // Default commit emoji
    }

    getRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        const weeks = Math.floor(diff / 604800000);
        const months = Math.floor(diff / 2592000000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        if (weeks < 4) return `${weeks}w ago`;
        if (months < 12) return `${months}mo ago`;
        
        return `${Math.floor(months / 12)}y ago`;
    }

    getEmptyState() {
        return `
            <div class="p-8 text-center text-muted-foreground">
                <div class="text-3xl mb-2">🔍</div>
                <p>No commits found matching your criteria</p>
                <p class="text-sm">Try adjusting your search or filters</p>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('commits-container');
        container.innerHTML = `
            <div class="p-8 text-center text-red-500">
                <div class="text-3xl mb-2">❌</div>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }

    // Pagination methods
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagination();
            this.renderCommits();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagination();
            this.renderCommits();
        }
    }

    // Utility methods
    async copyCommitHash(hash) {
        const success = await copyToClipboard(hash);
        if (success) {
            showToast('Commit hash copied to clipboard!', 'success');
        } else {
            showToast('Failed to copy commit hash', 'error');
        }
    }

    async refreshLog() {
        showToast('Refreshing git log...', 'info');
        
        try {
            // Trigger log update on server
            const response = await fetch('/api/admin/github/refresh', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                // Reload commits
                await this.loadCommits();
                showToast('Git log refreshed successfully!', 'success');
            } else {
                showToast('Failed to refresh git log', 'error');
            }
        } catch (error) {
            console.error('Error refreshing log:', error);
            showToast('Network error occurred', 'error');
        }
    }
}

// Initialize GitHub log viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.github = new GitHubLogViewer();
});