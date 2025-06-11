<?php
// /api/votes/get.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$targetType = $_GET['target_type'] ?? '';
$targetId = isset($_GET['target_id']) ? (int)$_GET['target_id'] : 0;

$allowedTypes = ['media', 'branch', 'segment', 'comment', 'image'];
if (!in_array($targetType, $allowedTypes, true) || $targetId < 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$db = getDB();
try {
    $stmt = $db->prepare('SELECT COALESCE(SUM(vote_value), 0) AS score FROM votes WHERE target_type = ? AND target_id = ?');
    $stmt->execute([$targetType, $targetId]);
    $score = (int)$stmt->fetch(PDO::FETCH_ASSOC)['score'];

    $userVote = 0;
    $user = getCurrentUser();
    if ($user) {
        $stmt = $db->prepare('SELECT vote_value FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?');
        $stmt->execute([$user['id'], $targetType, $targetId]);
        $userVote = (int)$stmt->fetchColumn();
    }

    echo json_encode(['score' => $score, 'user_vote' => $userVote]);
} catch (Exception $e) {
    error_log('Vote get error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}