import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext.jsx';
import { locationInfo } from '../../game/locationInfo.js';
import QuizModal from '../modals/QuizModal.jsx';
import MiniGameModal from '../modals/MiniGameModal.jsx';
import HistoryModal from '../modals/HistoryModal.jsx';
import SettingsModal from '../modals/SettingsModal.jsx';
import AboutModal from '../modals/AboutModal.jsx';
import EndGameModal from '../modals/EndGameModal.jsx';
import { NotificationContainer } from '../common/Notification.jsx';
import styles from './GameMap.module.css';

const MAP_POINTS = [
  { id: 'Mols',      color: 'yellow', top: '12%', left: '11%', label: 'Ziemelu mols' },
  { id: 'Cietums',   color: 'green',  top: '24%', left: '44%', label: 'Karostas cietums' },
  { id: 'Kanals',    color: 'blue',   top: '58%', left: '23%', label: 'Tirdzniecibas kanals' },
  { id: 'Dzintars',  color: 'blue',   top: '61.5%', left: '30.5%', label: 'Lielais Dzintars' },
  { id: 'RTU',       color: 'blue',   top: '63%', left: '27%', label: 'RTU Liepaja' },
  { id: 'Teatris',   color: 'blue',   top: '64%', left: '37%', label: 'Liepajas Teatris' },
  { id: 'Osta',      color: 'red',    top: '60%', left: '33%', label: 'Liepajas Osta' },
  { id: 'Parks',     color: 'green',  top: '70%', left: '12%', label: 'Jurmalas parks' },
  { id: 'LSEZ',      color: 'red',    top: '61.5%', left: '52.5%', label: 'LSEZ' },
  { id: 'Ezerkrasts',color: 'green',  top: '81%', left: '57%', label: 'Ezerkrasta taka' },
];

export default function GameMap() {
  const { state, dispatch, completeTask, notify, TOTAL_TASKS, taskSequence, antiCheat, taskTypeRef } = useGame();
  const navigate = useNavigate();

  const [activeModal, setActiveModal] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });

  const { completedTasks, score, startTime, playerName, lives, maxLives, difficulty } = state;

  // Show end game if all tasks are done (e.g. restored session) OR lives ran out (Hard)
  useEffect(() => {
    if (!showEnd && (completedTasks >= TOTAL_TASKS || (difficulty === 'hard' && lives <= 0))) {
      setShowEnd(true);
    }
  }, [completedTasks, lives, difficulty, TOTAL_TASKS, showEnd]);

  // Notify player when they switch tabs during a game
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        notify('Brīdinājums: cilnes maiņa tiek reģistrēta!', 'warning', 3000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [notify]);

  const getPointState = useCallback(
    (id) => {
      const idx = taskSequence.indexOf(id);
      if (idx < completedTasks) return 'done';
      if (idx === completedTasks) return 'active';
      return 'locked';
    },
    [completedTasks, taskSequence]
  );

  const handlePointClick = useCallback(
    (id) => {
      const idx = taskSequence.indexOf(id);
      if (idx !== completedTasks) {
        notify('Veic uzdevumus pēc kārtas!', 'warning');
        return;
      }
      dispatch({ type: 'SET_LOCATION', location: id });

      const taskType = taskTypeRef.current?.[id] || 'quiz';
      if (taskType === 'minigame') {
        setActiveModal('minigame');
      } else if (id === 'Teatris') {
        setActiveModal('history');
      } else {
        setActiveModal('quiz');
      }
    },
    [completedTasks, taskSequence, dispatch, notify, taskTypeRef]
  );

  const handleTaskComplete = useCallback(
    (pts) => {
      const n = completeTask();
      setActiveModal(null);
      if (n >= TOTAL_TASKS) {
        setTimeout(() => setShowEnd(true), 400);
      }
    },
    [completeTask, TOTAL_TASKS]
  );

  const elapsedFormatted = () => {
    const s = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <nav className={styles.topbar}>
        <button className={styles.topBtn} onClick={() => navigate('/')}>
            Atpakaļ
          </button>
          <div className={styles.topCenter}>
            <span className={styles.scoreDisplay}>Punkti: {score}</span>
            {difficulty === 'hard' && maxLives !== null && (
              <div className={styles.livesDisplay}>
                {Array.from({ length: maxLives }, (_, i) => (
                  <span key={i} className={i < lives ? styles.heartAlive : styles.heartDead}>♥</span>
                ))}
              </div>
            )}
          </div>
          <div className={styles.topRight}>
            <button className={styles.topBtn} onClick={() => setShowSettings(true)}>
              Iestatījumi
            </button>
            <button className={styles.topBtn} onClick={() => setShowAbout(true)}>
              Par spēli
            </button>
          </div>
      </nav>

      {/* Map area */}
      <div className={styles.mapContainer}>
        <div className={styles.mapArea}>
          {MAP_POINTS.map((pt) => {
            const st = getPointState(pt.id);
            return (
              <button
                key={pt.id}
                className={`${styles.point} ${styles[`color-${pt.color}`]} ${styles[st]}`}
                style={{ top: pt.top, left: pt.left }}
                onClick={() => st === 'active' && handlePointClick(pt.id)}
                onMouseEnter={(e) =>
                  setTooltip({ visible: true, text: pt.label, x: e.clientX + 14, y: e.clientY + 14 })
                }
                onMouseMove={(e) =>
                  setTooltip((t) => ({ ...t, x: e.clientX + 14, y: e.clientY + 14 }))
                }
                onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                aria-label={pt.label}
                aria-disabled={st !== 'active'}
                data-game
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <p className={styles.legendTitle}>Apskates vietas</p>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles['color-green']}`} />
            Daba un atpūta
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles['color-blue']}`} />
            Kultūra un vēsture
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles['color-yellow']}`} />
            RTU akadēmija
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles['color-red']}`} />
            Industrija un osta
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div className={styles.tooltip} style={{ top: tooltip.y, left: tooltip.x }}>
          {tooltip.text}
        </div>
      )}

      {/* Modals */}
      <QuizModal
        open={activeModal === 'quiz'}
        location={state.currentLocation}
        onComplete={handleTaskComplete}
        onClose={() => setActiveModal(null)}
      />
      <MiniGameModal
        open={activeModal === 'minigame'}
        location={state.currentLocation}
        onComplete={handleTaskComplete}
        onClose={() => setActiveModal(null)}
      />
      <HistoryModal
        open={activeModal === 'history'}
        onComplete={handleTaskComplete}
        onClose={() => setActiveModal(null)}
      />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      <EndGameModal
        open={showEnd}
        score={score}
        startTime={startTime}
        playerName={playerName}
        isGameOver={difficulty === 'hard' && lives <= 0 && completedTasks < TOTAL_TASKS}
        onClose={() => navigate('/')}
      />

      <NotificationContainer />
    </div>
  );
}
