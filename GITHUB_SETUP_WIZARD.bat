@echo off
echo.
echo ========================================
echo   C1 MECHANIC - GITHUB SETUP WIZARD
echo ========================================
echo.
echo Step 1: Opening GitHub in your browser...
echo.
start https://github.com/new
echo.
echo ----------------------------------------
echo   WHAT TO DO IN THE BROWSER:
echo ----------------------------------------
echo.
echo 1. Log into GitHub (if not already logged in)
echo 2. Repository name: philosopher-ai-backend
echo 3. Description: Philosopher AI Backend - C3 Oracle with Claude
echo 4. Select: PRIVATE (recommended for security)
echo 5. UNCHECK "Initialize with README" (we already have one)
echo 6. Click "Create repository"
echo 7. On the next page, you'll see: "Quick setup" section
echo 8. COPY the HTTPS URL (looks like: https://github.com/YOUR-USERNAME/philosopher-ai-backend.git)
echo.
echo ----------------------------------------
echo.
set /p repo_url="Paste the GitHub repo URL here and press Enter: "
echo.
echo Great! Setting up git remote and pushing code...
echo.

cd /d C:\Users\dwrek\100X_DEPLOYMENT\BACKEND\philosopher-ai

git remote add origin %repo_url%
git branch -M main
git push -u origin main

echo.
echo ========================================
echo   SUCCESS! Code pushed to GitHub!
echo ========================================
echo.
echo Next step: Deploy to Railway
echo.
pause
