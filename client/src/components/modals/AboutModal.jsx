import React from 'react';
import Modal from '../common/Modal.jsx';
import styles from './AboutModal.module.css';

export default function AboutModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className={styles.title}>Par Speli</h2>

      <div className={styles.infoBox}>
        <p><strong>Spele:</strong> Macibas ekskursija Liepaja</p>
        <p><strong>Merkis:</strong> Iepazit Liepajas kultuurvesturiskās vietas, uznemums un RTU akademiju, veicot interaktīvus uzdevumus.</p>
      </div>

      <h3 className={styles.section}>Speles noteikumi</h3>
      <div className={styles.infoBox}>
        <ol className={styles.ruleList}>
          <li>Ekskursija ietver <strong>10 apmeklejuma vietas</strong>, kas japamekle noteikta seciba.</li>
          <li>Katra vieta sanemsi informaciju un uzdevumu.</li>
          <li>Pareiza atbilde pirma meginjuma: <strong>+10 punkti</strong>.</li>
          <li>Pareiza atbilde pec 1 nepareizas: <strong>+5 punkti</strong>. Pec 2 — 0 punkti, atbilde tiek paradita.</li>
          <li>Speles beigās tiek paradits tavs rezultats un laiks.</li>
          <li>Vari saglabat rezultatu Top 10 tabulā!</li>
        </ol>
      </div>

      <h3 className={styles.section}>Objektu nozime karte</h3>
      <ul className={styles.legendList}>
        <li><span className={`${styles.dot} ${styles.green}`} /> Zals: Daba un atputa</li>
        <li><span className={`${styles.dot} ${styles.blue}`} /> Zils: Kultura un vesture</li>
        <li><span className={`${styles.dot} ${styles.yellow}`} /> Dzeltens: RTU akademija</li>
        <li><span className={`${styles.dot} ${styles.red}`} /> Sarkans: Industrija un osta</li>
      </ul>

      <div className={styles.twoCol}>
        <div>
          <h3 className={styles.section}>Tehnologijas</h3>
          <ul className={styles.techList}>
            <li>React 18 + Vite 5</li>
            <li>Phaser 3 (mini-speles)</li>
            <li>PHP (aizmugure)</li>
            <li>WebSocket (real-time)</li>
            <li>AI: Gemini, Claude, Copilot</li>
          </ul>
        </div>
        <div>
          <h3 className={styles.section}>Izstraadataji (2PT)</h3>
          <ul className={styles.techList}>
            <li>Niks Senvalds</li>
            <li>Dans Bitenieks</li>
          </ul>
        </div>
      </div>

      <h3 className={styles.section}>Izmantotie resursi</h3>
      <div className={styles.resources}>
        <p><strong>Atteli:</strong> OpenStreetMap, Freepik</p>
        <p><strong>Audio:</strong> Programmetiski generets CC0 audio (hover skaņa un fona muzika)</p>
        <p><strong>Informacija:</strong> liepaja.lv, rtu.lv, wikipedia.org</p>
        <p><strong>Bibliotēkas:</strong> Bootstrap 5, Node.js, Phaser 3</p>
      </div>

      <button className={styles.closeBtn} onClick={onClose}>Aizvērt</button>
    </Modal>
  );
}
