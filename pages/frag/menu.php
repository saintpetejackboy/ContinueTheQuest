
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