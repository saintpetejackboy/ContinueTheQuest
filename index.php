<?php
require __DIR__ . '/bootstrap.php';

$currentUser = getCurrentUser();
include('pages/frag/header.php'); 
include('pages/frag/mobile.php'); 
?>



    
<!-- Main Content -->
<main id="content" class="container mx-auto px-4 py-8">
    <!-- Content loaded here dynamically -->
</main>
    

    
<!-- Core Scripts -->
<script src="/assets/js/core.js" defer></script>
<script src="/assets/js/router.js" defer></script>
<?php include('includes/coin.php'); ?>
</body>
</html>