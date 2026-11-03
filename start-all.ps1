# MediaBox Startup Script for PowerShell
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Starting MediaBox (Backend + Frontend)   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Start Python FastAPI Backend on port 8000
Write-Host "[1/2] Starting Python FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
$BackendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd backend; ..\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload" -PassThru

# 2. Start Next.js Frontend on port 3000
Write-Host "[2/2] Starting Next.js Frontend on http://localhost:3000..." -ForegroundColor Green
$FrontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -PassThru

Write-Host ""
Write-Host "MediaBox is running!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend API: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "API Documentation: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "Close the spawned PowerShell windows to stop the servers." -ForegroundColor Yellow
