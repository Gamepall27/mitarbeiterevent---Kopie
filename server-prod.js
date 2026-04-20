import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.static(path.join(__dirname, 'dist')))
app.use(express.json({ limit: '10mb' }))

// API Routes (alles bleibt gleich wie jetzt)
// Import the existing server.js routes
import('./server.js').catch(err => {
  console.error('Error loading routes:', err)
})

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
  console.log(`📱 Open: http://localhost:${PORT}`)
})
