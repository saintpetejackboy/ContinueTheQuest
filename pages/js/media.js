class MediaPage {
    constructor() {
        this.mediaId = parseInt(new URLSearchParams(window.location.search).get('id'), 10);
        this.container = document.getElementById('media-container');
        if (!this.mediaId || !this.container) {
            if (this.container) {
                this.container.innerHTML = '<p class="text-destructive">Invalid media ID.</p>';
            }
            return;
        }
        this.init();
    }

    async init() {
        await this.fetchMedia();
        if (!this.media) return;
        this.renderView();
        this.bindEvents();
    }

    async fetchMedia() {
        try {
            const resp = await fetch(`/api/media/get.php?id=${this.mediaId}`);
            if (!resp.ok) throw new Error('Failed to load media');
            const data = await resp.json();
            this.media = data.media;
        } catch (err) {
            console.error(err);
            this.container.innerHTML = '<p class="text-destructive">Error loading media.</p>';
        }
    }

    renderView() {
        const m = this.media;
        let html = `<div class="space-y-4">`;
        html += `<h1 class="text-3xl font-bold">${escapeHTML(m.title)}</h1>`;
        html += `<div class="flex items-center space-x-2">`;
        if (m.author_avatar) {
            html += `<img src="${m.author_avatar}" class="w-8 h-8 rounded-full">`;
        }
        html += `<span class="font-medium">${escapeHTML(m.author)}</span>`;
        html += `<span class="text-sm text-muted-foreground">${new Date(m.created_at).toLocaleString()}</span>`;
        html += `</div>`;
        if (m.tags && m.tags.length) {
            html += `<div class="flex flex-wrap gap-2">`;
            m.tags.forEach(tag => {
                html += `<a href="?page=genre&id=${tag.id}" class="px-2 py-1 text-xs bg-muted rounded">${escapeHTML(tag.name)}</a>`;
            });
            html += `</div>`;
        }
        html += `<div class="flex items-center space-x-2 mt-2">`;
        html += `<button data-vote="1" class="vote-btn btn">▲</button>`;
        html += `<span id="media-vote-score" class="font-medium">${m.vote_score}</span>`;
        html += `<button data-vote="-1" class="vote-btn btn">▼</button>`;
        html += `</div>`;
        if (m.cover_image) {
            html += `<div class="mt-4"><img src="/uploads/users/${m.created_by}/images/${m.cover_image}" class="w-full rounded"></div>`;
        }
        html += `<p class="mt-4">${escapeHTML(m.description || '')}</p>`;
        if (m.images && m.images.length) {
            html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">`;
            m.images.forEach(img => {
                const src = `/uploads/users/${m.created_by}/images/${img.file_name}`;
                html += `<div class="relative">`;
                html += `<img src="${src}" class="w-full rounded">`;
                html += `<div class="absolute top-1 right-1 flex flex-col items-center space-y-1">`;
                html += `<button data-img-id="${img.id}" data-vote="1" class="img-vote-btn text-green-600">▲</button>`;
                html += `<span class="text-sm text-white">${img.vote_score}</span>`;
                html += `<button data-img-id="${img.id}" data-vote="-1" class="img-vote-btn text-red-600">▼</button>`;
                html += `</div></div>`;
            });
            html += `</div>`;
        }
        html += `<div class="mt-6 flex space-x-2">`;
        if (m.can_edit) {
            html += `<button id="edit-media-btn" class="btn-secondary">Edit</button>`;
        }
        html += `<button id="add-branch-btn" class="btn-primary">Add Branch</button>`;
        html += `</div>`;
        html += `<div id="comments-section" class="mt-8">`;
        html += `<h2 class="text-xl font-semibold mb-4">Comments</h2>`;
        html += `<div id="comment-form" class="mb-4">`;
        html += `<textarea id="comment-body" rows="3" class="form-textarea w-full" placeholder="Write a comment..."></textarea>`;
        html += `<button id="submit-comment-btn" class="btn-primary mt-2">Post Comment</button>`;
        html += `</div>`;
        html += `<div id="comments-list"></div>`;
        html += `</div>`;
        html += `<div id="branch-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden">`;
        html += `<div class="bg-card rounded p-4 w-full max-w-md">`;
        html += `<h3 class="text-lg font-semibold mb-2">Add Branch (Coming Soon)</h3>`;
        html += `<button id="close-branch-modal" class="btn-secondary">Close</button>`;
        html += `</div></div>`;
        html += `</div>`;
        this.container.innerHTML = html;
    }

    bindEvents() {
        this.container.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleVote('media', this.mediaId, parseInt(btn.dataset.vote, 10)));
        });
        this.container.querySelectorAll('.img-vote-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleVote('image', parseInt(btn.dataset.imgId, 10), parseInt(btn.dataset.vote, 10));
            });
        });
        const cbtn = this.container.querySelector('#submit-comment-btn');
        if (cbtn) cbtn.addEventListener('click', () => this.postComment());
        const branchBtn = this.container.querySelector('#add-branch-btn');
        if (branchBtn) branchBtn.addEventListener('click', () => {
            this.container.querySelector('#branch-modal').classList.remove('hidden');
        });
        const closeBranch = this.container.querySelector('#close-branch-modal');
        if (closeBranch) closeBranch.addEventListener('click', () => {
            this.container.querySelector('#branch-modal').classList.add('hidden');
        });
        this.loadComments();
    }

    async handleVote(type, id, value) {
        try {
            const res = await fetch('/api/votes/create.php', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({target_type:type, target_id:id, vote_value:value})
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            if (data.success) {
                if (type === 'media') {
                    this.container.querySelector('#media-vote-score').textContent = data.score;
                } else {
                    this.init();
                }
            }
        } catch (err) {
            console.error('Vote failed', err);
        }
    }

    async loadComments() {
        try {
            const res = await fetch(`/api/comments/get.php?target_type=media&target_id=${this.mediaId}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            const list = this.container.querySelector('#comments-list');
            if (!data.comments || !data.comments.length) {
                list.innerHTML = '<p class="text-muted-foreground">No comments yet.</p>';
            } else {
                list.innerHTML = data.comments.map(c => `
                    <div class="border-b border-border py-2">
                      <div class="flex items-center space-x-2 mb-1">
                        <span class="font-medium">${c.is_anonymous ? 'Anonymous' : escapeHTML(c.username || '')}</span>
                        <span class="text-sm text-muted-foreground">${new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p>${escapeHTML(c.body)}</p>
                      <div class="flex items-center space-x-1 text-sm mt-1">
                        <button data-comment-id="${c.id}" data-vote="1" class="comment-vote-btn text-green-600">▲</button>
                        <span>${c.vote_score}</span>
                        <button data-comment-id="${c.id}" data-vote="-1" class="comment-vote-btn text-red-600">▼</button>
                      </div>
                    </div>
                `).join('');
                this.container.querySelectorAll('.comment-vote-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.handleVote('comment', parseInt(btn.dataset.commentId,10), parseInt(btn.dataset.vote,10));
                    });
                });
            }
        } catch (err) {
            console.error('Load comments failed', err);
        }
    }

    async postComment() {
        const textarea = this.container.querySelector('#comment-body');
        const body = textarea.value.trim();
        if (!body) return;
        try {
            const res = await fetch('/api/comments/create.php', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({target_type:'media', target_id:this.mediaId, body})
            });
            if (!res.ok) throw new Error();
            textarea.value = '';
            this.loadComments();
        } catch (err) {
            console.error('Post comment failed', err);
        }
    }

    cleanup() {
        // Cleanup if needed
    }
}

// Utility to escape HTML
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, tag => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[tag]));
}