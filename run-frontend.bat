@echo off
cd /d "%~dp0"
echo.
echo  Starting backend + frontend together (login needs both).
echo  For frontend-only, run: npm run dev:frontend  (and start the API separately.)
echo.
echo  ========================================
echo   LOCALHOST LINKS
echo  ========================================
echo   Frontend app: http://localhost:5173
echo   Backend API:  http://localhost:4000
echo   Open in browser: http://localhost:5173
echo  ========================================
echo.
call npm.cmd run dev
pause
