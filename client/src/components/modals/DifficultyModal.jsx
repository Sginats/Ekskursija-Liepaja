import React from 'react';
import Modal from '../common/Modal.jsx';
import styles from './DifficultyModal.module.css';

const DIFFICULTIES = [
  {
    id: 'normal',
    label: 'Normāls',
    icon: '',
    color: '#4caf50',
    lives: null,
    tagline: 'Spēlē bez spiediena',
    descriptions: [
      'Neierobežotas dzīvības — kļūdas nekad nebeidz spēli',
      'Laika limits: 60 → 45 → 30 sek.',
      'Ieteikts iesācējiem un tiem, kas iepazīst pilsētu',
    ],
  },
  {
    id: 'hard',
    label: 'Grūts',
    icon: '',
    color: '#f44336',
    lives: 3,
    tagline: '3 dzīvības — katrai kļūdai ir cena!',
    descriptions: [
      '3 dzīvības — zaudē tās visas un spēle beidzas',
      'Laika limits: 45 → 30 → 20 sek.',
      'Tikai pieredzējušajiem izaicinātājiem',
    ],
  },
];

export default function DifficultyModal({ open, onSelect, onCancel }) {
  return (
    <Modal open={open}>
      <div data-game>
        <h2 className={styles.title}>Izvēlies Grūtumu</h2>
        <p className={styles.subtitle}>Grūtums ietekmē dzīvību skaitu un laika limitu katram jautājumam</p>

        <div className={styles.cards}>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              className={styles.card}
              style={{ '--card-color': d.color }}
              onClick={() => onSelect(d.id)}
            >
              <div className={styles.cardIcon}>{d.icon}</div>
              <div className={styles.cardLabel}>{d.label}</div>
              <div className={styles.cardTagline}>{d.tagline}</div>
              <ul className={styles.cardDesc}>
                {d.descriptions.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <button className={styles.cancelBtn} onClick={onCancel}>Atcelt</button>
      </div>
    </Modal>
  );
}
