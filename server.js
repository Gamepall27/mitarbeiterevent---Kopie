import express from 'express'
import multer from 'multer'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  ADMIN_CODE,
  createEmptyTeam,
  createInitialAppState,
  createStationProgress,
  EVENT_DURATION_MINUTES,
  generateUnlockCode,
  stationCatalog,
} from './src/data/mockData.js'
import {
  generateAccessCode,
  getEstimatePoints,
  getStationName,
  getTeamPoints,
  normalizeAnswer,
} from './src/utils/eventModel.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'server-data')
const distDir = path.join(__dirname, 'dist')
const uploadsDir = path.join(dataDir, 'uploads')
const TEAM_SESSION_TIMEOUT_MS = 45_000
const ADMIN_PORTAL_ACCESS_CODE = 'Admin123'
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4173',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5173',
]

fs.mkdirSync(uploadsDir, { recursive: true })

const db = new Database(path.join(dataDir, 'app.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

const upload = multer({ dest: uploadsDir })
const app = express()
const allowedOrigins = new Set(
  [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...String(process.env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  ],
)

app.use((request, response, next) => {
  const origin = request.headers.origin

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }

  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-code, x-team-id, x-team-session')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')

  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }

  next()
})

app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static(uploadsDir))

initializeState()

app.get('/api/state', (request, response) => {
  const teamSession = getTeamSessionFromRequest(request)

  if (!teamSession) {
    response.json({ appState: toClientAppState(readState()) })
    return
  }

  const state = readState()
  const team = state.teams.find((entry) => entry.id === teamSession.teamId)

  if (!team || !isTeamSessionValid(team, teamSession.sessionId)) {
    response.json({
      appState: toClientAppState(state),
      teamSessionValid: false,
    })
    return
  }

  const nextState = mutateState((draft) => {
    const activeTeam = requireTeam(draft, teamSession.teamId)
    touchTeamSession(activeTeam)
  })

  response.json({
    appState: toClientAppState(nextState),
    teamSessionValid: true,
  })
})

app.post('/api/admin/login', (request, response) => {
  if (!isValidAdminCode(request.body?.code)) {
    response.status(401).json({ message: 'Admin-Code ungueltig.' })
    return
  }

  response.json({ ok: true })
})

app.post('/api/access/login', (request, response) => {
  const state = readState()
  const identifier = normalizeAnswer(request.body?.code)
  const sessionId = crypto.randomUUID()
  const matchingCode = state.accessCodes.find(
    (entry) => normalizeAnswer(entry.code) === identifier,
  )

  if (!matchingCode) {
    response.status(404).json({ message: 'Kein gueltiger Gruppencode gefunden.' })
    return
  }

  if (!matchingCode.teamId) {
    response.status(409).json({
      message: 'Dieser Gruppencode muss zuerst mit einem Gruppennamen eingerichtet werden.',
    })
    return
  }

  let activeTeamId = matchingCode.teamId
  let nextTab = 'start'

  try {
    const nextState = mutateState((draft) => {
      const codeEntry = draft.accessCodes.find((entry) => entry.id === matchingCode.id)

      if (!codeEntry) {
        throw new Error('Gruppencode nicht mehr vorhanden.')
      }

      const team = draft.teams.find((entry) => entry.id === codeEntry.teamId)

      if (!team) {
        throw new Error('Zugehoerige Gruppe wurde nicht gefunden.')
      }

      if (hasActiveTeamSession(team)) {
        throw createHttpError(
          409,
          'Dieses Team ist bereits auf einem anderen Geraet angemeldet.',
        )
      }

      activeTeamId = team.id
      team.currentSessionId = sessionId
      touchTeamSession(team)
      nextTab = draft.eventStartedAt ? 'missions' : 'start'
    })

    response.json({
      appState: toClientAppState(nextState),
      teamId: activeTeamId,
      teamSessionId: sessionId,
      nextTab,
    })
  } catch (error) {
    response.status(error.statusCode ?? 500).json({
      message: error.message ?? 'Login fehlgeschlagen.',
    })
  }
})

app.post('/api/access/register-group', (request, response) => {
  const state = readState()
  const identifier = normalizeAnswer(request.body?.code)
  const requestedGroupName = String(request.body?.groupName ?? '').trim()
  const matchingCode = state.accessCodes.find(
    (entry) => normalizeAnswer(entry.code) === identifier,
  )

  if (!matchingCode) {
    response.status(404).json({ message: 'Kein gueltiger Gruppencode gefunden.' })
    return
  }

  if (!requestedGroupName) {
    response.status(400).json({ message: 'Bitte einen Gruppennamen eingeben.' })
    return
  }

  if (matchingCode.teamId) {
    response.status(409).json({ message: 'Dieser Gruppencode ist bereits eingerichtet.' })
    return
  }

  try {
    const nextState = mutateState((draft) => {
      const codeEntry = draft.accessCodes.find((entry) => entry.id === matchingCode.id)

      if (!codeEntry) {
        throw new Error('Gruppencode nicht mehr vorhanden.')
      }

      if (codeEntry.teamId) {
        throw createHttpError(409, 'Dieser Gruppencode ist bereits eingerichtet.')
      }

      const newTeam = createEmptyTeam({
        id: crypto.randomUUID(),
        code: codeEntry.code,
        name: requestedGroupName,
        started: Boolean(draft.eventStartedAt),
        startedAt: draft.eventStartedAt ?? null,
        stations: getStations(draft),
      })

      codeEntry.teamId = newTeam.id
      codeEntry.assignedGroupName = newTeam.name
      codeEntry.activatedAt = new Date().toISOString()
      draft.teams.push(newTeam)
    })

    response.json({
      appState: toClientAppState(nextState),
      message: 'Gruppe angelegt. Bitte jetzt mit dem Gruppencode anmelden.',
    })
  } catch (error) {
    response.status(error.statusCode ?? 500).json({
      message: error.message ?? 'Gruppe konnte nicht angelegt werden.',
    })
  }
})

app.post('/api/admin/codes', requireAdmin, (request, response) => {
  try {
    const requestedCode = normalizeAccessCode(request.body?.code)
    const state = readState()

    if (
      requestedCode &&
      state.accessCodes.some((entry) => normalizeAccessCode(entry.code) === requestedCode)
    ) {
      response.status(409).json({ message: 'Dieser Gruppencode existiert bereits.' })
      return
    }

    const codeEntry = {
      id: crypto.randomUUID(),
      code: requestedCode || generateAccessCode(),
      createdAt: new Date().toISOString(),
      teamId: null,
      assignedGroupName: '',
      activatedAt: null,
    }

    const nextState = mutateState((draft) => {
      draft.accessCodes.unshift(codeEntry)
    })

    respondWithAppState(response, nextState, {
      code: codeEntry.code,
      message: `Neuer Gruppencode erstellt: ${codeEntry.code}`,
    })
  } catch (error) {
    response.status(error.statusCode ?? 500).json({
      message: error.message ?? 'Gruppencode konnte nicht erstellt werden.',
    })
  }
})

app.post('/api/admin/stations', requireAdmin, upload.single('stationImage'), (request, response) => {
  try {
    const payload = createStationFromPayload(request.body, request.file)

    const nextState = mutateState((draft) => {
      const stations = getStations(draft)
      draft.stations = [...stations, payload]

      draft.teams = draft.teams.map((team) => ({
        ...team,
        stationProgress: {
          ...team.stationProgress,
          [payload.id]: createStationProgress([payload])[payload.id],
        },
      }))
    })

    respondWithAppState(response, nextState, { message: 'Aufgabe hinzugefuegt.' })
  } catch (error) {
    cleanupUploadedFile(request.file)
    response.status(error.statusCode ?? 500).json({
      message: error.message ?? 'Aufgabe konnte nicht angelegt werden.',
    })
  }
})

app.post('/api/admin/stations/:stationId/delete', requireAdmin, (request, response) => {
  const nextState = mutateState((draft) => {
    const stations = getStations(draft)
    const stationToDelete = stations.find((station) => station.id === request.params.stationId)
    draft.stations = stations.filter((station) => station.id !== request.params.stationId)
    cleanupStationAsset(stationToDelete)

    draft.teams = draft.teams.map((team) => {
      cleanupProgressAsset(team.stationProgress[request.params.stationId])
      const { [request.params.stationId]: _removed, ...restProgress } = team.stationProgress
      const nextSelectedStationId =
        team.selectedStationId === request.params.stationId
          ? draft.stations[0]?.id ?? null
          : team.selectedStationId

      return {
        ...team,
        selectedStationId: nextSelectedStationId,
        stationProgress: restProgress,
      }
    })
  })

  respondWithAppState(response, nextState, { message: 'Aufgabe entfernt.' })
})

app.post('/api/admin/team/:teamId/delete', requireAdmin, (request, response) => {
  const nextState = mutateState((draft) => {
    const team = requireTeam(draft, request.params.teamId)
    draft.teams = draft.teams.filter((entry) => entry.id !== request.params.teamId)
    draft.accessCodes = draft.accessCodes.filter(
      (entry) => entry.teamId !== request.params.teamId,
    )

    cleanupTeamUploads(team)
  })

  respondWithAppState(response, nextState, { message: 'Gruppe geloescht.' })
})

app.post('/api/team/:teamId/logout', requireTeamSession, (request, response) => {
  const nextState = mutateState((draft) => {
    const team = requireTeam(draft, request.params.teamId)
    team.currentSessionId = ''
    team.sessionSeenAt = null
  })

  respondWithAppState(response, nextState, { message: 'Team abgemeldet.' })
})

app.post('/api/admin/team/:teamId/start', requireAdmin, (request, response) => {
  const nextState = mutateState((draft) => {
    startEvent(draft)
  })

  respondWithAppState(response, nextState, {
    message: 'Event-Timer gestartet. Alle Gruppen laufen jetzt synchron.',
  })
})

app.post('/api/admin/event/start', requireAdmin, (_request, response) => {
  const nextState = mutateState((draft) => {
    startEvent(draft)
  })

  respondWithAppState(response, nextState, {
    message: 'Event-Timer gestartet. Alle Gruppen laufen jetzt synchron.',
  })
})

app.post('/api/admin/event/pause', requireAdmin, (_request, response) => {
  const nextState = mutateState((draft) => {
    pauseEvent(draft)
  })

  respondWithAppState(response, nextState, {
    message: 'Event-Timer pausiert.',
  })
})

app.post('/api/admin/event/resume', requireAdmin, (_request, response) => {
  const nextState = mutateState((draft) => {
    resumeEvent(draft)
  })

  respondWithAppState(response, nextState, {
    message: 'Event-Timer fortgesetzt.',
  })
})

app.post('/api/admin/event/stop', requireAdmin, (_request, response) => {
  const nextState = mutateState((draft) => {
    stopEvent(draft)
  })

  respondWithAppState(response, nextState, {
    message: 'Event-Timer gestoppt.',
  })
})

app.post('/api/admin/event/reset', requireAdmin, (_request, response) => {
  const nextState = mutateState((draft) => {
    resetEventTimer(draft)
  })

  respondWithAppState(response, nextState, {
    message: 'Event-Timer zurueckgesetzt.',
  })
})

app.post('/api/team/:teamId/select-station', requireTeamSession, (request, response) => {
  const nextState = mutateState((draft) => {
    const team = requireTeam(draft, request.params.teamId)
    team.selectedStationId = request.body?.stationId ?? team.selectedStationId
    touchTeamSession(team)
  })

  respondWithAppState(response, nextState)
})

app.post('/api/team/:teamId/stations/:stationId/unlock', requireTeamSession, (request, response) => {
  const state = readState()
  const eventInteractionError = getEventInteractionError(state)

  if (eventInteractionError) {
    response.status(409).json({ message: eventInteractionError })
    return
  }

  const stations = getStations(state)
  const station = stations.find((entry) => entry.id === request.params.stationId)

  if (!station) {
    response.status(404).json({ message: 'Station nicht gefunden.' })
    return
  }

  const unlockCode = normalizeUnlockCode(request.body?.code)

  if (!unlockCode) {
    response.status(400).json({ message: 'Bitte geben Sie einen Code ein.' })
    return
  }

  if (unlockCode.length !== 4) {
    response
      .status(400)
      .json({ message: 'Bitte einen 4-stelligen Code mit Buchstaben oder Zahlen eingeben.' })
    return
  }

  const matchingStations = stations.filter(
    (entry) => getStationUnlockCode(entry) === unlockCode,
  )
  const targetStation =
    matchingStations.find((entry) => entry.id === request.params.stationId) ??
    (matchingStations.length === 1 ? matchingStations[0] : null)

  if (!targetStation) {
    response.status(401).json({ message: 'Falscher Code.' })
    return
  }

  const nextState = mutateState((draft) => {
    const team = requireTeam(draft, request.params.teamId)
    const progress = team.stationProgress[targetStation.id]
    touchTeamSession(team)
    progress.unlocked = true
    team.selectedStationId = targetStation.id
  })

  respondWithAppState(response, nextState, {
    message:
      targetStation.id === request.params.stationId
        ? 'Station freigeschaltet!'
        : `${targetStation.name} wurde mit diesem Code freigeschaltet.`,
  })
})

app.post(
  '/api/team/:teamId/stations/:stationId/submit',
  requireTeamSession,
  upload.single('file'),
  (request, response) => {
    const state = readState()
    const eventInteractionError = getEventInteractionError(state)

    if (eventInteractionError) {
      response.status(409).json({ message: eventInteractionError })
      return
    }

    const stations = getStations(state)
    const station = stations.find((entry) => entry.id === request.params.stationId)

    if (!station) {
      response.status(404).json({ message: 'Station nicht gefunden.' })
      return
    }

    const submittedBy = String(request.body?.memberName ?? '').trim()
    const answer = String(request.body?.answer ?? '')

    try {
      const nextState = mutateState((draft) => {
        const team = requireTeam(draft, request.params.teamId)
        const progress = team.stationProgress[station.id]
        const submittedAt = new Date().toISOString()
        const nextAttempts = progress.attempts + 1
        touchTeamSession(team)

        if (progress.status === 'solved') {
          return
        }

        if (progress.submittedAt) {
          throw createHttpError(
            409,
            'Diese Antwort wurde bereits abgeschickt und kann nicht mehr bearbeitet werden.',
          )
        }

        if (station.type === 'photo') {
          if (!request.file) {
            throw createHttpError(400, 'Bitte zuerst ein Foto auswaehlen.')
          }

          progress.status = 'pending'
          progress.attempts = nextAttempts
          progress.submittedAt = submittedAt
          progress.assetName = request.file.originalname
          progress.assetUrl = `/uploads/${request.file.filename}`
          progress.submittedBy = submittedBy
          progress.reviewNote = ''
          progress.reviewedAt = null
          team.selectedStationId = station.id
          prependActivity(team, `${station.name} zur Freigabe eingereicht`)
          return
        }

        if (station.type === 'manual') {
          if (!answer.trim()) {
            throw createHttpError(400, 'Bitte zuerst euren Freitext eintragen.')
          }

          progress.status = 'pending'
          progress.attempts = nextAttempts
          progress.answer = answer
          progress.submittedAt = submittedAt
          progress.submittedBy = submittedBy
          progress.reviewNote = ''
          progress.reviewedAt = null
          team.selectedStationId = station.id
          prependActivity(team, `${station.name} zur Freigabe eingereicht`)
          return
        }

        if (station.type === 'estimate') {
          const awardedPoints = getEstimatePoints(station, answer)

          progress.attempts = nextAttempts
          progress.answer = answer
          progress.submittedAt = submittedAt
          progress.submittedBy = submittedBy
          progress.pointsAwarded = awardedPoints
          progress.status = 'solved'
          progress.solvedAt = submittedAt
          progress.reviewNote = ''
          progress.reviewedAt = submittedAt
          team.selectedStationId = station.id
          prependActivity(team, `${station.name} als Schaetzaufgabe abgeschlossen`)
          return
        }

        const isCorrect = normalizeAnswer(answer) === normalizeAnswer(station.answer)

        progress.attempts = nextAttempts
        progress.answer = answer
        progress.submittedAt = submittedAt
        progress.submittedBy = submittedBy
        progress.pointsAwarded = isCorrect ? station.points : 0
        team.selectedStationId = station.id

        if (!isCorrect) {
          prependActivity(team, `${station.name} falsch beantwortet`)
          return
        }

        progress.status = 'solved'
        progress.solvedAt = submittedAt
        progress.reviewNote = ''
        progress.reviewedAt = submittedAt
        prependActivity(team, `${station.name} erfolgreich abgeschlossen`)
      })

      respondWithAppState(response, nextState, {
        message: getSubmissionMessage(station, nextState, request.params.teamId),
      })
    } catch (error) {
      cleanupUploadedFile(request.file)

      if (error.statusCode) {
        response.status(error.statusCode).json({ message: error.message })
        return
      }

      response.status(500).json({ message: 'Station konnte nicht gespeichert werden.' })
    }
  },
)

app.get('/api/admin/approvals', requireAdmin, (_request, response) => {
  response.json({ approvals: buildApprovals(readState()) })
})

app.post('/api/admin/team/:teamId/bonus', requireAdmin, (request, response) => {
  const delta = Number(request.body?.delta ?? 0)
  const state = readState()
  const stations = getStations(state)
  const team = state.teams.find((entry) => entry.id === request.params.teamId)

  if (!team) {
    response.status(404).json({ message: 'Team nicht gefunden.' })
    return
  }

  const appliedDelta =
    delta >= 0 ? delta : -Math.min(Math.abs(delta), getTeamPoints(team, stations))

  const nextState = mutateState((draft) => {
    const activeTeam = requireTeam(draft, request.params.teamId)

    if (appliedDelta >= 0) {
      activeTeam.bonusPoints += appliedDelta
    } else {
      activeTeam.penaltyPoints += Math.abs(appliedDelta)
    }

    prependActivity(
      activeTeam,
      `${appliedDelta >= 0 ? 'Bonus' : 'Abzug'} von ${Math.abs(appliedDelta)} Punkten gesetzt`,
    )
  })

  respondWithAppState(response, nextState, {
    message: appliedDelta >= 0 ? 'Bonuspunkte gesetzt.' : 'Punkteabzug gesetzt.',
  })
})

app.post('/api/team/:teamId/stations/:stationId/buy-hint', requireTeamSession, (request, response) => {
  const state = readState()
  const eventInteractionError = getEventInteractionError(state)

  if (eventInteractionError) {
    response.status(409).json({ message: eventInteractionError })
    return
  }

  const stations = getStations(state)
  const station = stations.find((entry) => entry.id === request.params.stationId)

  if (!station) {
    response.status(404).json({ message: 'Station nicht gefunden.' })
    return
  }

  const hintId = request.body?.hintId

  if (!hintId) {
    response.status(400).json({ message: 'Hinweis-ID erforderlich.' })
    return
  }

  const hint = station.hints?.find((entry) => entry.id === hintId)

  if (!hint) {
    response.status(404).json({ message: 'Hinweis nicht gefunden.' })
    return
  }

  const team = state.teams.find((entry) => entry.id === request.params.teamId)

  if (!team) {
    response.status(404).json({ message: 'Team nicht gefunden.' })
    return
  }

  if (getTeamPoints(team, stations) < hint.cost) {
    response.status(400).json({ message: 'Nicht genug Punkte fuer diesen Hinweis.' })
    return
  }

  const nextState = mutateState((draft) => {
    const activeTeam = requireTeam(draft, request.params.teamId)
    const progress = activeTeam.stationProgress[request.params.stationId]
    touchTeamSession(activeTeam)

    if (!progress.boughtHints) {
      progress.boughtHints = []
    }

    if (!progress.boughtHints.includes(hintId)) {
      progress.boughtHints.push(hintId)
    }
  })

  respondWithAppState(response, nextState, {
    message: `Hinweis gekauft! ${hint.cost} Punkte abgezogen.`,
  })
})

app.post('/api/admin/team/:teamId/toggle-active', requireAdmin, (request, response) => {
  const nextState = mutateState((draft) => {
    const team = requireTeam(draft, request.params.teamId)
    team.active = !team.active
    prependActivity(team, team.active ? 'Gruppe reaktiviert' : 'Gruppe pausiert')
  })

  const team = requireTeam(nextState, request.params.teamId)
  respondWithAppState(response, nextState, {
    message: team.active ? 'Gruppe aktiviert.' : 'Gruppe deaktiviert.',
  })
})

app.post(
  '/api/admin/team/:teamId/stations/:stationId/review',
  requireAdmin,
  (request, response) => {
    const action = request.body?.action
    const reviewNote = String(request.body?.reviewNote ?? '').trim()

    if (!['approve', 'reject'].includes(action)) {
      response.status(400).json({ message: 'Ungueltige Freigabe-Aktion.' })
      return
    }

    const nextState = mutateState((draft) => {
      const team = requireTeam(draft, request.params.teamId)
      const progress = team.stationProgress[request.params.stationId]
      const station = getStations(draft).find((entry) => entry.id === request.params.stationId)

      if (!progress) {
        throw createHttpError(404, 'Stationsstand nicht gefunden.')
      }

      if (!station) {
        throw createHttpError(404, 'Station nicht gefunden.')
      }

      const stationName = getStationName(request.params.stationId, getStations(draft))
      progress.reviewedAt = new Date().toISOString()
      progress.reviewNote = reviewNote

      if (action === 'approve') {
        progress.status = 'solved'
        progress.solvedAt = progress.solvedAt ?? progress.reviewedAt
        progress.pointsAwarded =
          ['manual', 'photo'].includes(station.type)
            ? getApprovedManualPoints(request.body?.awardedPoints, station.points)
            : progress.pointsAwarded || getStationPoints(draft, request.params.stationId)
        prependActivity(team, `${stationName} freigegeben`)
        return
      }

      progress.status = 'rejected'
      progress.solvedAt = null
      progress.pointsAwarded = 0
      prependActivity(team, `${stationName} abgelehnt`)
    })

    respondWithAppState(response, nextState, {
      message: action === 'approve' ? 'Freigabe bestaetigt.' : 'Freigabe abgelehnt.',
    })
  },
)

app.post('/api/admin/settings/timer', requireAdmin, (request, response) => {
  const eventDurationMinutes = Number(request.body?.eventDurationMinutes)

  if (!Number.isFinite(eventDurationMinutes) || eventDurationMinutes < 1) {
    response.status(400).json({ message: 'Bitte eine gueltige Timer-Laenge in Minuten angeben.' })
    return
  }

  const nextState = mutateState((draft) => {
    draft.eventDurationMinutes = Math.round(eventDurationMinutes)
  })

  respondWithAppState(response, nextState, {
    message: `Timer-Laenge auf ${nextState.eventDurationMinutes} Minuten gesetzt.`,
  })
})

app.post('/api/admin/reset', requireAdmin, (_request, response) => {
  cleanupStateUploads(readState())
  const nextState = createInitialAppState()
  writeState(nextState)
  respondWithAppState(response, nextState, { message: 'Daten zurueckgesetzt.' })
})

if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api(?:\/|$)|\/uploads(?:\/|$)).*/, (_request, response) => {
    response.sendFile(path.join(distDir, 'index.html'))
  })
}

const port = Number(globalThis.process?.env?.PORT ?? 3001)
app.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on http://0.0.0.0:${port}`)
})

function initializeState() {
  const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get()

  if (!row) {
    writeState(createInitialAppState())
    return
  }

  writeState(migrateState(JSON.parse(row.state_json)))
}

function readState() {
  const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get()
  return row ? migrateState(JSON.parse(row.state_json)) : createInitialAppState()
}

function writeState(state) {
  db.prepare(
    `
      INSERT INTO app_state (id, state_json, updated_at)
      VALUES (1, @state_json, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = excluded.updated_at
    `,
  ).run({
    state_json: JSON.stringify(state),
    updated_at: new Date().toISOString(),
  })
}

function mutateState(mutator) {
  const draft = migrateState(readState())
  mutator(draft)
  writeState(draft)
  return draft
}

function migrateState(state) {
  const migratedEventStartedAt =
    typeof state.eventStartedAt === 'string' && state.eventStartedAt
      ? state.eventStartedAt
      : (state.teams ?? [])
          .map((team) => team.startedAt)
          .filter(Boolean)
          .sort()[0] ?? null
  const stations = (Array.isArray(state.stations) ? state.stations : stationCatalog).map(
    (station) => ({
      ...station,
      requiresUnlockCode: station.requiresUnlockCode !== false,
      unlockCode:
        station.requiresUnlockCode === false
          ? ''
          : getStationUnlockCode(station, { generateIfMissing: true }),
    }),
  )

  return {
    ...state,
    eventDurationMinutes:
      Number.isFinite(Number(state.eventDurationMinutes)) && Number(state.eventDurationMinutes) > 0
        ? Math.round(Number(state.eventDurationMinutes))
        : EVENT_DURATION_MINUTES,
    eventStartedAt: migratedEventStartedAt,
    eventStatus: migrateEventStatus(state.eventStatus, migratedEventStartedAt),
    eventPausedAt:
      typeof state.eventPausedAt === 'string' && state.eventPausedAt ? state.eventPausedAt : null,
    eventPausedDurationMs: Math.max(0, Number(state.eventPausedDurationMs) || 0),
    stations,
    teams: (state.teams ?? []).map((team) => ({
      ...team,
      currentSessionId: team.currentSessionId ?? '',
      sessionSeenAt: team.sessionSeenAt ?? null,
      started: Boolean(migratedEventStartedAt),
      startedAt: migratedEventStartedAt ?? null,
      selectedStationId: team.selectedStationId ?? stations[0]?.id ?? null,
      stationProgress: createStationProgress(stations, team.stationProgress ?? {}),
    })),
  }
}

function getStations(state) {
  return Array.isArray(state.stations) ? state.stations : stationCatalog
}

function prependActivity(team, text) {
  team.activityLog.unshift({
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
  })
  team.activityLog = team.activityLog.slice(0, 8)
}

function requireTeam(state, teamId) {
  const team = state.teams.find((entry) => entry.id === teamId)

  if (!team) {
    throw createHttpError(404, 'Gruppe nicht gefunden.')
  }

  return team
}

function requireAdmin(request, response, next) {
  const code = request.headers['x-admin-code']

  if (!isValidAdminCode(code)) {
    response.status(401).json({ message: 'Admin-Code ungueltig.' })
    return
  }

  next()
}

function requireTeamSession(request, response, next) {
  const teamSession = getTeamSessionFromRequest(request)

  if (!teamSession || teamSession.teamId !== request.params.teamId) {
    response.status(401).json({ message: 'Dieses Geraet ist fuer das Team nicht angemeldet.' })
    return
  }

  const state = readState()
  const team = state.teams.find((entry) => entry.id === request.params.teamId)

  if (!team || !isTeamSessionValid(team, teamSession.sessionId)) {
    response.status(401).json({
      message: 'Dieses Team ist bereits auf einem anderen Geraet angemeldet.',
    })
    return
  }

  next()
}

function isValidAdminCode(code) {
  const normalizedCode = normalizeAnswer(code)
  return (
    normalizedCode === normalizeAnswer(ADMIN_CODE) ||
    normalizedCode === normalizeAnswer(ADMIN_PORTAL_ACCESS_CODE)
  )
}

function startEvent(state) {
  const startedAt = new Date().toISOString()
  state.eventStartedAt = startedAt
  state.eventStatus = 'running'
  state.eventPausedAt = null
  state.eventPausedDurationMs = 0

  state.teams.forEach((team) => {
    team.started = true
    team.startedAt = startedAt
    team.active = true
    prependActivity(team, 'Event-Timer gestartet')
  })
}

function pauseEvent(state) {
  if (!state.eventStartedAt || state.eventStatus !== 'running') {
    return
  }

  state.eventStatus = 'paused'
  state.eventPausedAt = new Date().toISOString()

  state.teams.forEach((team) => {
    prependActivity(team, 'Event-Timer pausiert')
  })
}

function resumeEvent(state) {
  if (!state.eventStartedAt || state.eventStatus !== 'paused' || !state.eventPausedAt) {
    return
  }

  const pausedMs = Date.now() - new Date(state.eventPausedAt).getTime()
  state.eventPausedDurationMs += Math.max(pausedMs, 0)
  state.eventPausedAt = null
  state.eventStatus = 'running'

  state.teams.forEach((team) => {
    prependActivity(team, 'Event-Timer fortgesetzt')
  })
}

function stopEvent(state) {
  if (!state.eventStartedAt || ['idle', 'stopped'].includes(state.eventStatus)) {
    return
  }

  if (state.eventStatus === 'paused' && state.eventPausedAt) {
    const pausedMs = Date.now() - new Date(state.eventPausedAt).getTime()
    state.eventPausedDurationMs += Math.max(pausedMs, 0)
  }

  state.eventPausedAt = null
  state.eventStatus = 'stopped'

  state.teams.forEach((team) => {
    prependActivity(team, 'Event-Timer gestoppt')
  })
}

function resetEventTimer(state) {
  state.eventStartedAt = null
  state.eventStatus = 'idle'
  state.eventPausedAt = null
  state.eventPausedDurationMs = 0

  state.teams.forEach((team) => {
    team.started = false
    team.startedAt = null
    prependActivity(team, 'Event-Timer zurueckgesetzt')
  })
}

function migrateEventStatus(rawStatus, eventStartedAt) {
  if (!eventStartedAt) {
    return 'idle'
  }

  if (['running', 'paused', 'stopped'].includes(rawStatus)) {
    return rawStatus
  }

  return 'running'
}

function getEventInteractionError(state) {
  const eventStatus = getEffectiveEventStatus(state)

  if (eventStatus === 'idle') {
    return 'Der Event-Timer wurde noch nicht gestartet.'
  }

  if (eventStatus === 'paused') {
    return 'Der Event-Timer ist aktuell pausiert.'
  }

  if (eventStatus === 'stopped') {
    return 'Der Event-Timer wurde gestoppt oder ist bereits abgelaufen.'
  }

  return null
}

function getEffectiveEventStatus(state) {
  if (!state.eventStartedAt) {
    return 'idle'
  }

  if (state.eventStatus === 'paused' || state.eventStatus === 'stopped') {
    return state.eventStatus
  }

  const elapsedMs =
    Date.now() -
    new Date(state.eventStartedAt).getTime() -
    Math.max(0, Number(state.eventPausedDurationMs) || 0)

  return elapsedMs >= state.eventDurationMinutes * 60_000 ? 'stopped' : 'running'
}

function createHttpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function respondWithAppState(response, state, payload = {}) {
  response.json({
    ...payload,
    appState: toClientAppState(state),
  })
}

function toClientAppState(state) {
  const effectiveEventStatus = getEffectiveEventStatus(state)

  return {
    ...state,
    eventStatus: effectiveEventStatus,
    teams: (state.teams ?? []).map((team) => {
      const publicTeam = { ...team }
      delete publicTeam.currentSessionId
      delete publicTeam.sessionSeenAt
      return publicTeam
    }),
  }
}

function getTeamSessionFromRequest(request) {
  const teamId = String(request.headers['x-team-id'] ?? '').trim()
  const sessionId = String(request.headers['x-team-session'] ?? '').trim()

  if (!teamId || !sessionId) {
    return null
  }

  return { teamId, sessionId }
}

function hasActiveTeamSession(team) {
  if (!team.currentSessionId || !team.sessionSeenAt) {
    return false
  }

  const sessionAgeMs = Date.now() - new Date(team.sessionSeenAt).getTime()
  return Number.isFinite(sessionAgeMs) && sessionAgeMs <= TEAM_SESSION_TIMEOUT_MS
}

function isTeamSessionValid(team, sessionId) {
  return Boolean(team.currentSessionId) && team.currentSessionId === sessionId && hasActiveTeamSession(team)
}

function touchTeamSession(team) {
  team.sessionSeenAt = new Date().toISOString()
}

function cleanupUploadedFile(file) {
  if (!file?.path) {
    return
  }

  fs.rm(file.path, { force: true }, () => {})
}

function cleanupTeamUploads(team) {
  Object.values(team.stationProgress ?? {}).forEach((progress) => {
    cleanupProgressAsset(progress)
  })
}

function normalizeAccessCode(value) {
  const normalized = String(value ?? '').trim().toUpperCase()

  if (!normalized) {
    return ''
  }

  if (!/^[A-Z0-9-]{3,32}$/.test(normalized)) {
    throw createHttpError(
      400,
      'Bitte nur Gruppencodes mit 3 bis 32 Zeichen aus Buchstaben, Zahlen oder Bindestrichen verwenden.',
    )
  }

  return normalized
}

function cleanupStateUploads(state) {
  Object.values(state.teams ?? []).forEach((team) => {
    cleanupTeamUploads(team)
  })

  Object.values(getStations(state) ?? []).forEach((station) => {
    cleanupStationAsset(station)
  })
}

function cleanupProgressAsset(progress) {
  if (!progress?.assetUrl?.startsWith('/uploads/')) {
    return
  }

  const filePath = path.join(uploadsDir, progress.assetUrl.replace('/uploads/', ''))
  fs.rm(filePath, { force: true }, () => {})
}

function createStationFromPayload(body, file) {
  const type = String(body?.type ?? 'text')
  const name = String(body?.name ?? '').trim()
  const task = String(body?.task ?? '').trim()
  const requiresUnlockCode = parseBoolean(body?.requiresUnlockCode, true)

  if (!name || !task) {
    throw createHttpError(400, 'Name und Aufgabe sind Pflichtfelder.')
  }

  let choices
  let answer = ['photo', 'manual'].includes(type)
    ? ''
    : String(body?.answer ?? '').trim()

  if (type === 'choice') {
    const rawChoiceOptions = body?.choiceOptions
    let parsedChoiceOptions = []

    if (Array.isArray(rawChoiceOptions)) {
      parsedChoiceOptions = rawChoiceOptions
    } else if (typeof rawChoiceOptions === 'string' && rawChoiceOptions.trim()) {
      try {
        parsedChoiceOptions = JSON.parse(rawChoiceOptions)
      } catch {
        parsedChoiceOptions = []
      }
    }

    if (parsedChoiceOptions.length > 0) {
      choices = parsedChoiceOptions
        .map((entry, index) => ({
          id: String(entry?.id ?? `choice-${index + 1}`),
          label: String(entry?.label ?? '').trim(),
          isCorrect: Boolean(entry?.isCorrect),
        }))
        .filter((entry) => entry.label)

      if (choices.length < 2) {
        throw createHttpError(400, 'Multiple-Choice-Aufgaben brauchen mindestens zwei Optionen.')
      }

      const correctChoices = choices.filter((entry) => entry.isCorrect)

      if (correctChoices.length !== 1) {
        throw createHttpError(400, 'Bitte genau eine richtige Antwort festlegen.')
      }

      answer = correctChoices[0].id
    } else {
      choices = String(body?.choicesText ?? '')
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((label, index) => ({
          id: String.fromCharCode(97 + index),
          label,
          isCorrect:
            normalizeAnswer(String(body?.answer ?? '').trim()) === String.fromCharCode(97 + index),
        }))

      if (choices.length < 2) {
        throw createHttpError(400, 'Multiple-Choice-Aufgaben brauchen mindestens zwei Optionen.')
      }
    }
  }

  const unlockCode = normalizeUnlockCode(body?.unlockCode)
  let hints = []
  try {
    if (body?.hints) {
      hints = Array.isArray(body.hints) ? body.hints : JSON.parse(body.hints)
    }
  } catch {
    // Wenn hints nicht geparst werden können, ist es leer
  }

  return {
    id: `task-${crypto.randomUUID().slice(0, 8)}`,
    name,
    zone: String(body?.zone ?? 'Allgemein').trim() || 'Allgemein',
    area: String(body?.area ?? 'Custom').trim() || 'Custom',
    type,
    requiresUnlockCode,
    format: String(body?.format ?? 'Admin-Aufgabe').trim() || 'Admin-Aufgabe',
    mandatory: Boolean(body?.mandatory),
    points: Number(body?.points ?? 0),
    fragment: String(body?.fragment ?? '').trim() || null,
    locationHint: String(body?.locationHint ?? '').trim(),
    task,
    answer,
    placeholder: String(body?.placeholder ?? 'Antwort eingeben').trim() || 'Antwort eingeben',
    rewardHint: String(body?.rewardHint ?? '').trim(),
    imageName: file?.originalname ?? '',
    imageUrl: file ? `/uploads/${file.filename}` : '',
    unlockCode: requiresUnlockCode
      ? unlockCode.length === 4
        ? unlockCode
        : generateUnlockCode()
      : '',
    hints,
    ...(choices ? { choices } : {}),
  }
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'true') {
      return true
    }

    if (normalized === 'false') {
      return false
    }
  }

  return fallback
}

function normalizeUnlockCode(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 4)
}

function getStationUnlockCode(station, options = {}) {
  if (station?.requiresUnlockCode === false) {
    return ''
  }

  const normalizedUnlockCode = normalizeUnlockCode(station?.unlockCode)

  if (normalizedUnlockCode.length === 4) {
    return normalizedUnlockCode
  }

  const answerFallback = normalizeUnlockCode(station?.answer)

  if (answerFallback.length === 4) {
    return answerFallback
  }

  if (options.generateIfMissing) {
    return generateUnlockCode()
  }

  return ''
}

function cleanupStationAsset(station) {
  if (!station?.imageUrl?.startsWith('/uploads/')) {
    return
  }

  const filePath = path.join(uploadsDir, station.imageUrl.replace('/uploads/', ''))
  fs.rm(filePath, { force: true }, () => {})
}

function getStationPoints(state, stationId) {
  return getStations(state).find((station) => station.id === stationId)?.points ?? 0
}

function getApprovedManualPoints(rawValue, maxPoints) {
  const parsedValue = Number(rawValue)

  if (!Number.isFinite(parsedValue)) {
    return maxPoints
  }

  return Math.min(maxPoints, Math.max(0, Math.round(parsedValue)))
}

function buildApprovals(state) {
  const stations = getStations(state)

  return state.teams.flatMap((team) =>
    stations
      .filter((station) => team.stationProgress[station.id]?.status === 'pending')
      .map((station) => {
        const progress = team.stationProgress[station.id]

        return {
          teamId: team.id,
          teamName: team.name,
          stationId: station.id,
          stationName: station.name,
          stationType: station.type,
          stationPoints: station.points,
          submittedAt: progress.submittedAt,
          submittedBy: progress.submittedBy,
          answer: progress.answer,
          assetName: progress.assetName,
          assetUrl: progress.assetUrl,
        }
      }),
  )
}

function getSubmissionMessage(station, state, teamId) {
  const team = state.teams.find((entry) => entry.id === teamId)
  const progress = team?.stationProgress[station.id]

  if (!progress) {
    return 'Station gespeichert.'
  }

  if (station.type === 'photo' || station.type === 'manual') {
    return 'Antwort eingereicht. Das Admin-Team prueft jetzt die Station.'
  }

  if (station.type === 'estimate') {
    return `Schaetzaufgabe gespeichert. Ihr habt ${progress.pointsAwarded ?? 0} von ${station.points} Punkten erhalten.`
  }

  return progress.status === 'solved'
    ? `${station.name} ist geloest. Punkte und Fragment wurden gutgeschrieben.`
    : 'Noch nicht korrekt. Prueft Hinweis und Ort noch einmal.'
}
