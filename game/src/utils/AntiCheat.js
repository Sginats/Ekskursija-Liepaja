/**
 * AntiCheat — client-side timing guard
 *
 * Records when a location minigame was started and validates the elapsed time
 * when it finishes. Suspicious completions are flagged and reported to the
 * server via SocketManager.
 *
 * The server performs its own independent check; this is a complementary
 * early-warning layer.
 */

import SocketManager from './SocketManager.js';

/** Minimum expected elapsed seconds per location activity */
const MIN_LOCATION_SECS = 20;

/** Per-location start timestamps keyed by locationId */
const _starts = new Map();

const AntiCheat = {
  /**
   * Record the start time for a location activity.
   * Call this when the player enters a location (before minigame).
   * @param {string} locationId
   */
  startLocation(locationId) {
    _starts.set(locationId, Date.now());
  },

  /**
   * Validate elapsed time for a completed location.
   * Returns elapsed seconds and whether it was flagged as suspicious.
   *
   * @param {string} locationId
   * @param {number} score
   * @returns {{ elapsedSecs: number, flagged: boolean }}
   */
  finishLocation(locationId, score) {
    const startTs    = _starts.get(locationId) ?? Date.now();
    const elapsedMs  = Date.now() - startTs;
    const elapsedSecs = Math.round(elapsedMs / 1000);
    const flagged    = elapsedSecs < MIN_LOCATION_SECS;

    _starts.delete(locationId);

    // Report to server (server will do independent check & broadcast to admin)
    SocketManager.reportComplete(locationId, score, elapsedSecs);

    return { elapsedSecs, flagged };
  },

  /**
   * Get elapsed seconds since a location was started (live check).
   * @param {string} locationId
   * @returns {number}
   */
  getElapsed(locationId) {
    const start = _starts.get(locationId);
    if (!start) return 0;
    return Math.round((Date.now() - start) / 1000);
  },
};

export default AntiCheat;
