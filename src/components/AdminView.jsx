import { useEffect, useRef, useState } from 'react'
import {
  formatCountdown,
  formatTime,
  generateAccessCode,
  generateStableId,
  getEventTimerState,
  getDisplayProgressStatus,
  getStationAnalytics,
  getStationName,
} from '../utils/eventModel'
import Metric from './Metric'

function createEmptyChoiceOption() {
  return {
    id: generateStableId('choice'),
    label: '',
  }
}

function createEmptyStationDraft() {
  return {
    id: null,
    name: '',
    type: 'text',
    unlimitedAttempts: true,
    points: 50,
    requiresUnlockCode: true,
    task: '',
    answer: '',
    placeholder: 'Antwort eingeben',
    locationHint: '',
    rewardHint: '',
    fragment: '',
    choiceOptions: [createEmptyChoiceOption(), createEmptyChoiceOption()],
    correctChoiceId: '',
    stationImage: null,
    unlockCode: '',
    hints: [],
    existingImageName: '',
    existingImageUrl: '',
  }
}

function createStationDraftFromStation(station) {
  return {
    id: station.id,
    name: station.name ?? '',
    type: station.type ?? 'text',
    unlimitedAttempts: station.unlimitedAttempts ?? station.type !== 'choice',
    points: station.points ?? 0,
    requiresUnlockCode: station.requiresUnlockCode !== false,
    task: station.task ?? '',
    answer: station.type === 'choice' ? '' : station.answer ?? '',
    placeholder: station.placeholder ?? 'Antwort eingeben',
    locationHint: station.locationHint ?? '',
    rewardHint: station.rewardHint ?? '',
    fragment: station.fragment ?? '',
    choiceOptions:
      station.type === 'choice' && Array.isArray(station.choices) && station.choices.length
        ? station.choices.map((choice) => ({ id: choice.id, label: choice.label }))
        : [createEmptyChoiceOption(), createEmptyChoiceOption()],
    correctChoiceId:
      station.type === 'choice' && Array.isArray(station.choices)
        ? station.choices.find((choice) => choice.id === station.answer)?.id ?? ''
        : '',
    stationImage: null,
    unlockCode: station.unlockCode ?? '',
    hints: Array.isArray(station.hints)
      ? station.hints.map((hint) => ({
          ...hint,
          imageFile: null,
        }))
      : [],
    existingImageName: station.imageName ?? '',
    existingImageUrl: station.imageUrl ?? '',
  }
}

function getTeamTaskLabel(task) {
  if (task.status === 'solved') {
    return `beantwortet - ${task.earnedPoints}/${task.points} P`
  }

  if (task.status === 'pending') {
    return `wird geprueft - ${task.earnedPoints}/${task.points} P`
  }

  if (task.status === 'rejected') {
    return `abgelehnt - ${task.points} P`
  }

  if (task.status === 'wrong') {
    return `falsch beantwortet - ${task.points} P`
  }

  return `offen - ${task.points} P`
}

function AdminView({
  teams,
  stations,
  rankedTeams,
  accessCodes,
  eventDurationMinutes,
  eventStartedAt,
  eventStatus,
  eventPausedAt,
  eventPausedDurationMs,
  eventTimerState,
  pendingApprovals,
  adminSelectedTeamId,
  adminSelectedTeam,
  adminSelectedStation,
  onSetAdminSelectedTeam,
  onSetAdminSelectedStation,
  onMarkCorrect,
  onBonus,
  onSetEventDurationMinutes,
  onToggleActive,
  onReset,
  onCreateCode,
  onCreateStation,
  onUpdateStation,
  onDeleteStation,
  onDeleteTeam,
  onLogout,
  onReview,
  codeDraft,
  onPauseEvent,
  onResumeEvent,
  onStartEvent,
  onStopEvent,
  onResetEventTimer,
  now,
}) {
  const [tab, setTab] = useState('teams')
  const [selectedAnalysisStationId, setSelectedAnalysisStationId] = useState(null)
  const [timerDraft, setTimerDraft] = useState(String(eventDurationMinutes))
  const [reviewNotes, setReviewNotes] = useState({})
  const reviewPointInputsRef = useRef({})
  const [hintTextDraft, setHintTextDraft] = useState('')
  const [hintImageDraft, setHintImageDraft] = useState(null)
  const [hintCostDraft, setHintCostDraft] = useState('5')
  const [stationDraft, setStationDraft] = useState(createEmptyStationDraft())
  const [accessCodeInput, setAccessCodeInput] = useState('')
  const [accessCodeSearch, setAccessCodeSearch] = useState('')
  const resolvedTimerState =
    eventTimerState ??
    getEventTimerState(
      { eventStartedAt, eventStatus, eventPausedAt, eventPausedDurationMs },
      now,
      eventDurationMinutes,
    )

  const stuckTeams = teams.filter((team) => team.metrics.isStuck)
  const usedCodes = accessCodes.filter((entry) => entry.teamId)
  const freeCodes = accessCodes.filter((entry) => !entry.teamId)
  const filteredAccessCodes = accessCodes.filter((entry) => {
    const needle = accessCodeSearch.trim().toLowerCase()

    if (!needle) {
      return true
    }

    return (
      entry.code.toLowerCase().includes(needle) ||
      entry.assignedGroupName.toLowerCase().includes(needle)
    )
  })
  const maxBasePoints = stations.reduce((sum, station) => sum + station.points, 0)
  const selectedTeamTaskSummary = adminSelectedTeam
    ? stations.map((station) => {
        const progress = adminSelectedTeam.stationProgress[station.id]
        const status = getDisplayProgressStatus(progress)

        return {
          id: station.id,
          name: station.name,
          points: station.points,
          status,
          earnedPoints:
            status === 'solved' || status === 'pending'
              ? (progress.pointsAwarded ?? 0)
              : 0,
        }
      })
    : []
  const solvedTasks = selectedTeamTaskSummary.filter((task) => task.status === 'solved')
  const reviewTasks = selectedTeamTaskSummary.filter((task) => task.status === 'pending')
  const rejectedTasks = selectedTeamTaskSummary.filter((task) => task.status === 'rejected')
  const wrongTasks = selectedTeamTaskSummary.filter((task) => task.status === 'wrong')
  const openTasks = selectedTeamTaskSummary.filter((task) => task.status === 'open')

  useEffect(() => {
    setTimerDraft(String(eventDurationMinutes))
  }, [eventDurationMinutes])

  function getReviewNote(approval) {
    return reviewNotes[`${approval.teamId}:${approval.stationId}`] ?? ''
  }

  function setReviewNote(approval, value) {
    setReviewNotes((current) => ({
      ...current,
      [`${approval.teamId}:${approval.stationId}`]: value,
    }))
  }

  function getReviewPoints(approval) {
    const key = `${approval.teamId}:${approval.stationId}`
    return reviewPointInputsRef.current[key]?.value ?? String(approval.stationPoints ?? 0)
  }

  function clearApprovalDraft(approval) {
    const key = `${approval.teamId}:${approval.stationId}`

    setReviewNotes((current) => {
      const { [key]: _removed, ...rest } = current
      return rest
    })
    delete reviewPointInputsRef.current[key]
  }

  function resetStationDraft() {
    setStationDraft(createEmptyStationDraft())
    setHintTextDraft('')
    setHintImageDraft(null)
    setHintCostDraft('5')
  }

  function handleCreateStation(event) {
    event.preventDefault()

    const normalizedChoiceOptions =
      stationDraft.type === 'choice'
        ? stationDraft.choiceOptions
            .map((option) => ({
              id: option.id,
              label: option.label.trim(),
              isCorrect: stationDraft.correctChoiceId === option.id,
            }))
            .filter((option) => option.label)
        : []

    const payload = {
      ...stationDraft,
      points: Number(stationDraft.points),
      choiceOptions: normalizedChoiceOptions,
    }

    if (stationDraft.id) {
      onUpdateStation(stationDraft.id, payload)
    } else {
      onCreateStation(payload)
    }

    resetStationDraft()
  }

  function handleTimerSubmit(event) {
    event.preventDefault()
    onSetEventDurationMinutes(Number(timerDraft))
  }

  function handleCreateCodeSubmit(event) {
    event.preventDefault()
    onCreateCode(accessCodeInput)
    setAccessCodeInput('')
  }

  function handleEditStation(station) {
    setTab('tasks')
    setSelectedAnalysisStationId(station.id)
    setStationDraft(createStationDraftFromStation(station))
    setHintTextDraft('')
    setHintImageDraft(null)
    setHintCostDraft('5')
  }

  return (
    <section className="stack">
      <nav className="tabs">
        <button
          className={tab === 'teams' ? 'tab-button active' : 'tab-button'}
          onClick={() => setTab('teams')}
          type="button"
        >
          Gruppen
        </button>
        <button
          className={tab === 'tasks' ? 'tab-button active' : 'tab-button'}
          onClick={() => setTab('tasks')}
          type="button"
        >
          Aufgaben
        </button>
        <button
          className={
            pendingApprovals.length
              ? tab === 'approvals'
                ? 'tab-button active attention-button'
                : 'tab-button attention-button'
              : tab === 'approvals'
                ? 'tab-button active'
                : 'tab-button'
          }
          onClick={() => setTab('approvals')}
          type="button"
        >
          Freigaben{pendingApprovals.length ? ` (${pendingApprovals.length})` : ''}
        </button>
        <button
          className={tab === 'setup' ? 'tab-button active' : 'tab-button'}
          onClick={() => setTab('setup')}
          type="button"
        >
          Setup
        </button>
      </nav>

      {tab === 'teams' ? (
        <>
          <div className="content-grid">
            <div className="card stack">
              <div className="section-head compact">
                <div>
                  <p className="eyebrow">Gruppenstatus</p>
                  <h2>Teams, Punkte und aktuelle Lage</h2>
                </div>
                <button className="ghost-button" onClick={onLogout} type="button">
                  Admin abmelden
                </button>
              </div>

              <div className="metric-grid">
                <Metric label="Gruppen" value={teams.length} />
                <Metric label="Aktiv" value={teams.filter((team) => team.active).length} />
                <Metric label="Stau" value={stuckTeams.length} />
                <Metric label="Freigaben" value={pendingApprovals.length} />
              </div>

              <div className="table-list">
                {rankedTeams.length ? (
                  rankedTeams.map((team, index) => (
                    <div className="monitoring-team" key={team.id}>
                      <button
                        className={adminSelectedTeamId === team.id ? 'table-row active' : 'table-row'}
                        onClick={() => onSetAdminSelectedTeam(team.id)}
                        type="button"
                      >
                        <span>{index + 1}</span>
                        <strong>{team.name}</strong>
                        <span>{team.code}</span>
                        <span>
                          {team.selectedStationId
                            ? getStationName(team.selectedStationId, stations)
                            : 'kein Fokus'}
                        </span>
                        <span>{team.metrics.points} P</span>
                      </button>

                      {adminSelectedTeamId === team.id ? (
                        <div className="monitoring-detail">
                          <div className="section-head compact">
                            <div>
                              <p className="eyebrow">Teamdetail</p>
                              <h3>{team.name}</h3>
                            </div>
                            <button
                              className="ghost-button danger-button"
                              onClick={() => onDeleteTeam(team.id)}
                              type="button"
                            >
                              Gruppe loeschen
                            </button>
                          </div>

                          <div className="metric-grid">
                            <Metric label="Punkte" value={team.metrics.points} />
                            <Metric label="Maximal" value={maxBasePoints} />
                            <Metric label="Beantwortet" value={solvedTasks.length} />
                            <Metric label="Pruefung" value={reviewTasks.length} />
                          </div>

                          <div className="content-grid monitoring-detail__grid">
                            <div className="stack">
                              <label className="field">
                                <span>Station fuer Schnellaktionen</span>
                                <select
                                  disabled={!stations.length}
                                  onChange={(event) => onSetAdminSelectedStation(event.target.value)}
                                  value={adminSelectedStation?.id ?? ''}
                                >
                                  {stations.length ? (
                                    stations.map((station) => (
                                      <option key={station.id} value={station.id}>
                                        {station.name}
                                      </option>
                                    ))
                                  ) : (
                                    <option value="">Keine Aufgaben angelegt</option>
                                  )}
                                </select>
                              </label>

                              <div className="action-row">
                                <button
                                  className="primary-button"
                                  disabled={!adminSelectedStation}
                                  onClick={onMarkCorrect}
                                  type="button"
                                >
                                  Station freigeben
                                </button>
                              </div>

                              <div className="action-row">
                                <button className="ghost-button" onClick={() => onBonus(30)} type="button">
                                  +30 Bonus
                                </button>
                                <button className="ghost-button" onClick={() => onBonus(-15)} type="button">
                                  -15 Strafe
                                </button>
                                <button className="ghost-button" onClick={onToggleActive} type="button">
                                  {adminSelectedTeam?.active ? 'Gruppe pausieren' : 'Gruppe aktivieren'}
                                </button>
                              </div>
                            </div>

                            <div className="stack">
                              <div className="detail-block">
                                <p className="eyebrow">Aufgabenstand</p>
                                <div className="task-list">
                                  {selectedTeamTaskSummary.length ? (
                                    selectedTeamTaskSummary.map((task) => (
                                      <div className="task-row" key={task.id}>
                                        <strong>{task.name}</strong>
                                        <span>{getTeamTaskLabel(task)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="hint-text">Keine Aufgaben fuer dieses Team vorhanden.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="hint-text">Noch keine Gruppe hat einen Code aktiviert.</p>
                )}
              </div>
            </div>

            <div className="card stack">
              <p className="eyebrow">Auffaelligkeiten</p>
              <h3>Was gerade Aufmerksamkeit braucht</h3>
              <ul className="feature-list">
                {stuckTeams.length ? (
                  stuckTeams.map((team) => (
                    <li key={team.id}>
                      <strong>{team.name}</strong> haengt seit {team.metrics.minutesSinceActivity} Min. ohne neue Aktivitaet.
                    </li>
                  ))
                ) : (
                  <li>Aktuell haengt keine Gruppe deutlich fest.</li>
                )}
              </ul>

              <div className="detail-block">
                <p className="eyebrow">Status-Summen</p>
                <div className="task-list">
                  <div className="task-row">
                    <strong>Beantwortet</strong>
                    <span>{solvedTasks.length}</span>
                  </div>
                  <div className="task-row">
                    <strong>Wird geprueft</strong>
                    <span>{reviewTasks.length}</span>
                  </div>
                  <div className="task-row">
                    <strong>Abgelehnt</strong>
                    <span>{rejectedTasks.length}</span>
                  </div>
                  <div className="task-row">
                    <strong>Falsch beantwortet</strong>
                    <span>{wrongTasks.length}</span>
                  </div>
                  <div className="task-row">
                    <strong>Offen</strong>
                    <span>{openTasks.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {tab === 'tasks' ? (
        <>
          <div className="content-grid">
            <div className="card stack">
              <div className="section-head compact">
                <div>
                  <p className="eyebrow">Aufgabenverwaltung</p>
                  <h2>{stationDraft.id ? 'Aufgabe bearbeiten' : 'Neue Aufgabe anlegen'}</h2>
                </div>
                {stationDraft.id ? (
                  <button className="ghost-button" onClick={resetStationDraft} type="button">
                    Bearbeitung abbrechen
                  </button>
                ) : null}
              </div>

              <form className="stack" onSubmit={handleCreateStation}>
                <label className="field">
                  <span>Name</span>
                  <input
                    onChange={(event) =>
                      setStationDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    type="text"
                    value={stationDraft.name}
                  />
                </label>

                <div className="content-grid">
                  <label className="field">
                    <span>Typ</span>
                    <select
                      onChange={(event) =>
                        setStationDraft((current) => {
                          const nextType = event.target.value

                          if (nextType !== 'choice') {
                            return {
                              ...current,
                              type: nextType,
                              unlimitedAttempts:
                                current.type === 'choice' ? true : current.unlimitedAttempts,
                            }
                          }

                          const choiceOptions =
                            current.choiceOptions?.length >= 2
                              ? current.choiceOptions
                              : [createEmptyChoiceOption(), createEmptyChoiceOption()]

                          return {
                            ...current,
                            type: nextType,
                            answer: '',
                            unlimitedAttempts:
                              current.type === 'choice' ? current.unlimitedAttempts : false,
                            choiceOptions,
                            correctChoiceId: current.correctChoiceId,
                          }
                        })
                      }
                      value={stationDraft.type}
                    >
                      <option value="text">Text</option>
                      <option value="number">Zahl</option>
                      <option value="manual">Freitext mit Freigabe</option>
                      <option value="photo">Foto</option>
                      <option value="estimate">Schaetzaufgabe</option>
                      <option value="qr">QR-Code</option>
                      <option value="choice">Multiple Choice</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Punkte</span>
                    <input
                      min="0"
                      onChange={(event) =>
                        setStationDraft((current) => ({ ...current, points: event.target.value }))
                      }
                      type="number"
                      value={stationDraft.points}
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Freischaltung</span>
                  <label style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      checked={stationDraft.requiresUnlockCode}
                      onChange={(event) =>
                        setStationDraft((current) => ({
                          ...current,
                          requiresUnlockCode: event.target.checked,
                          unlockCode: event.target.checked ? current.unlockCode : '',
                        }))
                      }
                      type="checkbox"
                    />
                    <span>Freischaltcode erforderlich</span>
                  </label>
                  <small>
                    Wenn deaktiviert, ist die Aufgabe fuer Spieler sofort verfuegbar.
                  </small>
                </label>

                <label className="field">
                  <span>Versuche</span>
                  <label style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      checked={stationDraft.unlimitedAttempts}
                      onChange={(event) =>
                        setStationDraft((current) => ({
                          ...current,
                          unlimitedAttempts: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>Unendlich viele Versuche erlauben</span>
                  </label>
                  <small>
                    Deaktiviert bedeutet: genau ein Versuch, danach ist die Aufgabe gesperrt.
                  </small>
                </label>

                <label className="field">
                  <span>Aufgabe</span>
                  <textarea
                    onChange={(event) =>
                      setStationDraft((current) => ({ ...current, task: event.target.value }))
                    }
                    rows="4"
                    value={stationDraft.task}
                  />
                </label>

                {stationDraft.type === 'choice' ? (
                  <div className="stack">
                    <div className="section-head compact">
                      <div>
                        <p className="eyebrow">Antwortoptionen</p>
                        <h3>Optionen und richtige Antwort</h3>
                      </div>
                    </div>

                    {stationDraft.choiceOptions.map((option, index) => (
                      <div className="content-grid" key={option.id}>
                        <label className="field">
                          <span>Option {index + 1}</span>
                          <input
                            onChange={(event) =>
                              setStationDraft((current) => ({
                                ...current,
                                choiceOptions: current.choiceOptions.map((entry) =>
                                  entry.id === option.id
                                    ? { ...entry, label: event.target.value }
                                    : entry,
                                ),
                              }))
                            }
                            type="text"
                            value={option.label}
                          />
                        </label>

                        <label className="field">
                          <span>Richtige Antwort</span>
                          <input
                            checked={stationDraft.correctChoiceId === option.id}
                            name="correct-choice"
                            onChange={() =>
                              setStationDraft((current) => ({
                                ...current,
                                correctChoiceId: option.id,
                              }))
                            }
                            type="radio"
                          />
                        </label>

                        <button
                          className="ghost-button danger-button"
                          disabled={stationDraft.choiceOptions.length <= 2}
                          onClick={() =>
                            setStationDraft((current) => {
                              const nextChoiceOptions = current.choiceOptions.filter(
                                (entry) => entry.id !== option.id,
                              )

                              return {
                                ...current,
                                choiceOptions: nextChoiceOptions,
                                correctChoiceId:
                                  current.correctChoiceId === option.id
                                    ? ''
                                    : current.correctChoiceId,
                              }
                            })
                          }
                          type="button"
                        >
                          Entfernen
                        </button>
                      </div>
                    ))}

                    <button
                      className="ghost-button"
                      onClick={() =>
                        setStationDraft((current) => ({
                          ...current,
                          choiceOptions: [
                            ...current.choiceOptions,
                            createEmptyChoiceOption(),
                          ],
                        }))
                      }
                      type="button"
                    >
                      Weitere Option
                    </button>
                  </div>
                ) : (
                  <label className="field">
                    <span>
                      {stationDraft.type === 'estimate'
                        ? 'Echter Wert fuer die Schaetzung'
                        : 'Loesung / erwartete Antwort'}
                    </span>
                    <input
                      onChange={(event) =>
                        setStationDraft((current) => ({ ...current, answer: event.target.value }))
                      }
                      type={stationDraft.type === 'estimate' ? 'number' : 'text'}
                      value={stationDraft.answer}
                    />
                  </label>
                )}

                <label className="field">
                  <span>Ortshinweis</span>
                  <textarea
                    onChange={(event) =>
                      setStationDraft((current) => ({ ...current, locationHint: event.target.value }))
                    }
                    rows="2"
                    value={stationDraft.locationHint}
                  />
                </label>

                <label className="field">
                  <span>Bild zur Aufgabe</span>
                  <input
                    accept="image/*"
                    onChange={(event) =>
                      setStationDraft((current) => ({
                        ...current,
                        stationImage: event.target.files?.[0] ?? null,
                      }))
                    }
                    type="file"
                  />
                  {stationDraft.existingImageName && !stationDraft.stationImage ? (
                    <small>Aktuell: {stationDraft.existingImageName}</small>
                  ) : null}
                  {stationDraft.stationImage ? <small>{stationDraft.stationImage.name}</small> : null}
                </label>

                {stationDraft.requiresUnlockCode ? (
                  <label className="field">
                    <span>Freischaltungscode (4 Zeichen, Buchstaben/Zahlen)</span>
                    <input
                      maxLength="4"
                      onChange={(event) =>
                        setStationDraft((current) => ({
                          ...current,
                          unlockCode: event.target.value
                            .replace(/[^a-zA-Z0-9]+/g, '')
                            .slice(0, 4),
                        }))
                      }
                      placeholder="z. B. A1B2"
                      type="text"
                      value={stationDraft.unlockCode}
                    />
                  </label>
                ) : null}

                <div className="section-head compact">
                  <div>
                    <p className="eyebrow">Hinweise</p>
                    <h3>Spieler-Hinweise vorbereiten</h3>
                  </div>
                </div>

                {stationDraft.hints?.length > 0 ? (
                  <div className="task-list">
                    {stationDraft.hints.map((hint, index) => (
                      <div className="task-row" key={hint.id}>
                        <div>
                          <strong>Hinweis Stufe {index + 1}</strong>
                          <p className="hint-text">{hint.content}</p>
                          <p className="hint-text">{hint.cost} Punkte</p>
                          {hint.imageName ? <p className="hint-text">Bild: {hint.imageName}</p> : null}
                        </div>
                        <button
                          className="ghost-button danger-button"
                          onClick={() =>
                            setStationDraft((current) => ({
                              ...current,
                              hints: current.hints.filter((entry) => entry.id !== hint.id),
                            }))
                          }
                          type="button"
                        >
                          Entfernen
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="hint-text">Noch keine Hinweise hinzugefuegt.</p>
                )}

                <div className="content-grid">
                  <label className="field">
                    <span>Kosten (Punkte)</span>
                    <input
                      min="1"
                      onChange={(event) => setHintCostDraft(event.target.value)}
                      type="number"
                      value={hintCostDraft}
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Hinweis-Text</span>
                  <textarea
                    onChange={(event) => setHintTextDraft(event.target.value)}
                    rows="2"
                    value={hintTextDraft}
                  />
                </label>

                <label className="field">
                  <span>Optionales Hinweis-Bild</span>
                  <input
                    accept="image/*"
                    onChange={(event) => {
                      setHintImageDraft(event.target.files?.[0] ?? null)
                    }}
                    type="file"
                  />
                  {hintImageDraft ? <small>{hintImageDraft.name}</small> : null}
                </label>

                <button
                  className="ghost-button"
                  onClick={() => {
                    const trimmedHintText = hintTextDraft.trim()

                    if (!trimmedHintText) {
                      return
                    }

                    if (hintImageDraft instanceof File) {
                      const newHint = {
                        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2, 11),
                        content: trimmedHintText,
                        imageUrl: '',
                        imageName: hintImageDraft.name,
                        imageFile: hintImageDraft,
                        cost: Number(hintCostDraft),
                      }

                      setStationDraft((current) => ({
                        ...current,
                        hints: [...(current.hints || []), newHint],
                      }))
                      setHintTextDraft('')
                      setHintImageDraft(null)
                      setHintCostDraft('5')
                      return
                    }

                    const newHint = {
                      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2, 11),
                      content: trimmedHintText,
                      imageUrl: '',
                      imageName: '',
                      imageFile: null,
                      cost: Number(hintCostDraft),
                    }

                    setStationDraft((current) => ({
                      ...current,
                      hints: [...(current.hints || []), newHint],
                    }))
                    setHintTextDraft('')
                    setHintImageDraft(null)
                    setHintCostDraft('5')
                  }}
                  type="button"
                >
                  Hinweis hinzufuegen
                </button>

                <button className="primary-button" type="submit">
                  {stationDraft.id ? 'Aenderungen speichern' : 'Aufgabe speichern'}
                </button>
              </form>
            </div>

            <div className="card stack">
              <div className="section-head compact">
                <div>
                  <p className="eyebrow">Bestehende Aufgaben</p>
                  <h2>Analyse und Loeschen</h2>
                </div>
              </div>

              <div className="task-list">
                {stations.length ? (
                  stations.map((station) => {
                    const analytics = getStationAnalytics(teams, station.id)
                    const isSelected = selectedAnalysisStationId === station.id

                    return (
                      <div className="monitoring-team" key={station.id}>
                        <button
                          className={isSelected ? 'table-row active' : 'table-row'}
                          onClick={() =>
                            setSelectedAnalysisStationId(isSelected ? null : station.id)
                          }
                          type="button"
                        >
                          <span>{station.name}</span>
                          <span>{station.type}</span>
                          <span>{station.points} P</span>
                          <span>{analytics.solved} beantwortet</span>
                          <span>{analytics.pending} eingereicht</span>
                          <span>{analytics.wrongAttempts} Fehler</span>
                        </button>

                        {isSelected ? (
                          <div className="monitoring-detail">
                            <div className="section-head compact">
                              <div>
                                <p className="eyebrow">Aufgabendetail</p>
                                <h3>{station.name}</h3>
                              </div>
                              <button
                                className="ghost-button"
                                onClick={() => handleEditStation(station)}
                                type="button"
                              >
                                Bearbeiten
                              </button>
                              <button
                                className="ghost-button danger-button"
                                onClick={() => onDeleteStation(station.id)}
                                type="button"
                              >
                                Aufgabe loeschen
                              </button>
                            </div>

                            <div className="task-panel">
                              <div className="task-meta">
                                <span>{station.type}</span>
                                <span>{station.points} Punkte</span>
                                <span>
                                  {station.requiresUnlockCode !== false
                                    ? `Code: ${station.unlockCode || 'nicht gesetzt'}`
                                    : 'ohne Freischaltcode'}
                                </span>
                              </div>

                              {station.imageUrl ? (
                                <div className="task-visual">
                                  <img alt={station.imageName || station.name} src={station.imageUrl} />
                                </div>
                              ) : null}

                              <p className="section-copy">{station.locationHint}</p>
                              <p>{station.task}</p>

                              {station.type === 'choice' && station.choices ? (
                                <div className="detail-block">
                                  <p className="eyebrow">Antwortoptionen</p>
                                  <ul className="feature-list">
                                    {station.choices.map((choice) => (
                                      <li key={choice.id}>{choice.label}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {station.answer ? (
                                <div className="reward-panel">
                                  <strong>Loesung</strong>
                                  <p>{station.answer}</p>
                                </div>
                              ) : null}

                              <div className="detail-block">
                                <p className="eyebrow">Analyse</p>
                                <div className="task-list">
                                  <div className="task-row">
                                    <strong>Beantwortet</strong>
                                    <span>{analytics.solved}</span>
                                  </div>
                                  <div className="task-row">
                                    <strong>Eingereicht</strong>
                                    <span>{analytics.pending}</span>
                                  </div>
                                  <div className="task-row">
                                    <strong>Fehlerhafte Versuche</strong>
                                    <span>{analytics.wrongAttempts}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })
                ) : (
                  <p className="hint-text">Noch keine Aufgaben vorhanden.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {tab === 'approvals' ? (
        <div className="card stack">
          <div className="section-head">
            <div>
              <p className="eyebrow">Freigaben</p>
              <h2>Uploads und Freitext-Antworten pruefen</h2>
            </div>
            <Metric label="Offen" value={pendingApprovals.length} />
          </div>

          <div className="approval-list">
            {pendingApprovals.length ? (
              pendingApprovals.map((approval) => (
                <div className="approval-card" key={`${approval.teamId}-${approval.stationId}`}>
                  <div className="approval-card__head">
                    <div>
                      <strong>{approval.teamName}</strong>
                      <p>
                        {approval.stationName} - {approval.submittedBy || 'ohne Namen'} -{' '}
                        {formatTime(approval.submittedAt)}
                      </p>
                    </div>
                    <span className="status-pill locked">wartet</span>
                  </div>

                  {approval.answer ? (
                    <div className="review-note">
                      <strong>Antwort</strong>
                      <p>{approval.answer}</p>
                    </div>
                  ) : null}

                  {approval.assetUrl ? (
                    <div className="approval-preview">
                      <img alt={approval.assetName || approval.stationName} src={approval.assetUrl} />
                    </div>
                  ) : null}

                  <label className="field">
                    <span>Ablehnungsgrund oder Kommentar</span>
                    <textarea
                      onChange={(event) => setReviewNote(approval, event.target.value)}
                      rows="3"
                      value={getReviewNote(approval)}
                    />
                  </label>

                  {['manual', 'photo'].includes(approval.stationType) ? (
                    <label className="field">
                      <span>Punkte bei Freigabe</span>
                      <input
                        defaultValue={approval.stationPoints}
                        max={approval.stationPoints}
                        min="0"
                        ref={(element) => {
                          const key = `${approval.teamId}:${approval.stationId}`

                          if (element) {
                            reviewPointInputsRef.current[key] = element
                            return
                          }

                          delete reviewPointInputsRef.current[key]
                        }}
                        type="number"
                      />
                      <small>Maximum: {approval.stationPoints} Punkte</small>
                    </label>
                  ) : null}

                  <div className="action-row">
                    <button
                      className="primary-button"
                      onClick={() => {
                        onReview(
                          approval.teamId,
                          approval.stationId,
                          'approve',
                          getReviewNote(approval),
                          ['manual', 'photo'].includes(approval.stationType)
                            ? Number(getReviewPoints(approval))
                            : undefined,
                        )
                        clearApprovalDraft(approval)
                      }}
                      type="button"
                    >
                      Freigeben
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => {
                        onReview(approval.teamId, approval.stationId, 'reject', getReviewNote(approval))
                        clearApprovalDraft(approval)
                      }}
                      type="button"
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="hint-text">Aktuell warten keine neuen Einreichungen.</p>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'setup' ? (
        <div className="content-grid">
          <div className="card stack">
            <div className="section-head">
              <div>
                <p className="eyebrow">Codeverwaltung</p>
                <h2>Codes und Event-Steuerung</h2>
              </div>
              <button className="ghost-button" onClick={onReset} type="button">
                Daten resetten
              </button>
            </div>

            <form className="stack" onSubmit={handleCreateCodeSubmit}>
              <label className="field">
                <span>Gruppencode</span>
                <div className="action-row">
                  <input
                    onChange={(event) =>
                      setAccessCodeInput(
                        event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32),
                      )
                    }
                    placeholder="TEAM-ABCD"
                    type="text"
                    value={accessCodeInput}
                  />
                  <button
                    className="ghost-button"
                    onClick={() => setAccessCodeInput(generateAccessCode())}
                    type="button"
                  >
                    Generieren
                  </button>
                </div>
              </label>
              <button className="primary-button" type="submit">
                Gruppencode erstellen
              </button>
              {codeDraft ? (
                <div className="reward-panel">
                  <strong>Zuletzt erstellt</strong>
                  <p>{codeDraft}</p>
                </div>
              ) : null}
            </form>

            <div className="metric-grid">
              <Metric label="Codes gesamt" value={accessCodes.length} />
              <Metric label="Frei" value={freeCodes.length} />
              <Metric label="Vergeben" value={usedCodes.length} />
              <Metric label="Aufgaben" value={stations.length} />
            </div>

            <form className="content-grid" onSubmit={handleTimerSubmit}>
              <label className="field">
                <span>Timer in Minuten</span>
                <input
                  min="1"
                  onChange={(event) => setTimerDraft(event.target.value)}
                  type="number"
                  value={timerDraft}
                />
              </label>
              <button className="primary-button secondary" type="submit">
                Timer speichern
              </button>
            </form>

            <div className="metric-grid">
              <Metric
                label="Timer-Status"
                value={
                  resolvedTimerState.status === 'running'
                    ? 'laeuft'
                    : resolvedTimerState.status === 'paused'
                      ? 'pausiert'
                      : resolvedTimerState.status === 'stopped'
                        ? 'gestoppt'
                        : 'bereit'
                }
              />
              <Metric
                label="Restzeit"
                value={formatCountdown(
                  { eventStartedAt, eventStatus, eventPausedAt, eventPausedDurationMs },
                  now,
                  eventDurationMinutes,
                )}
              />
              <Metric
                label="Gestartet"
                value={eventStartedAt ? formatTime(eventStartedAt) : 'noch nicht'}
              />
            </div>

            <div className="action-row">
              <button
                className="primary-button secondary"
                disabled={resolvedTimerState.status !== 'idle'}
                onClick={onStartEvent}
                type="button"
              >
                Event-Timer starten
              </button>
              <button
                className="ghost-button"
                disabled={resolvedTimerState.status !== 'running'}
                onClick={onPauseEvent}
                type="button"
              >
                Pausieren
              </button>
              <button
                className="ghost-button"
                disabled={resolvedTimerState.status !== 'paused'}
                onClick={onResumeEvent}
                type="button"
              >
                Fortsetzen
              </button>
              <button
                className="ghost-button"
                disabled={!['running', 'paused'].includes(resolvedTimerState.status)}
                onClick={onStopEvent}
                type="button"
              >
                Stoppen
              </button>
              <button
                className="ghost-button"
                disabled={resolvedTimerState.status === 'idle'}
                onClick={onResetEventTimer}
                type="button"
              >
                Timer zuruecksetzen
              </button>
            </div>
          </div>

          <div className="card stack">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Gruppencodes</p>
                <h2>Freie und vergebene Codes</h2>
              </div>
            </div>

            <label className="field">
              <span>Code einlesen oder suchen</span>
              <input
                onChange={(event) => setAccessCodeSearch(event.target.value)}
                placeholder="Code oder Gruppenname eingeben"
                type="text"
                value={accessCodeSearch}
              />
            </label>

            <div className="quick-team-list">
              {filteredAccessCodes.length ? (
                filteredAccessCodes.map((entry) => (
                  <div className="quick-team static-card" key={entry.id}>
                    <div>
                      <strong>{entry.code}</strong>
                      <span>{entry.assignedGroupName || 'Noch keiner Gruppe zugeordnet'}</span>
                    </div>
                    <span className={`status-pill ${entry.teamId ? 'solved' : 'open'}`}>
                      {entry.teamId ? 'vergeben' : 'frei'}
                    </span>
                  </div>
                ))
              ) : accessCodes.length ? (
                <p className="hint-text">Kein Gruppencode passt zur aktuellen Suche.</p>
              ) : (
                <p className="hint-text">Noch keine Gruppencodes erstellt.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default AdminView
