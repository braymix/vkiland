/** Selettore della lingua (menu principale): una riga di codici IT/EN/ES/… */
import { LANGS, setLang, useLang } from '../i18n';

export function LanguageSwitcher() {
  const lang = useLang();
  return (
    <div className="lang-switcher" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.code}
          className={'lang-btn' + (l.code === lang ? ' lang-btn--active' : '')}
          onClick={() => setLang(l.code)}
          title={l.native}
          aria-pressed={l.code === lang}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
