<?php
require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../includes/utils.php';

$db = getDB();

$opts = getopt('', ['id:']);
$manualId = isset($opts['id']) ? (int)$opts['id'] : null;

try {
    $stmt = $db->query('SELECT * FROM backup_schedules WHERE enabled = 1');
    $allSchedules = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    echo "Error fetching schedules: " . $e->getMessage() . "\n";
    exit(1);
}

$dueSchedules = [];
foreach ($allSchedules as $sched) {
    if ($manualId !== null) {
        if ($sched['id'] === $manualId) {
            $dueSchedules[] = $sched;
        }
        continue;
    }
    $last = $sched['last_run_at'];
    $freq = $sched['frequency'];
    $due = false;
    if (!$last) {
        $due = true;
    } else {
        $lastTs = strtotime($last);
        $now = time();
        switch ($freq) {
            case 'hourly':  $interval = 3600; break;
            case 'daily':   $interval = 86400; break;
            case 'weekly':  $interval = 604800; break;
            case 'monthly': $interval = 2592000; break;
            default:        $interval = 86400;
        }
        if ($now - $lastTs >= $interval) {
            $due = true;
        }
    }
    if ($due) {
        $dueSchedules[] = $sched;
    }
}

if (count($dueSchedules) === 0) {
    echo "No backup schedules due\n";
    exit(0);
}

$projectDir = realpath(__DIR__ . '/..');
$backupDir  = $projectDir . '/backups';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

foreach ($dueSchedules as $sched) {
    $sid = $sched['id'];
    $type = $sched['backup_type'];
    $startedAt = date('Y-m-d H:i:s');
    $ins = $db->prepare('INSERT INTO backup_logs (schedule_id, started_at, finished_at, success) VALUES (?, ?, ?, 0)');
    $ins->execute([$sid, $startedAt, $startedAt]);
    $logId = $db->lastInsertId();

    $output = '';
    $errorMessage = '';
    $success = 1;

    try {
        if ($type === 'code' || $type === 'both') {
            $file = sprintf('%s/code-backup-%s.tar.gz', $backupDir, date('Ymd_His'));
            echo "Backing up code to $file\n";
            $cmd = sprintf(
                'tar czf %s --exclude=vendor --exclude=uploads --exclude=node_modules --exclude=.git -C %s .',
                escapeshellarg($file),
                escapeshellarg($projectDir)
            );
            exec($cmd . ' 2>&1', $lines, $rc);
            $output .= implode("\n", $lines) . "\n";
            if ($rc !== 0) {
                throw new RuntimeException("Code backup failed (exit code $rc)");
            }
        }
        if ($type === 'database' || $type === 'both') {
            $dbName = getenv('DB_NAME');
            $dbUser = getenv('DB_USER');
            $dbPass = getenv('DB_PASSWORD');
            $dbHost = getenv('DB_HOST') ?: '127.0.0.1';
            $dbPort = getenv('DB_PORT') ?: '3306';
            $file = sprintf('%s/db-backup-%s.sql.gz', $backupDir, date('Ymd_His'));
            echo "Backing up database to $file\n";
            $dump = sprintf(
                'mysqldump -h%s -P%s -u%s -p%s %s',
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($dbPass),
                escapeshellarg($dbName)
            );
            $cmd = sprintf('%s | gzip > %s', $dump, escapeshellarg($file));
            exec($cmd . ' 2>&1', $lines, $rc);
            $output .= implode("\n", $lines) . "\n";
            if ($rc !== 0) {
                throw new RuntimeException("Database backup failed (exit code $rc)");
            }
        }
    } catch (Throwable $e) {
        $success = 0;
        $errorMessage = $e->getMessage();
        echo "Error: $errorMessage\n";
    }

    $finishedAt = date('Y-m-d H:i:s');
    $upd = $db->prepare('UPDATE backup_logs SET finished_at = ?, success = ?, output = ?, error_message = ? WHERE id = ?');
    $upd->execute([$finishedAt, $success, $output, $errorMessage, $logId]);
    $db->prepare('UPDATE backup_schedules SET last_run_at = ? WHERE id = ?')->execute([$finishedAt, $sid]);
}