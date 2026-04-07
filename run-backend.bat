@echo off
cd /d "%~dp0"
echo.
echo  Freeing port 4000 if another backend is already running...
call npx.cmd kill-port 4000 2>nul
echo.
echo  ========================================
echo   LOCALHOST LINKS
echo  ========================================
echo   Backend API:  http://localhost:4000
echo   Frontend app: http://localhost:5173
echo   Open in browser: http://localhost:5173
echo  ========================================
echo.
call npm.cmd run dev:backend
pause
