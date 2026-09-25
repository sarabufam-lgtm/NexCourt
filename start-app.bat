@echo off
title NexCourt - Court Booking Management System
color 0A

echo =====================================================================
echo   🏸 Starting NexCourt - Sports Facility & Court Booking PWA
echo =====================================================================
echo.

:: Ensure working directory is the script directory
cd /d "%~dp0"

:: Check if PostgreSQL service is running
sc query postgresql-x64-17 | find "RUNNING" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [*] Checking local PostgreSQL service...
    net start postgresql-x64-17 >nul 2>&1
)

echo [*] Launching Full-Stack Services:
echo     - Backend API & WebSockets: http://localhost:5000
echo     - Frontend PWA:             http://localhost:5173
echo.
echo [*] Opening NexCourt in your browser shortly...
echo.

:: Automatically open browser after 3 seconds
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

:: Run Backend & Frontend concurrently
npm run dev

echo.
echo =====================================================================
echo   NexCourt servers stopped.
echo =====================================================================
pause
