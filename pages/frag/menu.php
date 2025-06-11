
<header class="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
    <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-4">
            <button id="menu-toggle" class="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </button>
            <a href="?page=home" class="text-xl font-semibold text-primary hover:text-primary/80 transition-colors">
               <img src="https://continuethe.quest/img/bookie-main.webp" style="height: 60px;">
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
			<?php echo '<img src="https://continuethe.quest/uploads/users/'.$currentUser['id'].'/avatars/'.$currentUser['avatar'].'" style="height: 50px;">'; ?>
                <a href="?page=profile" class="text-sm font-medium hover:text-primary transition-colors">
                    <?php echo htmlspecialchars($currentUser['username']);   ?>
                </a>
                <a href="/api/auth/logout.php" class="text-sm text-muted-foreground hover:text-foreground transition-colors">Logout</a>
				
				
            <?php else: ?>
                <a href="?page=login" class="nav-link text-muted-foreground hover:text-foreground transition-colors">Login</a>
                <a href="?page=register" class="btn-primary-sm">Register</a>
            <?php endif; ?>
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
        <?php if ($currentUser): ?>
            <a href="?page=add-media" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">Add Media</a>
        <?php endif; ?>
        <a href="?page=about" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">About</a>
        <a href="?page=faq" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">FAQ</a>
        <a href="?page=contact" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">Contact</a>
        <?php if ($currentUser && $currentUser['is_admin']): ?>
            <a href="?page=admin" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">Admin</a>
        <?php endif; ?>
        
        <div class="border-t border-border mt-4 pt-4">
            <div class="text-sm font-medium text-muted-foreground mb-2 px-3">Legal</div>
            <a href="?page=terms" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">Terms of Service</a>
            <a href="?page=privacy" class="block px-3 py-2 rounded-lg hover:bg-muted transition-colors">Privacy Policy</a>
        </div>
    </nav>
</div>

<!-- Mobile Menu Overlay -->
<div id="menu-overlay" class="fixed inset-0 bg-black/50 z-30 hidden lg:hidden"></div>