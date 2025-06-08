# Project Structure

## Directory Layout

```
continuethequest/
├── api/                    # API endpoints
│   └── index.php          # Main API router
├── assets/                # Static assets
│   ├── js/               # JavaScript files
│   │   ├── core.js       # Core functionality
│   │   └── router.js     # Page routing
│   └── css/              # Additional CSS (if needed)
├── db/                    # Database files
│   └── schema/           # SQL schema files
│       └── schema.sql    # Complete schema
├── includes/              # PHP includes
│   └── utils.php         # Utility functions
├── logs/                  # Application logs (git ignored)
├── pages/                 # Page content
│   ├── home.html         # Home page content
│   ├── home.js           # Home page JS (optional)
│   ├── about.html        # About page
│   └── browse.html       # Browse page
├── test-data/             # Test/dummy data (git ignored)
│   └── genres.json       # Sample genres
├── uploads/               # User uploads (git ignored)
│   └── users/            # User-specific directories
├── .env                   # Environment config (git ignored)
├── .env.example           # Example env file
├── .gitignore            # Git ignore rules
├── .htaccess             # Apache config
├── .repomixignore        # Repomix ignore rules
├── 404.html              # 404 error page
├── 500.html              # 500 error page
├── bootstrap.php         # Environment loader
├── deploy.php            # Deployment script
├── index.php             # Main entry point
├── input.css             # Tailwind input
├── output.css            # Compiled CSS (git ignored)
├── package.json          # NPM config
├── README.md             # Project readme
└── tailwind.config.js    # Tailwind config
```

## Key Components

### Frontend Architecture
- **Single Entry Point**: `index.php` serves as the main layout/skeleton
- **Dynamic Loading**: Pages are loaded via JavaScript without full page refreshes
- **Modular Pages**: Each page can have its own HTML, JS, and CSS files
- **URL Routing**: Uses query parameters (`?page=name`) for navigation

### Backend Architecture
- **Procedural PHP**: Fast, simple procedural style
- **API Endpoints**: RESTful API in `/api/` for AJAX calls
- **Database**: MariaDB with comprehensive schema
- **File Storage**: User uploads stored in filesystem by user ID

### JavaScript Module System
- **core.js**: Core functionality (menu, theme, utilities)
- **router.js**: Handles page navigation and content loading
- **Page-specific JS**: Optional JS files for individual pages

### CSS Architecture
- **Tailwind CSS**: Utility-first CSS framework
- **Dark Theme Default**: Built with dark mode as primary
- **Custom Components**: Defined in `input.css` layers
- **Page-specific CSS**: Optional CSS files for unique page styles

## Development Workflow

1. **Add a New Page**:
   - Create `pages/[name].html`
   - Optionally add `pages/[name].js` and `pages/[name].css`
   - Link to it with `?page=[name]`

2. **Add API Endpoint**:
   - Add case in `api/index.php`
   - Create handler function
   - Use from frontend with `fetch('/api/?endpoint=[name]')`

3. **Build CSS**:
   - Edit `input.css` or component classes
   - Run `npm run build-css` or `npm run watch-css`

4. **Deploy Changes**:
   - Run `php deploy.php` to verify setup
   - Checks database, directories, and configuration
