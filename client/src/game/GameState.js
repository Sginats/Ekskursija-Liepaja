import { TOTAL_TASKS } from './taskSequence.js';

const SESSION_KEY = '_gs';
const START_KEY = '_gameStart';
export const MAX_LIVES = 3;

function checksum(score, tasks) {
  return ((score * 7 + tasks * 13 + 42) ^ 0xa5a5) >>> 0;
}

class GameStateManager {
  constructor() {
    this._score = 0;
    this._completedTasks = 0;
    this._checksum = checksum(0, 0);
    this._lives = MAX_LIVES;
    this._combo = 0;
  }

  _verify() {
    return this._checksum === checksum(this._score, this._completedTasks);
  }

  _fix() {
    this._score = 0;
    this._completedTasks = 0;
    this._checksum = checksum(0, 0);
    this._lives = MAX_LIVES;
    this._combo = 0;
  }

  getScore() {
    if (!this._verify()) this._fix();
    return this._score;
  }

  addScore(points) {
    if (!this._verify()) this._fix();
    this._score = Math.max(0, Math.min(100, this._score + points));
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

  loseLife() {
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

  reset() {
    this._score = 0;
    this._completedTasks = 0;
    this._checksum = checksum(0, 0);
    this._lives = MAX_LIVES;
    this._combo = 0;
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(START_KEY);
    } catch (_) {}
  }

  restore(score, tasks, lives, combo) {
    this._score = Math.max(0, Math.min(100, score));
    this._completedTasks = Math.max(0, Math.min(TOTAL_TASKS, tasks));
    this._checksum = checksum(this._score, this._completedTasks);
    this._lives = typeof lives === 'number' ? Math.max(0, Math.min(MAX_LIVES, lives)) : MAX_LIVES;
    this._combo = typeof combo === 'number' ? Math.max(0, combo) : 0;
  }

  _persist() {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ s: this._score, c: this._completedTasks, l: this._lives, co: this._combo })
      );
    } catch (_) {}
  }

  loadFromSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const { s, c, l, co } = JSON.parse(raw);
      if (typeof s === 'number' && typeof c === 'number') {
        this.restore(s, c, l, co);
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
