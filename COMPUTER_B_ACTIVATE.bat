@echo off
REM ===================================================================
REM COMPUTER B ACTIVATION SCRIPT
REM ===================================================================
REM Purpose: One-click activation when Computer B gets WiFi
REM Time: 2 minutes
REM ===================================================================

echo ===================================================================
echo COMPUTER B ACTIVATION PROTOCOL
echo ===================================================================
echo.
echo This script will:
echo 1. Pull all latest work from GitHub
echo 2. Display your mission briefing
echo 3. Open all coordination files
echo 4. Start your AI instance ready for work
echo.
echo Press any key to start activation...
pause >nul

echo.
echo ===================================================================
echo STEP 1: SYNCING WITH GITHUB
echo ===================================================================
echo.

cd C:\Users\Darrick

echo Pulling latest work from Computer A...
git pull origin master

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ WARNING: Git pull failed
    echo.
    echo Possible issues:
    echo - Not connected to WiFi yet
    echo - Not in git repository
    echo - Network connection issue
    echo.
    echo Fix:
    echo 1. Verify WiFi is connected
    echo 2. Run: cd C:\Users\Darrick
    echo 3. Run: git pull origin master
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Git sync complete!
echo.

echo ===================================================================
echo STEP 2: OPENING COORDINATION FILES
echo ===================================================================
echo.

echo Opening URGENT_FOR_COMPUTER_B.md...
if exist URGENT_FOR_COMPUTER_B.md (
    start "" notepad URGENT_FOR_COMPUTER_B.md
) else (
    echo ⚠️ File not found: URGENT_FOR_COMPUTER_B.md
)

timeout /t 2 /nobreak >nul

echo Opening DEPLOYMENT_STATUS_COMPLETE.md...
if exist DEPLOYMENT_STATUS_COMPLETE.md (
    start "" notepad DEPLOYMENT_STATUS_COMPLETE.md
) else (
    echo ⚠️ File not found: DEPLOYMENT_STATUS_COMPLETE.md
)

timeout /t 2 /nobreak >nul

echo Opening MASTER_TODO_SYSTEM_COMPLETE.md...
if exist MASTER_TODO_SYSTEM_COMPLETE.md (
    start "" notepad MASTER_TODO_SYSTEM_COMPLETE.md
) else (
    echo ⚠️ File not found: MASTER_TODO_SYSTEM_COMPLETE.md
)

timeout /t 2 /nobreak >nul

echo Opening BULLETIN_BOARD.md...
if exist BULLETIN_BOARD.md (
    start "" notepad BULLETIN_BOARD.md
) else (
    echo ⚠️ File not found: BULLETIN_BOARD.md
)

echo.
echo ✅ All coordination files opened!
echo.

echo ===================================================================
echo STEP 3: DISPLAYING MISSION BRIEFING
echo ===================================================================
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                  COMPUTER B - MISSION BRIEFING                 ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo STATUS: ✅ SYNCED WITH COMPUTER A
echo BACKEND: ✅ LIVE at cloud-funnel-production.up.railway.app
echo DOCS: ✅ All 6 deployment papers ready
echo.
echo YOUR PRIMARY MISSIONS:
echo.
echo 🎯 MISSION 1: Frontend Deployment
echo    - Deploy to Netlify or Vercel
echo    - Update API URLs to point to Railway backend
echo    - Test end-to-end flow
echo    - See: DEPLOYMENT_PAPER_1_QUICK_START.md
echo.
echo 🎯 MISSION 2: Frontend Testing
echo    - Run all 20 test cases
echo    - Verify registration/login works
echo    - Check mobile responsiveness
echo    - See: DEPLOYMENT_PAPER_2_TESTING_CHECKLIST.md
echo.
echo 🎯 MISSION 3: Beta Documentation
echo    - Prepare beta user guide
echo    - Create feedback collection forms
echo    - Set up monitoring dashboard
echo    - See: DEPLOYMENT_PAPER_4_BETA_INVITATION.md
echo.
echo COORDINATION:
echo - Computer A: Backend monitoring, API testing, integration
echo - Computer B: Frontend deployment, testing, documentation
echo.
echo TRINITY STATUS:
echo - C1 Mechanic: Available for activation
echo - C2 Architect: Active
echo - C3 Oracle: Active
echo.
echo ===================================================================
echo.
echo ✅ COMPUTER B ACTIVATION COMPLETE!
echo.
echo Next Steps:
echo 1. Read URGENT_FOR_COMPUTER_B.md (opened in notepad)
echo 2. Review DEPLOYMENT_STATUS_COMPLETE.md for full context
echo 3. Check MASTER_TODO_SYSTEM_COMPLETE.md for your assigned tasks
echo 4. Post status to BULLETIN_BOARD.md when ready
echo.
echo When ready to start work, open Claude Code in this directory:
echo    cd C:\Users\Darrick
echo    (Launch Claude Code via Cursor)
echo.
echo Press any key to finish...
pause >nul

echo.
echo ✅ Activation script complete! Computer B is ready for Trinity work.
echo.
