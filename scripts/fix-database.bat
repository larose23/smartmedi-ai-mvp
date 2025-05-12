@echo off
echo ==========================================
echo SmartMedi-AI Database Fix Utility
echo ==========================================
echo This script will fix the appointments database schema issues
echo.

echo Running comprehensive database fix...
node scripts/apply-migrations.js

echo.
echo Database fix completed! You can now restart your application.
echo Press any key to exit
pause > nul 