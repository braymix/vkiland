const CANONICAL_URL = 'https://viking-island.it';

export function Maintenance() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div className="pixel-frame" style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: 16, marginBottom: 16, color: 'var(--accent)' }}>Viking-Island</h1>
        <p>Questo non è l'indirizzo giusto: il gioco vive solo su viking-island.it.</p>
        <p style={{ color: 'var(--ink-dim)' }}>
          Apri il sito ufficiale per continuare a giocare e ricevere tutti gli aggiornamenti.
        </p>
        <a
          className="pxbtn"
          href={CANONICAL_URL}
          style={{ display: 'inline-block', margin: '16px 0', textDecoration: 'none' }}
        >
          Vai su viking-island.it
        </a>
        <p style={{ color: 'var(--ink-dim)', fontSize: 10 }}>
          Hai già aggiunto l'app alla schermata Home da qui? Rimuovila e rifai l'installazione da{' '}
          <a href={CANONICAL_URL} style={{ color: 'var(--accent)' }}>
            viking-island.it
          </a>
          , così l'icona punterà sempre al sito giusto.
        </p>
      </div>
    </div>
  );
}
