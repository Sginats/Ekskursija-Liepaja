import { useState } from 'react';
import TheoryLibrary from './TheoryLibrary.jsx';

export default function PreFinalModal({ onReady }) {
  const [showTheory, setShowTheory] = useState(false);

  if (showTheory) {
    return <TheoryLibrary onReady={onReady} />;
  }

  return (
    <div className="prefinal-overlay" role="dialog" aria-modal="true">
      <div className="prefinal-panel">
        <h2 className="prefinal-title">📝 Noslēguma tests</h2>

        <p className="prefinal-text">
          Tu esi apmeklējis visas 10 lokācijas! Tagad seko noslēguma tests
          ar 5 jautājumiem par Liepāju. Katra pareiza atbilde dod <strong>+2 bonusa punktus</strong>.
        </p>

        <p className="prefinal-question">Vai esi gatavs noslēguma testam?</p>

        <div className="prefinal-btns">
          <button className="menu-start-btn" onClick={onReady}>
            ✅ Jā, esmu gatavs!
          </button>
          <button className="nav-btn prefinal-theory-btn" onClick={() => setShowTheory(true)}>
            📖 Nē — vēlos atkārtot teoriju
          </button>
        </div>
      </div>
    </div>
  );
}
