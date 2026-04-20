# ✅ DEPLOYMENT CHECKLISTE - Kostenlos zu Production

## VORAUSSETZUNGEN
- [ ] Node.js installiert (`node -v`)
- [ ] Git installiert (`git -v`)
- [ ] Firebase CLI installiert (`firebase --version`)
- [ ] GitHub Account erstellt
- [ ] Google Account für Firebase

---

## PHASE 1: FIREBASE SETUP (5-10 Min)

### Schritt 1.1: Firebase Project
- [ ] https://console.firebase.google.com öffnen
- [ ] "Add Project" klicken
- [ ] Name: `mitarbeiterevent`
- [ ] Google Analytics: **NEIN**
- [ ] "Create Project" klicken
- [ ] ⏳ Warten (~2-3 Min)

### Schritt 1.2: Realtime Database
- [ ] Links: "Build" → "Realtime Database"
- [ ] "Create Database" klicken
- [ ] Location: **Europe (Belgium)** `eur3`
- [ ] Rules: **Start in test mode**
- [ ] "Enable" klicken

### Schritt 1.3: Firebase Config kopieren
- [ ] ⚙️ Zahnrad oben rechts → "Project Settings"
- [ ] Section "Your apps" finden
- [ ] Falls leer: **"</>"** klicken um Web App zu registrieren
- [ ] Firebase config kopieren (JSON)
- [ ] In `src/config/firebase.js` einfügen (oben beschriebene Werte ersetzen)

Beispiel - Config sieht so aus:
```javascript
export const firebaseConfig = {
  apiKey: "AIzaSyDxxx...",
  authDomain: "mitarbeiterevent.firebaseapp.com",
  databaseURL: "https://mitarbeiterevent-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mitarbeiterevent",
  storageBucket: "mitarbeiterevent.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
}
```

---

## PHASE 2: GITHUB SETUP (5 Min)

### Schritt 2.1: Repository erstellen
- [ ] https://github.com/new öffnen
- [ ] Repository Name: `mitarbeiterevent`
- [ ] Description: `Mitarbeiterevent App`
- [ ] Public oder Private (deine Wahl)
- [ ] "Create repository" klicken

### Schritt 2.2: Code hochladen
```bash
# Im Projektordner ausführen:
git config user.name "Your Name"
git config user.email "your.email@example.com"
git init
git add .
git commit -m "Initial commit: Mitarbeiterevent mit Hinweis-System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mitarbeiterevent.git
git push -u origin main
```

- [ ] Alle Befehle ausgeführt
- [ ] Code auf GitHub sichtbar (repo öffnen)

---

## PHASE 3: RENDER SETUP (10 Min)

### Schritt 3.1: Render Account
- [ ] https://render.com öffnen
- [ ] "Sign Up" mit GitHub klicken
- [ ] Autorisiere Render
- [ ] Account erstellen

### Schritt 3.2: Web Service deployen
- [ ] Im Render Dashboard: **"New+"** → **"Web Service"**
- [ ] GitHub Repo: **"mitarbeiterevent"** verbinden
- [ ] Genehmige den Zugriff
- [ ] Konfiguriere:
  - [ ] **Name:** `mitarbeiterevent-api`
  - [ ] **Runtime:** `Node`
  - [ ] **Region:** `Frankfurt` (oder nächstgelegen)
  - [ ] **Build Command:** `npm install && npm run build`
  - [ ] **Start Command:** `npm run prod`
  - [ ] **Environment:** Production
- [ ] "Create Web Service" klicken
- [ ] ⏳ Warten bis "Live" (3-5 Min)
- [ ] ✅ URL notieren: z.B. `https://mitarbeiterevent-api.onrender.com`

---

## PHASE 4: FIREBASE HOSTING (10 Min)

### Schritt 4.1: Firebase Login
```bash
firebase login
```
- [ ] Browser öffnet sich
- [ ] "Allow" klicken
- [ ] Zurück zu Terminal - sollte erfolg anzeigen

### Schritt 4.2: Firebase init
```bash
firebase init hosting
```

Antworte so:
- **What do you want to use as your public directory?** → `dist`
- **Configure as a single-page app?** → `y` (yes)
- **Set up automatic builds and deploys with GitHub?** → `n` (no)
- **Overwrite dist/index.html?** → `n` (no) - falls gefragt

- [ ] Init vollendet

### Schritt 4.3: Build erstellen
```bash
npm run build
```
- [ ] Build erfolgreich (`dist/` Ordner vorhanden)

### Schritt 4.4: Deploy
```bash
firebase deploy
```
- [ ] ✅ URL notieren: z.B. `https://mitarbeiterevent.web.app`

---

## PHASE 5: TEST & FERTIG! (5 Min)

- [ ] Frontend öffnen: https://mitarbeiterevent.web.app
- [ ] Seite lädt
- [ ] Admin-Login testen (Code: `ADMIN-2026`)
- [ ] Team-Login testen
- [ ] Aufgabe hinzufügen
- [ ] Hinweis hinzufügen
- [ ] Hinweis kaufen testen

---

## WEITERE DEPLOYMENTS

Nach Phase 1-5 ist setup FERTIG! Für zukünftige Updates:

### Lokal entwickeln
```bash
npm run dev
```

### Zu Production deployen (Windows)
```bash
deploy.bat
```

### Zu Production deployen (Mac/Linux)
```bash
bash deploy.sh
```

---

## KOSTENLOSE LIMITS (Unbegrenzt für dich!)

| Service | Limit | Status |
|---------|-------|--------|
| **Firebase Hosting** | Unbegrenzt | ✅ Kostenlos |
| **Render Web Service** | Auto-sleep nach 15 Min | ✅ Kostenlos |
| **Firebase DB** | 1 GB + 100 Connections | ✅ Kostenlos |
| **Bandbreite** | Unbegrenzt | ✅ Kostenlos |
| **SSL/HTTPS** | Inklusive | ✅ Kostenlos |

**Totale Kosten: $0.00** 🎉

---

## SUPPORT

Wenn etwas nicht funktioniert:

### Problem: Firebase Deploy schlägt fehl
```bash
firebase login --reauth
firebase deploy
```

### Problem: Render bleibt auf "Building"
- Warte 5-10 Min
- Oder klicke "Manual Deploy" im Render Dashboard

### Problem: Frontend laden nicht
```bash
npm run build
firebase deploy
```

### Problem: API nicht erreichbar
- Render URL in `vite.config.js` proxy prüfen
- Neu bauen: `npm run build`

---

## 🎉 FERTIG!

Deine App ist jetzt weltweit erreichbar und kostenlos gehostet!

Teile die URL: **https://mitarbeiterevent.web.app**
