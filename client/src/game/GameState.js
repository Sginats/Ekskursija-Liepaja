import { TOTAL_TASKS } from './taskSequence.js';

const SESSION_KEY = '_gs';
const START_KEY = '_gameStart';

function checksum(score, tasks) {
  return ((score * 7 + tasks * 13 + 42) ^ 0xa5a5) >>> 0;
}

class GameStateManager {
  constructor() {
    this._score = 0;
    this._completedTasks = 0;
    this._checksum = checksum(0, 0);
  }

  _verify() {
    return this._checksum === checksum(this._score, this._completedTasks);
  }

  _fix() {
    this._score = 0;
    this._completedTasks = 0;
    this._checksum = checksum(0, 0);
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

  reset() {
    this._score = 0;
    this._completedTasks = 0;
    this._checksum = checksum(0, 0);
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(START_KEY);
    } catch (_) {}
  }

  restore(score, tasks) {
    this._score = Math.max(0, Math.min(100, score));
    this._completedTasks = Math.max(0, Math.min(TOTAL_TASKS, tasks));
    this._checksum = checksum(this._score, this._completedTasks);
  }

  _persist() {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ s: this._score, c: this._completedTasks })
      );
    } catch (_) {}
  }

  loadFromSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const { s, c } = JSON.parse(raw);
      if (typeof s === 'number' && typeof c === 'number') {
        this.restore(s, c);
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
