@echo off
REM ============================================
REM AUTONOMOUS BACKUP PROTOCOL
REM 3-Layer Backup: Thumb Drive + GitHub + Local
REM ============================================

echo ============================================
echo BACKUP PROTOCOL INITIATED
echo ============================================
echo.

REM Create backup directory with timestamp
set TIMESTAMP=%DATE:~-4%%DATE:~-10,2%%DATE:~-7,2%_%TIME:~0,2%%TIME:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=BACKUP_%TIMESTAMP%

echo [1/4] Creating backup directory: %BACKUP_DIR%
mkdir "D:\%BACKUP_DIR%" 2>nul

REM Critical systems to backup
echo.
echo [2/4] Copying critical systems to D:\%BACKUP_DIR%...
echo.

REM All new social media files
echo   - Social Media Integration Systems...
xcopy "C:\Users\Darrick\TWITTER_API_INTEGRATION.js" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\INSTAGRAM_API_INTEGRATION.js" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\AI_CONTENT_GENERATOR_SOCIAL_MEDIA.js" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\AUTOMATED_POSTING_SCHEDULER.js" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\COMPLETE_SOCIAL_MEDIA_SYSTEM.js" "D:\%BACKUP_DIR%\" /Y /Q

REM Marketplace system (new)
echo   - Marketplace System...
xcopy "C:\Users\Darrick\MARKETPLACE_DATABASE_SCHEMA.sql" "D:\%BACKUP_DIR%\" /Y /Q

REM Existing frameworks
echo   - Core Frameworks...
xcopy "C:\Users\Darrick\AI_INTEGRATION_FRAMEWORK.js" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\AUTHENTICATION_SYSTEM_COMPLETE.js" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\CACHING_SYSTEM_COMPLETE.js" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\SECURITY_AUDIT_SYSTEM.js" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\CODE_GENERATOR.js" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\DOCUMENTATION_GENERATOR.js" "D:\%BACKUP_DIR%\" /Y /Q

REM Reports and documentation
echo   - Reports and Documentation...
xcopy "C:\Users\Darrick\AUTONOMOUS_WORK_PHASE_1_COMPLETE.md" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\AUTONOMOUS_WORK_PHASES_2_3_4_COMPLETE.md" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\BRAIN_UNLOAD_FRAMEWORK_CONSOLIDATION.md" "D:\%BACKUP_DIR%\" /Y /Q
xcopy "C:\Users\Darrick\ONE_YEAR_BOOT_COMPLETE_NOV_4.md" "D:\%BACKUP_DIR%\" /Y /Q

REM Package.json for dependencies
echo   - Configuration Files...
xcopy "C:\Users\Darrick\package.json" "D:\%BACKUP_DIR%\" /Y /Q

echo.
echo [3/4] Backup to D: drive complete!
echo Location: D:\%BACKUP_DIR%

echo.
echo [4/4] Creating backup verification file...
dir "D:\%BACKUP_DIR%" > "D:\%BACKUP_DIR%\BACKUP_MANIFEST.txt"

echo.
echo ============================================
echo BACKUP COMPLETE
echo ============================================
echo.
echo Backup Location: D:\%BACKUP_DIR%
echo Next: Push to GitHub for cloud backup
echo.

pause
