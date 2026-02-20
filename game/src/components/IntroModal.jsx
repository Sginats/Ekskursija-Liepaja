export default function IntroModal({ onDismiss }) {
  return (
    <div className="intro-overlay" role="dialog" aria-modal="true">
      <div className="intro-panel">
        <h2 className="intro-title">📋 Pirms sākam!</h2>

        <div className="intro-body">
          <p className="intro-highlight">
            ⚠️ Katrā lokācijā pēc mini-spēles tev tiks parādīts <strong>interesants fakts</strong> (pavediens) par šo vietu.
          </p>

          <p className="intro-text">
            <strong>Obligāti iegaumē šos faktus!</strong> Pēc visu 10 vietu apmeklēšanas
            sekos <em>noslēguma tests</em>, kur šie pavedieni būs izšķiroši, lai iegūtu
            bonusa punktus.
          </p>

          <ul className="intro-list">
            <li>🗺️ Apmeklē 10 lokācijas noteiktā secībā</li>
            <li>🎮 Katrā vietā — mini-spēle + jautājums</li>
            <li>💡 Pēc uzdevuma — fakts (pavediens) — <strong>iegaumē to!</strong></li>
            <li>📝 Beigās — 5 jautājumu noslēguma tests</li>
          </ul>
        </div>

        <button className="menu-start-btn intro-start-btn" onClick={onDismiss}>
          Sapratu — Sākt! →
        </button>
      </div>
    </div>
  );
}
