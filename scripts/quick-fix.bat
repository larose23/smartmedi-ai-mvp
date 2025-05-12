@echo off
echo ==========================================
echo SmartMedi-AI Quick Database Fix
echo ==========================================
echo This script will directly apply the critical database fixes
echo.

echo Applying simplified migration script...
echo.

:: First, check if we have required environment variables
if "%NEXT_PUBLIC_SUPABASE_URL%"=="" (
  echo ERROR: Missing NEXT_PUBLIC_SUPABASE_URL environment variable
  echo Please set this variable before running the script
  goto end
)

if "%NEXT_PUBLIC_SUPABASE_ANON_KEY%"=="" (
  echo ERROR: Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable
  echo Please set this variable before running the script
  goto end
)

:: Try direct migration using Supabase CLI if available
npx supabase migration up --file=20240515_simplified_fix.sql

:: If that fails, provide manual instructions
if %ERRORLEVEL% neq 0 (
  echo.
  echo *** Direct migration failed. ***
  echo.
  echo Please run the SQL statements in this file manually:
  echo supabase/migrations/20240515_simplified_fix.sql
  echo.
  echo After fixing the database, restart your application.
)

:end
echo.
echo Press any key to exit
pause > nul 