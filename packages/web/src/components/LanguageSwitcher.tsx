/** Selettore della lingua (menu principale): un PICKER a tendina con bandierina. */
import { LANGS, setLang, useLang, type Lang } from '../i18n';

export function LanguageSwitcher() {
  const lang = useLang();
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0]!;
  return (
    <div className="lang-picker">
      <span className="lang-flag" aria-hidden="true">
        {current.flag}
      </span>
      <select
        className="lang-select"
        aria-label="Language"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </div>
  );
}
