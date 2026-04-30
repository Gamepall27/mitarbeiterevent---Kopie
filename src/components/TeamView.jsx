import { useState } from 'react'

import {
  formatCountdown,
  getEventTimerState,
  getDisplayProgressStatus,
  getStationUnlimitedAttempts,
  getStatusLabel,
  getTeamStationOrder,
  getVisualStatus,
} from '../utils/eventModel'
import { getTranslation } from '../i18n'
import LanguageSelect from './LanguageSelect'
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
  language,
  onLogout,
  onLanguageChange,
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
  const translation = getTranslation(language)
  const orderedStations = getTeamStationOrder(stations, team.id || team.code)
  const selectedStation =
    orderedStations.find((station) => station.id === team.selectedStationId) ??
    orderedStations[0]

  if (!selectedStation) {
    return (
      <section className="team-layout team-layout--simple">
        <div className="team-header card">
          <div>
            <p className="eyebrow">{translation.common.team}</p>
            <h2>{team.name}</h2>
            <p className="section-copy">{translation.common.noTasks}</p>
          </div>
          <LanguageSelect
            label={translation.common.language}
            language={language}
            onChange={onLanguageChange}
          />
          <button className="ghost-button" onClick={onLogout} type="button">
            {translation.common.switchTeam}
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
            <p className="eyebrow">{translation.common.team}</p>
            <h2>{team.name}</h2>
            <p className="section-copy">
              {translation.common.code} {team.code}
            </p>
          </div>
          <div className="team-header__meta team-header__meta--simple">
            <Metric
              label={teamReady ? translation.common.remainingTime : translation.common.status}
              value={
                teamReady
                  ? formatCountdown(
                      { eventStartedAt, eventStatus, eventPausedAt, eventPausedDurationMs },
                      now,
                      eventDurationMinutes,
                    )
                  : translation.common.waitingForStart
              }
            />
            <Metric label={translation.common.points} value={team.metrics.points} />
            <LanguageSelect
              label={translation.common.language}
              language={language}
              onChange={onLanguageChange}
            />
            <button className="ghost-button" onClick={onLogout} type="button">
              {translation.common.switchTeam}
            </button>
          </div>
        </div>

        {!teamReady ? (
          <div className="card stack simple-focus">
            <p className="eyebrow">{translation.teamView.startEyebrow}</p>
            <h3>{translation.teamView.notStarted}</h3>
            <p className="section-copy">{translation.teamView.startInfo}</p>
            <div className="simple-inline">
              <span className="status-pill open">
                {translation.common.code} {team.code}
              </span>
              <span className="simple-note">{translation.teamView.startListInfo}</span>
            </div>
          </div>
        ) : null}

        <div className="card stack">
          <div className="section-head compact">
            <div>
              <p className="eyebrow">{translation.common.tasks}</p>
              <h3>{translation.teamView.tasksTitle}</h3>
            </div>
            <p className="hint-text">{translation.teamView.tasksHint}</p>
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
                      <p>{getStationPointsLabel(progress, station, translation)}</p>
                    </div>
                    <span className={`status-pill ${visualStatus}`}>
                      {getStatusLabel(visualStatus, translation.status)}
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
                        language={language}
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
            <strong>{translation.common.collectedFragments}</strong>
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
              alt={translation.common.enlargedHintImage}
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

function getStationPointsLabel(progress, station, translation) {
  const status = getDisplayProgressStatus(progress)

  if (status === 'solved' || status === 'pending') {
    return `${progress.pointsAwarded ?? 0} / ${station.points} ${translation.common.pointsSuffix}`
  }

  return `${station.points} ${translation.common.pointsSuffix}`
}

function StationDetail({
  station,
  team,
  teamReady,
  teamCanPlay,
  language,
  timerStatus,
  onSubmit,
  onUnlock,
  onBuyHint,
  setExpandedHintImage,
}) {
  const translation = getTranslation(language)
  const progress = team.stationProgress[station.id]
  const [answer, setAnswer] = useState(progress.answer ?? '')
  const [photoName, setPhotoName] = useState(progress.assetName ?? '')
  const [photoFile, setPhotoFile] = useState(null)
  const [unlockCode, setUnlockCode] = useState('')
  const hasUnlimitedAttempts = getStationUnlimitedAttempts(station)
  const hasUsedSingleAttempt = !hasUnlimitedAttempts && progress.attempts > 0
  const isSolved = progress.status === 'solved'
  const isPendingReview = progress.status === 'pending'
  const isSubmissionLocked = isSolved || hasUsedSingleAttempt
  const showHints = Boolean(station.hints?.length) && teamCanPlay && !isSolved

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
            <button
              className="ghost-button"
              onClick={() => setExpandedHintImage(station.imageUrl)}
              style={{
                padding: 0,
                border: 'none',
                background: 'transparent',
                width: '100%',
              }}
              type="button"
            >
              <img
                alt={station.imageName || station.name}
                onError={(event) => {
                  event.target.style.display = 'none'
                }}
                onMouseEnter={(event) => {
                  event.target.style.transform = 'scale(1.02)'
                  event.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(event) => {
                  event.target.style.transform = 'scale(1)'
                  event.target.style.boxShadow = 'none'
                }}
                src={station.imageUrl}
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              />
            </button>
          </div>
        ) : null}

        <p className="section-copy">{station.locationHint}</p>
        <p>{station.task}</p>

        {showHints ? (
          <div className="card stack simple-focus">
            <div className="section-head compact">
              <p className="eyebrow">{translation.common.availableHints}</p>
            </div>
            <div className="hints-list">
              {station.hints.map((hint, index) => {
                const isAlreadyBought = progress.boughtHints?.includes(hint.id)
                const previousHintsBought =
                  index === 0 ||
                  station.hints
                    .slice(0, index)
                    .every((entry) => progress.boughtHints?.includes(entry.id))
                const canBuyThisHint = previousHintsBought && !isAlreadyBought

                return (
                  <div className="hint-card" key={hint.id}>
                    <div style={{ width: '100%' }}>
                      <p className="hint-label">
                        {translation.common.hintLevel} {index + 1}
                      </p>
                      {isAlreadyBought ? (
                        <>
                          <p className="hint-preview">{hint.content}</p>
                          {hint.imageUrl ? (
                            <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                              <img
                                alt={translation.common.enlargedHintImage}
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
                          {translation.common.openHintAfterPurchase}
                        </p>
                      )}
                      <p className="hint-cost">
                        {translation.common.hintCost}: {hint.cost} {translation.common.pointsSuffix}
                      </p>
                    </div>
                    <button
                      className={isAlreadyBought ? 'primary-button secondary' : 'primary-button'}
                      disabled={isAlreadyBought || !canBuyThisHint}
                      onClick={() => {
                        if (canBuyThisHint) {
                          onBuyHint(team.id, station.id, hint.id)
                        }
                      }}
                      title={!canBuyThisHint ? translation.common.buyPreviousHintsFirst : ''}
                      type="button"
                    >
                      {isAlreadyBought
                        ? translation.common.bought
                        : canBuyThisHint
                          ? translation.common.buy
                          : translation.common.locked}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {!teamReady ? (
          <div className="review-note">
            <strong>{translation.teamView.waitingTitle}</strong>
            <p>{translation.teamView.waitingBody}</p>
          </div>
        ) : !teamCanPlay ? (
          <div className="review-note">
            <strong>
              {timerStatus === 'paused'
                ? translation.teamView.pausedTitle
                : translation.teamView.stoppedTitle}
            </strong>
            <p>
              {timerStatus === 'paused'
                ? translation.teamView.pausedBody
                : translation.teamView.stoppedBody}
            </p>
          </div>
        ) : !progress.unlocked ? (
          <form className="stack" onSubmit={handleUnlockSubmit}>
            <label className="field">
              <span>{translation.teamView.unlockCode}</span>
              <small>{translation.teamView.unlockCodeHint}</small>
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
              {translation.teamView.unlock}
            </button>
          </form>
        ) : null}

        {isPendingReview ? (
          <div className="review-note">
            <strong>{translation.common.submitted}</strong>
            <p>
              {hasUnlimitedAttempts
                ? translation.teamView.reviewPendingEditable
                : translation.teamView.reviewPending}
            </p>
          </div>
        ) : null}

        {isSolved ? (
          <div className="reward-panel">
            <strong>{translation.common.taskDone}</strong>
            <p>
              {station.fragment
                ? `${translation.teamView.fragmentCollected} ${station.fragment}`
                : translation.teamView.solvedNoFragment}
            </p>
          </div>
        ) : isSubmissionLocked ? (
          <div className="review-note">
            <strong>{translation.common.submitted}</strong>
            <p>{translation.teamView.submissionLocked}</p>
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
                <span>{translation.common.uploadPhoto}</span>
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
                <span>
                  {['number', 'estimate'].includes(station.type)
                    ? translation.common.number
                    : translation.common.answer}
                </span>
                <input
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder={station.placeholder ?? translation.common.answer}
                  type={['number', 'estimate'].includes(station.type) ? 'number' : 'text'}
                  value={answer}
                />
              </label>
            )}

            <button className="primary-button" type="submit">
              {translation.common.sendAnswer}
            </button>
          </form>
        ) : null}

        {progress.reviewNote ? (
          <div className="review-note">
            <strong>{translation.common.feedback}</strong>
            <p>{progress.reviewNote}</p>
          </div>
        ) : null}
      </div>
    </>
  )
}

export default TeamView
