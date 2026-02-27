import Phaser from 'phaser';
import EventBridge from '../../utils/EventBridge.js';
import SpeedController from '../../utils/SpeedController.js';
import { getDayNightState, getSkyColors } from '../../utils/DayNight.js';

const BTN_SIZE = 80;
const BTN_GAP = 14;
const RAMP_MIN_FACTOR   = 0.5;
const RAMP_PER_ROUND    = 0.12;

export default class SequenceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SequenceScene' });
  }

  init(data) {
    this._cfg = data;
    this._seq = [];
    this._playerIdx = 0;
    this._round = 0;
    this._active = false;
    this._inputEnabled = false;
    this._speedRamp = data.speedRamp || false;
    this._rampFactor = 1.0;
    this._hasMistake = false; // persistent flag for the whole game
    const dn = getDayNightState();
    this._sky = getSkyColors(dn.isNight, dn.isGoldenHour);
    this._nightMode = dn.isNight;
  }

  create() {
    const { width, height } = this.scale;
    const sky = this._sky;

    const bg = this.add.graphics();
    bg.fillGradientStyle(sky.top, sky.top, sky.bottom, sky.bottom, 1);
    bg.fillRect(0, 0, width, height);

    if (this._nightMode) {
      const ng = this.add.graphics();
      for (let i = 0; i < 18; i++) {
        ng.fillStyle(0xffffff, 0.15 + Math.random() * 0.25);
        ng.fillCircle(Math.random() * width, Math.random() * height * 0.6, Math.random() * 2 + 0.5);
      }
    }

    this._statusText = this.add
      .text(width / 2, 22, 'Vēro secību...', {
        fontSize: '20px',
        fontFamily: 'Poppins, Arial',
        color: '#ffaa00',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this._roundText = this.add
      .text(width / 2, height - 22, `Kārta 0/${this._cfg.rounds}`, {
        fontSize: '15px',
        fontFamily: 'Poppins, Arial',
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 1)
      .setDepth(10);

    this._buttons = this._buildButtons(width, height);

    if (window.MinigameFX) {
      window.MinigameFX.applyTheme(this, 'culture');
    }

    this.time.delayedCall(SpeedController.scale(400), () => this._nextRound());

    // ── Co-op Phaser bridge ────────────────────────────────────────────────
    this._coopText = null;
    this._coopUnsubs = [
      EventBridge.on('COOP_SESSION_START', ({ partnerName }) => {
        this._showCoopBanner(`🤝 Ko-op: ${partnerName}`, '#ffd700');
      }),
      EventBridge.on('COOP_CLUE_RECEIVED', ({ clue }) => {
        this._showCoopBanner(`💡 ${clue}`, '#4caf50');
      }),
      EventBridge.on('COOP_MULTIPLIER', ({ multiplier }) => {
        this._showCoopBanner(`✨ Ko-op ×${multiplier}!`, '#ffaa00');
      }),
    ];
  }

  _showCoopBanner(msg, color = '#ffd700') {
    const { width } = this.scale;
    if (this._coopText) this._coopText.destroy();
    this._coopText = this.add.text(width / 2, 48, msg, {
      fontSize: '13px', fontFamily: 'Poppins, Arial',
      color, backgroundColor: 'rgba(0,0,0,0.65)',
      padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setDepth(30);
    this.time.delayedCall(SpeedController.scale(2800), () => {
      if (this._coopText) { this._coopText.destroy(); this._coopText = null; }
    });
  }

  _buildButtons(width, height) {
    const elems = this._cfg.elements;
    const cols = 2;
    const rows = Math.ceil(elems.length / cols);
    const totalW = cols * BTN_SIZE + (cols - 1) * BTN_GAP;
    const totalH = rows * BTN_SIZE + (rows - 1) * BTN_GAP;
    const startX = (width - totalW) / 2 + BTN_SIZE / 2;
    const startY = (height - totalH) / 2 + BTN_SIZE / 2 + 20;

    return elems.map((el, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (BTN_SIZE + BTN_GAP);
      const y = startY + row * (BTN_SIZE + BTN_GAP);

      const bg = this.add.graphics().setDepth(4);
      bg.fillStyle(el.color, 0.85);
      bg.fillRoundedRect(x - BTN_SIZE / 2, y - BTN_SIZE / 2, BTN_SIZE, BTN_SIZE, 14);
      bg.lineStyle(3, 0xffffff, 0.25);
      bg.strokeRoundedRect(x - BTN_SIZE / 2, y - BTN_SIZE / 2, BTN_SIZE, BTN_SIZE, 14);

      const label = this.add
        .text(x, y, el.symbol, { fontSize: '36px' })
        .setOrigin(0.5)
        .setDepth(5);

      const zone = this.add.zone(x, y, BTN_SIZE, BTN_SIZE).setInteractive();
      zone.on('pointerdown', () => this._onBtnPress(i));

      return { bg, label, zone, el, x, y };
    });
  }

  _nextRound() {
    this._active = true;
    this._round++;
    this._playerIdx = 0;
    this._inputEnabled = false;
    if (this._speedRamp && this._round > 1) {
      this._rampFactor = Math.max(RAMP_MIN_FACTOR, this._rampFactor - RAMP_PER_ROUND);
    }
    const el = this._cfg.elements[Math.floor(Math.random() * this._cfg.elements.length)];
    this._seq.push(el);
    this._roundText.setText(`Kārta ${this._round}/${this._cfg.rounds}`);
    this._statusText.setText('Vēro secību...').setColor('#ffaa00');
    this._playSequence();
  }

  _playSequence() {
    const rf = this._speedRamp ? this._rampFactor : 1.0;
    this._seq.forEach((el, i) => {
      const btnIdx   = this._cfg.elements.indexOf(el);
      const show     = SpeedController.scale(this._cfg.showDuration * rf);
      const gap      = SpeedController.scale(this._cfg.gapDuration * rf);
      const delay    = show * i + SpeedController.scale(300 * rf);
      this.time.delayedCall(delay,           () => this._flash(btnIdx, true));
      this.time.delayedCall(delay + show - gap, () => this._flash(btnIdx, false));
    });

    const totalDelay = SpeedController.scale(this._cfg.showDuration * rf) * this._seq.length + SpeedController.scale(500 * rf);
    this.time.delayedCall(totalDelay, () => {
      this._inputEnabled = true;
      this._statusText.setText('Tava kārta!').setColor('#4caf50');
    });
  }

  _flash(btnIdx, on) {
    const btn = this._buttons[btnIdx];
    if (!btn) return;
    btn.bg.clear();
    const alpha = on ? 1 : 0.85;
    btn.bg.fillStyle(btn.el.color, alpha);
    btn.bg.fillRoundedRect(btn.x - BTN_SIZE / 2, btn.y - BTN_SIZE / 2, BTN_SIZE, BTN_SIZE, 14);
    btn.label.setScale(on ? 1.25 : 1);
    if (on) btn.label.setTint(0xffffff);
    else btn.label.clearTint();
  }

  _onBtnPress(btnIdx) {
    if (!this._inputEnabled || !this._active) return;
    const expected = this._cfg.elements.indexOf(this._seq[this._playerIdx]);
    this._flash(btnIdx, true);
    this.time.delayedCall(SpeedController.scale(180), () => this._flash(btnIdx, false));

    if (window.MinigameFX) {
      const btn = this._buttons[btnIdx];
      window.MinigameFX.flash(this, 60, 0xffffff);
    }

    if (btnIdx !== expected) {
      this._inputEnabled = false;
      this._hasMistake = true;

      if (window.MinigameFX) {
        window.MinigameFX.shake(this, 300, 0.012);
      }

      // Show feedback, replay sequence (infinite retries but points capped)
      this._statusText.setText('Nepareizi — mēģini vēlreiz!').setColor('#ff9800');
      this.time.delayedCall(SpeedController.scale(900), () => {
        if (!this._active) return;
        this._playerIdx = 0;
        this._statusText.setText('Vēro secību vēlreiz...').setColor('#ffaa00');
        this.time.delayedCall(SpeedController.scale(400), () => {
          if (!this._active) return;
          this._playSequence();
        });
      });
      return;
    }

    this._playerIdx++;
    
    if (window.MinigameFX && this._playerIdx > 2) {
      const btn = this._buttons[btnIdx];
      window.MinigameFX.textPop(this, btn.x, btn.y, `${this._playerIdx}!`, '#4caf50');
    }

    if (this._playerIdx < this._seq.length) return;

    this._inputEnabled = false;
    if (this._round >= this._cfg.rounds) {
      this._coopUnsubs?.forEach(u => u());
      this._statusText.setText('Lieliski! ✓').setColor('#4caf50');

      if (window.MinigameFX) {
        window.MinigameFX.flash(this, 400, 0x4caf50);
      }

      const pts = this._hasMistake ? 5 : 10;
      this.time.delayedCall(SpeedController.scale(900), () =>
        EventBridge.emit('MINIGAME_COMPLETE', { success: true, bonusPoints: pts })
      );
    } else {
      this._statusText.setText('Pareizi! Nākamā kārta...').setColor('#4caf50');
      this.time.delayedCall(SpeedController.scale(800), () => this._nextRound());
    }
  }
}
