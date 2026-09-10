import { useState } from 'react';
import NotoEmoji from './NotoEmoji.jsx';
import { useI18n } from '../context/I18nContext.jsx';

export default function MainMenu({ onStart, onAbout }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const { language, setLanguage, t } = useI18n();

  function handleStart() {
    const n = name.trim().slice(0, 12);
    if (!n) { setErr(t.nameRequired); return; }
    onStart(n);
  }

  return (
    <div className="main-menu">
      <div className="menu-card">
        <label className="language-picker">
          {t.language}
          <select value={language} onChange={e => setLanguage(e.target.value)} aria-label={t.language}>
            <option value="lv">Latviešu</option>
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </select>
        </label>
        <h1 className="menu-title">
          <NotoEmoji emoji="🌊" size={44} style={{ marginBottom: 4 }} /><br />
          {t.title}
        </h1>
        <p className="menu-sub">{t.subtitle}</p>

        <div className="menu-features">
          <span><NotoEmoji emoji="💨" size={18} style={{ marginRight: 6 }} />Vēja enerģijas sistēma</span>
          <span><NotoEmoji emoji="🎮" size={18} style={{ marginRight: 6 }} />3 mini-spēļu veidi</span>
          <span><NotoEmoji emoji="🃏" size={18} style={{ marginRight: 6 }} />Kolekcionējamās kartītes</span>
          <span><NotoEmoji emoji="🏆" size={18} style={{ marginRight: 6 }} />Top 10 tabula</span>
        </div>

        <div className="input-wrap">
          <label className="input-label" htmlFor="player-name">{t.name}</label>
          <input
            id="player-name"
            className="menu-input"
            value={name}
            onChange={e => { setName(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            placeholder={t.namePlaceholder}
            maxLength={12}
            autoFocus
          />
          {err && <p className="input-error">{err}</p>}
        </div>

        <button className="menu-start-btn" onClick={handleStart}>
          {t.start}
        </button>

        <button className="nav-btn menu-about-btn" onClick={onAbout}>
          {t.about}
        </button>

        <p className="menu-hint">{t.hint}</p>
        <p className="menu-hint">{t.anonymous}</p>
      </div>
    </div>
  );
}
