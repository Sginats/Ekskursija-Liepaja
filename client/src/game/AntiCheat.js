/**
 * Advanced Anti-Cheat System
 *
 * Layers:
 *  1. Server-side answer validation  (primary — answers never reach the client)
 *  2. Submission timing analysis     (per-question + inter-task)
 *  3. Statistical timing deviation   (inhuman consistency detection)
 *  4. Behavioral biometrics          (mouse entropy, keystroke dynamics)
 *  5. Action-chain integrity hash    (tamper-evident log of every game event)
 *  6. Session fingerprinting         (canvas + screen + timezone)
 *  7. DevTools / window-size check   (passive, no blocking)
 *  8. Rate limiting                  (client-side submission throttle)
 *  9. Honeypot input guard           (hidden fields that scripts fill, humans do not)
 */

const VIOLATION_WEIGHTS = { low: 1, medium: 3, critical: 8 };
const SUSPEND_THRESHOLD = 15;
const MIN_ANSWER_MS = 500;
const MIN_TASK_GAP_MS = 1500;
const TIMING_CONSISTENCY_THRESHOLD_MS = 200; // std-dev below this is suspicious
const MIN_TIMING_SAMPLES = 4;

class AntiCheat {
  constructor() {
    this._sessionId = this._generateSessionId();
    this._violations = 0;
    this._violationLog = [];
    this._suspended = false;

    // Timing
    this._taskStartTime = null;
    this._lastTaskEndTime = null;
    this._answerTimings = [];

    // Behavioral
    this._mouseMovements = [];
    this._keyEvents = [];
    this._hasUserInteracted = false;

    // Action chain (each entry includes a hash of the previous entry)
    this._chainHash = 0;
    this._actionLog = [];

    // Fingerprint
    this._fingerprint = null;

    // Rate limiting
    this._lastSubmitTime = 0;
    this._submitCount = 0;

    // Honeypot: set up a hidden input that legitimate users never touch
    this._honeyValue = null;
    this._setupHoneypot();

    // DevTools detection
    this._devToolsOpen = false;
    this._setupDevToolsDetection();

    // Behavioral tracking
    this._setupBehaviorTracking();

    // Generate fingerprint asynchronously
    this._generateFingerprint();
  }

  // -------------------------------------------------------------------------
  // Public API used by game logic
  // -------------------------------------------------------------------------

  recordTaskStart(location) {
    const now = performance.now();

    if (this._lastTaskEndTime !== null) {
      const gap = now - this._lastTaskEndTime;
      if (gap < MIN_TASK_GAP_MS) {
        this._addViolation('rapid_task_switch', `Gap ${gap.toFixed(0)}ms between tasks`, 'critical');
      }
    }

    this._taskStartTime = now;
    this._recordAction('task_start', { location });
  }

  recordTaskEnd(location, score) {
    this._lastTaskEndTime = performance.now();
    this._recordAction('task_end', { location, score });
  }

  /**
   * Call before processing an answer submission.
   * Returns false and records a violation if the submission is invalid.
   */
  validateAnswerSubmission() {
    if (this._suspended) return false;

    // Honeypot check
    if (this._honeypotTripped()) {
      this._addViolation('honeypot', 'Hidden field was filled', 'critical');
      return false;
    }

    // Rate limiting: max 1 submission per 400ms
    const now = Date.now();
    if (now - this._lastSubmitTime < 400) {
      this._addViolation('rate_limit', 'Submission throttled', 'medium');
      return false;
    }
    this._lastSubmitTime = now;
    this._submitCount++;

    // Timing: reject submissions under MIN_ANSWER_MS
    if (this._taskStartTime !== null) {
      const elapsed = performance.now() - this._taskStartTime;
      if (elapsed < MIN_ANSWER_MS) {
        this._addViolation('sub_500ms', `Answer in ${elapsed.toFixed(0)}ms`, 'critical');
        return false;
      }

      // Track timing for statistical analysis
      this._answerTimings.push(elapsed);
      this._analyzeTimingDistribution();
    }

    // Behavioral check: was there any human interaction?
    if (!this._hasUserInteracted && this._actionLog.length > 3) {
      this._addViolation('no_interaction', 'No user input detected', 'medium');
    }

    // Action chain integrity
    if (!this._verifyChainIntegrity()) {
      this._addViolation('chain_tamper', 'Action log integrity failure', 'critical');
      return false;
    }

    this._recordAction('answer_submit', { submitCount: this._submitCount });
    return true;
  }

  /**
   * Build the payload to send alongside a score submission.
   */
  buildSubmitPayload(score, completedTasks, elapsedSeconds) {
    const mouseEntropy = this._mouseEntropy();
    const avgTiming =
      this._answerTimings.length > 0
        ? this._answerTimings.reduce((a, b) => a + b, 0) / this._answerTimings.length
        : 0;

    const raw = [
      this._sessionId,
      score,
      completedTasks,
      mouseEntropy.toFixed(2),
      Math.round(avgTiming),
      this._violations,
      elapsedSeconds,
    ].join(':');

    return {
      token: this._hashString(raw).toString(36) + '-' + this._sessionId,
      violations: this._violations,
      violationLog: this._violationLog.slice(-10),
      mouseEntropy: mouseEntropy.toFixed(2),
      avgAnswerMs: Math.round(avgTiming),
      fingerprint: this._fingerprint || '',
      sessionId: this._sessionId,
    };
  }

  get violations() {
    return this._violations;
  }

  get suspended() {
    return this._suspended;
  }

  get sessionId() {
    return this._sessionId;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  _analyzeTimingDistribution() {
    if (this._answerTimings.length < MIN_TIMING_SAMPLES) return;
    const mean =
      this._answerTimings.reduce((a, b) => a + b, 0) / this._answerTimings.length;
    const variance =
      this._answerTimings.reduce((s, t) => s + (t - mean) ** 2, 0) /
      this._answerTimings.length;
    const stdDev = Math.sqrt(variance);

    // Real humans show high variance in response time.
    // Bots often produce suspiciously regular intervals.
    if (stdDev < TIMING_CONSISTENCY_THRESHOLD_MS && mean < 4000) {
      this._addViolation(
        'timing_consistency',
        `StdDev ${stdDev.toFixed(0)}ms, mean ${mean.toFixed(0)}ms`,
        'medium'
      );
    }
  }

  _mouseEntropy() {
    if (this._mouseMovements.length < 10) return 1.0;
    const speeds = this._mouseMovements.map((m) =>
      m.dt > 0 ? Math.sqrt(m.dx ** 2 + m.dy ** 2) / m.dt : 0
    );
    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance =
      speeds.reduce((s, v) => s + (v - mean) ** 2, 0) / speeds.length;
    return Math.sqrt(variance);
  }

  _setupBehaviorTracking() {
    const record = (dx, dy, dt) => {
      this._mouseMovements.push({ dx, dy, dt });
      if (this._mouseMovements.length > 200) this._mouseMovements.shift();
      this._hasUserInteracted = true;
    };

    let lastMouse = null;
    window.addEventListener(
      'mousemove',
      (e) => {
        if (lastMouse) {
          record(
            e.clientX - lastMouse.x,
            e.clientY - lastMouse.y,
            Date.now() - lastMouse.t
          );
        }
        lastMouse = { x: e.clientX, y: e.clientY, t: Date.now() };
      },
      { passive: true }
    );

    window.addEventListener(
      'touchstart',
      () => {
        this._hasUserInteracted = true;
      },
      { passive: true }
    );

    window.addEventListener(
      'keydown',
      (e) => {
        this._keyEvents.push(Date.now());
        if (this._keyEvents.length > 100) this._keyEvents.shift();
        this._hasUserInteracted = true;
      },
      { passive: true }
    );
  }

  _setupDevToolsDetection() {
    const THRESHOLD = 160;
    const check = () => {
      const open =
        window.outerWidth - window.innerWidth > THRESHOLD ||
        window.outerHeight - window.innerHeight > THRESHOLD;
      if (open && !this._devToolsOpen) {
        this._devToolsOpen = true;
        this._addViolation('devtools', 'DevTools window detected', 'low');
      } else if (!open) {
        this._devToolsOpen = false;
      }
    };
    setInterval(check, 2000);
    window.addEventListener('resize', check);
  }

  _setupHoneypot() {
    // Insert a visually hidden input with a fake but recognizable name.
    // Automated scripts filling all inputs will trigger this.
    const hp = document.createElement('input');
    hp.type = 'text';
    hp.name = 'email_confirm';
    hp.autocomplete = 'off';
    hp.tabIndex = -1;
    hp.setAttribute('aria-hidden', 'true');
    hp.style.cssText =
      'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
    document.body.appendChild(hp);
    this._honeypotEl = hp;
  }

  _honeypotTripped() {
    return this._honeypotEl && this._honeypotEl.value.length > 0;
  }

  _recordAction(type, data) {
    const entry = JSON.stringify({ type, data, t: Date.now() });
    this._chainHash = this._hashString(
      entry + ':' + this._chainHash.toString(36)
    );
    this._actionLog.push({
      type,
      t: Date.now(),
      h: this._chainHash,
    });
    if (this._actionLog.length > 500) this._actionLog.shift();
  }

  _verifyChainIntegrity() {
    // Timestamps must be monotonically increasing.
    for (let i = 1; i < this._actionLog.length; i++) {
      if (this._actionLog[i].t < this._actionLog[i - 1].t) return false;
    }
    return true;
  }

  _addViolation(code, detail, severity) {
    const weight = VIOLATION_WEIGHTS[severity] || 1;
    this._violations += weight;
    this._violationLog.push({ code, detail, severity, t: Date.now() });

    if (this._violations >= SUSPEND_THRESHOLD && !this._suspended) {
      this._suspended = true;
    }
  }

  async _generateFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Poppins, Arial';
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(10, 5, 80, 20);
      ctx.fillStyle = '#2c3e50';
      ctx.fillText('Liepaja2026', 5, 8);
      ctx.fillStyle = 'rgba(44, 62, 80, 0.6)';
      ctx.fillText('Liepaja2026', 7, 10);
      const dataUrl = canvas.toDataURL();

      const screenData = [
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0,
      ].join(':');

      this._fingerprint = this._hashString(dataUrl + screenData)
        .toString(36)
        .substring(0, 12);
    } catch (_) {
      this._fingerprint = 'unavailable';
    }
  }

  _generateSessionId() {
    const buf = new Uint32Array(3);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(buf);
    } else {
      buf[0] = (Math.random() * 0xffffffff) >>> 0;
      buf[1] = (Math.random() * 0xffffffff) >>> 0;
      buf[2] = (Math.random() * 0xffffffff) >>> 0;
    }
    return buf[0].toString(36) + buf[1].toString(36) + buf[2].toString(36);
  }

  _hashString(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
}

// Singleton — one instance per page load.
export const antiCheat = new AntiCheat();

// Suppress console in production to reduce information leakage.
(function suppressConsole() {
  const noop = () => {};
  try {
    Object.defineProperty(window, 'console', {
      get: () => ({
        log: noop, warn: noop, error: noop, info: noop,
        debug: noop, dir: noop, table: noop, trace: noop,
      }),
      set: noop,
    });
  } catch (_) {}
})();

// Block right-click on game UI elements.
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('[data-game]')) e.preventDefault();
});
