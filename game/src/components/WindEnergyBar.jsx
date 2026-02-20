import { getWindLevel } from '../utils/WindEnergy.js';

export default function WindEnergyBar({ energy }) {
  const level = getWindLevel(energy);
  const pct = Math.max(0, Math.min(100, energy));

  return (
    <div className="wind-bar-wrap">
      <span className="wind-label">💨 Vēja enerģija</span>
      <div className="wind-track">
        <div
          className="wind-fill"
          style={{ width: `${pct}%`, background: level.color }}
        />
      </div>
      <span className="wind-value" style={{ color: level.color }}>
        {pct}% — {level.label}
      </span>
    </div>
  );
}
