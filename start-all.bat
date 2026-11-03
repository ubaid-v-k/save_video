@echo off
echo ==========================================
echo  Starting MediaBox (Backend + Frontend)   
echo ==========================================

start "MediaBox Backend" cmd /k "cd backend && ..\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start "MediaBox Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo MediaBox services launched!
echo Frontend: http://localhost:3000
echo Backend:  http://127.0.0.1:8000
echo.
pause
