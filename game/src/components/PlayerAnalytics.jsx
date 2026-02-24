import { LOCATIONS } from '../data/LocationData.js';
import NotoEmoji from './NotoEmoji.jsx';

const MAX_POINTS_PER_LOCATION = 10;

export default function PlayerAnalytics({ completedLocations, score, startTime }) {
  if (completedLocations.length === 0) return null;

  const completed = completedLocations.length;
  const total = LOCATIONS.length;

  // Accuracy: points earned vs maximum possible
  const maxPossible = completed * MAX_POINTS_PER_LOCATION;
  const accuracy = maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 0;
  const clampedAccuracy = Math.min(100, Math.max(0, accuracy));

  // Average time per location
  const elapsedSec = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
  const avgTimeSec = completed > 0 ? Math.round(elapsedSec / completed) : 0;
  const avgMin = Math.floor(avgTimeSec / 60);
  const avgSec = avgTimeSec % 60;
  const avgTimeLabel = `${avgMin}:${String(avgSec).padStart(2, '0')}`;

  return (
    <div className="analytics-panel">
      <div className="analytics-item">
        <span className="analytics-icon"><NotoEmoji emoji="📍" size={16} /></span>
        <span className="analytics-value">{completed}/{total}</span>
        <span className="analytics-label">Vietas</span>
      </div>
      <div className="analytics-item">
        <span className="analytics-icon"><NotoEmoji emoji="🎯" size={16} /></span>
        <span className="analytics-value">{clampedAccuracy}%</span>
        <span className="analytics-label">Precizitāte</span>
      </div>
      <div className="analytics-item">
        <span className="analytics-icon"><NotoEmoji emoji="⏱️" size={16} /></span>
        <span className="analytics-value">{avgTimeLabel}</span>
        <span className="analytics-label">Vid. laiks</span>
      </div>
    </div>
  );
}
