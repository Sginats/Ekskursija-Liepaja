import { LOCATIONS } from '../data/LocationData.js';
import WindEnergyBar from './WindEnergyBar.jsx';
import { useCoopContext } from './CoopManager.jsx';
import GlobalProgressBar from './GlobalProgressBar.jsx';
import PlayerAnalytics from './PlayerAnalytics.jsx';
import RouteOverlay from './RouteOverlay.jsx';
import NotoEmoji from './NotoEmoji.jsx';

const CATEGORY_COLORS = {
  culture:   { dot: '#2196f3', label: 'Kultūra & vēsture' },
  nature:    { dot: '#4caf50', label: 'Daba & atpūta' },
  education: { dot: '#ffd700', label: 'Izglītība' },
  industry:  { dot: '#f44336', label: 'Industrija & osta' },
};

export default function MapScreen({ completedLocations, onSelectLocation, score, windEnergy, ghostLocationId, ghostBestTime, startTime }) {
  const { otherPlayers, occupiedLocations } = useCoopContext();

  return (
    <div className="map-screen">
      <div className="map-topbar">
        <span className="map-title">
          <NotoEmoji emoji="🗺️" size={20} style={{ marginRight: 6 }} />Liepājas Ekskursija
        </span>
        <span className="map-score">
          <NotoEmoji emoji="⭐" size={18} style={{ marginRight: 4 }} />{score}
        </span>
      </div>

      <GlobalProgressBar />

      <WindEnergyBar energy={windEnergy} />

      <PlayerAnalytics completedLocations={completedLocations} score={score} startTime={startTime} />

      <div className="map-area-wrap">
        <div className="map-area">
          <RouteOverlay completedLocations={completedLocations} />
          {/* Location pins */}
          {LOCATIONS.map(loc => {
            const done      = completedLocations.includes(loc.id);
            const isNext    = !done && completedLocations.length === LOCATIONS.findIndex(l => l.id === loc.id);
            const isOccupied = occupiedLocations.has(loc.id);
            const catColor  = CATEGORY_COLORS[loc.category]?.dot || '#ffffff';

            return (
              <button
                key={loc.id}
                className={[
                  'map-point',
                  done       ? 'done'     : '',
                  isNext     ? 'pulse'    : '',
                  isOccupied ? 'occupied' : '',
                ].filter(Boolean).join(' ')}
                style={{
                  left:       `${loc.mapPosition.x}%`,
                  top:        `${loc.mapPosition.y}%`,
                  background: done ? 'rgba(170, 170, 170, 0.35)' : catColor,
                  borderColor: done ? 'rgba(170, 170, 170, 0.5)' : catColor,
                  boxShadow:  done ? 'none' : `0 0 12px ${catColor}88`,
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

          {/* Other players' presence avatars */}
          {otherPlayers
            .filter(p => p.currentLocation)
            .map(p => {
              const loc = LOCATIONS.find(l => l.id === p.currentLocation);
              if (!loc) return null;
              return (
                <div
                  key={p.socketId}
                  className="map-presence-dot"
                  style={{
                    left: `${loc.mapPosition.x}%`,
                    top:  `${loc.mapPosition.y}%`,
                  }}
                  title={p.name}
                >
                  <span className="map-presence-name">{p.name[0].toUpperCase()}</span>
                </div>
              );
            })}
          {/* Ghost run dot (previous best run) */}
          {ghostLocationId && (() => {
            const ghostLoc = LOCATIONS.find(l => l.id === ghostLocationId);
            if (!ghostLoc) return null;
            return (
              <div
                className="map-ghost-dot"
                style={{ left: `${ghostLoc.mapPosition.x}%`, top: `${ghostLoc.mapPosition.y}%` }}
                title={`👻 Rekords: ${ghostBestTime}`}
              >
                <span className="map-ghost-icon">👻</span>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="map-legend">
        {Object.entries(CATEGORY_COLORS).map(([key, val]) => (
          <span key={key} className="legend-item">
            <span className="legend-dot" style={{ background: val.dot }} />
            {val.label}
          </span>
        ))}
        {otherPlayers.length > 0 && (
          <span className="legend-item">
            <span className="legend-dot" style={{ background: 'var(--amber)', border: '2px solid var(--text)' }} />
            Citi spēlētāji ({otherPlayers.length})
          </span>
        )}
        {ghostLocationId && ghostBestTime && (
          <span className="legend-item">
            <span className="legend-dot" style={{ background: 'var(--sea-light)' }} />
            Rekords: {ghostBestTime}
          </span>
        )}
      </div>

      <p className="map-progress">
        Pabeigtas {completedLocations.length} / {LOCATIONS.length} vietas
      </p>
    </div>
  );
}
