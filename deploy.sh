#!/bin/bash
# Automatisches Deployment Script
# Speichere als: deploy.sh

set -e

echo "🚀 Deployment zu Firebase Hosting + Render..."

# Variablen
RENDER_REMOTE="https://git.render.com/your-repo.git"  # Später eintragen
FIREBASE_PROJECT="mitarbeiterevent"

# 1. Build erstellen
echo "📦 Baue Projekt..."
npm run build

# 2. Zu Render deployen (Git Push)
echo "📤 Deploye zu Render..."
git push render main || echo "⚠️ Render Push übersprungen (erste deployment manuell)"

# 3. Zu Firebase deployen
echo "🔥 Deploye zu Firebase Hosting..."
firebase deploy --project $FIREBASE_PROJECT

echo "✅ Deployment fertig!"
echo ""
echo "URLs:"
echo "- Frontend: https://${FIREBASE_PROJECT}.web.app"
echo "- API: https://mitarbeiterevent-api.onrender.com"
