# Media View – Day 2 Updates

**1) Clear‐cover endpoint**
- Created `api/media/clear-cover.php` to clear the `cover_image` field for the media record (owner/admin only).
- Updated `removeCover()` in `js/media.js` to use the new endpoint and refresh the page, with user feedback.

**2) Suppressed initial tag‐update callback**
- Wrapped `TaggingSystem`'s `onTagsChanged` callback in a first‐call guard (`firstTagInit`) so the initial `setTags()` does not trigger an unnecessary update and toast.

**3) Emojis for action buttons**
- Enhanced tags area “Add” button to “➕ Add”.
- Enhanced branch button to “🌿 Add Branch”.
- Enhanced comment button to “💬 Post Comment”.

**4) Comments flicker fix completed**
- Added static placeholder “Loading comments…” and only reveal the real list once loaded to avoid flashing UI.

Next: Implement nested comment replies, collapsible threads, and sorting (see `media_phase2_nested_comments_plan.md`).