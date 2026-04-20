@echo off
REM Automatisches Deployment Script für Windows
REM Speichere als: deploy.bat

setlocal enabledelayedexpansion

echo 🚀 Deployment zu Firebase Hosting + Render...

REM 1. Build erstellen
echo 📦 Baue Projekt...
call npm run build

if errorlevel 1 (
    echo ❌ Build fehlgeschlagen
    exit /b 1
)

REM 2. Zu Firebase deployen
echo 🔥 Deploye zu Firebase Hosting...
call firebase deploy

if errorlevel 1 (
    echo ⚠️ Firebase Deploy fehlgeschlagen
) else (
    echo ✅ Deployment zu Firebase erfolgreich!
)

echo.
echo URLs:
echo - Frontend: https://mitarbeiterevent.web.app
echo - API: https://mitarbeiterevent-api.onrender.com

pause
