<?php
require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../includes/utils.php';

echo "User Quota Functions Test\n";
echo "=========================\n\n";

// Test 1: getUserQuota function exists
echo "1. Testing getUserQuota function exists: ";
if (function_exists('getUserQuota')) {
    echo "✓ PASS - Function exists\n";
} else {
    echo "✗ FAIL - Function does not exist\n";
}

// Test 2: getUserDiskUsage function exists
echo "2. Testing getUserDiskUsage function exists: ";
if (function_exists('getUserDiskUsage')) {
    echo "✓ PASS - Function exists\n";
} else {
    echo "✗ FAIL - Function does not exist\n";
}

// Test 3: Test getUserQuota with invalid user (should return default)
echo "3. Testing getUserQuota with invalid user: ";
try {
    $quota = getUserQuota(999999); // Non-existent user
    $defaultQuota = 100 * 1024 * 1024; // 100MB default
    if ($quota === $defaultQuota) {
        echo "✓ PASS - Returns default quota for non-existent user\n";
    } else {
        echo "✗ FAIL - Expected: $defaultQuota, Got: $quota\n";
    }
} catch (Exception $e) {
    echo "✗ FAIL - Exception: " . $e->getMessage() . "\n";
}

// Test 4: Test getUserDiskUsage with invalid user
echo "4. Testing getUserDiskUsage with invalid user: ";
try {
    $usage = getUserDiskUsage(999999); // Non-existent user
    if ($usage === 0) {
        echo "✓ PASS - Returns 0 for non-existent user\n";
    } else {
        echo "✗ FAIL - Expected: 0, Got: $usage\n";
    }
} catch (Exception $e) {
    echo "✗ FAIL - Exception: " . $e->getMessage() . "\n";
}

// Test 5: Test getUserDiskUsage with negative user ID (should handle gracefully)
echo "5. Testing getUserDiskUsage with invalid user ID: ";
try {
    $usage = getUserDiskUsage(-1);
    if ($usage === 0) {
        echo "✓ PASS - Handles invalid user ID gracefully\n";
    } else {
        echo "✗ FAIL - Expected: 0, Got: $usage\n";
    }
} catch (Exception $e) {
    echo "✓ PASS - Exception handled gracefully: " . $e->getMessage() . "\n";
}

echo "\nUser quota function tests completed.\n";
?>