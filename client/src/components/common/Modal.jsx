import React from 'react';
import styles from './Modal.module.css';

export default function Modal({ open, onClose, children, wide = false }) {
  if (!open) return null;
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.content} ${wide ? styles.wide : ''}`}
        onClick={(e) => e.stopPropagation()}
        data-game
      >
        {children}
      </div>
    </div>
  );
}
