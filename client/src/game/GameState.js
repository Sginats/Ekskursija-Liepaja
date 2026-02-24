import { TOTAL_TASKS } from './taskSequence.js';

const SESSION_KEY  = '_gs';
const START_KEY    = '_gameStart';
const TYPES_KEY    = '_gtypes';
export const MAX_LIVES = 3;
// null = no lives system (Normal); number = lives count (Hard)
export const LIVES_BY_DIFFICULTY = { normal: null, hard: 3 };

function checksum(score, tasks) {
  return ((score * 7 + tasks * 13 + 42) ^ 0xa5a5) >>> 0;
}

class GameStateManager {
  constructor() {
    this._score = 0;
    this._completedTasks = 0;
    this._checksum = checksum(0, 0);
    this._lives = null;     // null = Normal mode (no lives); overwritten by reset(difficulty)
    this._maxLives = null;
    this._combo = 0;
  }

  _verify() {
    return this._checksum === checksum(this._score, this._completedTasks);
  }

  _fix() {
    this._score = 0;
    this._completedTasks = 0;
    this._checksum = checksum(0, 0);
    this._lives = this._maxLives; // null for Normal, max count for Hard
    this._combo = 0;
  }

  getScore() {
    if (!this._verify()) this._fix();
    return this._score;
  }

  addScore(points) {
    if (!this._verify()) this._fix();
    this._score = Math.max(0, Math.min(110, this._score + points));
    this._checksum = checksum(this._score, this._completedTasks);
    this._persist();
    return this._score;
  }

  getCompleted() {
    if (!this._verify()) this._fix();
    return this._completedTasks;
  }

  completeTask() {
    if (!this._verify()) this._fix();
    this._completedTasks = Math.min(TOTAL_TASKS, this._completedTasks + 1);
    this._checksum = checksum(this._score, this._completedTasks);
    this._persist();
    return this._completedTasks;
  }

  getLives() {
    return this._lives;
  }

  getMaxLives() {
    return this._maxLives;
  }

  loseLife() {
    if (this._maxLives === null) return null; // Normal mode — no lives system
    if (!this._verify()) this._fix();
    if (this._lives > 0) this._lives--;
    this._persist();
    return this._lives;
  }

  getCombo() {
    return this._combo;
  }

  incrementCombo() {
    this._combo += 1;
    this._persist();
    return this._combo;
  }

  resetCombo() {
    this._combo = 0;
    this._persist();
  }

  reset(difficulty = 'normal') {
    this._score = 0;
    this._completedTasks = 0;
    this._checksum = checksum(0, 0);
    const lives = LIVES_BY_DIFFICULTY[difficulty] ?? null;
    this._lives = lives;
    this._maxLives = lives;
    this._combo = 0;
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(START_KEY);
      sessionStorage.removeItem(TYPES_KEY);
    } catch (_) {}
  }

  saveTaskTypes(types) {
    try { sessionStorage.setItem(TYPES_KEY, JSON.stringify(types)); } catch (_) {}
  }

  loadTaskTypes() {
    try {
      const raw = sessionStorage.getItem(TYPES_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  restore(score, tasks, lives, combo, maxLives) {
    this._score = Math.max(0, Math.min(110, score));
    this._completedTasks = Math.max(0, Math.min(TOTAL_TASKS, tasks));
    this._checksum = checksum(this._score, this._completedTasks);
    // maxLives is null (Normal) or a number (Hard)
    this._maxLives = (maxLives === null || maxLives === undefined) ? null
      : Math.max(1, Math.min(MAX_LIVES, Number(maxLives)));
    this._lives = this._maxLives === null ? null
      : (typeof lives === 'number' ? Math.max(0, Math.min(this._maxLives, lives)) : this._maxLives);
    this._combo = typeof combo === 'number' ? Math.max(0, combo) : 0;
  }

  _persist() {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ s: this._score, c: this._completedTasks, l: this._lives, co: this._combo, ml: this._maxLives })
      );
    } catch (_) {}
  }

  loadFromSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const { s, c, l, co } = parsed;
      // ml may be absent in older sessions — default to null (Normal)
      const ml = Object.prototype.hasOwnProperty.call(parsed, 'ml') ? parsed.ml : null;
      if (typeof s === 'number' && typeof c === 'number') {
        this.restore(s, c, l, co, ml);
        return true;
      }
    } catch (_) {}
    return false;
  }

  getStartTime() {
    try {
      const v = sessionStorage.getItem(START_KEY);
      if (v) return parseInt(v, 10);
    } catch (_) {}
    return null;
  }

  saveStartTime(ts) {
    try {
      sessionStorage.setItem(START_KEY, String(ts));
    } catch (_) {}
  }

  clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(START_KEY);
    } catch (_) {}
  }
}

export const gameState = new GameStateManager();
