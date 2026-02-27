import React, { useState } from 'react';
import Modal from '../common/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import styles from './HistoryModal.module.css';

const EVENTS = [
  { year: 1625, text: 'Liepaja iegust pilsetas tiesibas' },
  { year: 1907, text: 'Dibināts Liepajas Teatris' },
  { year: 2015, text: 'Atklata koncertzale "Lielais Dzintars"' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HistoryModal({ open, onComplete, onClose }) {
  const { addScore, antiCheat, notify, gameTokenRef } = useGame();
  const [items, setItems] = useState(() => shuffle(EVENTS));
  const [phase, setPhase] = useState('play');
  const [wrong, setWrong] = useState(false);

  const move = (idx, dir) => {
    if (idx + dir < 0 || idx + dir >= items.length) return;
    const next = [...items];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    setItems(next);
  };

  const check = () => {
    if (!antiCheat.validateAnswerSubmission()) {
      notify('Atbilde iesniegta pārāk ātri!', 'warning');
      return;
    }
    const correct = items.every((it, i) => i === 0 || it.year >= items[i - 1].year);
    if (correct) {
      addScore(10);
      // Record score server-side so save_score.php uses the correct total
      if (gameTokenRef?.current) {
        fetch('../src/php/record_task_score.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            gameToken: gameTokenRef.current,
            taskId: 'Teatris',
            points: 10,
          }),
        }).catch(() => {
          // Fire-and-forget: a network failure here is not fatal for UX.
          // If the session is broken, save_score.php will also fail and
          // the user will see an error at that point.
        });
      }
      antiCheat.recordTaskEnd('Teatris', 10);
      setPhase('success');
      notify('+10 punkti!', 'success', 2000);
    } else {
      setWrong(true);
      notify('Nepareiza seciba! Megini velreiz.', 'error', 2500);
      antiCheat.recordTaskStart('Teatris');
    }
  };

  const reset = () => {
    setItems(shuffle(EVENTS));
    setWrong(false);
    antiCheat.recordTaskStart('Teatris');
  };

  return (
    <Modal open={open} onClose={phase === 'success' ? onClose : undefined}>
      <div data-game>
        <h2 className={styles.title}>Vesturiska seciba</h2>
        {phase === 'play' ? (
          <>
            <p className={styles.desc}>
              Sakarto notikumus hronologiska seciba (no senaka uz jaunako)!
            </p>
            {wrong && <p className={styles.warn}>Seciba nav pareiza. Megini velreiz.</p>}
            <div className={styles.list}>
              {items.map((it, i) => (
                <div key={it.year} className={styles.item}>
                  <span className={styles.num}>{i + 1}.</span>
                  <span className={styles.text}>{it.text}</span>
                  <div className={styles.arrows}>
                    <button
                      className={styles.arrowBtn}
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Uz augšu"
                    >
                      ^
                    </button>
                    <button
                      className={styles.arrowBtn}
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1}
                      aria-label="Uz leju"
                    >
                      v
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.btnRow}>
              <button className={styles.btn} onClick={check}>Iesniegt secību</button>
              {wrong && (
                <button className={styles.resetBtn} onClick={reset}>Atiestatit</button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className={styles.success}>Pareizi! +10 punkti</p>
            <p className={styles.fact}>
              Pareiza seciba: 1625, 1907, 2015
            </p>
            <button className={styles.btn} onClick={() => onComplete(10)}>
              Turpinat
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
