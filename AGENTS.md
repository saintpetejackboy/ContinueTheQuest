# Agents Guide for ContinueThe.Quest

This document is intended for AI-driven agents or developers stepping into the ContinueThe.Quest codebase. It provides pointers to key documentation and an overview of the project structure, conventions, and next steps.

## 📖 Core Documentation

- **Overview**: `docs/OVERVIEW.md` — High-level goals, end-to-end flow (Media → Branches → Segments), credits, authentication, storage model.
- **Architecture & Structure**: `docs/ARCHITECTURE.md` — Directory layout and component summary (frontend, backend, API, DB, storage).
- **Important Functions**: `docs/FUNCTIONS.md` — Quick reference to main PHP includes (auth, webauthn, utils), API modules, page managers, and bootstrap.
- **Current TODOs**: `docs/TODO.md` — Outstanding tasks, bug fixes, and roadmap checkpoints.
- **Project Goals**: `GOALS.md` — Core objectives, performance, community, moderation, AI integration.
- **Project Overview**: `project.md` — Original project rationale, tech stack, and feature list.
- **Database Schema**: `db.md` & `pages/STRUCTURE.md` — Detailed DB table definitions and structural notes.
- **Quick Start / Setup**: `README.md` — Local setup, CSS build, deployment steps.

## 🗂 Key Directories

```
/
├── api/              # REST endpoints (auth, media, branches, comments, tags, votes, users)
├── pages/            # SPA views (HTML, JS managers in pages/js, page fragments in pages/frag)
├── includes/         # PHP utilities (auth, utils, WebAuthn, credit icon)
├── db/               # SQL schema files
├── docs/             # Human-readable documentation (overview, architecture, functions, TODO)
├── uploads/          # User-generated assets (avatars, images, story segments)
├── scripts/          # Maintenance and backup scripts
├── vendor/           # Composer packages
├── .env              # Environment configuration
├── index.php         # Main entrypoint (SPA bootstrap)
└── bootstrap.php     # Application initialization (autoload, config, DB)
```

## 🚀 Development Workflow

1. **Read the Docs**: Start with `docs/OVERVIEW.md` and `docs/ARCHITECTURE.md` to understand high‑level flow and components.
2. **Local Setup**:
   ```bash
   cp .env.example .env       # configure your DB and secrets
   npm install && npm run build-css
   php deploy.php             # create/update database
   ```
3. **Coding Guidelines**:
   - Follow existing PHP procedural style in includes and API.
   - Use Tailwind CSS conventions; rebuild with `npm run build-css` after HTML/JS changes.
   - Add or update documentation under `docs/` as features evolve.
4. **Testing & Cleanup**:
   - Ensure new features are wired to the SPA router (`pages/js/router.js`).
   - Clean up event listeners (`cleanup()` hooks) to avoid leaks.
   - Update `docs/TODO.md` when tasks are completed or new items arise.

## 🎯 Next Features & AI Integration

- **Branch & Story Enhancements** — Branch listing, creation, merging, and segment uploads.
- **AI‑Generated Content** — Prompt construction in `BranchPage.openGenerateModal()`, OpenAI API hooks, credit deduction, and storage of AI segments.
- **Quota & Credits** — Enforce per‑user storage quotas, admin credit controls, credit history UI.

AI agents should consult `docs/TODO.md` to pick the next high‑impact task and follow the patterns established in MediaPage/BranchPage for page managers, API calls, and CSRF/JSON conventions in `includes/utils.php`.

---
*Happy coding!*