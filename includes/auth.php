<?php
// auth.php
require_once __DIR__ . '/utils.php';

function getCurrentUser() {
    if (isset($_SESSION['user_id'])) {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, username, email, is_admin, avatar, credits, quota FROM Users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    return null;
}

function loginUser($userId) {
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
}

function logoutUser() {
    session_unset();
    session_destroy();
}

function registerUser($username, $email) {
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO Users (username, email) VALUES (?, ?)");
    $stmt->execute([$username, $email]);
    return $db->lastInsertId();
}
