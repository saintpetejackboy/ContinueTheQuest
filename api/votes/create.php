<?php
// /api/votes/create.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$targetType = $data['target_type'] ?? '';
$targetId = isset($data['target_id']) ? (int)$data['target_id'] : 0;
$voteValue = isset($data['vote_value']) ? (int)$data['vote_value'] : 0;

$allowedTypes = ['media', 'branch', 'segment', 'comment', 'image'];
if (!in_array($targetType, $allowedTypes, true) || $targetId < 1 || !in_array($voteValue, [-1, 0, 1], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$db = getDB();
try {
    $db->beginTransaction();

    if ($voteValue === 0) {
        $stmt = $db->prepare('DELETE FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?');
        $stmt->execute([$user['id'], $targetType, $targetId]);
    } else {
        $stmt = $db->prepare(
            'INSERT INTO votes (user_id, target_type, target_id, vote_value)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE vote_value = VALUES(vote_value), created_at = CURRENT_TIMESTAMP()'
        );
        $stmt->execute([$user['id'], $targetType, $targetId, $voteValue]);
    }

    $stmt = $db->prepare('SELECT COALESCE(SUM(vote_value), 0) AS score FROM votes WHERE target_type = ? AND target_id = ?');
    $stmt->execute([$targetType, $targetId]);
    $score = (int)$stmt->fetch(PDO::FETCH_ASSOC)['score'];

    $tables = [
        'media'   => 'media',
        'branch'  => 'branches',
        'segment' => 'segments',
        'comment' => 'comments',
        'image'   => 'media_images'
    ];
    if (isset($tables[$targetType])) {
        $table = $tables[$targetType];
        $stmt = $db->prepare("UPDATE `$table` SET vote_score = ? WHERE id = ?");
        $stmt->execute([$score, $targetId]);
    }

    $db->commit();
    echo json_encode(['success' => true, 'score' => $score]);
} catch (Exception $e) {
    $db->rollBack();
    error_log('Vote error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}