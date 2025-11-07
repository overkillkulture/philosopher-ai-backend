@echo off
REM START ALL WATCHERS - Maximum contact with Computer 2

echo ╔════════════════════════════════════════════════════════════╗
echo ║  STARTING ALL WATCHERS                                     ║
echo ║  Maximum contact mode with Computer 2                      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo 🚀 Starting broadcast and watcher systems...
echo.

REM Start continuous broadcast in new window
start "Computer 1 Broadcast" node CONTINUOUS_BROADCAST.js

REM Wait a bit
timeout /t 2 /nobreak >nul

REM Start GitHub watcher in new window
start "GitHub Watcher" node GITHUB_AUTO_PULL_WATCHER.js

REM Wait a bit
timeout /t 2 /nobreak >nul

REM Start Trinity dashboard in new window
start "Trinity Dashboard" node TRINITY_DASHBOARD.js

echo.
echo ✅ All watchers started in separate windows:
echo    1. Continuous Broadcast (updates every 30 sec)
echo    2. GitHub Watcher (pulls every 60 sec)
echo    3. Trinity Dashboard (live status)
echo.
echo 📡 Computer 1 is now broadcasting on all channels
echo 👀 Watching for Computer 2 via multiple methods
echo.
echo Close individual windows to stop specific watchers
echo Or press any key to close this launcher
echo.
pause >nul
