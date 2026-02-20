/**
 * GhostRun
 *
 * Tracks and replays the player's personal best run as a "ghost" on the map.
 *
 * A run is saved when the player finishes the game if their elapsed time
 * beats the stored best.  On the map screen the ghost replays in real-time
 * showing which locations the record holder was visiting at each moment.
 *
 * Storage key: 'eksk_ghost_run_v1'
 * Shape: {
 *   totalMs:   number,
 *   score:     number,
 *   createdAt: number,
 *   waypoints: Array<{ locationId: string, startMs: number, endMs: number }>
 * }
 *
 * Usage:
 *   import GhostRun from './GhostRun.js';
 *
 *   // Record a waypoint when entering a location
 *   GhostRun.mark(locationId, elapsedMs);
 *
 *   // Finish and save if it beats the record
 *   GhostRun.finish(totalMs, score);
 *
 *   // During map display — query what locationId the ghost is at
 *   const ghostLocId = GhostRun.getGhostLocation(elapsedMs);
 *
 *   // Load/clear
 *   const run = GhostRun.load();
 *   GhostRun.clear();
 */

import { formatTime } from './JournalGenerator.js';

const STORAGE_KEY = 'eksk_ghost_run_v1';

// In-memory waypoints for the current run
let _currentWaypoints = [];
let _currentLocationId = null;
let _enterMs = 0;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function save(run) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
  } catch {}
}

const GhostRun = {
  /**
   * Mark the moment the player enters a location (call on location:join).
   * @param {string} locationId
   * @param {number} elapsedMs  – milliseconds since game start
   */
  mark(locationId, elapsedMs) {
    // Close previous waypoint
    if (_currentLocationId) {
      _currentWaypoints.push({
        locationId: _currentLocationId,
        startMs:    _enterMs,
        endMs:      elapsedMs,
      });
    }
    _currentLocationId = locationId;
    _enterMs = elapsedMs;
  },

  /**
   * Finish a run.  Saves as best ghost if it beats the stored time (or if none exists).
   * @param {number} totalMs
   * @param {number} score
   */
  finish(totalMs, score) {
    // Close last waypoint
    if (_currentLocationId) {
      _currentWaypoints.push({
        locationId: _currentLocationId,
        startMs:    _enterMs,
        endMs:      totalMs,
      });
      _currentLocationId = null;
    }

    const existing = load();
    if (!existing || totalMs < existing.totalMs) {
      save({
        totalMs,
        score,
        createdAt: Date.now(),
        waypoints: _currentWaypoints,
      });
    }

    // Reset for next run
    _currentWaypoints = [];
  },

  /**
   * Reset the current in-progress run (call on game start).
   */
  startRun() {
    _currentWaypoints  = [];
    _currentLocationId = null;
    _enterMs           = 0;
  },

  /**
   * Return the locationId the ghost record holder was at for the given elapsed time.
   * Returns null if no ghost or ghost has finished.
   * @param {number} elapsedMs
   * @returns {string|null}
   */
  getGhostLocation(elapsedMs) {
    const run = load();
    if (!run || !run.waypoints.length) return null;
    for (const wp of run.waypoints) {
      if (elapsedMs >= wp.startMs && elapsedMs < wp.endMs) return wp.locationId;
    }
    return null;
  },

  /**
   * Get the stored best run, or null.
   * @returns {{ totalMs: number, score: number, createdAt: number, waypoints: Array } | null}
   */
  load,

  /**
   * Clear the stored ghost run.
   */
  clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  },

  /**
   * Format the best ghost time as MM:SS for display.
   * @returns {string|null}
   */
  getBestTimeLabel() {
    const run = load();
    if (!run) return null;
    return formatTime(run.totalMs / 1000);
  },
};

export default GhostRun;
