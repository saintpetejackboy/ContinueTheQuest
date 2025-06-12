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
            maxDepth: 5,
            userLoggedIn: false,
            isAdmin: false,
            threadContinueDepth: 3,
            autoExpandAll: false, // New option to control auto-expansion
        }, options);
        
        this.container = document.querySelector(this.options.containerSelector);
        this.sort = this.options.defaultSort;
        this.comments = [];
        this.commentTree = {};
        this.replyCountsCache = {};
        this.loadedReplies = new Set();
        
        if (!this.container) {
            console.error('CommentThread: Container not found:', this.options.containerSelector);
            return;
        }
        
        this.init();
    }

    init() {
        this.renderThreadBase();
        this.bindSort();
        this.loadComments(this.sort);
    }

    renderThreadBase() {
        let html = `<div class="mb-6">
            <h2 class="text-xl font-semibold mb-4">Comments</h2>`;
        
        if (this.options.userLoggedIn) {
            html += `<div id="comment-reply-form" class="mb-4"></div>`;
        }
        
        html += `
            <div class="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg">
                <span class="text-sm text-muted-foreground">Sort comments by:</span>
                <select id="comment-sort" class="px-3 py-2 bg-background border border-border rounded-md text-sm font-medium min-w-[140px] focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="new">🆕 Newest</option>
                    <option value="old">📅 Oldest</option>
                    <option value="top">🔥 Top Rated</option>
                </select>
            </div>`;
        
        html += `</div>`;
        html += `<div id="comment-list"></div>`;
        
        this.container.innerHTML = html;
        
        if (this.options.userLoggedIn) {
            this.renderRootReplyForm();
        }
    }

    bindSort() {
        const sel = this.container.querySelector('#comment-sort');
        if (sel) {
            sel.value = this.sort;
            sel.addEventListener('change', () => {
                this.sort = sel.value;
                this.loadedReplies.clear();
                this.loadComments(this.sort);
            });
        }
    }

async loadComments(sort) {
    try {
        const listEl = this.container.querySelector('#comment-list');
        if (!listEl) return;

        // 1️⃣ Show a loading bubble
        listEl.innerHTML = `
            <div class="mb-4 p-3 bg-muted/30 rounded-lg text-sm flex items-center space-x-2">
                <span>💬</span>
                <span>Loading comments…</span>
            </div>
        `;

        // 2️⃣ Fetch comments + total
        const res = await fetch(
            `/api/comments/get.php?target_type=${this.options.targetType}` +
            `&target_id=${this.options.targetId}&sort=${encodeURIComponent(sort)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // 3️⃣ Replace loading with total-count bubble
        const total = data.total || 0;
        const msg = total > 0
            ? `Showing ${total} comment${total === 1 ? '' : 's'}`
            : 'Be the first to comment!';
        listEl.innerHTML = `
            <div class="mb-4 p-3 bg-muted/30 rounded-lg text-sm">
                💬 ${msg}
            </div>
        `;

        // 4️⃣ Proceed to render
        this.comments = data.comments || [];
        await this.preloadReplyCounts();

        const rootComments = this.getRootComments();
        this.renderComments(rootComments, listEl, 0);

        if (this.options.autoExpandAll) {
            await this.autoLoadAllReplies();
        }

    } catch (err) {
        console.error('Failed loading comments:', err);
        const listEl = this.container.querySelector('#comment-list');
        if (listEl) {
            listEl.innerHTML = '<p class="text-destructive">Failed to load comments.</p>';
        }
    }
}


    getRootComments() {
        return this.comments.filter(comment => comment.target_type !== 'comment');
    }

    async preloadReplyCounts() {
        const allCommentIds = this.comments.map(c => c.id);
        
        try {
            const promises = allCommentIds.map(async (commentId) => {
                const res = await fetch(
                    `/api/comments/count.php?target_type=comment&target_id=${commentId}`
                );
                if (res.ok) {
                    const data = await res.json();
                    this.replyCountsCache[commentId] = data.count || 0;
                } else {
                    this.replyCountsCache[commentId] = 0;
                }
            });
            
            await Promise.all(promises);
        } catch (err) {
            console.error('Failed to preload reply counts:', err);
            allCommentIds.forEach(id => this.replyCountsCache[id] = 0);
        }
    }

    async autoLoadAllReplies() {
        const rootComments = this.getRootComments();
        for (const rootComment of rootComments) {
            await this.loadAllRepliesRecursively(rootComment.id, 0);
        }
    }


    updateExpandButtonState(commentId, isExpanded) {
        const expandBtn = this.container.querySelector(`button[data-comment-id="${commentId}"].expand-replies-btn`);
        if (expandBtn) {
            const expandIcon = expandBtn.querySelector('.expand-icon');
            const expandText = expandBtn.querySelector('.expand-text');
            const replyCount = this.replyCountsCache[commentId] || 0;
            
            if (expandIcon) {
                expandIcon.textContent = isExpanded ? '▲' : '▼';
            }
            if (expandText) {
                const action = isExpanded ? 'Hide' : 'Show';
                expandText.textContent = `💬 ${action} ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
            }
        }
    }

    renderComments(comments, container, depth) {
        if (!container || !comments) return;
        
        comments.forEach(c => {
            this.renderSingleComment(c, container, depth);
        });
    }

    calculateIndentation(depth) {
        const baseIndent = 20;
        const maxVisualDepth = this.options.threadContinueDepth;
        
        if (depth <= maxVisualDepth) {
            return depth * baseIndent;
        } else {
            const extraDepth = depth - maxVisualDepth;
            const reducedIndent = 10;
            return (maxVisualDepth * baseIndent) + (extraDepth * reducedIndent);
        }
    }

    shouldShowThreadContinuation(depth) {
        return depth > this.options.threadContinueDepth;
    }

    renderSingleComment(comment, container, depth) {
        const wrap = document.createElement('div');
        const visualIndent = this.calculateIndentation(depth);
        const showContinuation = this.shouldShowThreadContinuation(depth);
        
        wrap.className = `border-b border-border py-3 ${comment.hidden ? 'opacity-50' : ''} relative`;
        wrap.style.marginLeft = `${visualIndent}px`;
        wrap.dataset.commentId = comment.id;
        wrap.dataset.depth = depth;
        
        let adminButtons = '';
        if (this.options.isAdmin) {
            adminButtons = `
                <button data-comment-id="${comment.id}" data-action="${comment.hidden ? 'unhide' : 'hide'}" 
                        class="hide-comment-btn btn btn-ghost btn-xs text-yellow-500 ml-2">
                    ${comment.hidden ? 'Unhide' : 'Hide'}
                </button>
                <button data-comment-id="${comment.id}" class="delete-comment-btn btn btn-ghost btn-xs text-red-500 ml-2">
                    Delete
                </button>
            `;
        }

        // FIXED: Build reply and expand buttons separately
        const replyCount = this.replyCountsCache[comment.id] || 0;
        let actionButtons = '';
        
        // Always show reply button if user is logged in and not at max depth
        if (this.options.userLoggedIn && depth < this.options.maxDepth) {
            actionButtons += `
                <button data-comment-id="${comment.id}" class="reply-btn btn btn-ghost btn-xs text-blue-600 ml-2">
                    💬 Reply
                </button>
            `;
        }
        
        // Show expand button if there are replies and not at max depth
        if (replyCount > 0 && depth < this.options.maxDepth) {
            actionButtons += `
                <button data-comment-id="${comment.id}" class="expand-replies-btn btn btn-ghost btn-xs text-blue-600 ml-2 flex items-center space-x-1">
                    <span class="expand-text">💬 ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}</span>
                    <span class="expand-icon">▼</span>
                </button>
            `;
        }
        
        // Thread continuation indicator
        let threadIndicator = '';
        if (showContinuation) {
            threadIndicator = `
                <div class="absolute left-0 top-0 h-full w-1 bg-blue-200"></div>
                <div class="text-xs text-muted-foreground mb-1 flex items-center">
                    <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                        📎 Thread continues (level ${depth})
                    </span>
                </div>
            `;
        }
        
        wrap.innerHTML = `
            ${threadIndicator}
            <div class="flex items-center justify-between text-sm mb-2">
                <div class="flex items-center space-x-2">
                    <span class="font-medium">${comment.is_anonymous ? 'Anonymous' : escapeHTML(comment.username || '')}</span>
                    <span class="text-muted-foreground">${new Date(comment.created_at).toLocaleString()}</span>
                    ${depth > 0 ? `<span class="text-xs text-muted-foreground bg-muted px-1 rounded">L${depth}</span>` : ''}
                </div>
                <div class="flex items-center">
                    ${adminButtons}
                </div>
            </div>
            <p class="mb-2">${escapeHTML(comment.body)}</p>
            <div class="flex items-center text-sm space-x-3">
                <button data-comment-id="${comment.id}" data-vote="1" class="vote-btn btn btn-ghost btn-xs p-1 text-green-600">
                    ▲
                </button>
                <span class="vote-score">${comment.vote_score}</span>
                <button data-comment-id="${comment.id}" data-vote="-1" class="vote-btn btn btn-ghost btn-xs p-1 text-red-600">
                    ▼
                </button>
                ${actionButtons}
            </div>
            <div class="replies-container ml-4 mt-2 hidden" id="replies-${comment.id}"></div>
        `;
        
        container.appendChild(wrap);
        this.bindCommentEvents(wrap, comment.id, depth);
        
        return wrap;
    }

    bindCommentEvents(commentElement, commentId, depth) {
        // Vote buttons
        commentElement.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const vote = parseInt(btn.dataset.vote, 10);
                this.voteComment(commentId, vote, btn);
            });
        });
        
        // Reply button
        const replyBtn = commentElement.querySelector('.reply-btn');
        if (replyBtn) {
            replyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleReplyForm(commentId);
            });
        }
        
        // Expand replies button
        const expandBtn = commentElement.querySelector('.expand-replies-btn');
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleReplies(commentId, depth);
            });
        }
        
        // Admin buttons
        if (this.options.isAdmin) {
            const hideBtn = commentElement.querySelector('.hide-comment-btn');
            if (hideBtn) {
                hideBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const action = hideBtn.dataset.action;
                    this.toggleCommentVisibility(commentId, action);
                });
            }
            
            const deleteBtn = commentElement.querySelector('.delete-comment-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.deleteComment(commentId);
                });
            }
        }
    }

    async toggleReplies(commentId, depth) {
        const repliesContainer = this.container.querySelector(`#replies-${commentId}`);
        if (!repliesContainer) return;
        
        const isHidden = repliesContainer.classList.contains('hidden');
        
        if (isHidden) {
            // Show replies - load them if not already loaded
            if (!this.loadedReplies.has(commentId)) {
                await this.loadReplies(commentId, depth);
            }
            repliesContainer.classList.remove('hidden');
            this.updateExpandButtonState(commentId, true);
        } else {
            // Hide replies
            repliesContainer.classList.add('hidden');
            this.updateExpandButtonState(commentId, false);
        }
    }

// Inside CommentThread class

/**
 * Manually load replies when the user clicks “Show … replies”
 */
async loadReplies(parentId, depth) {
    // stop if we’re at max depth or already loaded
    if (depth >= this.options.maxDepth || this.loadedReplies.has(parentId)) return;

    try {
        const container = this.container.querySelector(`#replies-${parentId}`);
        if (!container) return;

        console.log(`Loading replies for comment ${parentId} at depth ${depth}`);
        const res = await fetch(
            `/api/comments/get.php?target_type=comment&target_id=${parentId}&sort=${encodeURIComponent(this.sort)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { comments: children } = await res.json();

        if (!children || !children.length) {
            this.loadedReplies.add(parentId);
            return;
        }

        // 1️⃣ Fetch and cache reply counts for each child comment
        await Promise.all(children.map(async c => {
            try {
                const cntRes = await fetch(
                    `/api/comments/count.php?target_type=comment&target_id=${c.id}`
                );
                const { count = 0 } = cntRes.ok ? await cntRes.json() : {};
                this.replyCountsCache[c.id] = count;
            } catch {
                this.replyCountsCache[c.id] = 0;
            }
        }));

        // 2️⃣ Render the children and mark this parent as loaded
        this.renderComments(children, container, depth + 1);
        this.loadedReplies.add(parentId);

        // 3️⃣ Unhide container and flip the expand arrow
        container.classList.remove('hidden');
        this.updateExpandButtonState(parentId, true);

    } catch (err) {
        console.error('Failed loading replies for', parentId, err);
    }
}


/**
 * Recursively load *all* deeper levels (used by autoExpandAll)
 */
async loadAllRepliesRecursively(commentId, depth) {
    if (depth >= this.options.maxDepth || this.loadedReplies.has(commentId)) return;

    try {
        console.log(`Auto-loading replies for comment ${commentId} at depth ${depth}`);
        const res = await fetch(
            `/api/comments/get.php?target_type=comment&target_id=${commentId}&sort=${encodeURIComponent(this.sort)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { comments: children } = await res.json();

        if (!children || !children.length) {
            this.loadedReplies.add(commentId);
            return;
        }

        // Fetch counts for each child so deeper layers know they exist
        await Promise.all(children.map(async c => {
            try {
                const cntRes = await fetch(
                    `/api/comments/count.php?target_type=comment&target_id=${c.id}`
                );
                const { count = 0 } = cntRes.ok ? await cntRes.json() : {};
                this.replyCountsCache[c.id] = count;
            } catch {
                this.replyCountsCache[c.id] = 0;
            }
        }));

        // Render, mark as loaded, unhide, flip arrow
        const container = this.container.querySelector(`#replies-${commentId}`);
        if (container) {
            this.renderComments(children, container, depth + 1);
            this.loadedReplies.add(commentId);
            container.classList.remove('hidden');
            this.updateExpandButtonState(commentId, true);

            // And recurse for each newly rendered child
            for (const c of children) {
                await this.loadAllRepliesRecursively(c.id, depth + 1);
            }
        }
    } catch (err) {
        console.error('Failed auto-loading replies for', commentId, err);
    }
}


    async toggleReplyForm(parentId) {
        const existingForm = this.container.querySelector(`#reply-form-${parentId}`);
        if (existingForm) {
            existingForm.remove();
            return;
        }
        
        const repliesContainer = this.container.querySelector(`#replies-${parentId}`);
        if (!repliesContainer) return;
        
        const formDiv = document.createElement('div');
        formDiv.id = `reply-form-${parentId}`;
        formDiv.className = 'mt-2 p-3 bg-muted rounded';
        formDiv.innerHTML = `
            <textarea id="reply-body-${parentId}" rows="2" class="form-textarea w-full mb-2" 
                      placeholder="Write a reply..."></textarea>
            <div class="flex space-x-2">
                <button id="reply-submit-${parentId}" class="btn btn-primary btn-sm">Post Reply</button>
                <button id="reply-cancel-${parentId}" class="btn btn-secondary btn-sm">Cancel</button>
            </div>
        `;
        
        repliesContainer.parentNode.insertBefore(formDiv, repliesContainer);
        
        const textarea = formDiv.querySelector(`#reply-body-${parentId}`);
        if (textarea) textarea.focus();
        
        formDiv.querySelector(`#reply-submit-${parentId}`).addEventListener('click', async () => {
            const body = textarea.value.trim();
            if (!body) return;
            
            const newComment = await this.postComment('comment', parentId, body);
            formDiv.remove();
            
            if (newComment) {
                await this.addCommentRealTime(newComment, parentId);
            }
        });
        
        formDiv.querySelector(`#reply-cancel-${parentId}`).addEventListener('click', () => {
            formDiv.remove();
        });
    }

    async addCommentRealTime(newComment, parentId) {
        const repliesContainer = this.container.querySelector(`#replies-${parentId}`);
        if (!repliesContainer) return;
        
        // Update reply count cache
        this.replyCountsCache[parentId] = (this.replyCountsCache[parentId] || 0) + 1;
        
        // Check if we need to add an expand button (first reply)
        const existingExpandBtn = this.container.querySelector(`button[data-comment-id="${parentId}"].expand-replies-btn`);
        if (!existingExpandBtn) {
            // Add expand button after the reply button
            const replyBtn = this.container.querySelector(`button[data-comment-id="${parentId}"].reply-btn`);
            if (replyBtn) {
                const newReplyCount = this.replyCountsCache[parentId];
                const expandBtn = document.createElement('button');
                expandBtn.className = 'expand-replies-btn btn btn-ghost btn-xs text-blue-600 ml-2 flex items-center space-x-1';
                expandBtn.dataset.commentId = parentId;
                expandBtn.innerHTML = `
                    <span class="expand-text">💬 Hide ${newReplyCount} ${newReplyCount === 1 ? 'reply' : 'replies'}</span>
                    <span class="expand-icon">▲</span>
                `;
                
                replyBtn.parentNode.insertBefore(expandBtn, replyBtn.nextSibling);
                
                // Bind event listener
                expandBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const parentCommentEl = this.container.querySelector(`div[data-comment-id="${parentId}"]`);
                    const depth = parentCommentEl ? parseInt(parentCommentEl.dataset.depth || '0') : 0;
                    this.toggleReplies(parentId, depth);
                });
            }
        } else {
            // Update existing expand button
            this.updateExpandButtonState(parentId, true);
        }
        
        // Show replies container if hidden
        if (repliesContainer.classList.contains('hidden')) {
            repliesContainer.classList.remove('hidden');
        }
        
        // Calculate depth for the new comment
        const parentCommentEl = this.container.querySelector(`div[data-comment-id="${parentId}"]`);
        const parentDepth = parentCommentEl ? parseInt(parentCommentEl.dataset.depth || '0') : 0;
        const newCommentDepth = parentDepth + 1;
        
        // Render and add the new comment
        this.renderSingleComment(newComment, repliesContainer, newCommentDepth);
        
        // Scroll into view and highlight
        const newCommentElement = repliesContainer.lastElementChild;
        if (newCommentElement) {
            newCommentElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
            
            newCommentElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            setTimeout(() => {
                newCommentElement.style.backgroundColor = '';
            }, 2000);
        }
    }

    renderRootReplyForm() {
        const formEl = this.container.querySelector('#comment-reply-form');
        if (!formEl) return;
        
        formEl.innerHTML = `
            <div class="border rounded-lg p-4 bg-card">
                <textarea id="root-reply-body" rows="3" class="form-textarea w-full mb-3" 
                          placeholder="Write a comment..."></textarea>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-muted-foreground">💡 Be respectful and constructive</span>
                    <button id="root-reply-submit" class="btn btn-primary">💬 Post Comment</button>
                </div>
            </div>
        `;
        
        const submitBtn = formEl.querySelector('#root-reply-submit');
        const textarea = formEl.querySelector('#root-reply-body');
        
        submitBtn.addEventListener('click', async () => {
            const body = textarea.value.trim();
            if (!body) return;
            
            await this.postComment(this.options.targetType, this.options.targetId, body);
            textarea.value = '';
            this.loadComments(this.sort);
        });
    }

    async postComment(targetType, targetId, body) {
        try {
            const res = await fetch('/api/comments/create.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    target_type: targetType, 
                    target_id: targetId, 
                    body: body 
                })
            });
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to post comment');
            }
            
            if (window.notify) {
                window.notify.success('Comment posted successfully!');
            }
            
            return data.comment || null;
            
        } catch (err) {
            console.error('Failed posting comment', err);
            if (window.notify) {
                window.notify.error('Failed to post comment.');
            }
            return null;
        }
    }

    async voteComment(commentId, value, buttonElement) {
        try {
            const res = await fetch('/api/votes/create.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    target_type: 'comment', 
                    target_id: commentId, 
                    vote_value: value 
                })
            });
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            if (data.success) {
                const scoreElement = buttonElement.parentNode.querySelector('.vote-score');
                if (scoreElement) {
                    scoreElement.textContent = data.score;
                }
            }
        } catch (err) {
            console.error('Comment vote failed', err);
            if (window.notify) {
                window.notify.error('Failed to vote on comment.');
            }
        }
    }

    async toggleCommentVisibility(commentId, action) {
        try {
            const res = await fetch('/api/comments/hide.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id: commentId, action })
            });
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            if (data.success) {
                this.loadComments(this.sort);
                if (window.notify) {
                    window.notify.success(`Comment ${action === 'hide' ? 'hidden' : 'unhidden'} successfully.`);
                }
            }
        } catch (err) {
            console.error('Toggle comment visibility failed', err);
            if (window.notify) {
                window.notify.error('Failed to update comment visibility.');
            }
        }
    }

async deleteComment(commentId) {
  if (!confirm('Delete this reply? This can’t be undone.')) return;

  try {
    const res = await fetch('/api/comments/delete.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id: commentId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Delete failed');
    }

    // 1️⃣ Find the comment element and its parent-replies container
    const wrap = this.container.querySelector(`div[data-comment-id="${commentId}"]`);
    if (wrap) {
      const parentContainer = wrap.parentNode;          // should be the <div id="replies-<parentId>">
      const parentId = parseInt(parentContainer.id.replace('replies-',''), 10);

      // 2️⃣ Remove the comment + its own replies container
      wrap.remove();
      const childReplies = this.container.querySelector(`#replies-${commentId}`);
      if (childReplies) childReplies.remove();

      // 3️⃣ Decrement the cached count & update the button
      this.replyCountsCache[parentId] = Math.max((this.replyCountsCache[parentId]||1) - 1, 0);
      const isExpanded = this.loadedReplies.has(parentId);
      this.updateExpandButtonState(parentId, isExpanded);

      // 4️⃣ If there are now zero replies, remove the expand button entirely
      if (this.replyCountsCache[parentId] === 0) {
        const btn = this.container.querySelector(
          `button.expand-replies-btn[data-comment-id="${parentId}"]`
        );
        if (btn) btn.remove();
      }
    }

    if (window.notify) window.notify.success('Reply deleted.');
  } catch (err) {
    console.error('Delete comment failed', err);
    if (window.notify) window.notify.error('Failed to delete reply.');
  }
}


    cleanup() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.replyCountsCache = {};
        this.loadedReplies.clear();
    }
}

// Utility to escape HTML
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, tag => ({ 
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' 
    }[tag]));
}

window.CommentThread = CommentThread;