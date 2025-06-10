<?php
require_once __DIR__ . '/../../bootstrap.php';

header('Content-Type: application/json');

$user = getCurrentUser();

if ($user) {
    echo json_encode([
        'loggedIn' => true,
        'id' => $user['id'],
        'username' => $user['username']
    ]);
} else {
    echo json_encode(['loggedIn' => false]);
}
