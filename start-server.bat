@echo off
REM Liepājas Ekskursija - Server Startup Script (Windows)
REM This script starts both the WebSocket server and a local PHP/web server

echo 🚀 Starting Liepājas Ekskursija servers...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if PHP is installed (needed for leaderboard)
where php >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  WARNING: PHP is not installed!
    echo    Leaderboard functionality will not work without PHP
    echo    Install PHP from: https://www.php.net/downloads
    echo.
)

REM Check if npm packages are installed
if not exist "node_modules\" (
    echo 📦 Installing dependencies...
    call npm install
    echo.
)

REM Create data directory if it doesn't exist
if not exist "src\data\" mkdir src\data
if not exist "src\data\leaderboard.txt" type nul > src\data\leaderboard.txt

REM Start WebSocket server in background
echo 🔌 Starting WebSocket server on port 8080...
start /B node src/js/server.js
echo.

REM Wait a moment for the WebSocket server to start
timeout /t 2 /nobreak >nul

REM Start web server
echo 🌐 Starting PHP web server on port 8000...
echo    Open in browser: http://localhost:8000/index.html
echo.
echo 📊 Features enabled:
echo    ✅ Multiplayer mode (WebSocket)
echo    ✅ Leaderboard (PHP)
echo.
echo Press Ctrl+C to stop the web server
echo NOTE: You may need to manually stop the WebSocket server (check Task Manager)
echo.

REM Try to start PHP server first (best option due to leaderboard)
where php >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    php -S localhost:8000
    goto :end
)

REM Fall back to Python if PHP not available
echo ⚠️  PHP not found, trying Python (leaderboard will not work!)
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    python -m http.server 8000
    goto :end
)

where python3 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    python3 -m http.server 8000
    goto :end
)

echo ❌ No web server available!
echo Please install PHP or Python to run the web server
pause
exit /b 1

:end
