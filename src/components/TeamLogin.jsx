import { useMemo, useState } from 'react'
import { normalizeAnswer } from '../utils/eventModel'

function TeamLogin({ accessCodes, onLogin }) {
  const [code, setCode] = useState('')
  const matchingCode = useMemo(() => {
    const identifier = normalizeAnswer(code)
    return accessCodes.find((entry) => normalizeAnswer(entry.code) === identifier) ?? null
  }, [accessCodes, code])

  function handleSubmit(event) {
    event.preventDefault()
    onLogin({ code })
  }

  return (
    <section className="panel stack narrow-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Login</p>
          <h2>Mit Gruppencode anmelden</h2>
        </div>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Gruppencode</span>
          <input
            autoComplete="off"
            name="code"
            onChange={(event) => setCode(event.target.value)}
            placeholder="z. B. TEAM-4821"
            type="text"
            value={code}
          />
        </label>

        {matchingCode ? (
          <div className="card stack subtle-card">
            <p className="eyebrow">Code erkannt</p>
            <h3>{matchingCode.teamId ? matchingCode.assignedGroupName : matchingCode.code}</h3>
            <p className="hint-text">
              {matchingCode.teamId
                ? 'Dieser Code oeffnet die vorhandene Gruppe.'
                : 'Beim ersten Login wird die Gruppe mit diesem Code automatisch angelegt.'}
            </p>
          </div>
        ) : null}

        <button className="primary-button" type="submit">
          Gruppe oeffnen
        </button>
      </form>
    </section>
  )
}

export default TeamLogin
