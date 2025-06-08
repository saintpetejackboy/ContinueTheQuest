# ContinueThe.Quest

A collaborative storytelling platform where unfinished stories find their endings.

## Quick Setup

1. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

2. **Build CSS**
   ```bash
   # Install Tailwind CSS
   npm install
   
   # Build CSS (one-time)
   npm run build-css
   
   # Or watch for changes during development
   npm run watch-css
   ```

3. **Deploy & Setup Database**
   ```bash
   php deploy.php
   ```

## Project Structure

```
/
├── assets/          # Static assets
│   ├── js/         # JavaScript files
│   └── css/        # Additional CSS (if needed)
├── pages/          # Page content (loaded dynamically)
├── test-data/      # Test/dummy data
├── uploads/        # User uploads (git ignored)
├── logs/           # Application logs (git ignored)
├── db/            # Database schema
└── index.php      # Main application entry
```

## Development

- **Adding Pages**: Create `pages/[name].html` and optionally `pages/[name].js` and `pages/[name].css`
- **Routing**: Uses URL parameter `?page=[name]` for navigation
- **Styling**: Uses Tailwind CSS with dark theme by default
- **Database**: MariaDB with schema in `db/schema/schema.sql`

## Features (Coming Soon)

- User authentication (WebAuthn/Passkey-first)
- Media creation and management
- Story branching system
- AI-assisted content generation
- Community voting and engagement
- Credit system for contributions

## Tech Stack

- **Backend**: PHP (procedural style)
- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **Database**: MariaDB
- **Storage**: File-system based
