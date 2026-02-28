import { useState } from 'react';
import NotoEmoji from './NotoEmoji.jsx';

export default function MainMenu({ onStart, onAbout }) {
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
        <h1 className="menu-title">
          <NotoEmoji emoji="🌊" size={44} style={{ marginBottom: 4 }} /><br />
          Liepājas<br />Ekskursija
        </h1>
        <p className="menu-sub">Iepazīsti 10 Liepājas nozīmīgākās vietas</p>

        <div className="menu-features">
          <span><NotoEmoji emoji="💨" size={18} style={{ marginRight: 6 }} />Vēja enerģijas sistēma</span>
          <span><NotoEmoji emoji="🎮" size={18} style={{ marginRight: 6 }} />3 mini-spēļu veidi</span>
          <span><NotoEmoji emoji="🃏" size={18} style={{ marginRight: 6 }} />Kolekcionējamās kartītes</span>
          <span><NotoEmoji emoji="🏆" size={18} style={{ marginRight: 6 }} />Top 10 tabula</span>
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

        <button className="nav-btn menu-about-btn" onClick={onAbout}>
          ℹ Par spēli
        </button>

        <p className="menu-hint">Nospied Enter lai sāktu</p>
      </div>
    </div>
  );
}
