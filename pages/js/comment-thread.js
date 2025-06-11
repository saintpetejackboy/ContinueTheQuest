// /pages/js/comment-thread.js
// A modular comment thread component supporting nesting, replies, and sorting.
class CommentThread {
    constructor(options) {
        this.options = Object.assign({
            containerSelector: '#comment-thread',
            targetType: 'media',
            targetId: 0,
            sortSelector: null,
            defaultSort: 'new',
            maxDepth: 3,
            userLoggedIn: false,
            isAdmin: false,
        }, options);
        this.container = document.querySelector(this.options.containerSelector);
        this.sort = this.options.defaultSort;
        if (!this.container) return;
        this.init();
    }

    init() {
        this.renderThreadBase();
        this.bindSort();
        this.loadComments(this.sort);
    }

    renderThreadBase() {
        let html = `<div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold">Comments</h2>`;
        if (this.options.userLoggedIn) {
            html += `
            <div>
              <label for="comment-sort" class="text-sm">Sort by:</label>
              <select id="comment-sort" class="ml-2 form-select">
                <option value="new">Newest</option>
                <option value="old">Oldest</option>
                <option value="top">Top</option>
              </select>
            </div>`;
        }
        html += `</div><div id="comment-reply-form"></div><div id="comment-list"></div>`;
        this.container.innerHTML = html;
        if (this.options.userLoggedIn) this.renderRootReplyForm();
    }

    bindSort() {
        const sel = this.container.querySelector('#comment-sort');
        if (sel) {
            sel.value = this.sort;
            sel.addEventListener('change', () => {
                this.sort = sel.value;
                this.loadComments(this.sort);
            });
        }
    }

    async loadComments(sort) {
        try {
            const listEl = this.container.querySelector('#comment-list');
            listEl.innerHTML = '<p class="text-muted-foreground">Loading comments...</p>';
            const res = await fetch(
                `/api/comments/get.php?target_type=${this.options.targetType}` +
                `&target_id=${this.options.targetId}&sort=${encodeURIComponent(sort)}`
            );
            if (!res.ok) throw new Error();
            const data = await res.json();
            this.renderComments(data.comments || [], listEl, 0);
        } catch (err) {
            console.error('Failed loading comments:', err);
        }
    }

    renderComments(comments, container, depth) {
        if (!container) return;
        container.innerHTML = ''; 
        comments.forEach(c => {
            const wrap = document.createElement('div');
            wrap.className = `border-b border-border py-2 ${c.hidden ? 'opacity-50' : ''}`;
            wrap.innerHTML = `
                <div class="flex items-center text-sm mb-1">
                    <span class="font-medium">${c.is_anonymous ? 'Anonymous' : escapeHTML(c.username || '')}</span>
                    <span class="text-muted-foreground ml-2">${new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p>${escapeHTML(c.body)}</p>
                <div class="flex items-center text-sm space-x-2 mt-1">
                    <button data-comment-id="${c.id}" data-vote="1" class="btn btn-ghost btn-xs p-1">▲</button>
                    <span>${c.vote_score}</span>
                    <button data-comment-id="${c.id}" data-vote="-1" class="btn btn-ghost btn-xs p-1">▼</button>
                    ${this.options.userLoggedIn ? `<button data-comment-id="${c.id}" class="reply-btn btn btn-ghost btn-xs p-1">Reply</button>` : ''}
                </div>
                <div class="ml-4 mt-2" id="replies-${c.id}"></div>
                `;
            container.appendChild(wrap);
            // Bind vote & reply
            wrap.querySelectorAll('[data-vote]').forEach(btn => {
                btn.addEventListener('click', () => this.voteComment(c.id, parseInt(btn.dataset.vote,10)));
            });
            const replyBtn = wrap.querySelector('.reply-btn');
            if (replyBtn) replyBtn.addEventListener('click', () => this.renderReplyForm(c.id));
            // Lazy-load replies if depth < maxDepth
            if (depth < this.options.maxDepth) {
                this.loadReplies(c.id, depth+1);
            }
        });
    }

    async loadReplies(parentId, depth) {
        try {
            const container = this.container.querySelector(`#replies-${parentId}`);
            if (!container) return;
            const res = await fetch(
                `/api/comments/get.php?target_type=comment&target_id=${parentId}&sort=${encodeURIComponent(this.sort)}`
            );
            if (!res.ok) throw new Error();
            const data = await res.json();
            if (data.comments && data.comments.length) {
                this.renderComments(data.comments, container, depth);
            }
        } catch (err) {
            console.error('Failed loading replies for', parentId, err);
        }
    }

    renderRootReplyForm() {
        const formEl = this.container.querySelector('#comment-reply-form');
        formEl.innerHTML = `
            <textarea id="root-reply-body" rows="2" class="form-textarea w-full" placeholder="Write a comment..."></textarea>
            <button id="root-reply-submit" class="btn btn-primary btn-sm mt-2">💬 Comment</button>
        `;
        formEl.querySelector('#root-reply-submit').addEventListener('click', async () => {
            const body = formEl.querySelector('#root-reply-body').value.trim();
            if (!body) return;
            await this.postComment('media', this.options.targetId, body);
            formEl.querySelector('#root-reply-body').value = '';
            this.loadComments(this.sort);
        });
    }

    renderReplyForm(parentId) {
        const el = this.container.querySelector(`#replies-${parentId}`);
        const formId = `reply-form-${parentId}`;
        if (document.getElementById(formId)) return; // already open
        const div = document.createElement('div');
        div.id = formId;
        div.innerHTML = `
            <textarea id="reply-body-${parentId}" rows="2" class="form-textarea w-full" placeholder="Write a reply..."></textarea>
            <button id="reply-submit-${parentId}" class="btn btn-primary btn-xs mt-1">💬 Reply</button>
        `;
        el.prepend(div);
        div.querySelector(`#reply-submit-${parentId}`).addEventListener('click', async () => {
            const body = div.querySelector(`#reply-body-${parentId}`).value.trim();
            if (!body) return;
            await this.postComment('comment', parentId, body);
            this.loadReplies(parentId, 1);
            div.remove();
        });
    }

    async postComment(type, id, body) {
        try {
            await fetch('/api/comments/create.php', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ target_type: type, target_id: id, body })
            });
        } catch (err) {
            console.error('Failed posting comment', err);
        }
    }

    async voteComment(parent, value) {
        try {
            await fetch('/api/votes/create.php', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ target_type: 'comment', target_id: parent, vote_value: value })
            });
            this.loadComments(this.sort);
        } catch (err) {
            console.error('Comment vote failed', err);
        }
    }

    cleanup() {
        // Future: remove dynamic listeners if needed
    }
}

// Utility to escape HTML
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, tag => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[tag]));
}

window.CommentThread = CommentThread;