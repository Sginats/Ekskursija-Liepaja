import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import CatcherScene from './scenes/CatcherScene.js';
import FlashlightScene from './scenes/FlashlightScene.js';
import SequenceScene from './scenes/SequenceScene.js';

const SCENE_MAP = {
  catcher: CatcherScene,
  flashlight: FlashlightScene,
  sequence: SequenceScene,
};

export default function PhaserScene({ miniGame, locationId }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const SceneClass = SCENE_MAP[miniGame.type];
    if (!SceneClass) return;

    const sceneData = { ...miniGame, locationId };

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: Math.min(480, containerRef.current.offsetWidth || 480),
      height: 360,
      backgroundColor: '#0a0a1a',
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 300 }, debug: false },
      },
      scene: [SceneClass],
    });

    game.events.once('ready', () => {
      const scenes = game.scene.getScenes(false);
      const key = scenes[0]?.sys.settings.key;
      if (key) game.scene.start(key, sceneData);
    });

    gameRef.current = game;

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [miniGame, locationId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    />
  );
}
