import React, { useState, useCallback } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { taskSequence } from '../../game/taskSequence.js';
import answers from '@data/answers.json';
import styles from './AdminPanel.module.css';

export default function AdminPanel() {
  const { isAdmin, logout } = useAdmin();
  const {
    state,
    adminAddScore,
    adminJumpToTask,
    adminSetTimer,
    adminSkipTask,
    TOTAL_TASKS,
  } = useGame();

  const [collapsed, setCollapsed] = useState(false);
  const [ptInput,   setPtInput]   = useState('10');
  const [tmInput,   setTmInput]   = useState('30');
  const [taskInput, setTaskInput] = useState('0');
  const [showAns,   setShowAns]   = useState(false);

  const onAddPts = useCallback(() => {
    const pts = parseInt(ptInput, 10);
    if (!isNaN(pts)) adminAddScore(pts);
  }, [ptInput, adminAddScore]);

  const onSetTimer = useCallback(() => {
    const s = parseInt(tmInput, 10);
    if (!isNaN(s) && s > 0) adminSetTimer(s);
  }, [tmInput, adminSetTimer]);

  const onJump = useCallback(() => {
    const idx = parseInt(taskInput, 10);
    if (!isNaN(idx)) adminJumpToTask(idx);
  }, [taskInput, adminJumpToTask]);

  if (!isAdmin) return null;

  // Derive current question answer from state
  const currentLoc = state.currentLocation;
  const currentQ   = currentLoc ? state.selectedQuestions?.[currentLoc] : null;
  const answerEntry = currentQ ? answers[currentQ.id] : null;
  const correctAnswer = answerEntry
    ? [answerEntry.answer, ...(answerEntry.alt || [])].join(' / ')
    : null;

  return (
    <div className={`${styles.panel} ${collapsed ? styles.panelCollapsed : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>⚙ Admin</span>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} title="Samazināt" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '▲' : '▼'}
          </button>
          <button className={styles.iconBtn} title="Iziet" onClick={logout}>✕</button>
        </div>
      </div>

      {!collapsed && (
        <div className={styles.body}>
          {/* Game phase info */}
          <div className={styles.info}>
            <span>Fāze: <b>{state.gamePhase}</b></span>
            <span>Punkti: <b>{state.score}</b></span>
            <span>Uzd.: <b>{state.completedTasks}/{TOTAL_TASKS}</b></span>
          </div>

          <div className={styles.divider} />

          {/* ── Show Answer ───────────────────────────────── */}
          <label className={styles.label}>Pareizā atbilde</label>
          {currentQ ? (
            <div className={styles.answerBlock}>
              <p className={styles.answerQuestion}>{currentQ.q}</p>
              <button
                className={`${styles.btn} ${styles.btnWide} ${styles.btnAnswer}`}
                onClick={() => setShowAns(v => !v)}
              >
                {showAns ? '🙈 Paslēpt' : '👁 Rādīt atbildi'}
              </button>
              {showAns && (
                <div className={styles.answerReveal}>
                  {correctAnswer ?? '—'}
                </div>
              )}
            </div>
          ) : (
            <p className={styles.answerNone}>Nav aktīva jautājuma</p>
          )}

          <div className={styles.divider} />

          {/* Add / subtract points */}
          <label className={styles.label}>Punkti (+ / −)</label>
          <div className={styles.row}>
            <input
              className={styles.input}
              type="number"
              value={ptInput}
              onChange={e => setPtInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onAddPts()}
            />
            <button className={styles.btn} onClick={onAddPts}>Pievienot</button>
          </div>

          <div className={styles.divider} />

          {/* Set timer */}
          <label className={styles.label}>Taimeris (sek.)</label>
          <div className={styles.row}>
            <input
              className={styles.input}
              type="number"
              min="1"
              max="999"
              value={tmInput}
              onChange={e => setTmInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSetTimer()}
            />
            <button className={styles.btn} onClick={onSetTimer}>Iestatīt</button>
          </div>

          <div className={styles.divider} />

          {/* Skip current task */}
          <button className={`${styles.btn} ${styles.btnWide} ${styles.btnSkip}`} onClick={adminSkipTask}>
            ⏭ Izlaist uzdevumu
          </button>

          <div className={styles.divider} />

          {/* Jump to task */}
          <label className={styles.label}>Pāriet uz uzdevumu #</label>
          <div className={styles.row}>
            <select
              className={styles.select}
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
            >
              {taskSequence.map((loc, i) => (
                <option key={loc} value={i}>{i + 1}. {loc}</option>
              ))}
              <option value={TOTAL_TASKS}>Beigas</option>
            </select>
            <button className={styles.btn} onClick={onJump}>Iet</button>
          </div>
        </div>
      )}
    </div>
  );
}
