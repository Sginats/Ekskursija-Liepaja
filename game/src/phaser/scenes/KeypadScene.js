import Phaser from 'phaser';
import EventBridge from '../../utils/EventBridge.js';
import SpeedController from '../../utils/SpeedController.js';

const RAMP_MIN_FACTOR = 0.55;
const RAMP_PER_DIGIT  = 0.1;

/**
 * KeypadScene
 *
 * Mini-game: enter a 4-digit code on a numeric keypad.
 *
 * Solo mode  – the target code is briefly displayed (3 s) then hidden;
 *              player must recall and type it from memory.
 * Co-op mode – the Navigator sees the code in the React UI (via
 *              CoopManager) and communicates it verbally;
 *              the Operator (this scene) just has the keypad.
 *
 * Config keys supplied via scene data (miniGame object):
 *   codeLength  {number}  default 4
 *   showTime    {number}  ms to show code in solo mode, default 3000
 *   timeLimit   {number}  seconds player has to enter the code, default 30
 *   coopRole    {string}  'operator' | 'solo' (default 'solo')
 *   code        {string}  pre-set code (only used in co-op, server-generated)
 */
export default class KeypadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'KeypadScene' });
  }

  init(data) {
    this._cfg        = data;
    this._codeLength = data.codeLength || 4;
    this._timeLimit  = data.timeLimit  || 30;
    this._coopRole   = data.coopRole   || 'solo';
    this._targetCode = data.code       || this._generateCode();
    this._entered    = '';
    this._active     = true;
    this._timeLeft   = this._timeLimit;
    this._codeVisible = false;
    this._coopUnsubs  = [];
    this._autoSubmitTimer = null;
    this._speedRamp       = data.speedRamp || false;
    this._rampFactor      = 1.0;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  _generateCode() {
    let code = '';
    for (let i = 0; i < this._codeLength; i++) {
      code += String(Math.floor(Math.random() * 10));
    }
    return code;
  }

  // ── create ───────────────────────────────────────────────────────────────────
  create() {
    const { width, height } = this.scale;

    // Background
    if (window.MinigameFX) {
      window.MinigameFX.applyTheme(this, 'industry');
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x0d1a2e, 0x0d1a2e, 0x0a0a1a, 0x0a0a1a, 1);
      bg.fillRect(0, 0, width, height);
    }

    // Title
    this.add.text(width / 2, 22, this._coopRole === 'operator'
      ? '⌨️ Ievadi kodu'
      : '🔢 Atceries kodu', {
      fontSize: '18px', fontFamily: 'Poppins, Arial',
      color: '#ffaa00',
    }).setOrigin(0.5, 0).setDepth(10);

    // ── Code display ──────────────────────────────────────────────────────────
    this._digitTexts = [];
    const cellW   = 36;
    const cellGap = 12;
    const totalW  = this._codeLength * cellW + (this._codeLength - 1) * cellGap;
    const startX  = (width - totalW) / 2 + cellW / 2;

    for (let i = 0; i < this._codeLength; i++) {
      const x = startX + i * (cellW + cellGap);

      const cell = this.add.graphics().setDepth(4);
      cell.lineStyle(2, 0x4a90d9, 0.7);
      cell.strokeRoundedRect(x - cellW / 2, 55, cellW, 38, 6);

      const t = this.add.text(x, 74, '_', {
        fontSize: '24px', fontFamily: 'Poppins, Arial',
        color: '#4a90d9', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(5);

      this._digitTexts.push(t);
    }

    // ── Target code reveal (solo mode only) ───────────────────────────────────
    if (this._coopRole === 'solo') {
      this._codeVisible = true;
      for (let i = 0; i < this._codeLength; i++) {
        this._digitTexts[i].setText(this._targetCode[i]).setColor('#ffd700');
      }
      this.time.delayedCall(SpeedController.scale(this._cfg.showTime || 3000), () => {
        this._hideTargetCode();
      });
    }

    // Timer
    this._timerText = this.add.text(width - 12, 12, `${this._timeLimit}s`, {
      fontSize: '16px', fontFamily: 'Poppins, Arial', color: '#ffffff',
    }).setOrigin(1, 0).setDepth(10);

    this._countdownTimer = this.time.addEvent({
      delay: SpeedController.scale(1000), callback: this._tick,
      callbackScope: this, loop: true,
    });

    // ── Keypad buttons ────────────────────────────────────────────────────────
    this._buildKeypad(width, height);

    // ── Co-op EventBridge listeners ───────────────────────────────────────────
    this._titleText = this.children.list.find(c => c.type === 'Text' && c.depth === 10) || null;

    this._coopUnsubs = [
      EventBridge.on('COOP_SESSION_START', ({ role, partnerName }) => {
        if (role === 'operator') {
          // Upgrade this scene to operator mode
          this._coopRole = 'operator';
          // Hide any pre-shown solo code and update title
          if (this._codeVisible) this._hideTargetCode();
          if (this._titleText) this._titleText.setText('⌨️ Ievadi kodu');
          this._showCoopBanner(`🤝 Operators — partneris: ${partnerName}`, '#ffd700');
        } else {
          this._showCoopBanner(`🤝 Ko-op: ${partnerName}`, '#ffd700');
        }
      }),
      EventBridge.on('ASYM_RESULT', ({ success }) => {
        if (this._active) this._finish(success);
      }),
    ];
  }

  _hideTargetCode() {
    this._codeVisible = false;
    for (let i = 0; i < this._codeLength; i++) {
      const entered = this._entered[i];
      this._digitTexts[i]
        .setText(entered || '_')
        .setColor(entered ? '#ffffff' : '#4a90d9');
    }
  }

  _updateDisplay() {
    for (let i = 0; i < this._codeLength; i++) {
      const ch = this._entered[i];
      this._digitTexts[i]
        .setText(ch || '_')
        .setColor(ch ? '#ffffff' : '#4a90d9');
    }
  }

  // ── Button drawing helper ─────────────────────────────────────────────────
  _drawButton(bg, x, btnW, btnH, bgColor, alpha = 0.9) {
    bg.clear();
    bg.fillStyle(bgColor, alpha);
    bg.fillRoundedRect(x.x - btnW / 2, x.y - btnH / 2, btnW, btnH, 8);
    bg.lineStyle(1, 0xffffff, 0.2);
    bg.strokeRoundedRect(x.x - btnW / 2, x.y - btnH / 2, btnW, btnH, 8);
  }

  // ── Keypad layout ─────────────────────────────────────────────────────────
  _buildKeypad(width, height) {
    const btnW   = 56;
    const btnH   = 44;
    const gapX   = 10;
    const gapY   = 10;
    const cols   = 3;
    const labels = ['1','2','3','4','5','6','7','8','9','CLR','0','ENT'];

    const totalW = cols * btnW + (cols - 1) * gapX;
    const rows   = Math.ceil(labels.length / cols);
    const totalH = rows * btnH + (rows - 1) * gapY;

    const startX = (width  - totalW) / 2 + btnW / 2;
    const startY = height - totalH - 24 + btnH / 2;

    labels.forEach((lbl, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const pos = { x: startX + col * (btnW + gapX), y: startY + row * (btnH + gapY) };

      const isAction = lbl === 'CLR' || lbl === 'ENT';
      const bgColor  = lbl === 'ENT'  ? 0x1b5e20
                     : lbl === 'CLR'  ? 0x4a0000
                     : 0x1a3a5c;

      const bg = this.add.graphics().setDepth(4);
      this._drawButton(bg, pos, btnW, btnH, bgColor);

      this.add.text(pos.x, pos.y, lbl, {
        fontSize: isAction ? '13px' : '18px',
        fontFamily: 'Poppins, Arial',
        color: lbl === 'ENT' ? '#66ff66' : lbl === 'CLR' ? '#ff6666' : '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(5);

      const zone = this.add.zone(pos.x, pos.y, btnW, btnH).setInteractive().setDepth(6);
      zone.on('pointerdown', () => this._onKey(lbl));
      zone.on('pointerover', () => this._drawButton(bg, pos, btnW, btnH, bgColor, 1));
      zone.on('pointerout',  () => this._drawButton(bg, pos, btnW, btnH, bgColor, 0.9));
    });
  }

  // ── Key press handler ─────────────────────────────────────────────────────
  _onKey(lbl) {
    if (!this._active) return;

    if (window.MinigameFX) {
      this.cameras.main.flash(40, 74, 144, 217, true);
    }

    if (lbl === 'CLR') {
      this._entered = '';
      if (this._autoSubmitTimer) { this._autoSubmitTimer.remove(); this._autoSubmitTimer = null; }
      this._updateDisplay();
      return;
    }

    if (lbl === 'ENT') {
      if (this._entered.length < this._codeLength) return; // incomplete
      if (this._autoSubmitTimer) { this._autoSubmitTimer.remove(); this._autoSubmitTimer = null; }
      this._submit();
      return;
    }

    // Digit
    if (this._entered.length >= this._codeLength) return;
    const digitIdx = this._entered.length;
    this._entered += lbl;
    this._updateDisplay();

    // Speed ramp: each correct digit press increases countdown speed
    if (this._speedRamp && lbl === this._targetCode[digitIdx]) {
      this._rampFactor = Math.max(RAMP_MIN_FACTOR, this._rampFactor - RAMP_PER_DIGIT);
      this._countdownTimer?.remove();
      this._countdownTimer = this.time.addEvent({
        delay: SpeedController.scale(1000 * this._rampFactor),
        callback: this._tick,
        callbackScope: this,
        loop: true,
      });
    }

    // Auto-submit when full length reached
    if (this._entered.length === this._codeLength) {
      this._autoSubmitTimer = this.time.delayedCall(SpeedController.scale(300), () => {
        this._autoSubmitTimer = null;
        this._submit();
      });
    }
  }

  _submit() {
    if (!this._active) return;
    if (this._coopRole === 'operator') {
      // Delegate validation to server via EventBridge → CoopManager → socket
      EventBridge.emit('ASYM_SUBMIT', {
        code:       this._entered,
        locationId: this._cfg.locationId,
      });
      // Result will arrive as ASYM_RESULT event (handled in create())
    } else {
      // Solo: validate locally
      this._finish(this._entered === this._targetCode);
    }
  }

  // ── Coop banner ───────────────────────────────────────────────────────────
  _showCoopBanner(msg, color = '#ffd700') {
    const { width } = this.scale;
    if (this._coopText) this._coopText.destroy();
    this._coopText = this.add.text(width / 2, 100, msg, {
      fontSize: '13px', fontFamily: 'Poppins, Arial',
      color, backgroundColor: 'rgba(0,0,0,0.65)',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(30);
    this.time.delayedCall(SpeedController.scale(2800), () => {
      if (this._coopText) { this._coopText.destroy(); this._coopText = null; }
    });
  }

  // ── Countdown ─────────────────────────────────────────────────────────────
  _tick() {
    if (!this._active) return;
    this._timeLeft--;
    this._timerText.setText(`${this._timeLeft}s`);
    if (this._timeLeft <= 5) this._timerText.setColor('#ff4444');
    if (this._timeLeft <= 0) this._finish(false);
  }

  // ── Finish ────────────────────────────────────────────────────────────────
  _finish(success) {
    if (!this._active) return;
    this._active = false;
    this._countdownTimer?.remove();
    this._coopUnsubs.forEach(u => u());

    if (success) {
      if (window.MinigameFX) window.MinigameFX.flash(this, 300, 0x4caf50);
    } else {
      if (window.MinigameFX) window.MinigameFX.shake(this, 200, 0.015);
    }

    const { width, height } = this.scale;
    const pts = success ? (this._timeLeft > this._timeLimit * 0.5 ? 10 : 5) : 0;

    const resultMsg = success
      ? (this._coopRole === 'solo' ? `✓ Pareizi! Kods: ${this._targetCode}` : '✓ Kods apstiprināts!')
      : '✗ Nepareizs kods!';

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(30);
    this.add.text(width / 2, height / 2 - 16, resultMsg, {
      fontSize: '24px', fontFamily: 'Poppins, Arial',
      color: success ? '#4caf50' : '#f44336',
    }).setOrigin(0.5).setDepth(31);

    this.time.delayedCall(SpeedController.scale(1600), () => {
      EventBridge.emit('MINIGAME_COMPLETE', { success, bonusPoints: pts });
    });
  }
}
