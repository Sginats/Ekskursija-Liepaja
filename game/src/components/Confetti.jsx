/**
 * Confetti
 *
 * Pure-CSS confetti rain for the finale screen.
 * Renders N coloured pieces that fall from random positions, each at a
 * slightly different animation delay and duration for a natural look.
 */

const COLORS  = ['#ffd700', '#ff6b6b', '#4caf50', '#2196f3', '#bb86fc', '#ff9800', '#26c6da'];
const PIECES  = 60;

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

export default function Confetti() {
  return (
    <div className="confetti-root" aria-hidden="true">
      {Array.from({ length: PIECES }, (_, i) => {
        const color    = COLORS[i % COLORS.length];
        const left     = `${randomBetween(0, 100)}%`;
        const delay    = `${randomBetween(0, 2).toFixed(2)}s`;
        const duration = `${randomBetween(1.8, 3.4).toFixed(2)}s`;
        const size     = Math.round(randomBetween(6, 14));
        const rotate   = Math.round(randomBetween(0, 360));

        return (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left,
              width:                size,
              height:               size * 0.55,
              background:           color,
              animationDelay:       delay,
              animationDuration:    duration,
              transform:            `rotate(${rotate}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
