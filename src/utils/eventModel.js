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
  
  // Calculate total cost of bought hints
  const hintCosts = stations.reduce((sum, station) => {
    const progress = team.stationProgress[station.id]
    if (!progress || !progress.boughtHints) return sum
    return sum + progress.boughtHints.reduce((hintSum, hintId) => {
      const hint = station.hints?.find((h) => h.id === hintId)
      return hintSum + (hint?.cost ?? 0)
    }, 0)
  }, 0)
  
  const points =
    solvedStations.reduce(
      (sum, station) =>
        sum + (team.stationProgress[station.id].pointsAwarded ?? station.points),
      0,
    ) +
    team.bonusPoints -
    team.penaltyPoints -
    hintCosts
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
    hints: [
      ...solvedStations
        .filter((station) => station.rewardHint)
        .map((station) => ({
          id: `${station.id}-reward`,
          text: station.rewardHint,
          createdAt: team.stationProgress[station.id].solvedAt,
        })),
      ...team.adminHints,
    ],
    lastActivityLabel: lastActivity ? formatTime(lastActivity) : 'keine Aktivitaet',
    minutesSinceActivity,
    isStuck:
      team.active &&
      team.started &&
      minutesSinceActivity !== null &&
      minutesSinceActivity >= 15,
  }
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

export function getVisualStatus(progress, station) {
  if (progress.status === 'solved') {
    return 'solved'
  }

  if (progress.status === 'pending') {
    return 'locked'
  }

  return station.mandatory ? 'open' : 'bonus'
}

export function getStatusLabel(status) {
  if (status === 'solved') {
    return 'geloest'
  }

  if (status === 'locked') {
    return 'wartet'
  }

  if (status === 'bonus') {
    return 'bonus'
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

export function formatCountdown(team, now, durationMinutes = EVENT_DURATION_MINUTES) {
  if (!team.startedAt) {
    return `${durationMinutes}:00`
  }

  const elapsedMs = now - new Date(team.startedAt).getTime()
  const remainingMs = Math.max(durationMinutes * 60_000 - elapsedMs, 0)
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
