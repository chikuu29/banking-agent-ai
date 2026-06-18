# Self-Check: Ensure we are in the root directory of the project
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Error "Error: Please run this script from the root of the 'banking-agent-ai' directory."
    Exit 1
}

Clear-Host
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  🏦 Banking CRM Agentic AI - Dev Starter   " -ForegroundColor Cyan -BackgroundColor DarkBlue
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check .env file
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found! Copying .env.example to .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "👉 Please edit the .env file in the root directory and add your GOOGLE_API_KEY." -ForegroundColor Cyan
} else {
    # Check if GOOGLE_API_KEY is configured
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "GOOGLE_API_KEY=your_gemini_api_key_here") {
        Write-Host "⚠️  Warning: GOOGLE_API_KEY in .env is still set to the placeholder." -ForegroundColor Yellow
        Write-Host "👉 Please edit the .env file in the root directory and add a valid Google Gemini API Key." -ForegroundColor Cyan
    }
}

# Determine which PowerShell executable to use
$Shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }

# Sync/Install dependencies if missing
if (-not (Test-Path "backend\.venv")) {
    Write-Host "📦 Backend virtual environment (.venv) not found. Running uv sync..." -ForegroundColor Green
    Set-Location backend
    uv sync
    Set-Location ..
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "📦 Frontend node_modules not found. Running pnpm install..." -ForegroundColor Green
    Set-Location frontend
    pnpm install
    Set-Location ..
}

Write-Host "🚀 Starting Backend (FastAPI) in a new window..." -ForegroundColor Green
Start-Process $Shell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'Banking Agent - FastAPI Backend'; cd backend; uv run python main.py"

Write-Host "🚀 Starting Frontend (React + Vite) in a new window..." -ForegroundColor Green
Start-Process $Shell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'Banking Agent - Vite Frontend'; cd frontend; pnpm dev"

Write-Host ""
Write-Host "🎉 Both servers have been launched in separate windows!" -ForegroundColor Green
Write-Host "---------------------------------------------" -ForegroundColor Gray
Write-Host "🔗 Backend: http://localhost:8000" -ForegroundColor Gray
Write-Host "🔗 Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "---------------------------------------------" -ForegroundColor Gray
Write-Host "Press Enter to exit this starter script..." -ForegroundColor Cyan
$null = Read-Host
