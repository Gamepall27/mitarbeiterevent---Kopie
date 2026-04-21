import { useState } from 'react'

import {
  formatCountdown,
  getStatusLabel,
  getVisualStatus,
} from '../utils/eventModel'
import Metric from './Metric'

function TeamView({
  team,
  stations,
  now,
  eventDurationMinutes,
  eventStartedAt,
  onLogout,
  onSelectStation,
  onSubmitStation,
  onUnlock,
  onBuyHint,
}) {
  const [expandedStationId, setExpandedStationId] = useState(null)
  const [expandedHintImage, setExpandedHintImage] = useState(null)
  
  const teamReady = Boolean(eventStartedAt)
  const selectedStation =
    stations.find((station) => station.id === team.selectedStationId) ??
    stations[0]
  const selectedProgress = selectedStation
    ? team.stationProgress[selectedStation.id]
    : null
  const latestHint = team.adminHints.at(-1) ?? null

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
                ? formatCountdown({ startedAt: eventStartedAt }, now, eventDurationMinutes)
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
          {stations.map((station) => {
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
                      {station.zone} · {station.mandatory ? 'Pflicht' : 'Bonus'}
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
                      onSubmit={onSubmitStation}
                      onUnlock={onUnlock}
                      onBuyHint={onBuyHint}
                      expandedHintImage={expandedHintImage}
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

      {latestHint ? (
        <div className="card review-note">
          <strong>Hinweis vom Admin-Team</strong>
          <p>{latestHint.text}</p>
        </div>
      ) : null}
    </section>

    {/* Image Modal - Full Screen */}
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
          onClick={(e) => e.stopPropagation()}
        >
          <img
            alt="Vergrößerter Hinweis"
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
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 1)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.9)'
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

function QuickUnlockCard({ teamId, currentStationId, onUnlock }) {
  const [unlockCode, setUnlockCode] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onUnlock(teamId, currentStationId, unlockCode)
    setUnlockCode('')
  }
}

function StationDetail({ station, team, teamReady, onSubmit, onUnlock, onBuyHint, expandedHintImage, setExpandedHintImage }) {
  const progress = team.stationProgress[station.id]
  const [answer, setAnswer] = useState(progress.answer ?? '')
  const [photoName, setPhotoName] = useState(progress.assetName ?? '')
  const [photoFile, setPhotoFile] = useState(null)
  const [unlockCode, setUnlockCode] = useState('')

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
      <div className="task-meta">
        <span>{station.zone}</span>
        <span>{station.format}</span>
        <span>{station.mandatory ? 'Pflicht' : 'Bonus'}</span>
      </div>

      {station.imageUrl ? (
        <div className="task-visual">
          <img alt={station.imageName || station.name} src={station.imageUrl} />
        </div>
      ) : null}

      <p className="section-copy">{station.locationHint}</p>
      <p>{station.task}</p>

      {!teamReady ? (
        <div className="review-note">
          <strong>Wartet auf den Start</strong>
          <p>Der Event-Timer wurde noch nicht gestartet. Das Antwortfeld bleibt bis dahin gesperrt.</p>
        </div>
      ) : !progress.unlocked ? (
        <>
          <div className="review-note">
            <strong>Naechster Schritt</strong>
            <p>Gebt zuerst den 4-stelligen Freischaltcode aus Buchstaben und Zahlen ein.</p>
          </div>

          <form className="stack" onSubmit={handleUnlockSubmit}>
            <label className="field">
              <span>Freischaltcode</span>
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
        </>
      ) : null}

      {progress.status === 'pending' ? (
        <div className="review-note">
          <strong>Antwort gesendet</strong>
          <p>
            Diese Aufgabe wird gerade geprueft. Ihr koennt warten oder eure
            Antwort aktualisieren.
          </p>
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
      ) : teamReady && progress.unlocked ? (
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
            {progress.status === 'pending' ? 'Antwort aktualisieren' : 'Antwort senden'}
          </button>
        </form>
      ) : null}

      {progress.reviewNote ? (
        <div className="review-note">
          <strong>Rueckmeldung</strong>
          <p>{progress.reviewNote}</p>
        </div>
      ) : null}

      {station.hints && station.hints.length > 0 && teamReady && progress.unlocked ? (
        <div className="card stack simple-focus">
          <div className="section-head compact">
            <p className="eyebrow">Verfuegbare Hinweise</p>
          </div>
          <div className="hints-list">
            {station.hints.map((hint, index) => {
              const isAlreadyBought = progress.boughtHints?.includes(hint.id)
              // Check if previous hints are bought (for hint levels)
              const previousHintsBought = index === 0 || station.hints.slice(0, index).every((h) => progress.boughtHints?.includes(h.id))
              const canBuyThisHint = previousHintsBought && !isAlreadyBought
              
              return (
                <div className="hint-card" key={hint.id}>
                  <div style={{ width: '100%' }}>
                    <p className="hint-label">Hinweis Stufe {index + 1}</p>
                    {isAlreadyBought ? (
                      hint.type === 'text' ? (
                        <p className="hint-preview">{hint.content}</p>
                      ) : (
                        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                          <img 
                            alt="Hinweis-Bild" 
                            src={hint.content} 
                            style={{ 
                              width: '100%', 
                              maxWidth: '100%',
                              height: 'auto',
                              borderRadius: '12px',
                              display: 'block',
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            onClick={() => setExpandedHintImage(hint.content)}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.02)'
                              e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)'
                              e.target.style.boxShadow = 'none'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        </div>
                      )
                    ) : (
                      <p className="hint-preview" style={{ fontStyle: 'italic', color: '#888' }}>Inhalt sichtbar nach dem Kauf</p>
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
    </div>
    </>
  )
}

export default TeamView
