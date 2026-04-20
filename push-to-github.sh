#!/bin/bash
# GitHub Push Script - Führe dies aus nachdem du die GitHub Repo erstellt hast

# ⚠️ WICHTIG: Ersetze YOUR_USERNAME mit deinem GitHub Username!

# Beispiel:
# https://github.com/joshua-joshi/mitarbeiterevent.git

echo "🚀 GitHub Push Script"
echo ""
echo "Schritt 1: Gehe zu https://github.com/new"
echo "Schritt 2: Erstelle Repo 'mitarbeiterevent' (public)"
echo "Schritt 3: Kopiere die HTTPS URL"
echo ""
echo "Dann ersetze HERE_DEINE_URL unten mit deiner URL:"
echo ""

# Ersetze dies mit deiner echten GitHub URL:
GITHUB_URL="https://github.com/YOUR_USERNAME/mitarbeiterevent.git"

echo "Adding remote: $GITHUB_URL"
git remote add origin $GITHUB_URL
git branch -M main
git push -u origin main

echo ""
echo "✅ Done! Code ist jetzt auf GitHub!"
