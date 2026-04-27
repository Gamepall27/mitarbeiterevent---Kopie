import { useState } from 'react'

import {
  formatCountdown,
  getEventTimerState,
  getDisplayProgressStatus,
  getStatusLabel,
  getTeamStationOrder,
  getVisualStatus,
} from '../utils/eventModel'
import Metric from './Metric'

function TeamView({
  team,
  stations,
  now,
  eventDurationMinutes,
  eventStartedAt,
  eventStatus,
  eventPausedAt,
  eventPausedDurationMs,
  eventTimerState,
  onLogout,
  onSubmitStation,
  onUnlock,
  onBuyHint,
}) {
  const [expandedStationId, setExpandedStationId] = useState(null)
  const [expandedHintImage, setExpandedHintImage] = useState(null)
  const resolvedTimerState =
    eventTimerState ??
    getEventTimerState(
      { eventStartedAt, eventStatus, eventPausedAt, eventPausedDurationMs },
      now,
      eventDurationMinutes,
    )
  const teamReady = Boolean(eventStartedAt)
  const teamCanPlay = resolvedTimerState.isInteractive
  const orderedStations = getTeamStationOrder(stations, team.id || team.code)
  const selectedStation =
    orderedStations.find((station) => station.id === team.selectedStationId) ??
    orderedStations[0]

  if (!selectedStation) {
    return (
      <section className="team-layout team-layout--simple">
        <div className="team-header card">
          <div>
            <p className="eyebrow">Team</p>
            <h2>{team.name}</h2>
            <p className="section-copy">Aktuell sind keine Aufgaben angelegt.</p>
          </div>
          <button className="ghost-button" onClick={onLogout} type="button">
            Gruppe wechseln
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
    <section className="team-layout team-layout--simple">
      <div className="team-header card">
        <div>
          <p className="eyebrow">Team</p>
          <h2>{team.name}</h2>
          <p className="section-copy">Code {team.code}</p>
        </div>
        <div className="team-header__meta team-header__meta--simple">
          <Metric
            label={teamReady ? 'Restzeit' : 'Status'}
            value={
              teamReady
                ? formatCountdown(
                    { eventStartedAt, eventStatus, eventPausedAt, eventPausedDurationMs },
                    now,
                    eventDurationMinutes,
                  )
                : 'wartet auf Start'
            }
          />
          <Metric label="Punkte" value={team.metrics.points} />
          <button className="ghost-button" onClick={onLogout} type="button">
            Gruppe wechseln
          </button>
        </div>
      </div>

      {!teamReady ? (
        <div className="card stack simple-focus">
          <p className="eyebrow">Start</p>
          <h3>Noch nicht gestartet</h3>
          <p className="section-copy">
            Ihr koennt die Aufgaben schon ansehen. Antworten und Freischaltung
            sind erst moeglich, sobald das Admin-Team den Event-Timer startet.
          </p>
          <div className="simple-inline">
            <span className="status-pill open">Code {team.code}</span>
            <span className="simple-note">
              Die Aufgabenliste bleibt sichtbar, damit ihr euch vorab orientieren koennt.
            </span>
          </div>
        </div>
      ) : null}

      <div className="card stack">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Aufgaben</p>
            <h3>Aufgaben ansehen und bearbeiten</h3>
          </div>
          <p className="hint-text">Klicke auf eine Aufgabe, um diese anzuzeigen und zu bearbeiten.</p>
        </div>

        <div className="station-accordion simple-station-list">
          {orderedStations.map((station) => {
            const progress = team.stationProgress[station.id]
            const visualStatus = getVisualStatus(progress, station)
            const isExpanded = expandedStationId === station.id

            const handleToggle = () => {
              if (isExpanded) {
                setExpandedStationId(null)
              } else {
                setExpandedStationId(station.id)
              }
            }

            return (
              <div key={station.id} className="accordion-item">
                <button
                  className={`accordion-header station-card ${isExpanded ? 'active' : ''}`}
                  onClick={handleToggle}
                  type="button"
                >
                  <div>
                    <strong>{station.name}</strong>
                    <p>
                      {getStationPointsLabel(progress, station)}
                    </p>
                  </div>
                  <span className={`status-pill ${visualStatus}`}>
                    {getStatusLabel(visualStatus)}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="accordion-content">
                    <StationDetail
                      key={`${team.id}-${station.id}-${progress.status}-${progress.answer}-${progress.assetName}-${progress.unlocked}-${teamReady}`}
                      station={station}
                      team={team}
                      teamReady={teamReady}
                      teamCanPlay={teamCanPlay}
                      timerStatus={resolvedTimerState.status}
                      onSubmit={onSubmitStation}
                      onUnlock={onUnlock}
                      onBuyHint={onBuyHint}
                      setExpandedHintImage={setExpandedHintImage}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {team.metrics.fragments.length ? (
        <div className="card reward-panel">
          <strong>Gesammelte Fragmente</strong>
          <p>{team.metrics.fragments.map((fragment) => fragment.fragment).join(' - ')}</p>
        </div>
      ) : null}
    </section>

    {expandedHintImage ? (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          overflow: 'auto',
        }}
        onClick={() => setExpandedHintImage(null)}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <img
            alt="Vergroesserter Hinweis"
            src={expandedHintImage}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              objectFit: 'contain',
            }}
          />
          <button
            onClick={() => setExpandedHintImage(null)}
            style={{
              position: 'fixed',
              top: '12px',
              right: '12px',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease',
              zIndex: 10000,
            }}
          >
            ✕
          </button>
        </div>
      </div>
    ) : null}
    </>
  )
}

function getStationPointsLabel(progress, station) {
  const status = getDisplayProgressStatus(progress)

  if (status === 'solved' || status === 'pending') {
    return `${progress.pointsAwarded ?? 0} / ${station.points} P`
  }

  return `${station.points} P`
}

function StationDetail({
  station,
  team,
  teamReady,
  teamCanPlay,
  timerStatus,
  onSubmit,
  onUnlock,
  onBuyHint,
  setExpandedHintImage,
}) {
  const progress = team.stationProgress[station.id]
  const [answer, setAnswer] = useState(progress.answer ?? '')
  const [photoName, setPhotoName] = useState(progress.assetName ?? '')
  const [photoFile, setPhotoFile] = useState(null)
  const [unlockCode, setUnlockCode] = useState('')
  const isSubmissionLocked = Boolean(progress.submittedAt)
  const showHints =
    Boolean(station.hints?.length) && teamCanPlay && progress.status !== 'solved'

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(team.id, station.id, { answer, file: photoFile })
  }

  function handleUnlockSubmit(event) {
    event.preventDefault()
    onUnlock(team.id, station.id, unlockCode)
    setUnlockCode('')
  }

  return (
    <>
    <div className="task-panel">
      {station.imageUrl ? (
        <div className="task-visual">
          <img alt={station.imageName || station.name} src={station.imageUrl} />
        </div>
      ) : null}

      <p className="section-copy">{station.locationHint}</p>
      <p>{station.task}</p>

      {showHints ? (
        <div className="card stack simple-focus">
          <div className="section-head compact">
            <p className="eyebrow">Verfuegbare Hinweise</p>
          </div>
          <div className="hints-list">
            {station.hints.map((hint, index) => {
              const isAlreadyBought = progress.boughtHints?.includes(hint.id)
              const previousHintsBought =
                index === 0 ||
                station.hints.slice(0, index).every((entry) => progress.boughtHints?.includes(entry.id))
              const canBuyThisHint = previousHintsBought && !isAlreadyBought

              return (
                <div className="hint-card" key={hint.id}>
                  <div style={{ width: '100%' }}>
                    <p className="hint-label">Hinweis Stufe {index + 1}</p>
                    {isAlreadyBought ? (
                      <>
                        <p className="hint-preview">{hint.content}</p>
                        {hint.imageUrl ? (
                        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                          <img
                            alt="Hinweis-Bild"
                            src={hint.imageUrl}
                            style={{
                              width: '100%',
                              maxWidth: '100%',
                              height: 'auto',
                              borderRadius: '12px',
                              display: 'block',
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            }}
                            onClick={() => setExpandedHintImage(hint.imageUrl)}
                            onMouseEnter={(event) => {
                              event.target.style.transform = 'scale(1.02)'
                              event.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                            }}
                            onMouseLeave={(event) => {
                              event.target.style.transform = 'scale(1)'
                              event.target.style.boxShadow = 'none'
                            }}
                            onError={(event) => {
                              event.target.style.display = 'none'
                            }}
                          />
                        </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="hint-preview" style={{ fontStyle: 'italic', color: '#888' }}>
                        Inhalt sichtbar nach dem Kauf
                      </p>
                    )}
                    <p className="hint-cost">Kosten: {hint.cost} Punkte</p>
                  </div>
                  <button
                    className={isAlreadyBought ? 'primary-button secondary' : 'primary-button'}
                    disabled={isAlreadyBought || !canBuyThisHint}
                    onClick={() => {
                      if (canBuyThisHint) {
                        onBuyHint(team.id, station.id, hint.id)
                      }
                    }}
                    title={!canBuyThisHint ? 'Kaufe zuerst die vorherigen Hinweise' : ''}
                    type="button"
                  >
                    {isAlreadyBought ? 'Gekauft' : canBuyThisHint ? 'Kaufen' : 'Gesperrt'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {!teamReady ? (
        <div className="review-note">
          <strong>Wartet auf den Start</strong>
          <p>Der Event-Timer wurde noch nicht gestartet. Das Antwortfeld bleibt bis dahin gesperrt.</p>
        </div>
      ) : !teamCanPlay ? (
        <div className="review-note">
          <strong>{timerStatus === 'paused' ? 'Event pausiert' : 'Event gestoppt'}</strong>
          <p>
            {timerStatus === 'paused'
              ? 'Der Timer ist pausiert. Freischaltungen und Antworten sind aktuell gesperrt.'
              : 'Der Timer wurde gestoppt. Freischaltungen und Antworten sind nicht mehr moeglich.'}
          </p>
        </div>
      ) : !progress.unlocked ? (
        <form className="stack" onSubmit={handleUnlockSubmit}>
          <label className="field">
            <span>Freischaltcode</span>
            <small>Den code findet ihr an der jeweiligen station</small>
            <input
              maxLength="4"
              onChange={(event) =>
                setUnlockCode(
                  event.target.value.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 4),
                )
              }
              placeholder="A1B2"
              type="text"
              value={unlockCode}
            />
          </label>
          <button
            className="primary-button"
            disabled={unlockCode.length !== 4}
            type="submit"
          >
            Freischalten
          </button>
        </form>
      ) : null}

      {progress.status === 'pending' ? (
        <div className="review-note">
          <strong>Antwort gesendet</strong>
          <p>Diese Aufgabe wird gerade geprueft und kann nicht mehr bearbeitet werden.</p>
        </div>
      ) : null}

      {progress.status === 'solved' ? (
        <div className="reward-panel">
          <strong>Aufgabe erledigt</strong>
          <p>
            {station.fragment
              ? `Fragment gesammelt: ${station.fragment}`
              : 'Diese Aufgabe ist bereits geloest.'}
          </p>
        </div>
      ) : isSubmissionLocked ? (
        <div className="review-note">
          <strong>Antwort gesendet</strong>
          <p>Diese Aufgabe wurde bereits abgeschickt und ist jetzt gesperrt.</p>
        </div>
      ) : teamCanPlay && progress.unlocked ? (
        <form className="stack" onSubmit={handleSubmit}>
          {station.type === 'choice' ? (
            <div className="choice-list">
              {station.choices.map((choice) => (
                <label className="choice-card" key={choice.id}>
                  <input
                    checked={answer === choice.id}
                    name={`choice-${station.id}`}
                    onChange={(event) => setAnswer(event.target.value)}
                    type="radio"
                    value={choice.id}
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </div>
          ) : station.type === 'photo' ? (
            <label className="field">
              <span>Foto hochladen</span>
              <input
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null
                  setPhotoFile(nextFile)
                  setPhotoName(nextFile?.name ?? '')
                }}
                type="file"
              />
              {photoName ? <small>{photoName}</small> : null}
            </label>
          ) : (
            <label className="field">
              <span>{['number', 'estimate'].includes(station.type) ? 'Zahl' : 'Antwort'}</span>
              <input
                onChange={(event) => setAnswer(event.target.value)}
                placeholder={station.placeholder ?? 'Antwort'}
                type={['number', 'estimate'].includes(station.type) ? 'number' : 'text'}
                value={answer}
              />
            </label>
          )}

          <button className="primary-button" type="submit">
            Antwort senden
          </button>
        </form>
      ) : null}

      {progress.reviewNote ? (
        <div className="review-note">
          <strong>Rueckmeldung</strong>
          <p>{progress.reviewNote}</p>
        </div>
      ) : null}

    </div>
    </>
  )
}

export default TeamView
