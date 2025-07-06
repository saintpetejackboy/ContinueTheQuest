#!/bin/bash
# Script to update git log data for admin viewing
# This should be run periodically (e.g., via cron) to keep the log current

cd /var/www/ctq

# Create logs directory if it doesn't exist
mkdir -p /var/www/ctq/logs

# Generate comprehensive git log in JSON format with proper escaping
git log --pretty=format:'{"commit":"%H","abbreviated_commit":"%h","author":"%an","author_email":"%ae","date":"%ai","message":"%f","body":""}' --all > /tmp/git_log_raw.txt

# Convert to proper JSON array
echo "[" > /var/www/ctq/logs/git_commits.json

# Process each line to ensure proper JSON formatting
first=true
while IFS= read -r line; do
    if [ "$first" = true ]; then
        echo "  $line" >> /var/www/ctq/logs/git_commits.json
        first=false
    else
        echo "  ,$line" >> /var/www/ctq/logs/git_commits.json
    fi
done < /tmp/git_log_raw.txt

echo "]" >> /var/www/ctq/logs/git_commits.json

# Clean up
rm /tmp/git_log_raw.txt

# Make readable by web server
chmod 644 /var/www/ctq/logs/git_commits.json

echo "Git log updated: $(date)"