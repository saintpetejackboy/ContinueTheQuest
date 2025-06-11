# Media View Phase 2 – Tagging & Nested Comments Plan

## 1. Enhanced Tagging (cost & UI)

- **Replace** the simple “Add Tag” input/button in the Media View with the modular `TaggingSystem` (same as add-media):
  - Use suggestion dropdown, arrow keys, and tag‐pill UI.
  - Display cost (free vs. 1 credit) per tag and an overall credit estimate.
  - Hooks into `api/media/update.php` to apply tag changes (new tags cost 1 credit each).

## 2. Cover & Image Removal/Hide/Delete Controls

- **Cover image**:
  - Add a “Remove Cover” action (via `api/media/update.php` or new endpoint) for creators/admins.
- **Other images**:
  - Improve hide/unhide/delete controls:
    - “Hide/Unhide” eye icon for admins (API: `api/media/hide-image.php`).
    - “× Remove” button for creator (API: `api/media/update.php`).

## 3. Nested, Modular Comment System

- **Replies to comments**:
  - Add a “Reply” button under each comment for logged‑in users.
  - Lazy‑load child comments via `api/comments/get.php?target_type=comment&target_id=<parent>`.
  - Provide an inline reply form, then refresh that subtree on submit.

- **Collapsible threads**:
  - Limit visible depth (e.g., 3 levels) with a “Show more replies” toggle.
  - Allow collapsing long threads to avoid layout break.

- **Sorting controls**:
  - Add a dropdown above the comment list (options: Newest, Oldest, Top).
  - Pass `&sort=` param to `api/comments/get.php` and adjust SQL `ORDER BY`.

## 4. Admin Comment Moderation

- **Hide/Delete comments**:
  - Inline “Hide/Unhide” for admins (API: `api/comments/hide.php`).
  - Optionally “Delete” (permanent) via new API if needed.

## 5. Modular Design & Reuse

- Package all comment UI logic (load, render, reply, sort) into a separate JS class (e.g., `CommentThread`) in a new file (`js/comment-thread.js`).
- Ensure the same component can be mounted in Media, Branch, and Story views.

---

Proceeding next with the implementation of #1 (Enhanced Tagging) and #2 (Cover/Image controls).