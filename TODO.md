# Project TODO

## 🚨 URGENT SECURITY FIXES (Fix Immediately)

☐ **XSS Vulnerability Fix** - Replace innerHTML with textContent in admin dashboard
    - Location: `pages/js/admin_dashboard_fixed.js:289, 288-296`
    - Risk: HIGH - Allows malicious script execution
    - Fix: Replace innerHTML with textContent and use proper event listeners

☐ **File Upload Security** - Implement proper MIME type validation
    - Location: `api/segments/upload.php:52-53`, `api/branches/upload-cover.php:108-118`
    - Risk: HIGH - Allows malicious file uploads
    - Fix: Use finfo_file() for server-side MIME validation

☐ **Path Traversal Protection** - Sanitize file paths
    - Location: `api/branches/upload-cover.php:84,97-98`, `api/users/storage.php:12`
    - Risk: HIGH - Directory traversal attacks
    - Fix: Implement proper path sanitization and validation

☐ **CSRF Protection** - Add CSRF tokens to all API endpoints
    - Location: All API endpoints in `api/` directory
    - Risk: HIGH - Cross-site request forgery
    - Fix: Implement CSRF tokens using existing functions in `includes/utils.php:84-96`

☐ **Missing Function Implementations** - Add missing functions referenced in code
    - Location: `api/segments/create.php:44-45`
    - Issue: `getUserQuota()` and `getUserDiskUsage()` functions not defined
    - Fix: Implement these functions in `includes/utils.php`

## 📊 DATABASE PERFORMANCE FIXES

☐ **Add Critical Database Indexes** - Improve query performance
    - Tables: admin_moderation, branches, comments, segments, tag_links
    - Execute SQL script to add missing indexes
    - Impact: Significant performance improvement for large datasets

☐ **Add Missing Foreign Key Constraints** - Ensure data integrity
    - Tables: All major tables missing FK constraints
    - Prevents orphaned records and maintains referential integrity
    - Execute SQL script to add missing constraints

☐ **Fix N+1 Query Problems** - Optimize database queries
    - Location: `api/comments/get.php:81-83`, `api/segments/list.php:33-41`
    - Replace individual queries with proper JOINs
    - Impact: Major performance improvement

## 🧹 CLEANUP TASKS

☐ **Remove Dead Code Files**
    - `includes/coin.php` - Contains only HTML img tag, unclear purpose
    - `pages/api` - Unnecessary symlink that could cause confusion
    - `pages/js/admin_dashboard.js` - Duplicate of admin_dashboard_fixed.js

☐ **Consolidate Duplicate Functions**
    - `convertToWebP()` functions in multiple files
    - `getUserSpaceUsage()` functions in multiple files
    - `calculateDirectorySize()` functions in multiple files
    - HTML escaping functions duplicated across 6+ JavaScript files

## 📋 ORIGINAL TODOS

☐ Add logs viewing section to admin panel
     ☐ Remove existing backup_ tables and simplify backup system
     ☐ Create new simplified backup tracking table
     ☐ Add admin backup management GUI for SQL dumps and codebase archives
     ☐ Add recent activity dashboard section
     ☐ Add content moderation dashboard
     ☐ Add user analytics and engagement metrics

● Now let me work on adding a logs viewing section to the admin panel. First, I need to understand what kind of logs exist in the system and where they might be stored.

● Task(Find log files and systems)
  ⎿  Done (26 tool uses · 50.0k tokens · 2m 19.5s)                                                                                                                                                                                                                  

● Great! Now I have a good understanding of the logging system. Let me create a comprehensive logs viewing section for the admin panel. I'll start by creating the HTML page, then the JavaScript, and finally the API endpoints.

● Write(pages/admin-logs.html)
  ⎿  Wrote 194 lines to pages/admin-logs.html                                  
     <!DOCTYPE html>
     <html lang="en">
     <head>
         <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>Admin - System Logs | Continue The Quest</title>
         <link rel="stylesheet" href="../output.css">
         <link rel="icon" href="../favicon.ico" type="image/x-icon">
     </head>
     <body class="bg-background text-foreground">
     … +184 lines (ctrl+r to expand)

● Now let me create the JavaScript file for the logs management system:

● Write(pages/js/admin-logs.js)
  ⎿  Wrote 530 lines to pages/js/admin-logs.js
     // /pages/js/admin-logs.js
     // Admin Logs Management System
     class AdminLogsManager {
         constructor() {
             this.logs = [];
             this.filteredLogs = [];
             this.currentPage = 1;
             this.perPage = 50;
             this.totalPages = 1;
     … +520 lines (ctrl+r to expand)
  ⎿  Claude usage limit reached. Your limit will reset at 5am (America/New_York).

      • /upgrade to increase your usage limit.
