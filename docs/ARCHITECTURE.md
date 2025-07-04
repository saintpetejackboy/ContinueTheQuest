 # Project Architecture & Structure

 This document outlines the high-level directory structure and architectural components of ContinueThe.Quest.

 ## Directory Layout

 ```
 /
 ├── api/             # RESTful API endpoints (admin, auth, media, comments, tags, votes, users)
 ├── assets/          # Frontend assets (JavaScript, CSS)
 ├── includes/        # PHP include files and utilities (authentication, WebAuthn, credit icon, common functions)
 ├── db/              # SQL schema files for database setup
 ├── favicons/        # Static site icons and manifest
 ├── img/             # Site and banner images
 ├── pages/           # Frontend views (HTML, modular fragments, JS)
 ├── scripts/         # Maintenance and backup scripts
 ├── uploads/         # User-uploaded files (avatars, images, text segments)
 ├── vendor/          # Composer dependencies
 ├── logs/            # Application logs (gitignored)
 ├── .env / .env.example  # Environment configuration
 ├── index.php        # Main SPA entry point
 ├── bootstrap.php    # Application initialization (autoload, config, DB)
 ├── project.md       # Project overview and documentation
 ├── GOALS.md         # Project goals and core features
 ├── README.md        # Setup instructions and quick start
 └── ...
 ```

 ## Key Architecture Components

 - **Frontend**: Vanilla JavaScript with a SPA-like router (`router.js`), modular HTML fragments (`pages/frag/`), and Tailwind CSS for styling.
 - **Backend**: Procedural PHP entrypoints for both the main site and the REST API. The API follows a modular structure under `api/`.
 - **Database**: MariaDB with normalized tables for users, media, branches, segments, tags, comments, votes, and credit logs. SQL schemas are stored in `db/schema/`.
 - **Storage**: Large textual content (story segments) and user uploads are stored on disk under `uploads/{user_id}`. User-specific quotas enforce storage limits.
 - **Authentication**: WebAuthn passkey-first login with fallback passphrase. Credential management and challenge handling are implemented in `includes/webauthn.php`.
 - **Credits System**: Tracked via the `credits_log` table; users earn and spend credits for actions such as AI generation or creating new tags.

 For detailed SQL schema and table definitions, refer to [pages/STRUCTURE.md](../pages/STRUCTURE.md) and [db.md](../db.md).