import { useEffect, useRef, useState } from 'react'
import { formatTime, getStationAnalytics, getStationName } from '../utils/eventModel'
import Metric from './Metric'

function AdminView({
  teams,
  stations,
  rankedTeams,
  accessCodes,
  eventDurationMinutes,
  eventStartedAt,
  pendingApprovals,
  adminSelectedTeamId,
  adminSelectedTeam,
  adminSelectedStation,
  onSetAdminSelectedTeam,
  onSetAdminSelectedStation,
  hintDraft,
  onSetHintDraft,
  onHint,
  onMarkCorrect,
  onBonus,
  onSetEventDurationMinutes,
  onToggleActive,
  onReset,
  onCreateCode,
  onCreateStation,
  onDeleteStation,
  onDeleteTeam,
  onLogout,
  onReview,
  codeDraft,
  onStartEvent,
}) {
  const [tab, setTab] = useState('overview')
  const [timerDraft, setTimerDraft] = useState(String(eventDurationMinutes))
  const [hintImage, setHintImage] = useState(null)
  const [hintImageName, setHintImageName] = useState('')
  const [reviewNotes, setReviewNotes] = useState({})
  const reviewPointInputsRef = useRef({})
  const [hintTypeDraft, setHintTypeDraft] = useState('text')
  const [hintContentDraft, setHintContentDraft] = useState('')
  const [hintCostDraft, setHintCostDraft] = useState('5')
  const [stationDraft, setStationDraft] = useState({
    name: '',
    zone: '',
    area: 'Custom',
    type: 'text',
    format: 'Admin-Aufgabe',
    points: 50,
    mandatory: true,
    task: '',
    answer: '',
    placeholder: 'Antwort eingeben',
    locationHint: '',
    rewardHint: '',
    fragment: '',
    choicesText: '',
    stationImage: null,
    unlockCode: '',
    hints: [],
  })
  const stuckTeams = teams.filter((team) => team.metrics.isStuck)
  const usedCodes = accessCodes.filter((entry) => entry.teamId)
  const maxBasePoints = stations.reduce((sum, station) => sum + station.points, 0)
  const selectedTeamTaskSummary = adminSelectedTeam
    ? stations.map((station) => {
        const progress = adminSelectedTeam.stationProgress[station.id]

        return {
          id: station.id,
          name: station.name,
          points: station.points,
          status: progress.status,
          earnedPoints: progress.status === 'solved' ? (progress.pointsAwarded ?? station.points) : 0,
        }
      })
    : []
  const solvedTasks = selectedTeamTaskSummary.filter((task) => task.status === 'solved')
  const pendingTasks = selectedTeamTaskSummary.filter((task) => task.status === 'pending')
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

  function handleCreateStation(event) {
    event.preventDefault()
    onCreateStation({
      ...stationDraft,
      points: Number(stationDraft.points),
    })
    setStationDraft({
      name: '',
      zone: '',
      area: 'Custom',
      type: 'text',
      format: 'Admin-Aufgabe',
      points: 50,
      mandatory: true,
      task: '',
      answer: '',
      placeholder: 'Antwort eingeben',
      locationHint: '',
      rewardHint: '',
      fragment: '',
      choicesText: '',
      stationImage: null,
      unlockCode: '',
      hints: [],
    })
    setHintTypeDraft('text')
    setHintContentDraft('')
    setHintCostDraft('5')
  }

  function handleTimerSubmit(event) {
    event.preventDefault()
    onSetEventDurationMinutes(Number(timerDraft))
  }

  function handleHintSubmit() {
    onHint({ text: hintDraft, hintImage })
    setHintImage(null)
    setHintImageName('')
  }

  return (
    <section className="stack">
      <nav className="tabs">
        <button
          className={tab === 'overview' ? 'tab-button active' : 'tab-button'}
          onClick={() => setTab('overview')}
          type="button"
        >
          Uebersicht
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
      </nav>

      {tab === 'overview' ? (
        <>
          <div className="content-grid">
            <div className="card stack">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Codeverwaltung</p>
                  <h2>Admin erstellt neue Gruppencodes</h2>
                </div>
                <div className="action-row">
                  <button className="ghost-button" onClick={onLogout} type="button">
                    Admin abmelden
                  </button>
                  <button className="ghost-button" onClick={onReset} type="button">
                    Daten resetten
                  </button>
                </div>
              </div>

              <form className="stack" onSubmit={onCreateCode}>
                <button className="primary-button" type="submit">
                  Neuen Gruppencode erstellen
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
                <Metric label="Unbenutzt" value={accessCodes.length - usedCodes.length} />
                <Metric label="Aktive Gruppen" value={teams.filter((team) => team.active).length} />
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

              <div className="action-row">
                <button
                  className="primary-button secondary"
                  disabled={Boolean(eventStartedAt)}
                  onClick={onStartEvent}
                  type="button"
                >
                  {eventStartedAt ? 'Event-Timer laeuft' : 'Event-Timer starten'}
                </button>
              </div>

              <div className="quick-team-list">
                {accessCodes.length ? (
                  accessCodes.map((entry) => (
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
                ) : (
                  <p className="hint-text">Noch keine Gruppencodes erstellt.</p>
                )}
              </div>
            </div>

            <div className="card stack">
              <p className="eyebrow">Orga-Lage</p>
              <h3>Was gerade Aufmerksamkeit braucht</h3>
              <div className="metric-grid">
                <Metric label="Gruppen" value={teams.length} />
                <Metric label="Stau-Gruppen" value={stuckTeams.length} />
                <Metric label="Pending" value={pendingApprovals.length} />
                </div>
              <ul className="feature-list">
                {stuckTeams.length ? (
                  stuckTeams.map((team) => (
                    <li key={team.id}>
                      <strong>{team.name}</strong> haengt seit{' '}
                      {team.metrics.minutesSinceActivity} Min. ohne neue Aktivitaet.
                    </li>
                  ))
                ) : (
                  <li>Aktuell haengt keine Gruppe deutlich fest.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="content-grid">
            <div className="card stack">
              <div className="section-head compact">
                <div>
                  <p className="eyebrow">Live-Monitoring</p>
                  <h3>Gruppen, Punkte und aktuelle Station</h3>
                </div>
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
                              <p className="eyebrow">Gruppendetails</p>
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
                            <Metric label="Geloest" value={solvedTasks.length} />
                            <Metric label="Offen" value={openTasks.length + pendingTasks.length} />
                          </div>

                          <div className="content-grid monitoring-detail__grid">
                            <div className="stack">
                              <div className="detail-block">
                                <p className="eyebrow">Erledigt</p>
                                <div className="task-list">
                                  {solvedTasks.length ? (
                                    solvedTasks.map((task) => (
                                      <div className="task-row task-row--solved" key={task.id}>
                                        <strong>{task.name}</strong>
                                        <span>{task.earnedPoints}/{task.points} P</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="hint-text">Noch keine Aufgabe erledigt.</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="stack">
                              <div className="detail-block">
                                <p className="eyebrow">Ausstehend</p>
                                <div className="task-list">
                                  {pendingTasks.length || openTasks.length ? (
                                    [...pendingTasks, ...openTasks].map((task) => (
                                      <div className="task-row" key={task.id}>
                                        <strong>{task.name}</strong>
                                        <span>
                                          {task.status === 'pending' ? 'wartet' : 'offen'} - {task.points} P
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="hint-text">Alle Aufgaben sind abgeschlossen.</p>
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
              <div className="section-head compact">
                <div>
                  <p className="eyebrow">Eingriffe</p>
                  <h3>
                    Schnellaktionen fuer {adminSelectedTeam?.name ?? 'noch keine Gruppe'}
                  </h3>
                </div>
              </div>

              <label className="field">
                <span>Gruppe</span>
                <select
                  disabled={!teams.length}
                  onChange={(event) => onSetAdminSelectedTeam(event.target.value)}
                  value={adminSelectedTeamId ?? ''}
                >
                  {teams.length ? (
                    teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Keine Gruppe aktiv</option>
                  )}
                </select>
              </label>

              <label className="field">
                <span>Station</span>
                <select
                  disabled={!teams.length || !stations.length}
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

              <label className="field">
                <span>Hinweis senden</span>
                <textarea
                  onChange={(event) => onSetHintDraft(event.target.value)}
                  rows="3"
                  value={hintDraft}
                />
              </label>

              <label className="field">
                <span>Hinweisbild</span>
                <input
                  accept="image/*"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null
                    setHintImage(nextFile)
                    setHintImageName(nextFile?.name ?? '')
                  }}
                  type="file"
                />
                {hintImageName ? <small>{hintImageName}</small> : null}
              </label>

              <div className="action-row">
                <button className="primary-button" disabled={!adminSelectedTeam} onClick={handleHintSubmit} type="button">
                  Hinweis senden
                </button>
                <button className="ghost-button" disabled={!adminSelectedTeam || !adminSelectedStation} onClick={onMarkCorrect} type="button">
                  Station freigeben
                </button>
              </div>

              <div className="action-row">
                <button className="ghost-button" disabled={!adminSelectedTeam} onClick={() => onBonus(30)} type="button">
                  +30 Bonus
                </button>
                <button className="ghost-button" disabled={!adminSelectedTeam} onClick={() => onBonus(-15)} type="button">
                  -15 Strafe
                </button>
                <button className="ghost-button" disabled={!adminSelectedTeam} onClick={onToggleActive} type="button">
                  {adminSelectedTeam?.active ? 'Gruppe pausieren' : 'Gruppe aktivieren'}
                </button>
              </div>
            </div>
          </div>

          <div className="content-grid">
            <div className="card stack">
              <div className="section-head compact">
                <div>
                  <p className="eyebrow">Aufgabenverwaltung</p>
                  <h3>Neue Aufgabe anlegen</h3>
                </div>
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
                        setStationDraft((current) => ({ ...current, type: event.target.value }))
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

                <div className="content-grid">
                  <label className="field">
                    <span>Zone</span>
                    <input
                      onChange={(event) =>
                        setStationDraft((current) => ({ ...current, zone: event.target.value }))
                      }
                      type="text"
                      value={stationDraft.zone}
                    />
                  </label>

                  <label className="field">
                    <span>Format</span>
                    <input
                      onChange={(event) =>
                        setStationDraft((current) => ({ ...current, format: event.target.value }))
                      }
                      type="text"
                      value={stationDraft.format}
                    />
                  </label>
                </div>

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
                  {stationDraft.stationImage ? (
                    <small>{stationDraft.stationImage.name}</small>
                  ) : null}
                </label>

                <label className="field">
                  <span>Freischaltungscode (4 Zeichen, Buchstaben/Zahlen)</span>
                  <input
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
                    maxLength="4"
                  />
                </label>

                {stationDraft.type === 'choice' ? (
                  <label className="field">
                    <span>Antwortoptionen, je Zeile eine</span>
                    <textarea
                      onChange={(event) =>
                        setStationDraft((current) => ({
                          ...current,
                          choicesText: event.target.value,
                        }))
                      }
                      rows="4"
                      value={stationDraft.choicesText}
                    />
                  </label>
                ) : null}

                <label className="field checkbox-field">
                  <span>Pflichtaufgabe</span>
                  <input
                    checked={stationDraft.mandatory}
                    onChange={(event) =>
                      setStationDraft((current) => ({
                        ...current,
                        mandatory: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                </label>

                <div className="section-head compact">
                  <div>
                    <p className="eyebrow">Hinweise</p>
                    <h4>Spieler-Hinweise hinzufuegen</h4>
                  </div>
                </div>

                {stationDraft.hints?.length > 0 ? (
                  <div className="task-list">
                    {stationDraft.hints.map((hint) => (
                      <div className="task-row" key={hint.id}>
                        <div>
                          <strong>{hint.type === 'text' ? 'Text' : 'Bild'}: {hint.content?.substring(0, 40)}...</strong>
                          <p className="hint-text">{hint.cost} Punkte</p>
                        </div>
                        <button
                          className="ghost-button danger-button"
                          onClick={() =>
                            setStationDraft((current) => ({
                              ...current,
                              hints: current.hints.filter((h) => h.id !== hint.id),
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
                    <span>Hinweis-Typ</span>
                    <select
                      onChange={(event) => setHintTypeDraft(event.target.value)}
                      value={hintTypeDraft}
                    >
                      <option value="text">Text</option>
                      <option value="image">Bild</option>
                    </select>
                  </label>

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

                {hintTypeDraft === 'text' ? (
                  <label className="field">
                    <span>Hinweis-Text</span>
                    <textarea
                      onChange={(event) => setHintContentDraft(event.target.value)}
                      placeholder="Geben Sie einen hilfreichen Hinweis ein"
                      rows="2"
                      value={hintContentDraft}
                    />
                  </label>
                ) : (
                  <label className="field">
                    <span>Hinweis-Bild</span>
                    <input
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          setHintContentDraft(file)
                        }
                      }}
                      type="file"
                    />
                  </label>
                )}

                <button
                  className="ghost-button"
                  onClick={() => {
                    if (!hintContentDraft) return
                    const newHint = {
                      id: crypto.randomUUID?.() || Math.random().toString(36).substr(2, 9),
                      type: hintTypeDraft,
                      content: hintTypeDraft === 'text' ? hintContentDraft : hintContentDraft.name,
                      cost: Number(hintCostDraft),
                    }
                    setStationDraft((current) => ({
                      ...current,
                      hints: [...(current.hints || []), newHint],
                    }))
                    setHintContentDraft('')
                    setHintCostDraft('5')
                    setHintTypeDraft('text')
                  }}
                  type="button"
                >
                  Hinweis hinzufuegen
                </button>

                <button className="primary-button" type="submit">
                  Aufgabe speichern
                </button>
              </form>
            </div>

            <div className="card stack">
              <div className="section-head compact">
                <div>
                  <p className="eyebrow">Aufgabenliste</p>
                  <h3>Vorhandene Aufgaben entfernen</h3>
                </div>
              </div>
              <div className="task-list">
                {stations.length ? (
                  stations.map((station) => (
                    <div className="task-row" key={station.id}>
                      <div>
                        <strong>{station.name}</strong>
                        <p className="hint-text">
                          {station.type} - {station.points} P
                        </p>
                      </div>
                      <button
                        className="ghost-button danger-button"
                        onClick={() => onDeleteStation(station.id)}
                        type="button"
                      >
                        Loeschen
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="hint-text">Noch keine Aufgaben vorhanden.</p>
                )}
              </div>
            </div>
          </div>

          <div className="card stack">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Stationsanalyse</p>
                <h3>Loesungsquote und Problemstellen</h3>
              </div>
            </div>
            <div className="mission-metrics">
              {stations.map((station) => {
                const analytics = getStationAnalytics(teams, station.id)

                return (
                  <div className="mission-card" key={station.id}>
                    <div className="mission-card__top">
                      <strong>{station.name}</strong>
                      <span className={`status-pill ${station.mandatory ? 'open' : 'bonus'}`}>
                        {station.mandatory ? 'Pflicht' : 'Bonus'}
                      </span>
                    </div>
                    <p>
                      {station.format} - {station.zone}
                    </p>
                    <div className="mission-card__stats">
                      <span>{analytics.solved} geloest</span>
                      <span>{analytics.pending} pending</span>
                      <span>{analytics.wrongAttempts} Fehler</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="stack">
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

                    {approval.stationType === 'manual' ? (
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
                            approval.stationType === 'manual'
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
        </div>
      )}
    </section>
  )
}

export default AdminView
