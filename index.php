<?php
require __DIR__ . '/bootstrap.php';
?>
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

<!-- Header -->
<header class="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
    <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <!-- Logo/Brand -->
        <div class="flex items-center gap-4">
            <button id="menu-toggle" class="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </button>
            <a href="/" class="text-xl font-semibold text-primary hover:text-primary/80 transition-colors">
                ContinueThe<span class="text-muted-foreground">.</span>Quest
            </a>
        </div>
        
        <!-- Desktop Nav -->
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
                        <!-- Populated by JS from DB -->
                    </div>
                </div>
            </div>
            <a href="?page=browse" class="nav-link text-muted-foreground hover:text-foreground transition-colors">Browse</a>
            <a href="?page=about" class="nav-link text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="?page=faq" class="nav-link text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            <a href="?page=contact" class="nav-link text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </nav>
        
        <!-- Right Actions -->
        <div class="flex items-center gap-4">
            <button class="p-2 hover:bg-muted rounded-lg transition-colors" title="Search">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </button>
            <button id="theme-toggle" class="p-2 hover:bg-muted rounded-lg transition-colors" title="Toggle theme">
                <svg class="w-5 h-5 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
                <svg class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
            </button>
        </div>
    </div>
</header>

<!-- Mobile Menu -->
<div id="mobile-menu" class="fixed inset-y-0 left-0 w-64 bg-card z-40 transform -translate-x-full menu-transition lg:hidden border-r border-border">
    <div class="p-4 border-b border-border">
        <button id="menu-close" class="p-2 hover:bg-muted rounded-lg transition-colors float-right">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
        <div class="text-lg font-semibold text-primary">Menu</div>
    </div>
    <nav class="p-4 space-y-2">
        <a href="?page=home" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">Home</a>
        <div class="px-3 py-2">
            <div class="text-sm font-medium text-muted-foreground mb-2">Genres</div>
            <div id="mobile-genre-menu" class="space-y-1 ml-3">
                <!-- Populated by JS -->
            </div>
        </div>
        <a href="?page=browse" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">Browse</a>
        <a href="?page=about" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">About</a>
        <a href="?page=faq" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">FAQ</a>
        <a href="?page=contact" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">Contact</a>
        
        <div class="border-t border-border mt-4 pt-4">
            <div class="text-sm font-medium text-muted-foreground mb-2 px-3">Legal</div>
            <a href="?page=terms" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">Terms of Service</a>
            <a href="?page=privacy" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">Privacy Policy</a>
        </div>
    </nav>
</div>

<!-- Mobile Menu Overlay -->
<div id="menu-overlay" class="fixed inset-0 bg-black/50 z-30 hidden lg:hidden"></div>
    
<!-- Main Content -->
<main id="content" class="container mx-auto px-4 py-8">
    <!-- Content loaded here dynamically -->
</main>
    
<!-- Footer -->
<footer class="bg-card/80 border-t border-border py-8 mt-16">
    <div class="container mx-auto px-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
                <h3 class="text-lg font-semibold mb-4">About</h3>
                <ul class="space-y-2">
                    <li><a href="?page=about" class="text-muted-foreground hover:text-primary transition-colors">Our Mission</a></li>
                    <li><a href="?page=faq" class="text-muted-foreground hover:text-primary transition-colors">FAQ</a></li>
                    <li><a href="?page=contact" class="text-muted-foreground hover:text-primary transition-colors">Contact Us</a></li>
                </ul>
            </div>
            <div>
                <h3 class="text-lg font-semibold mb-4">Explore</h3>
                <ul class="space-y-2">
                    <li><a href="?page=browse" class="text-muted-foreground hover:text-primary transition-colors">Browse Stories</a></li>
                    <li><a href="?page=home" class="text-muted-foreground hover:text-primary transition-colors">Home</a></li>
                </ul>
            </div>
            <div>
                <h3 class="text-lg font-semibold mb-4">Legal</h3>
                <ul class="space-y-2">
                    <li><a href="?page=terms" class="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
                    <li><a href="?page=privacy" class="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
                </ul>
            </div>
        </div>
        <div class="border-t border-border pt-6 text-center text-muted-foreground">
            <p>&copy; 2025 ContinueThe.Quest. All rights reserved.</p>
        </div>
    </div>
</footer>
    
<!-- Core Scripts -->
<script src="assets/js/core.js"></script>
<script src="assets/js/router.js"></script>
</body>
</html>