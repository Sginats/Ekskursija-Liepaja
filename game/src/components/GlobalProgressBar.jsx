/**
 * GlobalProgressBar
 *
 * Shows the shared city-wide completion progress across all connected players.
 * Receives `cityProgress` from CoopContext and renders a sticky bar above the map.
 */

import { useCoopContext } from './CoopManager.jsx';

export default function GlobalProgressBar() {
  const { cityProgress } = useCoopContext();
  const { pct = 0, completed = 0, total = 0 } = cityProgress;

  if (total === 0) return null;

  const isGoalReached = pct >= 100;

  return (
    <div className={`global-progress-bar-wrap ${isGoalReached ? 'goal-reached' : ''}`}>
      <span className="gp-label">🌆 Pilsētas progress</span>
      <div className="gp-track">
        <div
          className="gp-fill"
          style={{ width: `${pct}%` }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
      <span className="gp-value">{pct}%</span>
      {isGoalReached && (
        <span className="gp-bonus-badge">🎉 Bonuss aktīvs!</span>
      )}
    </div>
  );
}
