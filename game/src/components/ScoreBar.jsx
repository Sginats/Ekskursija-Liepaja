import { useState, useEffect, useRef } from 'react';
import ScorePop from './ScorePop.jsx';
import EventBridge from '../utils/EventBridge.js';
import NotoEmoji from './NotoEmoji.jsx';

/**
 * ScoreBar
 *
 * Fixed top bar that shows the current location name, score, and phase label.
 * - Mounts a ScorePop animation whenever the score increases.
 * - Briefly shakes in red when a wrong answer is submitted (via EventBridge).
 */
export default function ScoreBar({ score, locationName, phase }) {
  const prevScoreRef  = useRef(score);
  const [popKey,  setPopKey]  = useState(0);
  const [popDelta, setPopDelta] = useState(0);
  const [shake,   setShake]   = useState(false);

  // ── Score-pop on increase ─────────────────────────────────────────────────
  useEffect(() => {
    const delta = score - prevScoreRef.current;
    prevScoreRef.current = score;
    if (delta > 0) {
      setPopDelta(delta);
      setPopKey(k => k + 1);
    } else if (delta < 0) {
      // For penalties, we can also shake or show negative pop
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  }, [score]);

  // ── Shake on wrong answer ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = EventBridge.on('ANSWER_WRONG', () => {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    });
    return unsub;
  }, []);

  return (
    <div className={`score-bar${shake ? ' score-bar-shake' : ''}`}>
      <span className="score-bar-phase">{locationName}</span>
      <span className={`score-bar-score${shake ? ' score-bar-score-wrong' : ''}`}>
        <NotoEmoji emoji="⭐" size={18} style={{ marginRight: 4 }} />{score} punkti
        {popDelta !== 0 && <ScorePop key={popKey} delta={popDelta} />}
      </span>
      {phase && <span className="score-bar-hint">{phase}</span>}
    </div>
  );
}

