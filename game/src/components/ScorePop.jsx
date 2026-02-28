import { useState, useEffect } from 'react';

/**
 * ScorePop
 *
 * Renders a single "+N" (or "−N") label that animates upward and fades out.
 * Mount it with a non-zero `delta` prop; it auto-unmounts after the animation.
 *
 * Usage:
 *   <ScorePop key={animKey} delta={10} />
 */
export default function ScorePop({ delta }) {
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setAlive(false), 1100);
    return () => clearTimeout(t);
  }, []);

  if (!alive || !delta) return null;

  const positive = delta > 0;
  const label    = positive ? `+${delta}` : String(delta);

  return (
    <span
      className={`score-pop ${positive ? 'score-pop-pos' : 'score-pop-neg'}`}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
