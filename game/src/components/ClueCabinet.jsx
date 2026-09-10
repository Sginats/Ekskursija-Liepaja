export default function ClueCabinet({ clues, onClose }) {
  return (
    <div className="clue-overlay" role="dialog" aria-modal="true" aria-labelledby="clue-title">
      <div className="clue-panel">
        <div className="panel-header">
          <h2 id="clue-title">🧩 Pilsētas pavedieni ({clues.length}/10)</h2>
          <button className="close-btn" onClick={onClose} aria-label="Aizvērt">✕</button>
        </div>
        <p className="clue-intro">Katrs objekts atklāj vienu pavedienu. Savāc tos visus, lai noslēgumā atrisinātu Liepājas noslēpumu.</p>
        <div className="clue-grid">
          {clues.map(clue => (
            <article className="clue-card" key={clue.id}>
              <span className="clue-icon" aria-hidden="true">{clue.icon}</span>
              <div><strong>{clue.title}</strong><p>{clue.text}</p></div>
            </article>
          ))}
        </div>
        {!clues.length && <p className="clue-empty">Pabeidz pirmo lokāciju, lai atrastu pavedienu.</p>}
      </div>
    </div>
  );
}
