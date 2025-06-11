<!DOCTYPE html>
<html lang="en" class="">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ContinueThe.Quest - Collaborative Storytelling</title>
    <link href="output.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        #content { min-height: calc(100vh - 4rem); }
        .menu-transition { transition: transform 0.3s ease-in-out; }
    </style>
    <link rel="manifest" href="/site.webmanifest">
    <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png">
    <meta name="theme-color" content="#3a3a3a">
</head>

<body class="bg-background text-foreground antialiased">

<header class="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
    <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-4">
            <button id="menu-toggle" class="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </button>
            <a href="?page=home" class="text-xl font-semibold text-primary hover:text-primary/80 transition-colors">
                ContinueThe<span class="text-muted-foreground">.</span>Quest
            </a>
        </div>
        
        <nav class="hidden lg:flex items-center gap-6">
            <a href="?page=home" class="nav-link text-muted-foreground hover:text-foreground transition-colors">Home</a>
            <div class="relative group">
                <button class="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    Genres
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>
                <div class="absolute top-full left-0 mt-2 w-48 bg-card rounded-lg shadow-xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div id="genre-menu" class="py-2">
                        </div>
                </div>
            </div>
            <a href="?page=browse" class="nav-link text-muted-foreground hover:text-foreground transition-colors">Browse</a>
            <?php if ($currentUser): ?>
                <a href="?page=add-media" class="nav-link text-muted-foreground hover:text-foreground transition-colors">Add Media</a>
            <?php endif; ?>
            <a href="?page=about" class="nav-link text-muted-foreground hover:text-foreground transition-colors">About</a>
            <?php if ($currentUser && $currentUser['is_admin']): ?>
                <a href="?page=admin" class="nav-link text-muted-foreground hover:text-foreground transition-colors">Admin</a>
            <?php endif; ?>
        </nav>
        
        <div class="flex items-center gap-4">
            <?php if ($currentUser): ?>
                <a href="?page=profile" class="text-sm font-medium hover:text-primary transition-colors">
                    <?php echo htmlspecialchars($currentUser['username']); ?>
                </a>
                <a href="/api/auth/logout.php" class="text-sm text-muted-foreground hover:text-foreground transition-colors">Logout</a>
            <?php else: ?>
                <a href="?page=login" class="nav-link text-muted-foreground hover:text-foreground transition-colors">Login</a>
                <a href="?page=register" class="btn-primary-sm">Register</a>
            <?php endif; ?>
        </div>
    </div>
</header>