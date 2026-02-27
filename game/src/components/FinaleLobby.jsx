/**
 * FinaleLobby
 *
 * End-game meetup modal. Shown when the local player (or any player) joins
 * the finale lobby after completing all 10 locations.
 * Displays all finished players sorted by score, then time.
 */

import NotoEmoji from './NotoEmoji.jsx';

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function FinaleLobby({ players, onDismiss }) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.timeSeconds - b.timeSeconds);
  const allReady = players.length > 1 && players.every(p => p.ready);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="finale-lobby-overlay">
      <div className="finale-lobby-box">
        <div className="finale-lobby-header">
          <span className="finale-lobby-title">
            <NotoEmoji emoji="🏁" size={24} style={{ marginRight: 8 }} />
            Fināla Lobijs
          </span>
          <span className="finale-lobby-sub">
            {allReady ? 'Visi gatavi! Spēle sākas...' : 'Gaidām visus spēlētājus...'}
          </span>
        </div>

        <div className="finale-table-container">
          <table className="finale-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Vārds</th>
                <th>Statuss</th>
                <th><NotoEmoji emoji="⭐" size={14} style={{ marginRight: 3 }} />Punkti</th>
                <th><NotoEmoji emoji="⏱️" size={14} style={{ marginRight: 3 }} />Laiks</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={p.socketId || i} className={`${i < 3 ? `finale-rank-${i + 1}` : ''} ${p.ready ? 'player-ready' : ''}`}>
                  <td>{medals[i] ? <NotoEmoji emoji={medals[i]} size={18} /> : i + 1}</td>
                  <td>{p.name}</td>
                  <td>
                    <span className={`status-badge ${p.ready ? 'ready' : 'waiting'}`}>
                      {p.ready ? 'Gatavs ✓' : 'Gaidām...'}
                    </span>
                  </td>
                  <td className="finale-score">{p.score}</td>
                  <td className="finale-time">{formatTime(p.timeSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="finale-lobby-footer">
          <p className="finale-lobby-waiting">
            {players.length === 1
              ? <><NotoEmoji emoji="⏳" size={16} style={{ marginRight: 6 }} /> Gaida citus spēlētājus...</>
              : <><NotoEmoji emoji="🎉" size={16} style={{ marginRight: 6 }} /> {players.length} spēlētāji pabeiguši!</>
            }
          </p>
          {onDismiss && (
            <button className="nav-btn" onClick={onDismiss} style={{ marginTop: 15 }}>Aizvērt</button>
          )}
        </div>
      </div>
    </div>
  );
}
