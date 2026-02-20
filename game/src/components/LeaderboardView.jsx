import { useState, useEffect } from 'react';
import { getTopTen } from '../utils/Leaderboard.js';

export default function LeaderboardView({ mode = 'single', onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState(mode);

  useEffect(() => {
    setLoading(true);
    getTopTen(activeMode)
      .then(data => {
        setRows(data || []);
      })
      .catch(() => {
        setRows([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeMode]);

  function fmtTime(s) {
    if (s == null || isNaN(s)) return '--:--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  return (
    <div className="lb-overlay" role="dialog" aria-modal="true">
      <div className="lb-panel">
        <div className="panel-header">
          <h2>🏆 Top 10 Rezultāti</h2>
          <button className="close-btn" onClick={onClose} aria-label="Aizvērt">✕</button>
        </div>

        <div className="lb-tabs">
          <button className={`lb-tab ${activeMode === 'single' ? 'active' : ''}`} onClick={() => setActiveMode('single')}>
            👤 Viens spēlētājs
          </button>
          <button className={`lb-tab ${activeMode === 'multi' ? 'active' : ''}`} onClick={() => setActiveMode('multi')}>
            👥 Komandas
          </button>
        </div>

        <p className="lb-sort-info">Kārtots: Punkti (↓) → Laiks (↑)</p>

        {loading ? (
          <p className="lb-loading">Ielādē...</p>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Vārds</th>
                <th>Laiks ↑</th>
                <th>Punkti ↓</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa' }}>Nav rezultātu</td></tr>
              )}
              {rows.map((row, i) => (
                <tr key={i} className={i < 3 ? `top-${i + 1}` : ''}>
                  <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                  <td>{row.name}</td>
                  <td>{fmtTime(row.time_seconds)}</td>
                  <td>{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
