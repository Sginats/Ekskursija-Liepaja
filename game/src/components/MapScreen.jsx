import { LOCATIONS } from '../data/LocationData.js';
import WindEnergyBar from './WindEnergyBar.jsx';

const CATEGORY_COLORS = {
  culture:   { dot: '#2196f3', label: 'Kultūra & vēsture' },
  nature:    { dot: '#4caf50', label: 'Daba & atpūta' },
  education: { dot: '#ffd700', label: 'Izglītība' },
  industry:  { dot: '#f44336', label: 'Industrija & osta' },
};

export default function MapScreen({ completedLocations, onSelectLocation, score, windEnergy }) {
  return (
    <div className="map-screen">
      <div className="map-topbar">
        <span className="map-title">🗺 Liepājas Ekskursija</span>
        <span className="map-score">⭐ {score}</span>
      </div>

      <WindEnergyBar energy={windEnergy} />

      <div className="map-area-wrap">
        <div className="map-area">
          {LOCATIONS.map(loc => {
            const done = completedLocations.includes(loc.id);
            const isNext = !done && completedLocations.length === LOCATIONS.findIndex(l => l.id === loc.id);
            const catColor = CATEGORY_COLORS[loc.category]?.dot || '#ffffff';

            return (
              <button
                key={loc.id}
                className={`map-point ${done ? 'done' : ''} ${isNext ? 'pulse' : ''}`}
                style={{
                  left: `${loc.mapPosition.x}%`,
                  top: `${loc.mapPosition.y}%`,
                  background: done ? '#555' : catColor,
                  borderColor: done ? '#888' : catColor,
                  boxShadow: done ? 'none' : `0 0 12px ${catColor}88`,
                }}
                onClick={() => onSelectLocation(loc.id)}
                title={`${loc.name} — ${CATEGORY_COLORS[loc.category]?.label || ''}`}
                aria-label={loc.name}
              >
                {done ? '✓' : ''}
                <span className="map-tooltip">{loc.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="map-legend">
        {Object.entries(CATEGORY_COLORS).map(([key, val]) => (
          <span key={key} className="legend-item">
            <span className="legend-dot" style={{ background: val.dot }} />
            {val.label}
          </span>
        ))}
      </div>

      <p className="map-progress">
        Pabeigtas {completedLocations.length} / {LOCATIONS.length} vietas
      </p>
    </div>
  );
}
