@echo off
REM AUTO SYNC TRINITY STATUS TO GITHUB

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  AUTO SYNC TO GITHUB                                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo 📤 Syncing Trinity status to GitHub...
echo.

REM Add Trinity folder
git add .trinity/

REM Commit with timestamp
git commit -m "Computer 1 online - Trinity status update"

REM Push to GitHub
git push

echo.
echo ✅ Synced to GitHub!
echo.
echo 📋 Computer 2 can now:
echo    1. git pull
echo    2. node GITHUB_SYNC_CONNECTION.js
echo    3. Automatically connected!
echo.
pause
