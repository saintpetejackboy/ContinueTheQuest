#!/bin/bash
# ContinueThe.Quest Deployment Script
# Production deployment helper

set -e

echo "🚀 Starting ContinueThe.Quest deployment..."

# Check if we're in the right directory
if [ ! -f "bootstrap.php" ]; then
    echo "❌ Error: Must run from ContinueThe.Quest root directory"
    exit 1
fi

# Create required directories
echo "📁 Creating required directories..."
mkdir -p cache/api cache/rate_limits logs backups uploads

# Set proper permissions
echo "🔐 Setting permissions..."
chmod 755 cache logs backups uploads
chmod 755 scripts/*.sh scripts/*.php
find uploads -type d -exec chmod 755 {} \;

# Install/update dependencies
echo "📦 Building assets..."
npm install
npm run build

# Database setup
echo "🗄️ Setting up database..."
if [ -f "scripts/create_security_logs_table.sql" ]; then
    echo "Creating security logs table..."
    mysql -u root -p ctq < scripts/create_security_logs_table.sql
fi

if [ -f "scripts/add_missing_indexes.sql" ]; then
    echo "Adding database indexes..."
    mysql -u root -p ctq < scripts/add_missing_indexes.sql
fi

# Test critical systems
echo "🧪 Testing systems..."

# Test database connection
php -r "
require_once 'bootstrap.php';
try {
    \$db = getDB();
    \$db->query('SELECT 1');
    echo 'Database: ✅ Connected\n';
} catch (Exception \$e) {
    echo 'Database: ❌ Failed - ' . \$e->getMessage() . '\n';
    exit(1);
}
"

# Test file permissions
if [ -w "cache" ] && [ -w "logs" ] && [ -w "uploads" ]; then
    echo "File Permissions: ✅ OK"
else
    echo "File Permissions: ❌ Failed"
    exit 1
fi

# Test health endpoint
echo "🩺 Testing health endpoint..."
php -S localhost:8888 -t . > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

HEALTH_CHECK=$(curl -s http://localhost:8888/api/health.php | jq -r '.status' 2>/dev/null || echo "error")
kill $SERVER_PID 2>/dev/null || true

if [ "$HEALTH_CHECK" = "ok" ]; then
    echo "Health Check: ✅ Passed"
else
    echo "Health Check: ⚠️ Warning - Status: $HEALTH_CHECK"
fi

# Setup cron jobs (optional)
echo "⏰ Cron job recommendations:"
echo "# Add these to your crontab:"
echo "# Backup scheduler - daily at 2 AM"
echo "0 2 * * * /usr/bin/php $(pwd)/scripts/backup_scheduler.php"
echo "# Cache cleanup - every hour"
echo "0 * * * * find $(pwd)/cache -type f -mmin +60 -delete"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Next steps:"
echo "1. Configure your web server to point to this directory"
echo "2. Set up SSL/TLS certificate"
echo "3. Configure environment variables in .env"
echo "4. Add recommended cron jobs"
echo "5. Test the application: /api/health.php"
echo ""
echo "🔗 Key URLs:"
echo "   Health Check: /api/health.php"
echo "   Admin Panel: /admin"
echo "   Main App: /"
echo ""
echo "📊 Monitoring:"
echo "   Security logs: logs/security.log"
echo "   System health: /api/health.php"
echo "   Admin analytics: /pages/admin-analytics.html"