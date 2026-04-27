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

  return payload
}

export async function fetchAppState(adminCode, teamSession) {
  const response = await fetch('/api/state', {
    headers: buildHeaders({ adminCode, teamSession }, null),
  })

  return parseResponse(response)
}

export async function loginAdmin(code) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  return parseResponse(response)
}

export async function loginWithCode(payload) {
  const response = await fetch('/api/access/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseResponse(response)
}

export async function registerGroupWithCode(payload) {
  const response = await fetch('/api/access/register-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseResponse(response)
}

export async function postJson(url, body, adminCode, teamSession) {
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders({ adminCode, teamSession }),
    body: JSON.stringify(body),
  })

  return parseResponse(response)
}

export async function postMultipart(url, body, adminCode, teamSession) {
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders({ adminCode, teamSession }, null),
    body,
  })

  return parseResponse(response)
}

export async function fetchApprovals(adminCode) {
  const response = await fetch('/api/admin/approvals', {
    headers: { 'x-admin-code': adminCode },
  })

  return parseResponse(response)
}
