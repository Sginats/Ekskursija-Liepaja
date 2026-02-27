/**
 * DynamicDifficulty
 *
 * Tracks per-question answer statistics in localStorage and automatically
 * adjusts the bonus points available for questions that are statistically
 * answered incorrectly most often.
 *
 * Storage key: 'eksk_q_stats_v1'
 * Shape: { [questionKey]: { attempts: number, wrong: number } }
 * questionKey = `${locationId}:${questionIdx}`
 *
 * Difficulty tiers (based on wrong-answer rate):
 *   < 30% wrong  → standard   : base = 10
 *   30–59% wrong → hard       : base = 12  (+20%)
 *   ≥ 60% wrong  → very hard  : base = 15  (+50%)
 *
 * Usage:
 *   import DynamicDifficulty from './DynamicDifficulty.js';
 *
 *   // Get base points to offer for this question
 *   const base = DynamicDifficulty.getBasePoints(locationId, questionIdx);
 *
 *   // Record result after the player answers
 *   DynamicDifficulty.record(locationId, questionIdx, correct);
 *
 *   // Get statistics (for admin display)
 *   const stats = DynamicDifficulty.getStats();
 */

const STORAGE_KEY = 'eksk_q_stats_v1';

/** Standard / hard / very-hard base-point tiers */
const TIERS = [
  { minWrongRate: 0.60, basePoints: 15, label: 'Grūts' },
  { minWrongRate: 0.30, basePoints: 12, label: 'Vidēji grūts' },
  { minWrongRate: 0,    basePoints: 10, label: 'Standarts' },
];

/** Minimum sample size before tiers activate */
const MIN_SAMPLES = 3;

// ── Persistence helpers ───────────────────────────────────────────────────────
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ── Public API ────────────────────────────────────────────────────────────────
const DynamicDifficulty = {
  /**
   * Record a player's answer attempt.
   * @param {string}  locationId
   * @param {number}  questionIdx
   * @param {boolean} correct
   */
  record(locationId, questionIdx, correct) {
    const key  = `${locationId}:${questionIdx}`;
    const data = load();
    const stat = data[key] || { attempts: 0, wrong: 0 };
    stat.attempts++;
    if (!correct) stat.wrong++;
    data[key] = stat;
    save(data);
  },

  /**
   * Get the adjusted base points for a question.
   * On the first attempt ever the standard 10 pts are used.
   * @param {string} locationId
   * @param {number} questionIdx
   * @returns {number}
   */
  getBasePoints(locationId, questionIdx) {
    const key  = `${locationId}:${questionIdx}`;
    const data = load();
    const stat = data[key];
    if (!stat || stat.attempts < MIN_SAMPLES) return 10; // not enough data yet
    const wrongRate = stat.wrong / stat.attempts;
    const tier = TIERS.find(t => wrongRate >= t.minWrongRate);
    return tier ? tier.basePoints : 10;
  },

  /**
   * Get the difficulty label for display.
   * @param {string} locationId
   * @param {number} questionIdx
   * @returns {string}
   */
  getLabel(locationId, questionIdx) {
    const key  = `${locationId}:${questionIdx}`;
    const data = load();
    const stat = data[key];
    if (!stat || stat.attempts < MIN_SAMPLES) return '';
    const wrongRate = stat.wrong / stat.attempts;
    const tier = TIERS.find(t => wrongRate >= t.minWrongRate);
    return tier ? tier.label : '';
  },

  /**
   * Return all tracked statistics (for admin/debug).
   * @returns {Record<string, { attempts: number, wrong: number, wrongRate: number, basePoints: number }>}
   */
  getStats() {
    const data = load();
    const result = {};
    for (const [key, stat] of Object.entries(data)) {
      const wrongRate = stat.attempts > 0 ? stat.wrong / stat.attempts : 0;
      const [locationId, questionIdxStr] = key.split(':');
      result[key] = {
        ...stat,
        wrongRate:  Math.round(wrongRate * 100),
        basePoints: this.getBasePoints(locationId, Number(questionIdxStr)),
      };
    }
    return result;
  },

  /**
   * Reset all statistics (for testing).
   */
  reset() {
    save({});
  },
};

export default DynamicDifficulty;
