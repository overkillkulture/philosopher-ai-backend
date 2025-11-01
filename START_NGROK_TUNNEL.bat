@echo off
echo.
echo ========================================
echo   C1 MECHANIC - NGROK TUNNEL STARTER
echo ========================================
echo.
echo Starting ngrok tunnel to localhost:3001...
echo This will create a public URL for your backend!
echo.
echo KEEP THIS WINDOW OPEN - Closing it stops the tunnel.
echo.
echo Once started, look for the "Forwarding" line below.
echo The https:// URL is your public backend URL!
echo.
echo ========================================
echo.

cd /d C:\Users\dwrek\100X_DEPLOYMENT\BACKEND\philosopher-ai
ngrok.exe http 3001

pause
