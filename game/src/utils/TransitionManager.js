/**
 * TransitionManager
 *
 * Smooth, queued CSS-class-based transitions between game phases.
 *
 * Usage (React):
 *   const { state, next } = useTransition('idle');
 *   // state is one of 'idle' | 'leaving' | 'entering' | 'visible'
 *   // call next() to advance through the cycle
 *
 * Standalone:
 *   TransitionManager.fadeOut(element).then(() => TransitionManager.fadeIn(element));
 */

import SpeedController from './SpeedController.js';

// ── Shared timing constants (all scaled through SpeedController) ──────────────
export const TRANSITION_DURATIONS = {
  fade:   300,
  slide:  250,
  scale:  220,
  pause:  400,  // breathing room after a transition completes
};

// ── Low-level promise-based helpers ──────────────────────────────────────────

/**
 * Wait for `ms` milliseconds (respects SpeedController).
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, SpeedController.scale(ms)));
}

/**
 * Add a CSS class, wait for the animation, then remove it.
 * @param {HTMLElement} el
 * @param {string}      cls
 * @param {number}      [durationMs]
 * @returns {Promise<void>}
 */
export function animateClass(el, cls, durationMs = TRANSITION_DURATIONS.fade) {
  if (!el) return Promise.resolve();
  el.classList.add(cls);
  return wait(durationMs).then(() => el.classList.remove(cls));
}

/**
 * Fade an element out by applying `.tm-fade-out`, then set display:none.
 * @param {HTMLElement} el
 * @returns {Promise<void>}
 */
export function fadeOut(el) {
  if (!el) return Promise.resolve();
  return animateClass(el, 'tm-fade-out', TRANSITION_DURATIONS.fade).then(() => {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  });
}

/**
 * Fade an element in by removing display:none and applying `.tm-fade-in`.
 * @param {HTMLElement} el
 * @returns {Promise<void>}
 */
export function fadeIn(el) {
  if (!el) return Promise.resolve();
  el.style.opacity = '';
  el.style.pointerEvents = '';
  return animateClass(el, 'tm-fade-in', TRANSITION_DURATIONS.fade);
}

// ── React hook ────────────────────────────────────────────────────────────────
import { useState, useCallback, useRef } from 'react';

/**
 * @typedef {'idle'|'leaving'|'entering'|'visible'} TransitionState
 */

/**
 * React hook that drives a leaving → entering → visible state machine,
 * useful for page/phase transitions.
 *
 * @param {TransitionState} initial
 * @returns {{ state: TransitionState, transitionTo: (fn: () => void) => void }}
 */
export function useTransition(initial = 'visible') {
  const [state, setState] = useState(initial);
  const locked = useRef(false);

  /**
   * Trigger a transition:  visible → leaving → (callback) → entering → visible
   * @param {() => void} swapFn  Run between leaving and entering (e.g. change route)
   */
  const transitionTo = useCallback((swapFn) => {
    if (locked.current) return;
    locked.current = true;

    setState('leaving');
    const leaveDur = SpeedController.scale(TRANSITION_DURATIONS.fade + TRANSITION_DURATIONS.pause);

    setTimeout(() => {
      swapFn?.();
      setState('entering');
      const enterDur = SpeedController.scale(TRANSITION_DURATIONS.fade);
      setTimeout(() => {
        setState('visible');
        locked.current = false;
      }, enterDur);
    }, leaveDur);
  }, []);

  return { state, transitionTo };
}

const TransitionManager = { wait, animateClass, fadeOut, fadeIn, useTransition, TRANSITION_DURATIONS };
export default TransitionManager;
