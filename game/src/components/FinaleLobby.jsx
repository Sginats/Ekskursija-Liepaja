/**
 * FinaleLobby
 *
 * End-game meetup modal. Shown when the local player (or any player) joins
 * the finale lobby after completing all 10 locations.
 * Displays all finished players sorted by score, then time.
 */

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function FinaleLobby({ players }) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.timeSeconds - b.timeSeconds);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="finale-lobby-overlay">
      <div className="finale-lobby-box">
        <div className="finale-lobby-header">
          <span className="finale-lobby-title">🏁 Fināla Lobijs</span>
          <span className="finale-lobby-sub">Visi pabeiguši ekskursiju!</span>
        </div>

        <table className="finale-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Vārds</th>
              <th>⭐ Punkti</th>
              <th>⏱ Laiks</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.socketId || i} className={i < 3 ? `finale-rank-${i + 1}` : ''}>
                <td>{medals[i] || i + 1}</td>
                <td>{p.name}</td>
                <td className="finale-score">{p.score}</td>
                <td className="finale-time">{formatTime(p.timeSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="finale-lobby-waiting">
          {players.length === 1
            ? '⏳ Gaida citus spēlētājus...'
            : `🎉 ${players.length} spēlētāji pabeiguši!`
          }
        </p>
      </div>
    </div>
  );
}
