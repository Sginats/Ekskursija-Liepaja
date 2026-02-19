import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import Modal from '../common/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { AntScene } from '../../phaser/scenes/AntScene.js';
import { BoatScene } from '../../phaser/scenes/BoatScene.js';
import { FishingScene } from '../../phaser/scenes/FishingScene.js';
import { locationInfo } from '../../game/locationInfo.js';
import styles from './MiniGameModal.module.css';

const SCENE_MAP = {
  RTU: AntScene,
  Osta: BoatScene,
  Mols: FishingScene,
};

export default function MiniGameModal({ open, location, onComplete, onClose }) {
  const { addScore, antiCheat, notify, gameTokenRef } = useGame();
  const mountRef = useRef(null);
  const gameRef = useRef(null);

  const [phase, setPhase] = useState('info'); // 'info' | 'playing' | 'result'
  const [resultText, setResultText] = useState('');
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const info = location ? locationInfo[location] : null;
  const SceneClass = location ? SCENE_MAP[location] : null;

  const destroyGame = () => {
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
  };

  const launchGame = () => {
    destroyGame();
    setPhase('playing');
    setRetrying(false);
    antiCheat.recordTaskStart(location);

    setTimeout(() => {
      if (!mountRef.current || !SceneClass) return;

      const scene = new SceneClass();
      scene.init({
        onComplete: (pts, extra) => {
          destroyGame();
          const newScore = addScore(pts);
          // Record score server-side so save_score.php uses the correct total
          if (gameTokenRef?.current) {
            fetch('../src/php/record_task_score.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                gameToken: gameTokenRef.current,
                taskId: location,
                points: pts,
              }),
            }).catch(() => {
              // Fire-and-forget: a network failure here is not fatal for UX.
              // If the session is broken, save_score.php will also fail and
              // the user will see an error at that point.
            });
          }
          setEarnedPoints(pts);
          setResultText(buildSuccessText(location, pts, extra));
          setPhase('result');
          notify(`+${pts} punkti!`, 'success', 2000);
        },
        onFail: () => {
          destroyGame();
          setResultText(buildFailText(location));
          setPhase('retry');
        },
      });

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: mountRef.current,
        width: '100%',
        height: 320,
        backgroundColor: '#000000',
        scene,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        audio: { disableWebAudio: true },
      });
    }, 80);
  };

  // Clean up when modal closes
  useEffect(() => {
    if (!open) {
      destroyGame();
      setPhase('info');
    }
  }, [open]);

  // Clean up on unmount
  useEffect(() => () => destroyGame(), []);

  const handleContinue = () => {
    antiCheat.recordTaskEnd(location, earnedPoints);
    onComplete(earnedPoints);
  };

  if (!open || !location || !SceneClass) return null;

  return (
    <Modal open={open} wide>
      <div data-game>
        {phase === 'info' && (
          <>
            <h3 className={styles.infoName}>{info?.name}</h3>
            <p className={styles.infoDesc}>{info?.desc}</p>
            <button className={styles.btn} onClick={launchGame}>Sakt uzdevumu</button>
            <button className={styles.closeBtn} onClick={onClose}>Atcelt</button>
          </>
        )}

        {(phase === 'playing' || phase === 'retry') && (
          <>
            <div ref={mountRef} className={styles.canvas} />
            {phase === 'retry' && (
              <div className={styles.retry}>
                <p className={styles.failText}>{resultText}</p>
                <button className={styles.btn} onClick={launchGame}>Meginat velreiz</button>
              </div>
            )}
          </>
        )}

        {phase === 'result' && (
          <>
            <p className={styles.success}>{resultText}</p>
            <button className={styles.btn} onClick={handleContinue}>Turpinat</button>
          </>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Result text builders
// ---------------------------------------------------------------------------
function buildSuccessText(location, pts, extra) {
  switch (location) {
    case 'RTU':   return `Visi kukaiņi nokerti! +${pts} punkti`;
    case 'Osta':  return `Finiseja laika ${extra}s. +${pts} punkti`;
    case 'Mols':  return `Zivs noķerta ${extra}s laika! +${pts} punkti`;
    default:      return `Pabeigts! +${pts} punkti`;
  }
}

function buildFailText(location) {
  switch (location) {
    case 'RTU':  return 'Laiks beidzas! Megini velreiz.';
    case 'Osta': return 'Diemzel neizdevās. Megini velreiz.';
    case 'Mols': return 'Aukla partruka! Megini velreiz.';
    default:     return 'Neizdevās. Megini velreiz.';
  }
}
