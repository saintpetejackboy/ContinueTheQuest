<?php
require __DIR__ . '/bootstrap.php';

$currentUser = getCurrentUser();


?>

<?php include('pages/frag/header.php'); ?>

<?php include('pages/frag/menu.php'); ?>

    
<!-- Main Content -->
<main id="content" class="container mx-auto px-4 py-8">
    <!-- Content loaded here dynamically -->
</main>
    

    
<!-- Core Scripts -->
<script src="/assets/js/core.js" defer></script>
<script src="/assets/js/router.js" defer></script>
<?php include('pages/frag/footer.php'); ?>
</body>
</html>