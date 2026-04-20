# GitHub Setup (Manual aber einfach!)

## Schritt 1: GitHub Repo erstellen

1. Öffne: https://github.com/new
2. Gib ein:
   - **Repository name:** `mitarbeiterevent`
   - **Description:** `Mitarbeiterevent App mit Hinweis-System`
   - **Public** (nicht private)
3. Klicke: **"Create repository"**

## Schritt 2: Kopiere deine GitHub HTTPS URL

Nach dem Erstellen siehst du die URL:
```
https://github.com/YOUR_USERNAME/mitarbeiterevent.git
```

Kopiere diese URL!

## Schritt 3: Im Terminal hochladen

Im Projektordner einfach ausführen:

```bash
git remote add origin https://github.com/YOUR_USERNAME/mitarbeiterevent.git
git branch -M main
git push -u origin main
```

(Ersetze `YOUR_USERNAME` mit deinem GitHub Username!)

Das wars! Code ist jetzt auf GitHub. ✅

---

## Optional: Mit Render.com Auto-Deploy verbinden

Dann auto-deployed die Backend-API wenn du zu GitHub pushst.

1. Öffne: https://render.com
2. Klicke: "New Web Service"
3. Verbinde dein GitHub `mitarbeiterevent` Repo
4. Configure wie beschrieben in GO_LIVE.md (Schritt 7)

Dann ist alles vollständig automatisiert! 🚀
