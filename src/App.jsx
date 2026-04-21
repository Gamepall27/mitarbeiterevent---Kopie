import { useEffect, useRef, useState } from 'react'
import './App.css'
import {
  fetchAppState,
  loginAdmin,
  loginWithCode,
  postJson,
  postMultipart,
} from './api'
import AdminView from './components/AdminView'
import TeamLogin from './components/TeamLogin'
import TeamView from './components/TeamView'
import { stationCatalog } from './data/mockData'
import { getTeamMetrics } from './utils/eventModel'

const UI_STORAGE_KEY = 'mitarbeiterevent-ui-v2'
const EMPTY_LIST = []

function loadStoredUiState() {
  try {
    const rawValue = window.localStorage.getItem(UI_STORAGE_KEY)

    if (!rawValue) {
      return {}
    }

    return JSON.parse(rawValue)
  } catch {
    return {}
  }
}

function App() {
  const storedUiState = loadStoredUiState()
  const [appState, setAppState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTeamId, setActiveTeamId] = useState(storedUiState.activeTeamId ?? null)
  const [activeTeamSessionId, setActiveTeamSessionId] = useState(
    storedUiState.activeTeamSessionId ?? '',
  )
  const [stationFeedback, setStationFeedback] = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(
    Boolean(storedUiState.adminUnlocked && storedUiState.adminSessionCode),
  )
  const [adminSessionCode, setAdminSessionCode] = useState(
    storedUiState.adminSessionCode ?? '',
  )
  const [adminSelectedTeamId, setAdminSelectedTeamId] = useState(
    storedUiState.adminSelectedTeamId ?? null,
  )
  const [adminSelectedStationId, setAdminSelectedStationId] = useState(
    storedUiState.adminSelectedStationId ?? stationCatalog[0]?.id ?? null,
  )
  const [hintDraft, setHintDraft] = useState(
    'Prueft die Module in eurer Route nacheinander und haltet die Fragmente fest.',
  )
  const [codeDraft, setCodeDraft] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const pollingRef = useRef(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    loadState()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!pollingRef.current) {
        loadState({ silent: true })
      }
    }, 4000)

    return () => window.clearInterval(timer)
  }, [activeTeamId, activeTeamSessionId])

  useEffect(() => {
    if (!stationFeedback) {
      return undefined
    }

    const timer = window.setTimeout(() => setStationFeedback(''), 3200)
    return () => window.clearTimeout(timer)
  }, [stationFeedback])

  useEffect(() => {
    window.localStorage.setItem(
      UI_STORAGE_KEY,
      JSON.stringify({
        activeTeamId,
        activeTeamSessionId,
        adminUnlocked,
        adminSessionCode,
        adminSelectedTeamId,
        adminSelectedStationId,
      }),
    )
  }, [
    activeTeamId,
    activeTeamSessionId,
    adminUnlocked,
    adminSessionCode,
    adminSelectedTeamId,
    adminSelectedStationId,
  ])

  async function loadState({ silent = false } = {}) {
    pollingRef.current = true

    try {
      if (!silent) {
        setLoading(true)
      }

      const payload = await fetchAppState(
        undefined,
        activeTeamId && activeTeamSessionId
          ? { teamId: activeTeamId, sessionId: activeTeamSessionId }
          : undefined,
      )

      if (payload.teamSessionValid === false) {
        clearTeamSession()
        setStationFeedback('Dieses Team ist inzwischen auf einem anderen Geraet angemeldet.')
      }

      setAppState(payload.appState)
    } catch (error) {
      if (!silent) {
        setStationFeedback(error.message)
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }

      pollingRef.current = false
    }
  }

  const stations = appState?.stations ?? EMPTY_LIST
  const teams = appState?.teams ?? EMPTY_LIST
  const eventStartedAt = appState?.eventStartedAt ?? null
  const teamsWithMetrics = teams.map((team) => ({
    ...team,
    metrics: getTeamMetrics(team, now, stations),
  }))
  const effectiveAdminSelectedTeamId = teamsWithMetrics.some(
    (team) => team.id === adminSelectedTeamId,
  )
    ? adminSelectedTeamId
    : teamsWithMetrics[0]?.id ?? null
  const activeTeam = teamsWithMetrics.find((team) => team.id === activeTeamId) ?? null
  const adminSelectedTeam =
    teamsWithMetrics.find((team) => team.id === effectiveAdminSelectedTeamId) ?? null
  const adminSelectedStation =
    stations.find((station) => station.id === adminSelectedStationId) ?? stations[0]
  const rankedTeams = [...teamsWithMetrics].sort((left, right) => {
    if (right.metrics.points !== left.metrics.points) {
      return right.metrics.points - left.metrics.points
    }

    return right.metrics.solvedCount - left.metrics.solvedCount
  })
  const generatedCodes = [...(appState?.accessCodes ?? EMPTY_LIST)].sort((left, right) =>
    left.createdAt < right.createdAt ? 1 : -1,
  )
  const pendingApprovals = teamsWithMetrics.flatMap((team) =>
    stations
      .filter((station) => team.stationProgress[station.id]?.status === 'pending')
      .map((station) => ({
        teamId: team.id,
        teamName: team.name,
        stationId: station.id,
        stationName: station.name,
        stationType: station.type,
        stationPoints: station.points,
        submittedAt: team.stationProgress[station.id].submittedAt,
        submittedBy: team.stationProgress[station.id].submittedBy,
        answer: team.stationProgress[station.id].answer,
        assetName: team.stationProgress[station.id].assetName,
        assetUrl: team.stationProgress[station.id].assetUrl,
      })),
  )

  useEffect(() => {
    if (!appState) {
      return
    }

    if (activeTeamId && !activeTeam) {
      clearTeamSession()
    }
  }, [appState, activeTeamId, activeTeam])

  useEffect(() => {
    if (adminSelectedStationId && !adminSelectedStation) {
      setAdminSelectedStationId(stations[0]?.id ?? null)
    }
  }, [adminSelectedStationId, adminSelectedStation, stations])

  function clearTeamSession() {
    setActiveTeamId(null)
    setActiveTeamSessionId('')
  }

  if (loading || !appState) {
    return (
      <div className="app-shell">
        <section className="panel stack narrow-panel">
          <p className="eyebrow">Laden</p>
          <h2>Verbindung zur Event-Datenbank wird aufgebaut</h2>
        </section>
      </div>
    )
  }

  async function applyMutation(work, options = {}) {
    pollingRef.current = true

    try {
      const payload = await work()

      if (payload.appState) {
        setAppState(payload.appState)
      }

      if (payload.message !== undefined) {
        setStationFeedback(payload.message)
      }

      if (options.onSuccess) {
        options.onSuccess(payload)
      }
    } catch (error) {
      setStationFeedback(error.message)
    } finally {
      pollingRef.current = false
    }
  }

  function requireAdminCode() {
    return adminSessionCode
  }

  function handleAccess(payload) {
    applyMutation(
      async () => {
        try {
          await loginAdmin(payload.code)
          return { loginTarget: 'admin', adminCode: payload.code }
        } catch {
          const teamResponse = await loginWithCode(payload)
          return { ...teamResponse, loginTarget: 'team' }
        }
      },
      {
        onSuccess: (response) => {
          if (response.loginTarget === 'admin') {
            clearTeamSession()
            setAdminSessionCode(response.adminCode)
            setAdminUnlocked(true)
            return
          }

          setActiveTeamId(response.teamId)
          setActiveTeamSessionId(response.teamSessionId)
        },
      },
    )
  }

  function getActiveTeamSession() {
    return activeTeamId && activeTeamSessionId
      ? { teamId: activeTeamId, sessionId: activeTeamSessionId }
      : undefined
  }

  function handleTeamLogout() {
    if (!activeTeamId || !activeTeamSessionId) {
      clearTeamSession()
      return
    }

    applyMutation(
      () => postJson(`/api/team/${activeTeamId}/logout`, {}, undefined, getActiveTeamSession()),
      {
        onSuccess: () => clearTeamSession(),
      },
    )
  }

  function handleStationSelect(teamId, stationId) {
    applyMutation(() =>
      postJson(
        `/api/team/${teamId}/select-station`,
        { stationId },
        undefined,
        getActiveTeamSession(),
      ),
    )
  }

  function handleStationSubmit(teamId, stationId, payload) {
    const formData = new FormData()
    formData.set('answer', payload.answer ?? '')

    if (payload.file) {
      formData.set('file', payload.file)
    }

    applyMutation(() =>
      postMultipart(
        `/api/team/${teamId}/stations/${stationId}/submit`,
        formData,
        undefined,
        getActiveTeamSession(),
      ),
    )
  }

  function handleStationUnlock(teamId, stationId, code) {
    applyMutation(() =>
      postJson(
        `/api/team/${teamId}/stations/${stationId}/unlock`,
        { code },
        undefined,
        getActiveTeamSession(),
      ),
    )
  }

  function handleBuyHint(teamId, stationId, hintId) {
    applyMutation(() =>
      postJson(
        `/api/team/${teamId}/stations/${stationId}/buy-hint`,
        { hintId },
        undefined,
        getActiveTeamSession(),
      ),
    )
  }

  function handleAdminHint(payload) {
    if (!adminSelectedTeam) {
      return
    }

    const formData = new FormData()
    formData.set('text', payload?.text ?? hintDraft)

    if (payload?.hintImage instanceof File) {
      formData.set('hintImage', payload.hintImage)
    }

    applyMutation(() =>
      postMultipart(
        `/api/admin/team/${adminSelectedTeam.id}/hint`,
        formData,
        requireAdminCode(),
      ),
    )
  }

  function handleAdminBonus(pointsDelta) {
    if (!adminSelectedTeam) {
      return
    }

    applyMutation(() =>
      postJson(
        `/api/admin/team/${adminSelectedTeam.id}/bonus`,
        { delta: pointsDelta },
        requireAdminCode(),
      ),
    )
  }

  function handleAdminToggleActive() {
    if (!adminSelectedTeam) {
      return
    }

    applyMutation(() =>
      postJson(
        `/api/admin/team/${adminSelectedTeam.id}/toggle-active`,
        {},
        requireAdminCode(),
      ),
    )
  }

  function handleAdminSetEventDurationMinutes(eventDurationMinutes) {
    applyMutation(() =>
      postJson(
        '/api/admin/settings/timer',
        { eventDurationMinutes },
        requireAdminCode(),
      ),
    )
  }

  function handleAdminStartEvent() {
    applyMutation(() => postJson('/api/admin/event/start', {}, requireAdminCode()))
  }

  function handleAdminReview(teamId, stationId, action, reviewNote = '', awardedPoints) {
    applyMutation(() =>
      postJson(
        `/api/admin/team/${teamId}/stations/${stationId}/review`,
        { action, reviewNote, awardedPoints },
        requireAdminCode(),
      ),
    )
  }

  function handleAdminMarkCorrect() {
    if (!adminSelectedTeam || !adminSelectedStation) {
      return
    }

    handleAdminReview(adminSelectedTeam.id, adminSelectedStation.id, 'approve')
  }

  function handleResetDemo() {
    applyMutation(() => postJson('/api/admin/reset', {}, requireAdminCode()), {
      onSuccess: () => {
        clearTeamSession()
        setAdminSelectedTeamId(null)
        setAdminSelectedStationId(null)
        setCodeDraft('')
      },
    })
  }

  function handleCreateAccessCode(event) {
    event.preventDefault()

    applyMutation(() => postJson('/api/admin/codes', {}, requireAdminCode()), {
      onSuccess: (response) => setCodeDraft(response.code ?? ''),
    })
  }

  function handleCreateStation(payload) {
    if (!(payload.stationImage instanceof File)) {
      const { stationImage: _ignored, ...jsonPayload } = payload
      applyMutation(() => postJson('/api/admin/stations', jsonPayload, requireAdminCode()))
      return
    }

    const formData = new FormData()

    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return
      }

      if (key === 'stationImage' && value instanceof File) {
        formData.set(key, value)
        return
      }

      if (key === 'hints' && Array.isArray(value)) {
        formData.set(key, JSON.stringify(value))
        return
      }

      formData.set(key, String(value))
    })

    applyMutation(() => postMultipart('/api/admin/stations', formData, requireAdminCode()))
  }

  function handleDeleteStation(stationId) {
    applyMutation(
      () => postJson(`/api/admin/stations/${stationId}/delete`, {}, requireAdminCode()),
      {
        onSuccess: (response) => {
          if (adminSelectedStationId === stationId) {
            setAdminSelectedStationId(response.appState?.stations?.[0]?.id ?? null)
          }
        },
      },
    )
  }

  function handleDeleteTeam(teamId) {
    applyMutation(
      () => postJson(`/api/admin/team/${teamId}/delete`, {}, requireAdminCode()),
      {
        onSuccess: () => {
          if (activeTeamId === teamId) {
            clearTeamSession()
          }

          if (adminSelectedTeamId === teamId) {
            setAdminSelectedTeamId(null)
          }
        },
      },
    )
  }

  return (
    <div className="app-shell">
      {stationFeedback ? <div className="toast">{stationFeedback}</div> : null}

      {adminUnlocked ? (
        <AdminView
          accessCodes={generatedCodes}
          eventDurationMinutes={appState.eventDurationMinutes}
          eventStartedAt={eventStartedAt}
          adminSelectedStation={adminSelectedStation}
          adminSelectedTeam={adminSelectedTeam}
          adminSelectedTeamId={effectiveAdminSelectedTeamId}
          codeDraft={codeDraft}
          hintDraft={hintDraft}
          onBonus={handleAdminBonus}
          onCreateCode={handleCreateAccessCode}
          onCreateStation={handleCreateStation}
          onDeleteStation={handleDeleteStation}
          onDeleteTeam={handleDeleteTeam}
          onHint={handleAdminHint}
          onLogout={() => {
            setAdminUnlocked(false)
            setAdminSessionCode('')
          }}
          onMarkCorrect={handleAdminMarkCorrect}
          onReset={handleResetDemo}
          onReview={handleAdminReview}
          onSetEventDurationMinutes={handleAdminSetEventDurationMinutes}
          onSetAdminSelectedStation={setAdminSelectedStationId}
          onSetAdminSelectedTeam={setAdminSelectedTeamId}
          onSetHintDraft={setHintDraft}
          onStartEvent={handleAdminStartEvent}
          onToggleActive={handleAdminToggleActive}
          pendingApprovals={pendingApprovals}
          rankedTeams={rankedTeams}
          stations={appState.stations}
          teams={teamsWithMetrics}
        />
      ) : activeTeam ? (
        <TeamView
          eventDurationMinutes={appState.eventDurationMinutes}
          eventStartedAt={eventStartedAt}
          now={now}
          onLogout={handleTeamLogout}
          onSelectStation={handleStationSelect}
          onSubmitStation={handleStationSubmit}
          onUnlock={handleStationUnlock}
          onBuyHint={handleBuyHint}
          stations={appState.stations}
          team={activeTeam}
        />
      ) : (
        <TeamLogin accessCodes={generatedCodes} onLogin={handleAccess} />
      )}
    </div>
  )
}

export default App
