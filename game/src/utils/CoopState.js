/**
 * CoopState
 *
 * Module-level observable store for cooperative game state.
 * Used by CoopManager (React) and Phaser scenes (non-React).
 *
 * All mutations go through the `set()` helper so subscribers are notified.
 */

/**
 * @typedef {Object} OtherPlayer
 * @property {string}      socketId
 * @property {string}      name
 * @property {string|null} currentLocation
 */

/**
 * @typedef {Object} LootEntry
 * @property {string} itemId
 * @property {string} foundBy
 * @property {string} foundAt
 */

/**
 * @typedef {Object} CoopSession
 * @property {string}   sessionId
 * @property {string}   locationId
 * @property {'questioner'|'clue_holder'} role
 * @property {string}   partnerName
 * @property {string[]} [clues]
 */

/**
 * @typedef {Object} FlashQuizData
 * @property {string}   quizId
 * @property {string}   question
 * @property {string[]} options
 * @property {number}   timeLimit
 */

/**
 * @typedef {Object} FinalePlayer
 * @property {string} socketId
 * @property {string} name
 * @property {number} score
 * @property {number} timeSeconds
 * @property {number} completedAt
 */

const _state = {
  /** @type {OtherPlayer[]} */
  otherPlayers:    [],
  /** @type {Set<string>} */
  occupiedLocations: new Set(),
  /** @type {LootEntry[]} */
  sharedLoot:      [],
  /** @type {CoopSession|null} */
  coopSession:     null,
  /** @type {FlashQuizData|null} */
  flashQuiz:       null,
  /** @type {FinalePlayer[]} */
  finaleLobby:     [],
  /** @type {{ completed: number, total: number, pct: number }} */
  cityProgress:    { completed: 0, total: 0, pct: 0 },
  /** @type {string|null} - pending coop request */
  pendingRequest:  null,
  /** @type {{ requesterId: string, requesterName: string, locationId: string }|null} */
  inboundRequest:  null,
  coopMultiplier:  1.0,
};

const _listeners = new Set();

function _notify() {
  _listeners.forEach(fn => fn({ ..._state }));
}

const CoopState = {
  /** Get a snapshot of the current state */
  get() {
    return { ..._state };
  },

  /** Update one or more top-level keys and notify subscribers */
  set(patch) {
    Object.assign(_state, patch);
    _notify();
  },

  /**
   * Subscribe to state changes.
   * @param {(state: object) => void} fn
   * @returns {() => void} unsubscribe
   */
  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

export default CoopState;
