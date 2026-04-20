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

      <div className="simple-dashboard">
        <div className="card stack simple-focus">
          <div className="section-head compact">
            <div>
              <p className="eyebrow">Aktuelle Aufgabe</p>
              <h3>{selectedStation.name}</h3>
            </div>
            <span
              className={`status-pill ${getVisualStatus(
                selectedProgress,
                selectedStation,
              )}`}
            >
              {getStatusLabel(getVisualStatus(selectedProgress, selectedStation))}
            </span>
          </div>

          <StationDetail
            key={`${team.id}-${selectedStation.id}-${selectedProgress.status}-${selectedProgress.answer}-${selectedProgress.assetName}-${selectedProgress.unlocked}-${teamReady}`}
            station={selectedStation}
            team={team}
            teamReady={teamReady}
            onSubmit={onSubmitStation}
            onUnlock={onUnlock}
            onBuyHint={onBuyHint}
          />
        </div>

        <div className="card stack simple-sidebar">
          <div className="simple-progress">
            <Metric label="Punkte" value={team.metrics.points} />
            <Metric
              label="Pflichtaufgaben"
              value={`${team.metrics.mandatorySolved}/${team.metrics.mandatoryTotal}`}
            />
            <Metric
              label="Gesamt geloest"
              value={`${team.metrics.solvedCount}/${stations.length}`}
            />
          </div>

          {teamReady ? (
            <QuickUnlockCard
              currentStationId={selectedStation.id}
              onUnlock={onUnlock}
              teamId={team.id}
            />
          ) : null}

          {team.metrics.pendingCount ? (
            <div className="review-note">
              <strong>In Pruefung</strong>
              <p>
                {team.metrics.pendingCount}{' '}
                {team.metrics.pendingCount === 1
                  ? 'Aufgabe wartet auf Freigabe.'
                  : 'Aufgaben warten auf Freigabe.'}
              </p>
            </div>
          ) : null}

          {latestHint ? (
            <div className="review-note">
              <strong>Hinweis vom Admin-Team</strong>
              <p>{latestHint.text}</p>
            </div>
          ) : null}

          {team.metrics.fragments.length ? (
            <div className="reward-panel">
              <strong>Gesammelte Fragmente</strong>
              <p>{team.metrics.fragments.map((fragment) => fragment.fragment).join(' - ')}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card stack">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Aufgaben</p>
            <h3>Einfach Aufgabe auswaehlen</h3>
          </div>
          <p className="hint-text">Tippt auf eine Aufgabe, um Titel und Beschreibung direkt zu sehen.</p>
        </div>

        <div className="station-list simple-station-list">
          {stations.map((station) => {
            const progress = team.stationProgress[station.id]
            const visualStatus = getVisualStatus(progress, station)

            return (
              <button
                className={
                  team.selectedStationId === station.id
                    ? 'station-card active'
                    : 'station-card'
                }
                key={station.id}
                onClick={() => onSelectStation(team.id, station.id)}
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
            )
          })}
        </div>
      </div>
    </section>
  )
}

function QuickUnlockCard({ teamId, currentStationId, onUnlock }) {
  const [unlockCode, setUnlockCode] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onUnlock(teamId, currentStationId, unlockCode)
    setUnlockCode('')
  }

  return (
    <div className="review-note">
      <strong>Naechste Aufgabe freischalten</strong>
      <p>Nach einer geloesten Aufgabe koennt ihr hier direkt den naechsten Code eingeben.</p>
      <form className="stack" onSubmit={handleSubmit}>
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
        <button className="primary-button" disabled={unlockCode.length !== 4} type="submit">
          Code pruefen
        </button>
      </form>
    </div>
  )
}

function StationDetail({ station, team, teamReady, onSubmit, onUnlock, onBuyHint }) {
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
            <h4>Kostenlose oder kostenpflichtige Unterstuetzung</h4>
          </div>
          <div className="hints-list">
            {station.hints.map((hint) => {
              const isAlreadyBought = progress.boughtHints?.includes(hint.id)
              return (
                <div className="hint-card" key={hint.id}>
                  <div>
                    <p className="hint-label">{hint.type === 'text' ? '📝 Text' : '🖼️ Bild'}</p>
                    {hint.type === 'text' && !isAlreadyBought ? (
                      <p className="hint-preview">{hint.content}</p>
                    ) : null}
                    <p className="hint-cost">Kosten: {hint.cost} Punkte</p>
                  </div>
                  <button
                    className={isAlreadyBought ? 'primary-button secondary' : 'primary-button'}
                    disabled={isAlreadyBought}
                    onClick={() => onBuyHint(team.id, station.id, hint.id)}
                    type="button"
                  >
                    {isAlreadyBought ? 'Gekauft' : 'Kaufen'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default TeamView
