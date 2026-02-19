import React, { useCallback, useState } from 'react';
import Modal from '../common/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { useNavigate } from 'react-router-dom';
import { TOTAL_TASKS } from '../../game/taskSequence.js';
import styles from './EndGameModal.module.css';

const SCORE_SAVED_KEY = '_scoreSaved';

export default function EndGameModal({ open, score, startTime, playerName, onClose, isGameOver = false }) {
  const { antiCheat, notify, gameState, state, gameTokenRef } = useGame();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const elapsed = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const medal = score >= 80 ? 'Zelta' : score >= 50 ? 'Sudrabota' : 'Bronzas';

  const handleSave = useCallback(async () => {
    if (saved || saving) return;

    const nonce = sessionStorage.getItem(SCORE_SAVED_KEY);
    if (nonce === antiCheat.sessionId) {
      notify('Rezultats jau saglabats!', 'info', 2000);
      setSaved(true);
      return;
    }

    setSaving(true);
    try {
      const payload = antiCheat.buildSubmitPayload(score, TOTAL_TASKS, elapsed);
      const formData = new FormData();
      formData.append('name', playerName || 'Anonims');
      formData.append('score', score);
      formData.append('time', formattedTime);
      formData.append('token', payload.token);
      formData.append('tasks', TOTAL_TASKS);
      formData.append('violations', payload.violations);
      formData.append('mode', state.mode || 'single');
      formData.append('gameToken', gameTokenRef?.current || '');

      const res = await fetch('../src/php/save_score.php', { method: 'POST', credentials: 'include', body: formData });
      const text = await res.text();

      if (text.startsWith('Success') || text.trim() === 'Success') {
        sessionStorage.setItem(SCORE_SAVED_KEY, antiCheat.sessionId);
        gameState.clearSession();
        setSaved(true);
        notify('Rezultats saglabats!', 'success', 2000);
      } else {
        notify(`Kludda: ${text.substring(0, 60)}`, 'error');
      }
    } catch (_) {
      notify('Savienojuma kludda.', 'error');
    } finally {
      setSaving(false);
    }
  }, [saved, saving, score, formattedTime, playerName, antiCheat, elapsed, notify, gameState, state.mode, gameTokenRef]);

  const handleViewLeaderboard = () => {
    gameState.clearSession();
    navigate('/leaderboard');
  };

  const handleNewGame = () => {
    gameState.clearSession();
    try { sessionStorage.removeItem(SCORE_SAVED_KEY); } catch (_) {}
    onClose();
  };

  return (
    <Modal open={open}>
      <div className={styles.root} data-game>
        <h2 className={styles.title}>{isGameOver ? 'Spēle beigusies!' : 'Apsveicam!'}</h2>
        <p className={styles.medalLine}>
          {isGameOver ? '💔 Dzīvības beidzās' : medal + ' rezultats'}
        </p>

        <div className={styles.scoreBox}>
          <div className={styles.scoreRow}>
            <span className={styles.scoreLabel}>Punkti</span>
            <span className={styles.scoreValue}>{score} / 100</span>
          </div>
          <div className={styles.scoreRow}>
            <span className={styles.scoreLabel}>Laiks</span>
            <span className={styles.scoreValue}>{formattedTime}</span>
          </div>
        </div>

        <p className={styles.finishedMsg}>
          {isGameOver
            ? 'Dzīvības beidzās pirms ekskursijas beigām. Mēģini vēlreiz!'
            : 'Tu esi pabeidzis ekskursiju pa Liepajas pilsetu!'}
        </p>

        <div className={styles.btnGroup}>
          {!isGameOver && !saved ? (
            <button className={styles.btn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saglabajas...' : 'Saglabat rezultatu'}
            </button>
          ) : (
            <button className={`${styles.btn} ${styles.btnSaved}`} onClick={handleViewLeaderboard}>
              Skatit Top 10
            </button>
          )}
          <button className={styles.btnSecondary} onClick={handleNewGame}>
            Jauna spele
          </button>
          <button className={styles.btnSecondary} onClick={() => { gameState.clearSession(); onClose(); }}>
            Atpakal uz menu
          </button>
        </div>
      </div>
    </Modal>
  );
}
