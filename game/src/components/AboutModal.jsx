export default function AboutModal({ onClose }) {
  return (
    <div className="about-overlay" role="dialog" aria-modal="true">
      <div className="about-panel">
        <div className="panel-header">
          <h2>ℹ Par Spēli</h2>
          <button className="close-btn" onClick={onClose} aria-label="Aizvērt">✕</button>
        </div>

        <section className="about-section">
          <h3>📖 Par projektu</h3>
          <p>
            "Liepājas Ekskursija" ir izglītojoša spēle par Liepājas pilsētas nozīmīgākajām vietām.
            Spēle izveidota kā mācību projekts, izmantojot React un Phaser 3.
          </p>
        </section>

        <section className="about-section">
          <h3>🛠 Izmantotās tehnoloģijas</h3>
          <ul>
            <li><a href="https://react.dev" target="_blank" rel="noopener noreferrer">React 18</a> — UI komponentes</li>
            <li><a href="https://phaser.io" target="_blank" rel="noopener noreferrer">Phaser 3</a> — 2D spēļu dzinējs (MIT licence)</li>
            <li><a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">Vite</a> — būvēšanas rīks</li>
            <li><a href="https://supabase.com" target="_blank" rel="noopener noreferrer">Supabase</a> — datubāze rezultātiem</li>
            <li><a href="https://fonts.google.com/specimen/Poppins" target="_blank" rel="noopener noreferrer">Poppins</a> — Google Fonts (SIL Open Font Licence)</li>
          </ul>
        </section>

        <section className="about-section">
          <h3>🖼 Attēlu avoti</h3>
          <ul>
            <li>Liepājas karte — <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> (ODbL licence)</li>
            <li>Kaija attēls (kaija.png) — publiskā domēna attēls</li>
            <li>Visi emoji — Unicode konsorcija standarts</li>
          </ul>
        </section>

        <section className="about-section">
          <h3>📍 Obligātās vietas (V10, V12c, V17)</h3>
          <ul>
            <li>✓ <strong>RTU Liepājas akadēmija</strong> (V10)</li>
            <li>✓ <strong>LSEZ / UPB</strong> — Liepājas uzņēmums (V12c)</li>
            <li>✓ <strong>Jūrmalas parks</strong> — atpūtas vieta, spēle beidzas šeit (V17)</li>
          </ul>
        </section>

        <section className="about-section">
          <h3>🎵 Audio avoti</h3>
          <ul>
            <li>Hover skaņa — oriģināls, izveidots projektā</li>
            <li>Fona mūzika — oriģināls, izveidots projektā</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
