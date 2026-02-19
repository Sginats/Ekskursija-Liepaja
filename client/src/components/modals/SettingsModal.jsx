import React from 'react';
import Modal from '../common/Modal.jsx';
import { useTheme, THEME_LABELS } from '../../context/ThemeContext.jsx';
import styles from './SettingsModal.module.css';

export default function SettingsModal({ open, onClose }) {
  const {
    theme, setTheme,
    animationsEnabled, toggleAnimations,
    musicVolume, setMusicVolume,
    sfxVolume, setSfxVolume,
    themeKeys,
  } = useTheme();

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className={styles.title}>Iestatijumi</h2>

      <h3 className={styles.sectionTitle}>Audio</h3>
      <label className={styles.label}>Muzika</label>
      <input
        type="range" min="0" max="100"
        value={musicVolume}
        onChange={(e) => setMusicVolume(Number(e.target.value))}
        className={styles.slider}
      />
      <label className={styles.label}>Skanas efekti</label>
      <input
        type="range" min="0" max="100"
        value={sfxVolume}
        onChange={(e) => setSfxVolume(Number(e.target.value))}
        className={styles.slider}
      />

      <h3 className={styles.sectionTitle}>Krasu tema</h3>
      <div className={styles.themeGrid}>
        {themeKeys.map((key) => (
          <button
            key={key}
            className={`${styles.themeBtn} ${theme === key ? styles.active : ''}`}
            onClick={() => setTheme(key)}
          >
            <span
              className={styles.preview}
              style={{ background: `var(--bg-secondary)` }}
            />
            {THEME_LABELS[key] || key}
          </button>
        ))}
      </div>

      <h3 className={styles.sectionTitle}>Animacijas</h3>
      <label className={styles.toggleLabel}>
        <span>Animacijas ieslēgtas</span>
        <div className={styles.toggle}>
          <input
            type="checkbox"
            checked={animationsEnabled}
            onChange={(e) => toggleAnimations(e.target.checked)}
          />
          <span className={styles.slider2} />
        </div>
      </label>

      <button className={styles.closeBtn} onClick={onClose}>Aizvērt</button>
    </Modal>
  );
}
