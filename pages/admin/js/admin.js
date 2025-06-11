// pages/admin/js/admin.js
(async function() {
  const container = document.getElementById('admin-content');
  if (!container) return;

  // File viewer modal elements and helper functions
  const fileModal = document.getElementById('file-viewer-modal');
  const fileModalContent = document.getElementById('file-viewer-content');
  const fileModalTitle = document.getElementById('file-viewer-title');
  const fileModalBody = document.getElementById('file-viewer-body');
  const fileModalClose = document.getElementById('file-viewer-close');

  function openFileModal() {
    if (!fileModal || !fileModalContent) return;
    fileModal.classList.remove('hidden');
    fileModal.classList.add('flex');
    setTimeout(() => {
      fileModalContent.classList.remove('scale-95', 'opacity-0');
      fileModalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
  }

  function closeFileModal() {
    if (!fileModal || !fileModalContent) return;
    fileModalContent.classList.add('scale-95', 'opacity-0');
    fileModalContent.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
      fileModal.classList.add('hidden');
      fileModal.classList.remove('flex');
    }, 200);
  }

  if (fileModal) {
    fileModal.addEventListener('click', e => {
      if (e.target === fileModal) closeFileModal();
    });
  }
  if (fileModalClose) {
    fileModalClose.addEventListener('click', closeFileModal);
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  async function showFile(type, name) {
    try {
      const res = await fetch(`/api/admin/file.php?type=${type}&name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) {
        fileModalBody.textContent = 'Error: ' + (data.error || 'Failed to load file');
      } else {
        if (type === 'markdown' && window.marked) {
          fileModalBody.innerHTML = `<div class="flex flex-col gap-4">${marked.parse ? marked.parse(data.content) : marked(data.content)}</div>`;
        } else {
          fileModalBody.innerHTML = `<pre class="whitespace-pre-wrap">${escapeHTML(data.content)}</pre>`;
        }
      }
      fileModalTitle.textContent = name;
      openFileModal();
      if (type === 'log') {
        fileModalContent.scrollTop = fileModalContent.scrollHeight;
      } else {
        fileModalContent.scrollTop = 0;
      }
    } catch (err) {
      fileModalBody.textContent = 'Error: ' + err.message;
      fileModalTitle.textContent = name;
      openFileModal();
    }
  }

  const params = new URLSearchParams(window.location.search);
  const section = params.get('section') || 'users';

  // Toggle section nav links
  document.querySelectorAll('nav a[data-section]').forEach(link => {
    if (link.getAttribute('data-section') === section) {
      link.classList.remove('text-muted-foreground', 'hover:text-primary');
      link.classList.add('text-primary', 'border-b-2', 'border-primary');
    } else {
      link.classList.remove('text-primary', 'border-b-2', 'border-primary');
      link.classList.add('text-muted-foreground', 'hover:text-primary');
    }
  });

  // Load appropriate section
  if (section === 'stats') {
    await loadStats();
  } else if (section === 'backups') {
    await loadBackups();
  } else {
    await loadUsers();
  }

  async function loadUsers(page = 1, query = '') {
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="animate-spin inline-block h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p class="mt-2 text-muted-foreground">Loading users...</p>
      </div>`;
    try {
      const searchBar = `
        <div class="flex justify-between items-center mb-4">
          <input id="user-search" type="text" placeholder="Search users..." value="${query}" class="flex-1 px-3 py-2 border border-border rounded focus:outline-none focus:ring focus:ring-primary/50" />
        </div>`;
      const res = await fetch(`/api/admin/users.php?page=${page}&limit=10&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        container.innerHTML = `<div class="text-red-500">Error: ${data.error || 'Failed to load users'}</div>`;
        return;
      }
      const users = data.users || [];
      if (users.length === 0) {
        container.innerHTML = searchBar + '<p>No users found.</p>';
        return;
      }
      let html = searchBar + '<div class="space-y-4">';
      users.forEach(u => {
        const avatar = u.avatar_url
          ? `<img src="${u.avatar_url}" alt="${u.username}" class="w-12 h-12 rounded-full object-cover bg-muted" />`
          : '<div class="w-12 h-12 bg-muted rounded-full"></div>';
        html += `
        <div class="flex items-center space-x-4 p-4 bg-card border border-border rounded-lg">
          ${avatar}
          <div class="flex-1 min-w-0">
            <p class="font-medium text-primary">${u.username}</p>
            <p class="text-sm text-muted-foreground truncate">${u.email || ''}</p>
            <div class="mt-2 bg-muted h-2 rounded-full overflow-hidden">
              <div class="h-2 bg-primary" style="width:${u.percent}%;"></div>
            </div>
            <div class="flex justify-between text-xs text-muted-foreground mt-1">
              <span>${u.space_used_formatted} / ${u.quota_formatted}</span>
              <span>${u.percent}%</span>
            </div>
          </div>
          <div class="flex space-x-2">
            <button data-user-id="${u.id}" data-action="toggleAdmin" class="px-2 py-1 bg-blue-600 text-white rounded">${u.is_admin ? 'Revoke Admin' : 'Make Admin'}</button>
            <button data-user-id="${u.id}" data-action="toggleBan" class="px-2 py-1 ${u.is_banned ? 'bg-green-600' : 'bg-red-600'} text-white rounded">${u.is_banned ? 'Unban' : 'Ban'}</button>
          </div>
        </div>`;
      });
      html += '</div>';

      // Pagination controls
      const total = data.total || 0;
      const limit = data.limit || 10;
      const pages = Math.ceil(total / limit);
      if (pages > 1) {
        html += '<div class="mt-4 flex justify-center space-x-2">';
        for (let i = 1; i <= pages; i++) {
          html += `<button data-page="${i}" class="px-3 py-1 rounded ${i === page ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-primary hover:text-white'}">${i}</button>`;
        }
        html += '</div>';
      }
      container.innerHTML = html;

      // Search handler
      document.getElementById('user-search').addEventListener('keyup', e => {
        if (e.key === 'Enter') loadUsers(1, e.target.value.trim());
      });

      // Pagination handler
      container.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => loadUsers(Number(btn.getAttribute('data-page')), document.getElementById('user-search').value.trim()));
      });

      // Action buttons handler
      container.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = btn.getAttribute('data-user-id');
          const action = btn.getAttribute('data-action');
          const payload = { user_id: userId };
          if (action === 'toggleAdmin') payload.is_admin = btn.textContent.trim().startsWith('Make') ? 1 : 0;
          if (action === 'toggleBan') payload.is_banned = btn.textContent.trim() === 'Ban' ? 1 : 0;
          btn.disabled = true;
          try {
            const res2 = await fetch('/api/admin/users.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data2 = await res2.json();
            if (!res2.ok) alert('Error: ' + (data2.error || 'Failed to update user'));
            await loadUsers(page, query);
          } catch (err) {
            console.error(err);
            alert('Error updating user');
          } finally {
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="text-red-500">Error: ${err.message}</div>`;
    }
  }

  async function loadStats() {
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="animate-spin inline-block h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p class="mt-2 text-muted-foreground">Loading stats...</p>
      </div>`;
    try {
      const res = await fetch('/api/admin/stats.php');
      const data = await res.json();
      if (!res.ok) {
        container.innerHTML = `<div class="text-red-500">Error: ${data.error || 'Failed to load stats'}</div>`;
        return;
      }

      const { uptime, total_files, total_users, total_media, logs, markdown } = data;
      let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
      html += `<div class="card"><div class="text-lg font-semibold mb-2">Uptime</div><div>${uptime}</div></div>`;
      html += `<div class="card"><div class="text-lg font-semibold mb-2">Total Files</div><div>${total_files}</div></div>`;
      html += `<div class="card"><div class="text-lg font-semibold mb-2">Total Users</div><div>${total_users}</div></div>`;
      html += `<div class="card"><div class="text-lg font-semibold mb-2">Total Media</div><div>${total_media}</div></div>`;
      html += '</div>';
      html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';
      html += '<div><h2 class="text-xl font-semibold mb-2">Logs</h2><ul class="list-disc list-inside">';
      logs.forEach(fn => {
        html += `<li><button type="button" data-type="log" data-name="${fn}" class="text-primary hover:underline focus:outline-none">${fn}</button></li>`;
      });
      html += '</ul></div>';
      html += '<div><h2 class="text-xl font-semibold mb-2">Markdown Files</h2><ul class="list-disc list-inside">';
      markdown.forEach(fn => {
        html += `<li><button type="button" data-type="markdown" data-name="${fn}" class="text-primary hover:underline focus:outline-none">${fn}</button></li>`;
      });
      html += '</ul></div>';
      html += '</div>';
      container.innerHTML = html;
      container.querySelectorAll('button[data-type]').forEach(btn => {
        btn.addEventListener('click', () => {
          showFile(btn.getAttribute('data-type'), btn.getAttribute('data-name'));
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="text-red-500">Error: ${err.message}</div>`;
    }
  }

  async function loadBackups() {
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="animate-spin inline-block h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p class="mt-2 text-muted-foreground">Loading backups...</p>
      </div>`;
    try {
      const res = await fetch('/api/admin/backups.php');
      const data = await res.json();
      if (!res.ok) {
        container.innerHTML = `<div class="text-red-500">Error: ${data.error || 'Failed to load backups'}</div>`;
        return;
      }
      const { schedules, logs, files } = data;
      let html = '<h2 class="text-xl font-semibold mb-2">Backup Schedules</h2>';
      html += '<table class="w-full table-auto mb-6"><thead><tr><th>ID</th><th>Type</th><th>Frequency</th><th>Last Run</th><th>Enabled</th><th>Actions</th></tr></thead><tbody>';
      schedules.forEach(s => {
        html += `<tr class="border-t border-border"><td>${s.id}</td><td>${s.backup_type}</td><td>${s.frequency}</td><td>${s.last_run_at || 'never'}</td><td>${s.enabled ? 'Yes' : 'No'}</td><td><button data-action="run-backup" data-id="${s.id}" class="px-2 py-1 bg-primary text-white rounded">Run Now</button></td></tr>`;
      });
      html += '</tbody></table>';
      html += '<h2 class="text-xl font-semibold mb-2">Backup Logs</h2>';
      html += '<table class="w-full table-auto mb-6"><thead><tr><th>Schedule ID</th><th>Type</th><th>Started At</th><th>Finished At</th><th>Success</th></tr></thead><tbody>';
      logs.forEach(l => {
        html += `<tr class="border-t border-border"><td>${l.schedule_id}</td><td>${l.backup_type}</td><td>${l.started_at}</td><td>${l.finished_at}</td><td>${l.success ? '✔' : '✖'}</td></tr>`;
      });
      html += '</tbody></table>';
      html += '<h2 class="text-xl font-semibold mb-2">Backup Files</h2>';
      html += '<ul class="list-disc list-inside">';
      files.forEach(f => {
        html += `<li><a href="/backups/${encodeURIComponent(f.name)}" class="text-primary hover:underline" target="_blank">${f.name}</a> (${f.size_formatted}, ${f.modified_at})</li>`;
      });
      html += '</ul>';
      container.innerHTML = html;
      container.querySelectorAll('button[data-action="run-backup"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          btn.disabled = true;
          try {
            const res2 = await fetch('/api/admin/backups.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ schedule_id: id }),
            });
            const result = await res2.json();
            if (!res2.ok) {
              alert('Error: ' + (result.error || 'Backup failed'));
            } else {
              await loadBackups();
            }
          } catch (err) {
            alert('Error: ' + err.message);
          } finally {
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="text-red-500">Error: ${err.message}</div>`;
    }
  }

})();