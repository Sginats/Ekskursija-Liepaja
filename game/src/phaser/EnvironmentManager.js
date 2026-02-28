import Phaser from 'phaser';

/**
 * EnvironmentManager
 *
 * Adds a semi-transparent wind/sea-haze particle overlay to any Phaser scene,
 * imitating the characteristic windy atmosphere of Liepāja.
 *
 * Particle speed and density decrease dynamically as the player's score
 * increases — the weather "clears up" as the player progresses.
 *
 * Usage (inside a Phaser.Scene subclass):
 *
 *   import EnvironmentManager from '../EnvironmentManager.js';
 *
 *   create() {
 *     this._env = new EnvironmentManager(this, { score: 0 });
 *   }
 *   update() {
 *     this._env.update(this._score);
 *   }
 */
export default class EnvironmentManager {
  /**
   * @param {Phaser.Scene} scene – owning scene
   * @param {{ score?: number }} opts
   */
  constructor(scene, { score = 0 } = {}) {
    this._scene   = scene;
    this._emitter = null;
    this._init(score);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Map a 0–100 score value to emitter parameters.
   * At score 0  → stormy: dense, fast, opaque particles.
   * At score 100 → clear: sparse, slow, barely visible particles.
   */
  _calcParams(score) {
    const t = Math.min(Math.max(score, 0), 100) / 100; // 0 → 1
    return {
      frequency: Math.round(50  + t * 200),      // 50 ms (dense) → 250 ms (sparse)
      speedX:    { min: Math.round(35 * (1 - t * 0.7)), max: Math.round(70 * (1 - t * 0.6)) },
      alpha:     Math.max(0.06, 0.35 * (1 - t * 0.82)), // 0.35 → ~0.06
    };
  }

  _init(score) {
    const scene         = this._scene;
    const { width, height } = scene.scale;
    this._lastBucket    = Math.floor(score / 5);

    // ── Generate a tiny soft-circle texture procedurally ─────────────────────
    const TEXTURE_KEY = '__env_wind_particle';
    if (!scene.textures.exists(TEXTURE_KEY)) {
      const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
      gfx.fillStyle(0xaad4f5, 1);
      gfx.fillCircle(5, 5, 5);
      gfx.generateTexture(TEXTURE_KEY, 10, 10);
      gfx.destroy();
    }

    const params = this._calcParams(score);

    // ── Create the emitter ────────────────────────────────────────────────────
    // Particles spawn just off the left edge and drift rightward across the scene.
    this._emitter = scene.add.particles(0, 0, TEXTURE_KEY, {
      emitZone: {
        type:   'random',
        source: new Phaser.Geom.Rectangle(-12, 0, 12, height),
      },
      speedX:    params.speedX,
      speedY:    { min: -10, max: 10 },
      lifespan:  { min: 3500, max: 6500 },
      frequency:  params.frequency,
      alpha:     { start: params.alpha, end: 0 },
      scale:     { start: 0.7, end: 0.2 },
      gravityY:  0,
      blendMode: Phaser.BlendModes.ADD,
    });

    this._emitter.setDepth(50);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Call every frame (or periodically) to adjust particle density/speed.
   * Only recalculates when score changes to avoid unnecessary work.
   * @param {number} score – current player score (0–100)
   */
  update(score) {
    if (!this._emitter) return;
    // Only recalculate when the score bucket changes (every 5 points)
    const bucket = Math.floor(score / 5);
    if (bucket === this._lastBucket) return;
    this._lastBucket = bucket;
    const params = this._calcParams(score);
    this._emitter.setFrequency(params.frequency);
    this._emitter.setAlpha({ start: params.alpha, end: 0 });
  }

  /**
   * Cleanly remove the particle emitter.
   */
  destroy() {
    if (this._emitter) {
      this._emitter.destroy();
      this._emitter = null;
    }
  }
}
