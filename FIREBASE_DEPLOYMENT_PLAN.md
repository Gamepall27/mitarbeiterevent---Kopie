# Firebase Deployment Plan - Mitarbeiterevent

## Überblick
Das Projekt wird mit Firebase Hosting veröffentlicht mit Express-Server auf Cloud Run.

## Schritte zum Deployment

### 1. Firebase Project erstellen (manuell)
- Gehe zu https://console.firebase.google.com
- Neues Projekt: "mitarbeiterevent-prod" 
- Google Analytics: optional
- Firestore aktivieren (im Projekt)
- Storage aktivieren (für Uploads)

### 2. Firebase CLI Login
```bash
firebase login
```
- Browser öffnet sich
- Melde dich mit Google-Account an
- Genehmige den Zugriff

### 3. Firebase Project mit CLI verbinden
```bash
firebase init
```
- Firestore ✓
- Functions ✓  
- Hosting ✓
- Storage ✓

### 4. Environment-Variablen konfigurieren
Nach dem `firebase init`:
- `.env.local` mit Firebase Config füllen (aus Project Settings)
- `vite.config.js` aktualisieren

### 5. Build & Deploy
```bash
npm run build
firebase deploy
```

## Was wird gemacht:

### Frontend
- Vite build erstellt `dist/` Ordner
- Wird auf Firebase Hosting deployed
- Accessible auf: `https://mitarbeiterevent-prod.web.app`

### Backend-Optionen:

#### Option A: Cloud Run (Recommended)
- Express-Server containerisiert
- Läuft auf Cloud Run
- Kostenlos im kostenlosen Kontingent
- Einfach zu deployen

#### Option B: Cloud Functions
- Express wird in mehrere Functions aufgeteilt
- Cold starts möglich
- Weniger kostspielig bei weniger Traffic

### Datenbank
- Firestore (NoSQL) statt SQLite
- Real-time sync
- Kostenlos im kostenlosen Kontingent
- Auto-scaling

### Storage
- Firebase Storage für Bild-Uploads
- Ersetzt lokale `/uploads` Ordner
- Kostenlos im kostenlosen Kontingent

## Kosten (kostenlos bis zu):
- 50k Firestore Reads/Tag
- 50k Firestore Writes/Tag  
- 20k Delete Ops/Tag
- 1 GB Speicherplatz
- Cloud Run: 2 Millionen Requests/Monat
- Firebase Hosting: Unbegrenzt

## Schritte nacheinander:
1. ✅ Firebase CLI installiert
2. ⏳ Firebase Login
3. ⏳ Firebase init
4. ⏳ Environment Variablen
5. ⏳ Code anpassen (Firestore + Storage)
6. ⏳ Build
7. ⏳ Deploy
