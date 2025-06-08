<?php
// deploy.php
// ----------------------------------------------------------------------------
// Load environment and helpers
require_once __DIR__ . '/bootstrap.php';
date_default_timezone_set('America/New_York');

// Simple logger to logs/deploy.log
$logDir  = __DIR__ . '/logs';
$logFile = $logDir . '/deploy.log';
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}
function logMsg(string $msg) {
    global $logFile;
    $time = date('[Y-m-d H:i:s]');
    file_put_contents($logFile, "$time $msg\n", FILE_APPEND);
}

// Header
echo "=== Deployment Checklist ===\n";
$appName    = getenv('APP_NAME')    ?: 'Unknown';
$appEnv     = getenv('APP_ENV')     ?: 'Unknown';
$appVersion = getenv('APP_VERSION') ?: 'Unknown';
echo "App Name:    $appName\n";
echo "Environment: $appEnv\n";
echo "Version:     $appVersion\n";
echo "Checked at:  " . date('c') . "\n\n";
logMsg("Start deploy check: $appName v$appVersion ($appEnv)");

// 1) Core directories/files
$checks = [
    'db'               => 'dir',
    'db/schema'        => 'dir',
    'db/schema/schema.sql' => 'file',
    '.gitignore'       => 'file',
    '.repomixignore'   => 'file',
    'bootstrap.php'    => 'file',
    'db.md'            => 'file',
    'index.php'        => 'file',
    'input.css'        => 'file',
    'project.md'       => 'file',
    'deploy.php'       => 'file',
];
foreach ($checks as $path => $type) {
    $full = __DIR__ . "/$path";
    if ($type === 'dir') {
        if (is_dir($full)) {
            echo "[OK] Dir:  $path\n";    logMsg("Dir ok: $path");
        } else {
            echo "[MISSING] Dir:  $path\n"; logMsg("Dir missing: $path");
        }
    } else {
        if (is_file($full)) {
            echo "[OK] File: $path\n";    logMsg("File ok: $path");
        } else {
            echo "[MISSING] File: $path\n"; logMsg("File missing: $path");
        }
    }
}

// 2) .env permissions
$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    $perms = substr(sprintf('%o', fileperms($envFile)), -4);
    if ($perms <= '0640') {
        echo "[OK] .env perms: $perms\n"; logMsg(".env perms ok ($perms)");
    } else {
        echo "[WARN] .env perms: $perms (should be ≤0640)\n"; logMsg(".env perms warn ($perms)");
    }
} else {
    echo "[WARN] .env not found\n"; logMsg(".env missing");
}

// 3) Database connectivity + tables
echo "\n=== Database ===\n";
$host = getenv('DB_HOST');
$port = getenv('DB_PORT') ?: 3306;
$db   = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASSWORD');
$dsn  = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "[OK] Connected to {$db}@{$host}:{$port}\n"; logMsg("DB conn ok");
} catch (Exception $e) {
    echo "[ERROR] DB connect failed: " . $e->getMessage() . "\n";
    logMsg("DB conn error: " . $e->getMessage());
    exit(1);
}

// expected tables from schema
$tables = [
    'Users','Media','Branches','Segments',
    'Tags','Tag_Links','Comments','Votes',
    'Credits_Log','Admin_Moderation'
];
foreach ($tables as $t) {
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = ? AND table_name = ?"
    );
    $stmt->execute([$db, $t]);
    if ($stmt->fetchColumn() > 0) {
        echo "[OK] Table exists: $t\n"; logMsg("Table ok: $t");
    } else {
        echo "[MISSING] Table: $t\n"; logMsg("Table missing: $t");
    }
}

// 4) Tailwind CSS
echo "\n=== Tailwind ===\n";
$css = __DIR__ . '/output.css';
if (is_file($css)) {
    echo "[OK] Compiled CSS: output.css\n"; logMsg("CSS ok");
} else {
    echo "[MISSING] output.css (run: npx tailwindcss -i input.css -o output.css)\n";
    logMsg("CSS missing");
}
exec('npx tailwindcss --version 2>&1', $out, $rc);
if ($rc === 0) {
    echo "[OK] Tailwind CLI: " . implode(' ', $out) . "\n"; logMsg("Tailwind CLI ok");
} else {
    echo "[WARN] Tailwind CLI not found or failed\n"; logMsg("Tailwind CLI warn");
}

// 5) .htaccess
echo "\n=== .htaccess ===\n";
$ht = __DIR__ . '/.htaccess';
if (is_file($ht)) {
    echo "[OK] .htaccess exists\n"; logMsg(".htaccess ok");
} else {
    $content = <<<HT
# Disable directory listings
Options -Indexes

# Custom error pages
ErrorDocument 404 /404.html
ErrorDocument 500 /500.html

# Block sensitive files
<FilesMatch "\.(env|md|sql|log)$">
    Require all denied
</FilesMatch>

HT;
    file_put_contents($ht, $content);
    echo "[CREATED] .htaccess\n"; logMsg(".htaccess created");
}

// 6) Create directory structure
echo "\n=== Directory Structure ===\n";
$dirs = [
    'assets/js',
    'assets/css',
    'pages',
    'test-data',
    'uploads/users'
];
foreach ($dirs as $dir) {
    $path = __DIR__ . '/' . $dir;
    if (!is_dir($path)) {
        mkdir($path, 0755, true);
        echo "[CREATED] $dir\n"; logMsg("Created dir: $dir");
    } else {
        echo "[OK] $dir\n"; logMsg("Dir exists: $dir");
    }
}

// 7) Create test data files
echo "\n=== Test Data ===\n";
$genresFile = __DIR__ . '/test-data/genres.json';
if (!is_file($genresFile)) {
    $genres = [
        ['id' => 1, 'name' => 'Science Fiction'],
        ['id' => 2, 'name' => 'Fantasy'],
        ['id' => 3, 'name' => 'Mystery'],
        ['id' => 4, 'name' => 'Horror'],
        ['id' => 5, 'name' => 'Romance'],
        ['id' => 6, 'name' => 'Adventure']
    ];
    file_put_contents($genresFile, json_encode($genres, JSON_PRETTY_PRINT));
    echo "[CREATED] test-data/genres.json\n"; logMsg("Created genres.json");
} else {
    echo "[OK] test-data/genres.json\n"; logMsg("genres.json exists");
}

// 8) Insert dummy data into database
echo "\n=== Database Dummy Data ===\n";
try {
    // Check if we already have data
    $stmt = $pdo->query("SELECT COUNT(*) FROM Tags WHERE is_genre = 1");
    $genreCount = $stmt->fetchColumn();
    
    if ($genreCount == 0) {
        // Insert genre tags
        $genres = json_decode(file_get_contents($genresFile), true);
        $stmt = $pdo->prepare("INSERT INTO Tags (name, is_genre, created_by) VALUES (?, 1, NULL)");
        foreach ($genres as $genre) {
            $stmt->execute([$genre['name']]);
        }
        echo "[INSERTED] " . count($genres) . " genre tags\n";
        logMsg("Inserted genre tags");
        
        // Insert test user
        $stmt = $pdo->prepare("INSERT INTO Users (username, passphrase_hash, email, is_admin) VALUES (?, ?, ?, ?)");
        $stmt->execute(['admin', password_hash('admin123', PASSWORD_DEFAULT), 'admin@example.com', 1]);
        echo "[INSERTED] Test admin user\n";
        logMsg("Inserted test admin");
        
        // Insert sample media
        $stmt = $pdo->prepare("INSERT INTO Media (title, description, created_by) VALUES (?, ?, ?)");
        $stmt->execute(['The Unfinished Tale', 'A story that needs an ending...', 1]);
        echo "[INSERTED] Sample media\n";
        logMsg("Inserted sample media");
    } else {
        echo "[OK] Database already has dummy data\n";
        logMsg("Dummy data exists");
    }
} catch (Exception $e) {
    echo "[ERROR] Failed to insert dummy data: " . $e->getMessage() . "\n";
    logMsg("Dummy data error: " . $e->getMessage());
}


// 8) Insert dummy data into database
echo "\n=== Database Dummy Data ===\n";
try {
    // Check if we already have data
    $stmt = $pdo->query("SELECT COUNT(*) FROM Tags WHERE is_genre = 1");
    $genreCount = $stmt->fetchColumn();
    
    if ($genreCount == 0) {
        // Insert genre tags
        $genres = json_decode(file_get_contents($genresFile), true);
        $stmt = $pdo->prepare("INSERT INTO Tags (name, is_genre, created_by) VALUES (?, 1, NULL)");
        foreach ($genres as $genre) {
            $stmt->execute([$genre['name']]);
        }
        echo "[INSERTED] " . count($genres) . " genre tags\n";
        logMsg("Inserted genre tags");
        
        // Insert test user
        $stmt = $pdo->prepare("INSERT INTO Users (username, passphrase_hash, email, is_admin) VALUES (?, ?, ?, ?)");
        $stmt->execute(['admin', password_hash('admin123', PASSWORD_DEFAULT), 'admin@example.com', 1]);
        echo "[INSERTED] Test admin user\n";
        logMsg("Inserted test admin");
        
        // Insert sample media
        $stmt = $pdo->prepare("INSERT INTO Media (title, description, created_by) VALUES (?, ?, ?)");
        $stmt->execute(['The Unfinished Tale', 'A story that needs an ending...', 1]);
        echo "[INSERTED] Sample media\n";
        logMsg("Inserted sample media");
    } else {
        echo "[OK] Database already has dummy data\n";
        logMsg("Dummy data exists");
    }
} catch (Exception $e) {
    echo "[ERROR] Failed to insert dummy data: " . $e->getMessage() . "\n";
    logMsg("Dummy data error: " . $e->getMessage());
}


echo "\n✅ Deployment check complete. Details in logs/deploy.log\n";
logMsg("Deploy check complete");

