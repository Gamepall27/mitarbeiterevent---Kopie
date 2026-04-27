import { useMemo, useState } from 'react'
import LanguageSelect from './LanguageSelect'
import { getTranslation } from '../i18n'
import { normalizeAnswer } from '../utils/eventModel'

function TeamLogin({ accessCodes, language, onLanguageChange, onLogin }) {
  const [code, setCode] = useState('')
  const [groupName, setGroupName] = useState('')
  const translation = getTranslation(language)
  const matchingCode = useMemo(() => {
    const identifier = normalizeAnswer(code)
    return accessCodes.find((entry) => normalizeAnswer(entry.code) === identifier) ?? null
  }, [accessCodes, code])
  const needsSetup = Boolean(matchingCode && !matchingCode.teamId)

  function handleSubmit(event) {
    event.preventDefault()
    if (needsSetup) {
      onLogin({ code, groupName, mode: 'register-group' })
      return
    }

    onLogin({ code, mode: 'login' })
  }

  function handleSetup(event) {
    event.preventDefault()
    onLogin({ code, groupName, mode: 'register-group' })
  }

  return (
    <section className="panel stack narrow-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">{translation.login.eyebrow}</p>
          <h2>{translation.login.title}</h2>
        </div>
        <LanguageSelect
          label={translation.common.language}
          language={language}
          onChange={onLanguageChange}
        />
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>{translation.login.groupCode}</span>
          <input
            autoComplete="off"
            name="code"
            onChange={(event) => setCode(event.target.value)}
            placeholder={translation.login.groupCodePlaceholder}
            type="text"
            value={code}
          />
        </label>

        {matchingCode ? (
          <div className="card stack subtle-card">
            <p className="eyebrow">{translation.login.codeDetected}</p>
            <h3>{matchingCode.teamId ? matchingCode.assignedGroupName : matchingCode.code}</h3>
            <p className="hint-text">
              {matchingCode.teamId
                ? translation.login.existingGroup
                : translation.login.newGroup}
            </p>
          </div>
        ) : null}

        {needsSetup ? (
          <>
            <label className="field">
              <span>{translation.login.groupName}</span>
              <input
                autoComplete="off"
                name="groupName"
                onChange={(event) => setGroupName(event.target.value)}
                placeholder={translation.login.groupNamePlaceholder}
                type="text"
                value={groupName}
              />
            </label>

            <button className="primary-button" onClick={handleSetup} type="button">
              {translation.login.setGroupName}
            </button>
          </>
        ) : (
          <button className="primary-button" type="submit">
            {translation.login.openGroup}
          </button>
        )}
      </form>
    </section>
  )
}

export default TeamLogin
