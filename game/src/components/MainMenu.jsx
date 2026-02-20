import { useState } from 'react';

export default function MainMenu({ onStart }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  function handleStart() {
    const n = name.trim().slice(0, 12);
    if (!n) { setErr('Lūdzu ievadi savu vārdu!'); return; }
    onStart(n);
  }

  return (
    <div className="main-menu">
      <div className="menu-card">
        <h1 className="menu-title">🌊 Liepājas<br />Ekskursija</h1>
        <p className="menu-sub">Iepazīsti 10 Liepājas nozīmīgākās vietas</p>

        <div className="menu-features">
          <span>💨 Vēja enerģijas sistēma</span>
          <span>🎮 3 mini-spēļu veidi</span>
          <span>🃏 Kolekcionējamās kartītes</span>
          <span>🏆 Top 10 tabula</span>
        </div>

        <div className="input-wrap">
          <label className="input-label" htmlFor="player-name">Tavs vārds</label>
          <input
            id="player-name"
            className="menu-input"
            value={name}
            onChange={e => { setName(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            placeholder="Ievadi vārdu..."
            maxLength={12}
            autoFocus
          />
          {err && <p className="input-error">{err}</p>}
        </div>

        <button className="menu-start-btn" onClick={handleStart}>
          Sākt ekskursiju →
        </button>

        <p className="menu-hint">Nospied Enter lai sāktu</p>
      </div>
    </div>
  );
}
