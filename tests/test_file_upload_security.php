<?php
// Test file upload security improvements
echo "File Upload Security Test\n";
echo "========================\n\n";

// Test 1: Check if finfo functions are available
echo "1. Checking finfo availability: ";
if (function_exists('finfo_open')) {
    echo "✓ PASS - finfo functions available\n";
} else {
    echo "✗ FAIL - finfo functions not available\n";
}

// Test 2: Test MIME type detection with a sample file
echo "2. Testing MIME type detection: ";
try {
    // Create a temporary text file
    $tempFile = tempnam(sys_get_temp_dir(), 'test');
    file_put_contents($tempFile, "This is a test file");
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $detectedType = finfo_file($finfo, $tempFile);
    finfo_close($finfo);
    
    if ($detectedType === 'text/plain') {
        echo "✓ PASS - MIME type detection working\n";
    } else {
        echo "✗ FAIL - Expected text/plain, got: $detectedType\n";
    }
    
    unlink($tempFile);
} catch (Exception $e) {
    echo "✗ FAIL - Error: " . $e->getMessage() . "\n";
}

// Test 3: Test pathinfo function for extension checking
echo "3. Testing file extension detection: ";
$testFilename = "test.txt";
$extension = strtolower(pathinfo($testFilename, PATHINFO_EXTENSION));
if ($extension === 'txt') {
    echo "✓ PASS - Extension detection working\n";
} else {
    echo "✗ FAIL - Expected 'txt', got: '$extension'\n";
}

// Test 4: Test malicious filename handling
echo "4. Testing malicious filename handling: ";
$maliciousFilename = "../../../etc/passwd.txt";
$safePath = basename($maliciousFilename);
if ($safePath === "passwd.txt") {
    echo "✓ PASS - Path traversal prevention working\n";
} else {
    echo "✗ FAIL - Expected 'passwd.txt', got: '$safePath'\n";
}

echo "\nFile upload security tests completed.\n";
?>