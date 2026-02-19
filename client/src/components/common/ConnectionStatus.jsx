import React from 'react';
import { useGame } from '../../context/GameContext.jsx';
import styles from './ConnectionStatus.module.css';

const LABELS = {
  connected: 'Savienots',
  disconnected: 'Atvienots',
  reconnecting: 'Atjauno...',
  error: 'Kļūda',
};

export default function ConnectionStatus() {
  const { state } = useGame();
  const { connectionStatus } = state;
  if (!connectionStatus || connectionStatus === 'disconnected') return null;

  return (
    <div className={`${styles.indicator} ${styles[connectionStatus] || ''}`}>
      {LABELS[connectionStatus] || connectionStatus}
    </div>
  );
}
