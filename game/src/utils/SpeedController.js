/**
 * SpeedController
 *
 * Central pacing/speed registry for the game.
 *
 * Usage:
 *   import SpeedController from './SpeedController.js';
 *
 *   // read
 *   const t = SpeedController.scale(1000); // → 1000ms at current speed
 *
 *   // adjust (admin override, debug)
 *   SpeedController.set(0.75);  // 25 % slower
 *   SpeedController.reset();    // back to 1.0
 */

const DEFAULT_SPEED = 0.75;
const MIN_SPEED     = 0.25;
const MAX_SPEED     = 3.0;

let _speed     = DEFAULT_SPEED;
const _listeners = [];

const SpeedController = {
  /** Current speed multiplier (1.0 = normal) */
  get value() { return _speed; },

  /**
   * Scale a millisecond duration by the current speed.
   * Faster speed → shorter duration; slower → longer.
   * @param {number} ms Base duration
   * @returns {number}
   */
  scale(ms) {
    return Math.round(ms / _speed);
  },

  /**
   * Set a new speed multiplier.
   * @param {number} v
   */
  set(v) {
    const clamped = Math.max(MIN_SPEED, Math.min(MAX_SPEED, Number(v) || DEFAULT_SPEED));
    if (clamped === _speed) return;
    _speed = clamped;
    _listeners.forEach(fn => fn(_speed));
  },

  reset() {
    this.set(DEFAULT_SPEED);
  },

  /**
   * Subscribe to speed changes.
   * @param {(speed: number) => void} fn
   * @returns {() => void} unsubscribe
   */
  onChange(fn) {
    _listeners.push(fn);
    return () => {
      const idx = _listeners.indexOf(fn);
      if (idx !== -1) _listeners.splice(idx, 1);
    };
  },
};

export default SpeedController;
