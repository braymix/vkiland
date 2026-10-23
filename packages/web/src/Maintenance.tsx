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
        <p>Il sito è in lavorazione.</p>
        <p style={{ color: 'var(--ink-dim)' }}>Torna a trovarci a breve.</p>
      </div>
    </div>
  );
}
