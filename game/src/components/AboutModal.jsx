import NotoEmoji from './NotoEmoji.jsx';

export default function AboutModal({ onClose, onStart }) {
  return (
    <div className="about-overlay" role="dialog" aria-modal="true">
      <div className="about-panel">
        <div className="panel-header">
          <h2>ℹ Par spēli</h2>
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
          <h3>🎮 Spēles gaita</h3>
          <ul>
            <li>10 lokācijas Liepājā — apmeklē tās brīvā secībā (izņemot pēdējo — Jūrmalas parks).</li>
            <li>Katrā lokācijā: mini-spēle (bonusa punkti) + jautājums.</li>
            <li>Punkti: +10 (1. mēģinājums), +5 (2. mēģinājums), pēc 2 kļūdām — 0.</li>
            <li>Noslēgumā: 5 jautājumu tests (+2 par katru pareizu atbildi, maks. +10).</li>
            <li>Maksimālais rezultāts: <strong>110 punkti</strong>.</li>
          </ul>
        </section>

        <section className="about-section">
          <h3>🗺️ Krāsu leģenda (karte)</h3>
          <ul>
            <li><span style={{ color: '#2196f3' }}>●</span> Kultūra &amp; vēsture</li>
            <li><span style={{ color: '#4caf50' }}>●</span> Daba &amp; atpūta</li>
            <li><span style={{ color: '#ffd700' }}>●</span> Izglītība</li>
            <li><span style={{ color: '#f44336' }}>●</span> Industrija &amp; osta</li>
          </ul>
        </section>

        <section className="about-section">
          <h3>🌐 Multiplayer</h3>
          <p>
            Reāllaika ko-op režīms izmanto Socket.IO un WebSocket savienojumu.
            Ir automātiska atjaunošana un savienojuma statusa pārvaldība.
            Ko-op spēle dod bonusa punktu reizinātāju abiem spēlētājiem.
          </p>
        </section>

        <section className="about-section">
          <h3>👥 Izstrādes komanda</h3>
          <ul>
            <li><strong>Niks Šenvalds</strong> — Grupa 2PT</li>
            <li><strong>Dans Bitenieks</strong> — Grupa 2PT</li>
          </ul>
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
          </ul>
        </section>

        <section className="about-section">
          <h3>
            <NotoEmoji emoji="😀" size={20} style={{ marginRight: 8 }} />
            Emoji resursi
          </h3>
          <p>
            Spēlē izmantotie animētie emoji tiek ielādēti no{' '}
            <a
              href="https://googlefonts.github.io/noto-emoji-animation/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Noto Emoji Animation
            </a>{' '}
            CDN (<code>fonts.gstatic.com</code>).
          </p>
          <ul>
            <li>
              <strong>Projekts:</strong>{' '}
              <a
                href="https://github.com/googlefonts/noto-emoji"
                target="_blank"
                rel="noopener noreferrer"
              >
                googlefonts/noto-emoji
              </a>
            </li>
            <li><strong>Licence:</strong> Apache 2.0</li>
            <li><strong>Autors:</strong> Google LLC</li>
          </ul>
          <p className="about-emoji-preview">
            {['🌊','🏆','🎉','⭐','🎯','💡','🃏','🗺️','💾','🔄'].map(e => (
              <NotoEmoji key={e} emoji={e} size={28} style={{ margin: '0 4px' }} />
            ))}
          </p>
        </section>

        <section className="about-section">
          <h3>🎵 Audio avoti</h3>
          <ul>
            <li>Hover skaņa — oriģināls, izveidots projektā</li>
            <li>Fona mūzika — oriģināls, izveidots projektā</li>
          </ul>
        </section>

        <section className="about-section">
          <h3>📍 Obligātās vietas</h3>
          <ul>
            <li>✓ <strong>RTU Liepājas akadēmija</strong> (V10 — RTU aktivitāte)</li>
            <li>✓ <strong>LSEZ / UPB</strong> — Liepājas uzņēmums (V12c)</li>
            <li>✓ <strong>Jūrmalas parks</strong> — atpūtas vieta, spēle beidzas šeit (V17)</li>
          </ul>
        </section>

        <div className="about-footer-btns">
          {onStart && (
            <button
              className="menu-start-btn"
              onClick={() => { onClose(); onStart(); }}
            >
              Sākt spēli →
            </button>
          )}
          <button className="nav-btn" onClick={onClose}>
            Aizvērt
          </button>
        </div>
      </div>
    </div>
  );
}
