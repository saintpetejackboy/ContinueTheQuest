// pages/admin/js/admin.js
(async function() {
  const container = document.getElementById('admin-content');
  if (!container) return;

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users.php');
      const data = await res.json();
      if (!res.ok) {
        container.innerHTML = `<div class="text-red-500">Error: ${data.error || 'Failed to load users'}</div>`;
        return;
      }
      const users = data.users || [];
      if (users.length === 0) {
        container.innerHTML = '<p>No users found.</p>';
        return;
      }
      let html = '<table class="min-w-full bg-card border border-border"><thead><tr>' +
        '<th class="px-4 py-2 text-left">Username</th>' +
        '<th class="px-4 py-2 text-left">Email</th>' +
        '<th class="px-4 py-2 text-left">Admin</th>' +
        '<th class="px-4 py-2 text-left">Banned</th>' +
        '<th class="px-4 py-2 text-left">Passkeys</th>' +
        '<th class="px-4 py-2 text-left">Segments</th>' +
        '<th class="px-4 py-2 text-left">Comments</th>' +
        '<th class="px-4 py-2 text-left">Actions</th>' +
        '</tr></thead><tbody>';
      users.forEach(u => {
        html += `<tr class="border-t border-border">
          <td class="px-4 py-2">${u.username}</td>
          <td class="px-4 py-2">${u.email || ''}</td>
          <td class="px-4 py-2">${u.is_admin ? 'Yes' : 'No'}</td>
          <td class="px-4 py-2">${u.is_banned ? 'Yes' : 'No'}</td>
          <td class="px-4 py-2">${u.passkey_count}</td>
          <td class="px-4 py-2">${u.segments_count}</td>
          <td class="px-4 py-2">${u.comments_count}</td>
          <td class="px-4 py-2 space-x-2">` +
          `<button data-user-id="${u.id}" data-action="toggleAdmin" class="px-2 py-1 bg-blue-600 text-white rounded">${u.is_admin ? 'Revoke Admin' : 'Make Admin'}</button>` +
          `<button data-user-id="${u.id}" data-action="toggleBan" class="px-2 py-1 ${u.is_banned ? 'bg-green-600' : 'bg-red-600'} text-white rounded">${u.is_banned ? 'Unban' : 'Ban'}</button>` +
          `</td></tr>`;
      });
      html += '</tbody></table>';
      container.innerHTML = html;
      container.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = btn.getAttribute('data-user-id');
          const action = btn.getAttribute('data-action');
          let payload = { user_id: userId };
          if (action === 'toggleAdmin') {
            payload.is_admin = btn.textContent.trim() === 'Make Admin' ? 1 : 0;
          } else if (action === 'toggleBan') {
            payload.is_banned = btn.textContent.trim() === 'Ban' ? 1 : 0;
          }
          try {
            btn.disabled = true;
            const res2 = await fetch('/api/admin/users.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data2 = await res2.json();
            if (!res2.ok) {
              alert('Error: ' + (data2.error || 'Failed to update user'));
            }
            await loadUsers();
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

  await loadUsers();
})();