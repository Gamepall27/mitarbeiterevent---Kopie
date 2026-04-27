import { USER_LANGUAGES } from '../i18n'

function LanguageSelect({ language, label, onChange }) {
  return (
    <label className="field" style={{ minWidth: '150px' }}>
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={language}>
        {USER_LANGUAGES.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default LanguageSelect
