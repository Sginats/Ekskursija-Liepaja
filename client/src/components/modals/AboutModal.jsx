import React from 'react';
import Modal from '../common/Modal.jsx';
import styles from './AboutModal.module.css';

export default function AboutModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className={styles.title}>Par spēli</h2>

      <div className={styles.infoBox}>
        <p><strong>Spēle:</strong> Mācību ekskursija Liepājā</p>
        <p>
          <strong>Mērķis:</strong> iepazīt Liepājas kultūras, dabas, izglītības un industrijas vietas,
          izpildot uzdevumus un mini-spēles noteiktā secībā.
        </p>
      </div>

      <h3 className={styles.section}>Spēles plūsma un punkti</h3>
      <div className={styles.infoBox}>
        <ol className={styles.ruleList}>
          <li>Ekskursijā ir <strong>10 lokācijas</strong>, kuras jāveic secīgi.</li>
          <li>Katrā lokācijā ir zināšanu jautājums, mini-spēle vai vēstures aktivitāte.</li>
          <li>Pareiza atbilde 1. mēģinājumā: <strong>+10 punkti</strong>.</li>
          <li>Pareiza atbilde pēc 1 kļūdas: <strong>+5 punkti</strong>.</li>
          <li>Pēc 2 kļūdām: <strong>0 punkti</strong> (atbilde tiek parādīta).</li>
          <li>Noslēgumā ir fināla tests ar <strong>5 jautājumiem</strong> (kopā līdz +10 punktiem).</li>
          <li>Maksimālais rezultāts: <strong>110 punkti</strong>.</li>
        </ol>
      </div>

      <h3 className={styles.section}>Multiplayer un reāllaiks</h3>
      <div className={styles.infoBox}>
        <p>
          Spēlei ir viena spēlētāja un multiplayer režīms. Multiplayer režīmā tiek izmantots
          WebSocket savienojums ar automātisku pārslēgšanos uz rezerves režīmu, ja savienojums nav pieejams.
        </p>
      </div>

      <h3 className={styles.section}>Objektu nozīme kartē</h3>
      <ul className={styles.legendList}>
        <li><span className={`${styles.dot} ${styles.green}`} /> Zaļš: Daba un atpūta</li>
        <li><span className={`${styles.dot} ${styles.blue}`} /> Zils: Kultūra un vēsture</li>
        <li><span className={`${styles.dot} ${styles.yellow}`} /> Dzeltens: RTU akadēmija</li>
        <li><span className={`${styles.dot} ${styles.red}`} /> Sarkans: Industrija un osta</li>
      </ul>

      <div className={styles.twoCol}>
        <div>
          <h3 className={styles.section}>Tehnoloģijas</h3>
          <ul className={styles.techList}>
            <li><a href="https://react.dev" target="_blank" rel="noopener noreferrer">React 18</a> + <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">Vite</a></li>
            <li><a href="https://phaser.io" target="_blank" rel="noopener noreferrer">Phaser 3</a> mini-spēlēm</li>
            <li>PHP backend + WebSocket</li>
          </ul>
        </div>
        <div>
          <h3 className={styles.section}>Autori (2PT)</h3>
          <ul className={styles.techList}>
            <li>Niks Šenvalds</li>
            <li>Dans Bitenieks</li>
          </ul>
        </div>
      </div>

      <h3 className={styles.section}>Resursi</h3>
      <div className={styles.resources}>
        <p><strong>Karte:</strong> <a href="https://maps.apple.com/" target="_blank" rel="noopener noreferrer">maps.apple.com</a></p>
        <p><strong>Informācija:</strong> <a href="https://www.liepaja.lv/" target="_blank" rel="noopener noreferrer">liepaja.lv</a>, <a href="https://www.rtu.lv/" target="_blank" rel="noopener noreferrer">rtu.lv</a>, <a href="https://wikipedia.org/" target="_blank" rel="noopener noreferrer">wikipedia.org</a></p>
        <p><strong>Audio:</strong> <a href="https://pixabay.com/" target="_blank" rel="noopener noreferrer">pixabay.com</a></p>
      </div>

      <button className={styles.closeBtn} onClick={onClose}>Aizvērt</button>
    </Modal>
  );
}
