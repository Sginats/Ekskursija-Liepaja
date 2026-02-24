import { LOCATIONS } from '../data/LocationData.js';

export default function RouteOverlay({ completedLocations, routePlan }) {
  // If we have a routePlan, use it to draw the projected route line too? 
  // The issue asks for an "Animated route line on the map for progress tracking".
  // Let's first draw the completed route.

  const coords = completedLocations
    .map(id => LOCATIONS.find(l => l.id === id))
    .filter(Boolean)
    .map(loc => ({ x: loc.mapPosition.x, y: loc.mapPosition.y }));

  // Draw projected route if routePlan exists
  const projectedCoords = (routePlan || [])
    .map(id => LOCATIONS.find(l => l.id === id))
    .filter(Boolean)
    .map(loc => ({ x: loc.mapPosition.x, y: loc.mapPosition.y }));

  const buildPath = (pts) => pts.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const completedPathD = buildPath(coords);
  const projectedPathD = buildPath(projectedCoords);

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

      {/* Projected (dimmed) route */}
      {projectedPathD && (
        <path
          d={projectedPathD}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.4"
          strokeDasharray="1 1.5"
        />
      )}

      {/* Completed route glow */}
      {completedPathD && (
        <path
          d={completedPathD}
          fill="none"
          stroke="rgba(255,170,0,0.3)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Main route line with dash animation */}
      {completedPathD && (
        <path
          className="route-line-animated"
          d={completedPathD}
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2 1.5"
        />
      )}
    </svg>
  );
}
