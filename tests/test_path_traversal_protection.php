<?php
require_once __DIR__ . '/../includes/utils.php';

echo "Path Traversal Protection Test\n";
echo "==============================\n\n";

// Test 1: Valid user ID
echo "1. Testing valid user ID: ";
try {
    $path = getSafeUserDir(42);
    $expected = '/var/www/ctq/uploads/users/42';
    if ($path === $expected) {
        echo "✓ PASS - Valid path generated\n";
    } else {
        echo "✗ FAIL - Expected: $expected, Got: $path\n";
    }
} catch (Exception $e) {
    echo "✗ FAIL - Exception: " . $e->getMessage() . "\n";
}

// Test 2: Invalid user ID (string)
echo "2. Testing invalid user ID (string): ";
try {
    $path = getSafeUserDir('malicious');
    echo "✗ FAIL - Should have thrown exception\n";
} catch (InvalidArgumentException $e) {
    echo "✓ PASS - Exception thrown for invalid user ID\n";
} catch (Exception $e) {
    echo "✗ FAIL - Wrong exception type: " . $e->getMessage() . "\n";
}

// Test 3: Invalid user ID (negative)
echo "3. Testing invalid user ID (negative): ";
try {
    $path = getSafeUserDir(-1);
    echo "✗ FAIL - Should have thrown exception\n";
} catch (InvalidArgumentException $e) {
    echo "✓ PASS - Exception thrown for negative user ID\n";
} catch (Exception $e) {
    echo "✗ FAIL - Wrong exception type: " . $e->getMessage() . "\n";
}

// Test 4: Safe subdirectory handling
echo "4. Testing safe subdirectory: ";
try {
    $path = getSafeUserDir(42, 'images');
    $expected = '/var/www/ctq/uploads/users/42/images';
    if ($path === $expected) {
        echo "✓ PASS - Safe subdirectory path generated\n";
    } else {
        echo "✗ FAIL - Expected: $expected, Got: $path\n";
    }
} catch (Exception $e) {
    echo "✗ FAIL - Exception: " . $e->getMessage() . "\n";
}

// Test 5: Path traversal attempt in subdirectory
echo "5. Testing path traversal prevention: ";
try {
    $path = getSafeUserDir(42, '../../../etc');
    // Should sanitize to just 'etc' without the traversal
    $expected = '/var/www/ctq/uploads/users/42/etc';
    if ($path === $expected) {
        echo "✓ PASS - Path traversal prevented\n";
    } else {
        echo "✗ FAIL - Expected: $expected, Got: $path\n";
    }
} catch (Exception $e) {
    echo "✗ FAIL - Exception: " . $e->getMessage() . "\n";
}

// Test 6: basename function behavior
echo "6. Testing basename function: ";
$maliciousPath = "../../../etc/passwd";
$safeName = basename($maliciousPath);
if ($safeName === "passwd") {
    echo "✓ PASS - basename correctly sanitizes path\n";
} else {
    echo "✗ FAIL - Expected: passwd, Got: $safeName\n";
}

echo "\nPath traversal protection tests completed.\n";
?>