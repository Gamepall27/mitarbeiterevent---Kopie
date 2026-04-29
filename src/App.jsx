import { useEffect, useRef, useState } from 'react'
import './App.css'
import {
  fetchAppState,
  loginAdmin,
  loginWithCode,
  registerGroupWithCode,
  postJson,
  postMultipart,
} from './api'
import AdminView from './components/AdminView'
import { getTranslation } from './i18n'
import TeamLogin from './components/TeamLogin'
import TeamView from './components/TeamView'
import { stationCatalog } from './data/mockData'
import { getEventTimerState, getTeamMetrics } from './utils/eventModel'

const UI_STORAGE_KEY = 'mitarbeiterevent-ui-v2'
const EMPTY_LIST = []
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

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

async function compressImageFile(file, options = {}) {
  if (!(file instanceof File) || !IMAGE_MIME_TYPES.has(file.type)) {
    return file
  }

  const { maxWidth = 1600, maxHeight = 1600, quality = 0.78 } = options
  const imageBitmap = await createImageBitmap(file)
  const scale = Math.min(maxWidth / imageBitmap.width, maxHeight / imageBitmap.height, 1)
  const width = Math.max(1, Math.round(imageBitmap.width * scale))
  const height = Math.max(1, Math.round(imageBitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) {
    return file
  }

  context.drawImage(imageBitmap, 0, 0, width, height)

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })

  imageBitmap.close()

  if (!blob || blob.size >= file.size) {
    return file
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
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
  const [codeDraft, setCodeDraft] = useState('')
  const [language, setLanguage] = useState(storedUiState.language ?? 'de')
  const [now, setNow] = useState(() => Date.now())
  const pollingRef = useRef(false)
  const translation = getTranslation(language)

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
        language,
      }),
    )
  }, [
    activeTeamId,
    activeTeamSessionId,
    adminUnlocked,
    adminSessionCode,
    adminSelectedTeamId,
    adminSelectedStationId,
    language,
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
  const eventStatus = appState?.eventStatus ?? 'idle'
  const eventPausedAt = appState?.eventPausedAt ?? null
  const eventPausedDurationMs = appState?.eventPausedDurationMs ?? 0
  const eventTimerState = getEventTimerState(
    {
      eventStartedAt,
      eventStatus,
      eventPausedAt,
      eventPausedDurationMs,
    },
    now,
    appState?.eventDurationMinutes,
  )
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
          <p className="eyebrow">{translation.common.loadingEyebrow}</p>
          <h2>{translation.common.loadingTitle}</h2>
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
        if (payload.mode === 'register-group') {
          return { ...(await registerGroupWithCode(payload)), loginTarget: 'register-group' }
        }

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

          if (response.loginTarget === 'register-group') {
            clearTeamSession()
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
    applyMutation(async () => {
      const formData = new FormData()
      formData.set('answer', payload.answer ?? '')

      if (payload.file) {
        const optimizedFile = await compressImageFile(payload.file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.75,
        })
        formData.set('file', optimizedFile)
      }

      return postMultipart(
        `/api/team/${teamId}/stations/${stationId}/submit`,
        formData,
        undefined,
        getActiveTeamSession(),
      )
    })
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

  function handleAdminPauseEvent() {
    applyMutation(() => postJson('/api/admin/event/pause', {}, requireAdminCode()))
  }

  function handleAdminResumeEvent() {
    applyMutation(() => postJson('/api/admin/event/resume', {}, requireAdminCode()))
  }

  function handleAdminStopEvent() {
    applyMutation(() => postJson('/api/admin/event/stop', {}, requireAdminCode()))
  }

  function handleAdminResetEventTimer() {
    applyMutation(() => postJson('/api/admin/event/reset', {}, requireAdminCode()))
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

  function handleCreateAccessCode(customCode = '') {
    applyMutation(() => postJson('/api/admin/codes', { code: customCode }, requireAdminCode()), {
      onSuccess: (response) => setCodeDraft(response.code ?? ''),
    })
  }

  async function buildStationFormData(payload) {
    const formData = new FormData()
    const normalizedHints = []

    for (const [key, value] of Object.entries(payload)) {
      if (key === 'id' || key === 'existingImageName' || key === 'existingImageUrl') {
        continue
      }

      if (value === undefined || value === null || value === '') {
        continue
      }

      if (key === 'stationImage' && value instanceof File) {
        const optimizedFile = await compressImageFile(value, {
          maxWidth: 1800,
          maxHeight: 1800,
          quality: 0.8,
        })
        formData.set(key, optimizedFile)
        continue
      }

      if (key === 'hints' && Array.isArray(value)) {
        for (const hint of value) {
          const normalizedHint = {
            id: hint.id,
            content: hint.content,
            cost: hint.cost,
            imageUrl: hint.imageUrl ?? '',
            imageName: hint.imageName ?? '',
          }

          if (hint.imageFile instanceof File) {
            const optimizedHintFile = await compressImageFile(hint.imageFile, {
              maxWidth: 1400,
              maxHeight: 1400,
              quality: 0.76,
            })
            formData.append('hintImages', optimizedHintFile, `${hint.id}__${optimizedHintFile.name}`)
            normalizedHint.imageName = optimizedHintFile.name
          }

          normalizedHints.push(normalizedHint)
        }

        formData.set(key, JSON.stringify(normalizedHints))
        continue
      }

      if (key === 'choiceOptions' && Array.isArray(value)) {
        formData.set(key, JSON.stringify(value))
        continue
      }

      formData.set(key, String(value))
    }

    return formData
  }

  function handleCreateStation(payload) {
    const hasHintFiles = Array.isArray(payload.hints)
      && payload.hints.some((hint) => hint.imageFile instanceof File)

    if (!(payload.stationImage instanceof File) && !hasHintFiles) {
      const {
        stationImage: _ignored,
        id: _id,
        existingImageName: _existingImageName,
        existingImageUrl: _existingImageUrl,
        ...jsonPayload
      } = payload
      applyMutation(() => postJson('/api/admin/stations', jsonPayload, requireAdminCode()))
      return
    }

    applyMutation(async () => {
      const formData = await buildStationFormData(payload)
      return postMultipart('/api/admin/stations', formData, requireAdminCode())
    })
  }

  function handleUpdateStation(stationId, payload) {
    const hasHintFiles = Array.isArray(payload.hints)
      && payload.hints.some((hint) => hint.imageFile instanceof File)

    if (!(payload.stationImage instanceof File) && !hasHintFiles) {
      const {
        stationImage: _ignored,
        id: _id,
        existingImageName: _existingImageName,
        existingImageUrl: _existingImageUrl,
        ...jsonPayload
      } = payload
      applyMutation(() =>
        postJson(`/api/admin/stations/${stationId}`, jsonPayload, requireAdminCode()),
      )
      return
    }

    applyMutation(async () => {
      const formData = await buildStationFormData(payload)
      return postMultipart(`/api/admin/stations/${stationId}`, formData, requireAdminCode())
    })
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
          eventPausedAt={eventPausedAt}
          eventPausedDurationMs={eventPausedDurationMs}
          eventStartedAt={eventStartedAt}
          eventStatus={eventStatus}
          eventTimerState={eventTimerState}
          adminSelectedStation={adminSelectedStation}
          adminSelectedTeam={adminSelectedTeam}
          adminSelectedTeamId={effectiveAdminSelectedTeamId}
          codeDraft={codeDraft}
          now={now}
          onBonus={handleAdminBonus}
          onCreateCode={handleCreateAccessCode}
          onCreateStation={handleCreateStation}
          onDeleteStation={handleDeleteStation}
          onDeleteTeam={handleDeleteTeam}
          onLogout={() => {
            setAdminUnlocked(false)
            setAdminSessionCode('')
          }}
          onMarkCorrect={handleAdminMarkCorrect}
          onReset={handleResetDemo}
          onReview={handleAdminReview}
          onPauseEvent={handleAdminPauseEvent}
          onResetEventTimer={handleAdminResetEventTimer}
          onResumeEvent={handleAdminResumeEvent}
          onSetEventDurationMinutes={handleAdminSetEventDurationMinutes}
          onSetAdminSelectedStation={setAdminSelectedStationId}
          onSetAdminSelectedTeam={setAdminSelectedTeamId}
          onStartEvent={handleAdminStartEvent}
          onStopEvent={handleAdminStopEvent}
          onToggleActive={handleAdminToggleActive}
          onUpdateStation={handleUpdateStation}
          pendingApprovals={pendingApprovals}
          rankedTeams={rankedTeams}
          stations={appState.stations}
          teams={teamsWithMetrics}
        />
      ) : activeTeam ? (
        <TeamView
          eventDurationMinutes={appState.eventDurationMinutes}
          eventPausedAt={eventPausedAt}
          eventPausedDurationMs={eventPausedDurationMs}
          eventStartedAt={eventStartedAt}
          eventStatus={eventStatus}
          eventTimerState={eventTimerState}
          language={language}
          now={now}
          onLogout={handleTeamLogout}
          onLanguageChange={setLanguage}
          onSelectStation={handleStationSelect}
          onSubmitStation={handleStationSubmit}
          onUnlock={handleStationUnlock}
          onBuyHint={handleBuyHint}
          stations={appState.stations}
          team={activeTeam}
        />
      ) : (
        <TeamLogin
          accessCodes={generatedCodes}
          language={language}
          onLanguageChange={setLanguage}
          onLogin={handleAccess}
        />
      )}
    </div>
  )
}

export default App
