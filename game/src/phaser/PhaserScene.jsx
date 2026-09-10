import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

import EnvironmentManager from './EnvironmentManager.js';

// Mini-games are split into route-level chunks so the map/menu do not load all
// Phaser scenes and their assets before the player starts an activity.
const SCENE_LOADERS = {
  catcher:    { key: 'CatcherScene',    load: () => import('./scenes/CatcherScene.js') },
  flashlight: { key: 'FlashlightScene', load: () => import('./scenes/FlashlightScene.js') },
  sequence:   { key: 'SequenceScene',   load: () => import('./scenes/SequenceScene.js') },
  keypad:     { key: 'KeypadScene',     load: () => import('./scenes/KeypadScene.js') },
  tower:      { key: 'TowerScene',      load: () => import('./scenes/TowerScene.js') },
  regatta:    { key: 'RegattaScene',    load: () => import('./scenes/RegattaScene.js') },
};
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

    const entry = SCENE_LOADERS[miniGame.type];
    if (!entry) return;

    let cancelled = false;
    let ro;
    let resizeTimer = null;

    entry.load().then(({ default: SceneClass }) => {
      if (cancelled || !containerRef.current) return;
      const { key } = entry;
      const sceneData = { ...miniGame, locationId };
      const { width, height } = getCanvasSize(containerRef.current.offsetWidth);
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width,
        height,
        backgroundColor: '#0a0a1a',
        roundPixels: true,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width, height },
        physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } },
        scene: [{ key, scene: SceneClass, active: true, data: sceneData }],
      });
      game.events.once('step', () => {
        const activeScene = game.scene.getScene(key);
        if (activeScene) activeScene._env = new EnvironmentManager(activeScene, { score });
      });
      gameRef.current = game;

      ro = new ResizeObserver(entries => {
        const e = entries[0];
        if (!e || !gameRef.current) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (!gameRef.current) return;
          const newW = Math.min(e.contentRect.width, MAX_W);
          gameRef.current.scale.resize(newW, Math.round((newW / ASPECT_W) * ASPECT_H));
        }, 120);
      });
      ro.observe(containerRef.current);
    }).catch(() => {
      if (!cancelled && containerRef.current) {
        containerRef.current.textContent = 'Mini-spēli neizdevās ielādēt. Atgriezies kartē un mēģini vēlreiz.';
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      ro?.disconnect();
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [miniGame, locationId, score]);

  return (
      <div
        ref={containerRef}
        role="img"
        aria-label={`Interaktīva mini-spēle: ${miniGame.label || miniGame.type}`}
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