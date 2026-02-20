import { LOCATIONS } from '../data/LocationData.js';

export default function RouteOverlay({ completedLocations }) {
  if (completedLocations.length < 2) return null;

  // Build ordered coordinate array from completion order
  const coords = completedLocations
    .map(id => LOCATIONS.find(l => l.id === id))
    .filter(Boolean)
    .map(loc => ({ x: loc.mapPosition.x, y: loc.mapPosition.y }));

  if (coords.length < 2) return null;

  // Build SVG path
  const pathParts = coords.map((c, i) =>
    `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`
  );
  const pathD = pathParts.join(' ');

  return (
    <svg
      className="route-overlay"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffaa00" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#2c6fa8" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* Glow layer */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(255,170,0,0.3)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Main route line with dash animation */}
      <path
        className="route-line-animated"
        d={pathD}
        fill="none"
        stroke="url(#routeGrad)"
        strokeWidth="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 1.5"
      />
    </svg>
  );
}
