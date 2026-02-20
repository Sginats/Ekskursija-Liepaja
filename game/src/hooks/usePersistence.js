import { useCallback } from 'react';

/**
 * usePersistence
 *
 * Anti-softlock: persists the in-progress game state to localStorage so that
 * a page refresh returns the player to exactly where they left off.
 *
 * Stored shape:
 * {
 *   playerName:          string,
 *   score:               number,
 *   windEnergy:          number,
 *   completedLocations:  string[],
 *   currentLocationId:   string | null,
 *   startTime:           number,    // Date.now() timestamp
 *   savedAt:             number,    // Date.now() at save time
 * }
 *
 * Usage:
 *   const { saveState, loadState, clearState } = usePersistence();
 *
 *   // Persist whenever relevant state changes:
 *   useEffect(() => { saveState({ playerName, score, ... }); }, [score, ...]);
 *
 *   // Restore on mount:
 *   const saved = loadState();
 *   if (saved) { setScore(saved.score); ... }
 *
 *   // Wipe when player starts a fresh game:
 *   clearState();
 */

const LS_KEY     = 'eksk_game_state_v1';
const TTL_MS     = 4 * 60 * 60 * 1000; // 4 hours

/** Allowed keys in the persisted game state (whitelist for safety) */
const ALLOWED_KEYS = new Set([
  'playerName', 'score', 'windEnergy',
  'completedLocations', 'currentLocationId', 'startTime',
]);

export default function usePersistence() {
  const saveState = useCallback((state) => {
    try {
      // Only persist whitelisted keys to avoid accidentally persisting unexpected data
      const safe = Object.fromEntries(
        Object.entries(state).filter(([k]) => ALLOWED_KEYS.has(k))
      );
      localStorage.setItem(LS_KEY, JSON.stringify({ ...safe, savedAt: Date.now() }));
    } catch { /* storage full or unavailable */ }
  }, []);

  const loadState = useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Reject stale saves (older than TTL)
      if (!data.savedAt || Date.now() - data.savedAt > TTL_MS) {
        localStorage.removeItem(LS_KEY);
        return null;
      }
      // Must have a player name to be a valid in-progress save
      if (!data.playerName) return null;
      return data;
    } catch {
      return null;
    }
  }, []);

  const clearState = useCallback(() => {
    try { localStorage.removeItem(LS_KEY); } catch {}
  }, []);

  return { saveState, loadState, clearState };
}
