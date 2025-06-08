<?php
/**
 * Load .env file into getenv()/$_ENV/$_SERVER
 */
function loadEnv(string $path): void {

    if (! is_readable($path)) {
        error_log("loadEnv: could not read $path");
        return;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        [$name, $value] = explode('=', $line, 2) + [null, null];
        if (! $name) {
            error_log("loadEnv: skipping malformed line: $line");
            continue;
        }
        $value = trim($value, " \t\n\r\0\x0B\"'");
        putenv("$name=$value");
        $_ENV[$name]    = $value;
        $_SERVER[$name] = $value;

    }
}

// load the one at project root
loadEnv(__DIR__ . '/.env');
