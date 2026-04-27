import {
  EVENT_DURATION_MINUTES,
  stationCatalog,
} from '../data/mockData.js'

export function getTeamMetrics(
  team,
  now,
  stations = stationCatalog,
) {
  const solvedStations = stations.filter(
    (station) => team.stationProgress[station.id].status === 'solved',
  )
  const mandatorySolved = solvedStations.filter((station) => station.mandatory).length
  const bonusSolved = solvedStations.filter((station) => !station.mandatory).length
  const fragments = solvedStations
    .filter((station) => station.fragment)
    .map((station) => ({
      stationId: station.id,
      stationName: station.name,
      fragment: station.fragment,
    }))
  
  const points = getTeamPoints(team, stations)
  const pendingCount = stations.filter(
    (station) => team.stationProgress[station.id].status === 'pending',
  ).length
  const lastActivity = team.activityLog[0]?.createdAt ?? team.startedAt
  const minutesSinceActivity = lastActivity
    ? Math.floor((now - new Date(lastActivity).getTime()) / 60_000)
    : null
  return {
    points,
    solvedCount: solvedStations.length,
    bonusSolved,
    mandatorySolved,
    mandatoryTotal: stations.filter((station) => station.mandatory).length,
    fragments,
    pendingCount,
    lastActivityLabel: lastActivity ? formatTime(lastActivity) : 'keine Aktivitaet',
    minutesSinceActivity,
    isStuck:
      team.active &&
      team.started &&
      minutesSinceActivity !== null &&
      minutesSinceActivity >= 15,
  }
}

export function getTeamPoints(team, stations = stationCatalog) {
  return Math.max(0, getTeamRawPoints(team, stations))
}

export function getTeamRawPoints(team, stations = stationCatalog) {
  const solvedStations = stations.filter(
    (station) => team.stationProgress[station.id].status === 'solved',
  )

  const hintCosts = stations.reduce((sum, station) => {
    const progress = team.stationProgress[station.id]
    if (!progress || !progress.boughtHints) return sum
    return sum + progress.boughtHints.reduce((hintSum, hintId) => {
      const hint = station.hints?.find((entry) => entry.id === hintId)
      return hintSum + (hint?.cost ?? 0)
    }, 0)
  }, 0)

  return (
    solvedStations.reduce(
      (sum, station) =>
        sum + (team.stationProgress[station.id].pointsAwarded ?? station.points),
      0,
    ) +
    team.bonusPoints -
    team.penaltyPoints -
    hintCosts
  )
}

export function isCorrectSubmission(station, rawAnswer) {
  if (!station.answer) {
    return false
  }

  return normalizeAnswer(rawAnswer) === normalizeAnswer(station.answer)
}

export function getEstimatePoints(station, rawAnswer) {
  const actualValue = Number(station.answer)
  const guessedValue = Number(rawAnswer)

  if (!Number.isFinite(actualValue) || !Number.isFinite(guessedValue) || actualValue === 0) {
    return 0
  }

  const percentDifference = Math.abs((guessedValue - actualValue) / actualValue) * 100
  const penaltySteps = Math.floor(percentDifference)
  const ratio = Math.max(0, 1 - penaltySteps / 100)

  return Math.round(station.points * ratio)
}

export function getStationAnalytics(teams, stationId) {
  return teams.reduce(
    (summary, team) => {
      const progress = team.stationProgress[stationId]
      const solved = progress.status === 'solved' ? 1 : 0
      const pending = progress.status === 'pending' ? 1 : 0
      const wrongAttempts =
        progress.status === 'solved'
          ? Math.max(progress.attempts - 1, 0)
          : progress.attempts

      return {
        solved: summary.solved + solved,
        pending: summary.pending + pending,
        wrongAttempts: summary.wrongAttempts + wrongAttempts,
      }
    },
    { solved: 0, pending: 0, wrongAttempts: 0 },
  )
}

export function getDisplayProgressStatus(progress) {
  if (progress.status === 'rejected') {
    return 'rejected'
  }

  if (progress.status === 'open' && progress.attempts > 0 && progress.submittedAt) {
    return 'wrong'
  }

  if (progress.status === 'open' && progress.reviewedAt && progress.reviewNote) {
    return 'rejected'
  }

  return progress.status
}

export function getVisualStatus(progress) {
  const status = getDisplayProgressStatus(progress)

  if (status === 'solved') {
    return 'solved'
  }

  if (status === 'pending') {
    return 'locked'
  }

  if (status === 'rejected') {
    return 'rejected'
  }

  if (status === 'wrong') {
    return 'wrong'
  }

  return 'open'
}

export function getStatusLabel(status) {
  if (status === 'solved') {
    return 'beantwortet'
  }

  if (status === 'locked') {
    return 'wird geprueft'
  }

  if (status === 'rejected') {
    return 'abgelehnt'
  }

  if (status === 'wrong') {
    return 'falsch beantwortet'
  }

  return 'offen'
}

export function getStationName(stationId, stations = stationCatalog) {
  return stations.find((station) => station.id === stationId)?.name ?? 'Unbekannt'
}

export function formatTime(dateString) {
  if (!dateString) {
    return 'offen'
  }

  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function getEventTimerState(eventState, now, durationMinutes = EVENT_DURATION_MINUTES) {
  const status = eventState?.eventStatus ?? (eventState?.eventStartedAt ? 'running' : 'idle')
  const startedAt = eventState?.eventStartedAt
  const pausedAt = eventState?.eventPausedAt
  const pausedDurationMs = Number(eventState?.eventPausedDurationMs ?? 0)

  if (!startedAt) {
    return {
      status: 'idle',
      remainingMs: durationMinutes * 60_000,
      elapsedMs: 0,
      isInteractive: false,
    }
  }

  if (status === 'stopped') {
    return {
      status: 'stopped',
      remainingMs: 0,
      elapsedMs: durationMinutes * 60_000,
      isInteractive: false,
    }
  }

  const referenceTime =
    status === 'paused' && pausedAt
      ? new Date(pausedAt).getTime()
      : now
  const startedAtMs = new Date(startedAt).getTime()
  const elapsedMs = Math.max(referenceTime - startedAtMs - pausedDurationMs, 0)
  const remainingMs = Math.max(durationMinutes * 60_000 - elapsedMs, 0)
  const normalizedStatus = remainingMs === 0 && status !== 'paused' ? 'stopped' : status

  return {
    status: normalizedStatus,
    remainingMs,
    elapsedMs,
    isInteractive: normalizedStatus === 'running' && remainingMs > 0,
  }
}

export function formatCountdown(eventState, now, durationMinutes = EVENT_DURATION_MINUTES) {
  const { remainingMs } = getEventTimerState(eventState, now, durationMinutes)
  const minutes = Math.floor(remainingMs / 60_000)
  const seconds = Math.floor((remainingMs % 60_000) / 1000)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function normalizeAnswer(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function generateAccessCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const chunk = Array.from({ length: 4 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join('')

  return `TEAM-${chunk}`
}

export function generateStableId(prefix = 'id') {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  const randomPart = Math.random().toString(36).slice(2, 10)
  const timePart = Date.now().toString(36)
  return `${prefix}-${timePart}-${randomPart}`
}

export function getTeamStationOrder(stations, teamSeed) {
  const seed = String(teamSeed ?? '')

  return [...stations].sort((left, right) => {
    const leftScore = getSeededStationScore(left.id, seed)
    const rightScore = getSeededStationScore(right.id, seed)

    if (leftScore !== rightScore) {
      return leftScore - rightScore
    }

    return left.name.localeCompare(right.name, 'de')
  })
}

function getSeededStationScore(stationId, seed) {
  const value = `${seed}:${stationId}`
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}
