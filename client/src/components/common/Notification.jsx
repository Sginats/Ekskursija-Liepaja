import React, { useEffect } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import styles from './Notification.module.css';

export default function Notification({ note }) {
  const { dismissNotification } = useGame();

  useEffect(() => {
    const timer = setTimeout(() => dismissNotification(note.id), note.duration);
    return () => clearTimeout(timer);
  }, [note.id, note.duration, dismissNotification]);

  return (
    <div className={`${styles.note} ${styles[note.kind] || ''}`}>
      <span className={styles.icon}>
        {note.kind === 'success' && '+'}
        {note.kind === 'error' && '!'}
        {note.kind === 'warning' && '!'}
        {note.kind === 'info' && 'i'}
      </span>
      <span className={styles.text}>{note.message}</span>
    </div>
  );
}

export function NotificationContainer() {
  const { state } = useGame();
  if (state.notifications.length === 0) return null;
  return (
    <div className={styles.container}>
      {state.notifications.map((n) => (
        <Notification key={n.id} note={n} />
      ))}
    </div>
  );
}
