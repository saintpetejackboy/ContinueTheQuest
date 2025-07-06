<?php
echo "Running All Security Tests\n";
echo "===========================\n\n";

echo "1. File Upload Security Test:\n";
echo "-----------------------------\n";
include 'test_file_upload_security.php';

echo "\n\n2. Path Traversal Protection Test:\n";
echo "----------------------------------\n";
include 'test_path_traversal_protection.php';

echo "\n\n3. User Quota Functions Test:\n";
echo "-----------------------------\n";
include 'test_user_quota_functions.php';

echo "\n\n=== ALL TESTS COMPLETED ===\n";
echo "Check the individual test results above.\n";
echo "If all tests show 'PASS', security improvements are working correctly.\n";
?>