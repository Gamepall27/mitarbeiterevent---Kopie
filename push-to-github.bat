@echo off
REM GitHub Push Script - Führe dies aus nachdem du die GitHub Repo erstellt hast

REM ⚠️ WICHTIG: Ersetze YOUR_USERNAME mit deinem GitHub Username!

setlocal enabledelayedexpansion

echo.
echo 🚀 GitHub Push Script
echo.
echo Schritt 1: Gehe zu https://github.com/new
echo Schritt 2: Erstelle Repo 'mitarbeiterevent' (public)
echo Schritt 3: Kopiere die HTTPS URL
echo.
echo Dann ersetze YOUR_USERNAME unten mit deinem GitHub Username
echo.

REM Ersetze dies mit deinem echten GitHub URL:
set "GITHUB_URL=https://github.com/YOUR_USERNAME/mitarbeiterevent.git"

echo Adding remote: !GITHUB_URL!
git remote add origin !GITHUB_URL!
git branch -M main
git push -u origin main

echo.
echo ✅ Done! Code ist jetzt auf GitHub!
pause
