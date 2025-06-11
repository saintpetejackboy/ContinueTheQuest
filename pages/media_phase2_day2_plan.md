# Media View Phase 2 – Day 2 Plan

## Objectives for Today

1. **Cover‑image removal**
   - Add `api/media/clear-cover.php` to clear the `cover_image` field in the `media` table for owner/admin.
   - Update `removeCover()` in `js/media.js` to call `clear-cover.php` as needed.

2. **Suppress initial tag‑update call**
   - Prevent `TaggingSystem` initial `onTagsChanged` callback from firing on page load to avoid redundant API calls and toast messages.

3. **Emoji enhancements**
   - Add a ➕ emoji to the “Add” tag button.
   - Add a 🌿 emoji to the “Add Branch” button.
   - Add a 💬 emoji to the “Post Comment” button.

4. **Tag cost accuracy**
   - Ensure existing tags are free and do not consume credits; verify cost UI in media tagging matches Add‑Media behavior.

Proceed to implement these items without affecting the nested comments plan.