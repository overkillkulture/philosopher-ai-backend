@echo off
REM ========================================
REM AUTOMATED RAILWAY DEPLOYMENT SCRIPT
REM Deploys Backend + SMS Bot to Railway
REM ========================================

echo.
echo ========================================
echo RAILWAY AUTONOMOUS DEPLOYMENT
echo ========================================
echo.
echo This will deploy:
echo 1. Philosopher AI Backend (Node.js + PostgreSQL)
echo 2. SMS Bot (Python + Flask + Twilio)
echo.
echo Make sure you:
echo [x] Logged into Railway (railway login)
echo [x] Have Claude API key ready
echo [x] Have Twilio credentials ready (optional)
echo.
pause

echo.
echo ========================================
echo STEP 1: Deploy Backend
echo ========================================
cd "C:\Users\Darrick\100X_BACKUP\100X_DEPLOYMENT\BACKEND\philosopher-ai"

echo Creating Railway project for backend...
railway init --name philosopher-ai-backend

echo Adding PostgreSQL database...
railway add --database postgres

echo Deploying backend code...
railway up

echo Getting backend URL...
railway domain

echo.
echo ========================================
echo STEP 2: Set Backend Environment Variables
echo ========================================
echo.
echo IMPORTANT: Copy these commands and run them:
echo.
echo railway variables set NODE_ENV=production
echo railway variables set PORT=3001
echo railway variables set JWT_SECRET=your-random-secret-here-change-this
echo railway variables set ANTHROPIC_API_KEY=your-claude-key-here
echo railway variables set FRONTEND_URL=https://your-domain.com
echo railway variables set ALLOWED_ORIGINS=https://your-domain.com
echo.
echo (Stripe is optional - skip for now)
echo.
pause

echo.
echo ========================================
echo STEP 3: Deploy SMS Bot
echo ========================================
cd "C:\Users\Darrick\SMS_BOT"

echo Creating Railway project for SMS bot...
railway init --name sms-bot-claude

echo Deploying SMS bot code...
railway up

echo Getting SMS bot URL...
railway domain

echo.
echo ========================================
echo STEP 4: Set SMS Bot Environment Variables
echo ========================================
echo.
echo IMPORTANT: Copy these commands and run them:
echo.
echo railway variables set ANTHROPIC_API_KEY=your-claude-key-here
echo railway variables set TWILIO_ACCOUNT_SID=your-twilio-sid-here
echo railway variables set TWILIO_AUTH_TOKEN=your-twilio-token-here
echo railway variables set TWILIO_PHONE_NUMBER=your-twilio-number-here
echo railway variables set ALLOWED_NUMBERS=+1234567890,+9876543210
echo.
pause

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Next steps:
echo 1. Check Railway dashboard: https://railway.app/dashboard
echo 2. Test backend: https://your-backend.railway.app/api/v1/health
echo 3. Configure Twilio webhook: https://your-sms-bot.railway.app/sms
echo 4. Update frontend API URLs
echo.
echo Check C:\Users\Darrick\DEPLOYMENT_COMPLETE.md for full details
echo.
pause
