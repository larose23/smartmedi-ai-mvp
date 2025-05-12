@echo off
echo ==========================================
echo SmartMedi-AI Database Fix and Run Utility
echo ==========================================
echo This script will fix the database issues and start the application
echo.

echo Step 1: Applying comprehensive database fix...
node scripts/apply-migrations.js

echo.
echo Step 2: Starting the application on port 3020...
echo.
echo If the application fails to start because the port is in use,
echo manually run: npx next dev -p 3021
echo.

start /B cmd /c "npx next dev -p 3020"

echo.
echo Application started! Open http://localhost:3020 in your browser.
echo.
echo Press any key to close this window (application will continue running)
pause > nul 