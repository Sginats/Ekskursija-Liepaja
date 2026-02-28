import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

import CatcherScene from './scenes/CatcherScene.js';
import FlashlightScene from './scenes/FlashlightScene.js';
import SequenceScene from './scenes/SequenceScene.js';
import KeypadScene from './scenes/KeypadScene.js';
import TowerScene from './scenes/TowerScene.js';
import RegattaScene from './scenes/RegattaScene.js';

import EnvironmentManager from './EnvironmentManager.js';

const SCENE_ENTRY_MAP = {
  catcher:    { key: 'CatcherScene',    scene: CatcherScene },
  flashlight: { key: 'FlashlightScene', scene: FlashlightScene },
  sequence:   { key: 'SequenceScene',   scene: SequenceScene },
  keypad:     { key: 'KeypadScene',     scene: KeypadScene },
  tower:      { key: 'TowerScene',      scene: TowerScene },
  regatta:    { key: 'RegattaScene',    scene: RegattaScene },
};
z
const ASPECT_W = 4;
const ASPECT_H = 3;
const MAX_W    = 480;

function getCanvasSize(containerW) {
  const w = Math.min(containerW || MAX_W, MAX_W);
  const h = Math.round((w / ASPECT_W) * ASPECT_H);
  return { width: w, height: h };
}

export default function PhaserScene({ miniGame, locationId, score = 0 }) {
  const containerRef = useRef(null);
  const gameRef      = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!miniGame?.type) return;

    const entry = SCENE_ENTRY_MAP[miniGame.type];
    if (!entry) return;

    const { key, scene: SceneClass } = entry;

    const sceneData = { ...miniGame, locationId };
    const { width, height } = getCanvasSize(containerRef.current.offsetWidth);

    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width,
      height,
      backgroundColor: '#0a0a1a',
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width,
        height,
      },
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 300 }, debug: false },
      },

      scene: [{ key, scene: SceneClass, active: true, data: sceneData }],
    });

    game.events.once('step', () => {
      const activeScene = game.scene.getScene(key);
      if (activeScene) {
        activeScene._env = new EnvironmentManager(activeScene, { score });
      }
    });

    gameRef.current = game;

    let resizeTimer = null;
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      if (!e || !gameRef.current) return;

      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!gameRef.current) return;

        const newW = Math.min(e.contentRect.width, MAX_W);
        const newH = Math.round((newW / ASPECT_W) * ASPECT_H);

        gameRef.current.scale.resize(newW, newH);
      }, 120);
    });

    ro.observe(containerRef.current);

    return () => {
      clearTimeout(resizeTimer);
      ro.disconnect();
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [miniGame, locationId, score]);

  return (
      <div
          ref={containerRef}
          style={{
            width: '100%',
            maxWidth: MAX_W,
            margin: '0 auto',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            aspectRatio: `${ASPECT_W} / ${ASPECT_H}`,
          }}
      />
  );
}