# 🎉 Mitarbeiterevent - Kostenlos Deployen

## Dein Projekt ist BEREIT für Production!

Folge einfach der **`DEPLOYMENT_CHECKLIST.md`** Schritt-für-Schritt.

## Wichtiger Hinweis fuer Apache / statisches Hosting

Nur `dist/` per Apache hochzuladen reicht fuer diese App nicht aus. Das Frontend braucht das Node-Backend aus `server.js`, weil alle Daten ueber `/api/...` und `/uploads/...` geladen werden.

Es gibt dafuer genau zwei saubere Deployment-Varianten:

1. Frontend und Backend zusammen ueber Node/Express betreiben.
   `npm install`
   `npm run build`
   `npm start`

2. `dist/` statisch per Apache ausliefern und das Node-Backend separat starten.
   Dann muss im Frontend beim Build `VITE_API_URL` auf die Backend-URL zeigen, z. B. `http://178.105.50.197:3001`.
   Alternativ muss Apache `/api` und `/uploads` per Reverse Proxy an Node weiterleiten.

### 🚀 Quick Start (wenn du es schon kennst)

```bash
# 1. Firebase Setup (manuell)
# → siehe DEPLOYMENT_CHECKLIST.md Phase 1

# 2. GitHub Push
git add .
git commit -m "Ready for deployment"
git push origin main

# 3. Render Deploy (manuell verbinden)
# → siehe DEPLOYMENT_CHECKLIST.md Phase 3

# 4. Firebase Hosting Deploy
firebase login
firebase init hosting
npm run build
firebase deploy
```

### 📍 Nach Deploy erreichbar unter:
- **Frontend:** https://mitarbeiterevent.web.app
- **API:** https://mitarbeiterevent-api.onrender.com

### 💰 Kosten: **$0.00** ✅

Alles kostenlos mit großzügigen Kontingenten!

---

## 📚 Vollständige Anleitung

👉 **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** ← HIER STARTEN!

---

## Was ist alles vorbereitet?

✅ Vite Build-Konfiguration  
✅ Render.yaml für Auto-Deploy  
✅ Firebase Konfigurationsdatei  
✅ Production-Server (server-prod.js)  
✅ Deployment Scripts (deploy.sh / deploy.bat)  
✅ Docker Support  
✅ Environment Variables Setup  

---

## Features nach Deploy

- 🌍 **Weltweit erreichbar** (Firebase CDN)
- 🔄 **Auto-Sync** bei Code-Push zu GitHub
- 📱 **Mobile Ready** (responsive)
- 🔒 **SSL/HTTPS** (kostenlos)
- ⚡ **Fast** (CDN + Edge Computing)
- 📊 **Analytics** (Firebase Dashboard)

---

## Support

**Firebase Fragen?**
→ https://firebase.google.com/docs/hosting

**Render Fragen?**  
→ https://render.com/docs

**Git Fragen?**
→ https://docs.github.com

---

## Nächste Schritte

1. Öffne **`DEPLOYMENT_CHECKLIST.md`**
2. Folge den 5 Phasen
3. Teile deine URL!

🎉 **Let's go!**
