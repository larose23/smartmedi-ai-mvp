# PowerShell script to fix the database issues with SmartMedi-AI
Write-Host "======================================================"
Write-Host "SmartMedi-AI Database Fix Utility (PowerShell Version)"
Write-Host "======================================================"
Write-Host "This script will fix the appointments database schema issues"
Write-Host

# Read Supabase credentials from next.config.js
try {
    $configContent = Get-Content -Path "./next.config.js" -Raw
    
    # Extract URL
    if ($configContent -match "NEXT_PUBLIC_SUPABASE_URL:\s*`"([^`"]+)`"") {
        $supabaseUrl = $matches[1]
        Write-Host "Found Supabase URL: $supabaseUrl"
    } else {
        throw "Could not find NEXT_PUBLIC_SUPABASE_URL in next.config.js"
    }
    
    # Extract key
    if ($configContent -match "NEXT_PUBLIC_SUPABASE_ANON_KEY:\s*`"([^`"]+)`"") {
        $supabaseKey = $matches[1]
        Write-Host "Found Supabase ANON Key" 
    } else {
        throw "Could not find NEXT_PUBLIC_SUPABASE_ANON_KEY in next.config.js"
    }
} catch {
    Write-Host "Error reading config: $_" -ForegroundColor Red
    Write-Host "Please make sure next.config.js exists and contains Supabase credentials"
    exit 1
}

# Set environment variables for the script
$env:NEXT_PUBLIC_SUPABASE_URL = $supabaseUrl
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $supabaseKey

Write-Host "`nStep 1: Applying simplified migration" -ForegroundColor Cyan
try {
    # Try direct migration using Supabase CLI
    $output = npx supabase migration up --file=20240515_simplified_fix.sql 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`nDirect migration failed. Trying alternative approach..." -ForegroundColor Yellow
        
        # Try using Node.js script as fallback
        Write-Host "Running Node.js migration script..."
        $output = node scripts/apply-migrations.js 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            throw "Node.js script also failed"
        } else {
            Write-Host "Node.js script completed successfully" -ForegroundColor Green
        }
    } else {
        Write-Host "Migration applied successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "Error applying migration: $_" -ForegroundColor Red
    Write-Host "You may need to run the SQL manually"
}

Write-Host "`nStep 2: Running API fix endpoint" -ForegroundColor Cyan
Write-Host "This may take a moment..."

# Start the application in the background to run the API endpoint
$process = Start-Process -FilePath "npx" -ArgumentList "next dev -p 3030" -NoNewWindow -PassThru

# Give it time to start up
Start-Sleep -Seconds 5

try {
    # Try to call the API endpoint
    Write-Host "Calling fix-schema API..."
    
    # First try the API endpoint (might fail if app isn't fully started)
    try {
        Invoke-RestMethod -Uri "http://localhost:3030/api/appointments/fix-schema" -Method POST -ErrorAction Stop
        Write-Host "API called successfully" -ForegroundColor Green
    } catch {
        Write-Host "API call failed, continuing with next steps" -ForegroundColor Yellow
    }
} finally {
    # Kill the process after we're done
    Write-Host "Stopping temporary server..."
    Stop-Process -Id $process.Id -Force
}

Write-Host "`nDatabase fix process completed!" -ForegroundColor Green
Write-Host "You can now start your application with 'npm run dev'"
Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 