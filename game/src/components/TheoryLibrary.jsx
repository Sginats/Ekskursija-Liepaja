import { useState } from 'react';
import { LOCATIONS } from '../data/LocationData.js';

export default function TheoryLibrary({ onReady }) {
  const [index, setIndex] = useState(0);

  const loc = LOCATIONS[index];
  const facts = loc.questions.map(q => q.fact);

  const goPrev = () => setIndex(i => (i - 1 + LOCATIONS.length) % LOCATIONS.length);
  const goNext = () => setIndex(i => (i + 1) % LOCATIONS.length);

  return (
    <div className="theory-overlay" role="dialog" aria-modal="true">
      <div className="theory-panel">
        <div className="theory-header">
          <h2 className="theory-title">📖 Teorijas bibliotēka</h2>
          <span className="theory-counter">{index + 1} / {LOCATIONS.length}</span>
        </div>

        <div className="theory-card" style={{ borderColor: loc.color }}>
          <h3 className="theory-loc-name" style={{ color: loc.color }}>
            {loc.name}
          </h3>
          <p className="theory-loc-desc">{loc.description}</p>

          <div className="theory-facts">
            <h4 className="theory-facts-title">💡 Pavedieni:</h4>
            {facts.map((fact, i) => (
              <p key={i} className="theory-fact">• {fact}</p>
            ))}
          </div>
        </div>

        <div className="theory-nav">
          <button className="nav-btn theory-arrow" onClick={goPrev} aria-label="Iepriekšējā">
            ← Iepriekšējā
          </button>
          <button className="nav-btn theory-arrow" onClick={goNext} aria-label="Nākamā">
            Nākamā →
          </button>
        </div>

        <button className="menu-start-btn theory-ready-btn" onClick={onReady}>
          ✅ Esmu gatavs — sākt testu!
        </button>
      </div>
    </div>
  );
}
