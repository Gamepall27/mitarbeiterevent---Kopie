const API_BASE_URL = String(import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

function withLeadingSlash(value) {
  return value.startsWith('/') ? value : `/${value}`
}

export function apiPath(path) {
  const normalizedPath = withLeadingSlash(path)
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath
}

export function resolveAssetUrl(url) {
  const normalizedUrl = String(url ?? '').trim()

  if (!normalizedUrl) {
    return ''
  }

  if (/^(?:https?:)?\/\//.test(normalizedUrl) || normalizedUrl.startsWith('data:')) {
    return normalizedUrl
  }

  return API_BASE_URL ? `${API_BASE_URL}${withLeadingSlash(normalizedUrl)}` : normalizedUrl
}

function normalizeHint(hint) {
  return {
    ...hint,
    imageUrl: resolveAssetUrl(hint.imageUrl),
  }
}

function normalizeStation(station) {
  return {
    ...station,
    imageUrl: resolveAssetUrl(station.imageUrl),
    hints: Array.isArray(station.hints) ? station.hints.map(normalizeHint) : [],
  }
}

function normalizeTeam(team) {
  const stationProgress = Object.fromEntries(
    Object.entries(team.stationProgress ?? {}).map(([stationId, progress]) => [
      stationId,
      {
        ...progress,
        assetUrl: resolveAssetUrl(progress.assetUrl),
      },
    ]),
  )

  return {
    ...team,
    stationProgress,
  }
}

function normalizePayload(payload) {
  if (!payload?.appState) {
    return payload
  }

  return {
    ...payload,
    appState: {
      ...payload.appState,
      stations: Array.isArray(payload.appState.stations)
        ? payload.appState.stations.map(normalizeStation)
        : [],
      teams: Array.isArray(payload.appState.teams)
        ? payload.appState.teams.map(normalizeTeam)
        : [],
    },
  }
}

function buildHeaders({ adminCode, teamSession } = {}, contentType = 'application/json') {
  return {
    ...(contentType ? { 'Content-Type': contentType } : {}),
    ...(adminCode ? { 'x-admin-code': adminCode } : {}),
    ...(teamSession?.teamId ? { 'x-team-id': teamSession.teamId } : {}),
    ...(teamSession?.sessionId ? { 'x-team-session': teamSession.sessionId } : {}),
  }
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message ?? 'Anfrage fehlgeschlagen.')
  }

  return normalizePayload(payload)
}

export async function fetchAppState(adminCode, teamSession) {
  const response = await fetch(apiPath('/api/state'), {
    headers: buildHeaders({ adminCode, teamSession }, null),
  })

  return parseResponse(response)
}

export async function loginAdmin(code) {
  const response = await fetch(apiPath('/api/admin/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  return parseResponse(response)
}

export async function loginWithCode(payload) {
  const response = await fetch(apiPath('/api/access/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseResponse(response)
}

export async function registerGroupWithCode(payload) {
  const response = await fetch(apiPath('/api/access/register-group'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseResponse(response)
}

export async function postJson(url, body, adminCode, teamSession) {
  const response = await fetch(apiPath(url), {
    method: 'POST',
    headers: buildHeaders({ adminCode, teamSession }),
    body: JSON.stringify(body),
  })

  return parseResponse(response)
}

export async function postMultipart(url, body, adminCode, teamSession) {
  const response = await fetch(apiPath(url), {
    method: 'POST',
    headers: buildHeaders({ adminCode, teamSession }, null),
    body,
  })

  return parseResponse(response)
}

export async function fetchApprovals(adminCode) {
  const response = await fetch(apiPath('/api/admin/approvals'), {
    headers: { 'x-admin-code': adminCode },
  })

  return parseResponse(response)
}
