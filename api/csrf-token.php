<?php
require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../includes/utils.php';
require_once __DIR__ . '/../includes/csrf.php';

// This endpoint provides CSRF tokens to authenticated users
getCSRFTokenForAPI();
?>