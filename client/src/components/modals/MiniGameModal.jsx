import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import Modal from '../common/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { TowerBlocksScene } from '../../phaser/scenes/TowerBlocksScene.js';
import { BoatScene       } from '../../phaser/scenes/BoatScene.js';
import { FishingScene    } from '../../phaser/scenes/FishingScene.js';
import { DzintarsScene   } from '../../phaser/scenes/DzintarsScene.js';
import { TeatrisScene    } from '../../phaser/scenes/TeatrisScene.js';
import { KanalsScene     } from '../../phaser/scenes/KanalsScene.js';
import { LSEZScene       } from '../../phaser/scenes/LSEZScene.js';
import { CietumScene     } from '../../phaser/scenes/CietumScene.js';
import { ParksScene      } from '../../phaser/scenes/ParksScene.js';
import { EzerkrastsScene } from '../../phaser/scenes/EzerkrastsScene.js';
import { locationInfo } from '../../game/locationInfo.js';
import styles from './MiniGameModal.module.css';

const SCENE_MAP = {
  RTU:        TowerBlocksScene,
  Osta:       BoatScene,
  Mols:       FishingScene,
  Dzintars:   DzintarsScene,
  Teatris:    TeatrisScene,
  Kanals:     KanalsScene,
  LSEZ:       LSEZScene,
  Cietums:    CietumScene,
  Parks:      ParksScene,
  Ezerkrasts: EzerkrastsScene,
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
          const awardedPoints = Math.max(0, Math.min(10, Number(pts) || 0));
          destroyGame();
          const newScore = addScore(awardedPoints);
          // Record score server-side so save_score.php uses the correct total
          if (gameTokenRef?.current) {
            fetch('../src/php/record_task_score.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                gameToken: gameTokenRef.current,
                taskId: location,
                points: awardedPoints,
              }),
            }).catch(() => {
              // Fire-and-forget: a network failure here is not fatal for UX.
              // If the session is broken, save_score.php will also fail and
              // the user will see an error at that point.
            });
          }
          setEarnedPoints(awardedPoints);
          setResultText(buildSuccessText(location, awardedPoints, extra));
          setPhase('result');
          notify(`+${awardedPoints} punkti!`, 'success', 2000);
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

  // Admin: skip mini-game task
  useEffect(() => {
    const onSkip = () => { if (open) { destroyGame(); onComplete(0); } };
    window.addEventListener('admin:skipTask', onSkip);
    return () => window.removeEventListener('admin:skipTask', onSkip);
  }, [open, onComplete]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <button className={styles.btn} onClick={launchGame}>Sākt uzdevumu</button>
            <button className={styles.closeBtn} onClick={onClose}>Atcelt</button>
          </>
        )}

        {(phase === 'playing' || phase === 'retry') && (
          <>
            <div ref={mountRef} className={styles.canvas} />
            {phase === 'retry' && (
              <div className={styles.retry}>
                <p className={styles.failText}>{resultText}</p>
                <button className={styles.btn} onClick={launchGame}>Mēģināt vēlreiz</button>
              </div>
            )}
          </>
        )}

        {phase === 'result' && (
          <>
            <p className={styles.success}>{resultText}</p>
            <button className={styles.btn} onClick={handleContinue}>Turpināt</button>
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
    case 'RTU':        return `Tornis uzbūvēts! +${pts} punkti`;
    case 'Osta':       return `Finiēja laikā ${extra}s. +${pts} punkti`;
    case 'Mols':       return `Zivs noķerta ${extra}s laikā! +${pts} punkti`;
    case 'Dzintars':   return `Visi dzintari savākti! +${pts} punkti`;
    case 'Teatris':    return `Visi prožektori noķerti! +${pts} punkti`;
    case 'Kanals':     return `Visi kuģi pārgājuši! +${pts} punkti`;
    case 'LSEZ':       return `Investīciju mērķis sasniegts! +${pts} punkti`;
    case 'Cietums':    return `Pareizā atslēga atrasta! +${pts} punkti`;
    case 'Parks':      return `Visi ziedi savākti! +${pts} punkti`;
    case 'Ezerkrasts': return `Gulbis atrasts! +${pts} punkti`;
    default:           return `Pabeigts! +${pts} punkti`;
  }
}

function buildFailText(location) {
  switch (location) {
    case 'RTU':        return 'Tornis sabruka! Mēģini vēlreiz.';
    case 'Osta':       return 'Diemžēl neizdevās. Mēģini velreiz.';
    case 'Mols':       return 'Aukla pārtrūka! Mēģini velreiz.';
    case 'Dzintars':   return 'Laiks beidzās! Mēģini vēlreiz.';
    case 'Teatris':    return 'Pārāk daudz garām! Mēģini vēlreiz.';
    case 'Kanals':     return 'Kuģis uzskrēja uz tilta! Mēģini vēlreiz.';
    case 'LSEZ':       return 'Laiks beidzās! Mēģini vēlreiz.';
    case 'Cietums':    return 'Nepareizā atslēga! Mēģini vēlreiz.';
    case 'Parks':      return 'Pārāk daudz puķu novīst! Mēģini vēlreiz.';
    case 'Ezerkrasts': return 'Laiks beidzās! Mēģini vēlreiz.';
    default:           return 'Neizdevās. Mēģini velreiz.';
  }
}
