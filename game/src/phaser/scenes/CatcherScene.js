import Phaser from 'phaser';
import EventBridge from '../../utils/EventBridge.js';
import SpeedController from '../../utils/SpeedController.js';
import NoteSound from '../../utils/NoteSound.js';

const COMBO_THRESHOLDS = [3, 5, 8];   // hits to reach combo ×2, ×3, ×4
const SPEED_RAMP_RATE  = 0.07;        // speed boost per correct hit when speedRamp on
const SPEED_RAMP_MAX   = 2.0;         // max fall-speed multiplier

export default class CatcherScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CatcherScene' });
  }

  init(data) {
    this._cfg            = data;
    this._caught         = 0;
    this._timeLeft       = data.timeLimit;
    this._active         = true;
    this._spawnTimer     = null;
    this._countdownTimer = null;
    // Combo system
    this._combo          = 0;
    this._maxCombo       = 0;
    this._comboMultiplier = 1;
    // Progressive speed (when cfg.speedRamp is true)
    this._catchSpeedMult = 1.0;
  }

  create() {
    const { width, height } = this.scale;
    const cfg = this._cfg;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    const topGrad = this.add.graphics();
    topGrad.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x0a0a1a, 0x0a0a1a, 0.7);
    topGrad.fillRect(0, 0, width, height);

    this._basket = this.add.text(width / 2, height - 36, '🧺', {
      fontSize: '40px',
    }).setOrigin(0.5);

    this._scoreText = this.add
      .text(12, 12, `0 / ${cfg.required}`, {
        fontSize: '18px',
        fontFamily: 'Poppins, Arial',
        color: '#ffaa00',
      })
      .setDepth(10);

    this._timerText = this.add
      .text(width - 12, 12, `${cfg.timeLimit}s`, {
        fontSize: '18px',
        fontFamily: 'Poppins, Arial',
        color: '#ffffff',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this._items = this.add.group();

    // Apply SpeedController: faster speed → shorter spawn/countdown intervals
    const spawnDelay     = SpeedController.scale(cfg.spawnRate);
    const countdownDelay = SpeedController.scale(1000);

    this._spawnTimer = this.time.addEvent({
      delay:         spawnDelay,
      callback:      this._spawnItem,
      callbackScope: this,
      loop:          true,
    });

    this._countdownTimer = this.time.addEvent({
      delay:         countdownDelay,
      callback:      this._tick,
      callbackScope: this,
      loop:          true,
    });

    this.input.on('pointermove', (ptr) => {
      if (this._active) this._basket.x = Phaser.Math.Clamp(ptr.x, 24, width - 24);
    });

    // ── Combo & speed HUD ─────────────────────────────────────────────────────
    this._comboText = this.add
      .text(width / 2, height - 36, '', {
        fontSize: '16px',
        fontFamily: 'Poppins, Arial',
        color: '#ffaa00',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(15)
      .setAlpha(0);

    if (cfg.speedRamp) {
      this._speedMeterBg = this.add.graphics().setDepth(14);
      this._speedMeterFg = this.add.graphics().setDepth(15);
      this._speedLabel   = this.add
        .text(width - 12, height - 14, '⚡', {
          fontSize: '11px', fontFamily: 'Poppins, Arial', color: '#ffaa00',
        })
        .setOrigin(1, 1)
        .setDepth(15);
      this._drawSpeedMeter();
    }

    this._spawnItem();

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
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(30);
    this.time.delayedCall(SpeedController.scale(2800), () => {
      if (this._coopText) { this._coopText.destroy(); this._coopText = null; }
    });
  }

  _spawnItem() {
    if (!this._active) return;
    const cfg = this._cfg;
    const { width } = this.scale;
    const allItems = [...cfg.collect, ...cfg.avoid];
    const symbol   = allItems[Math.floor(Math.random() * allItems.length)];
    const isGood   = cfg.collect.includes(symbol);
    // Scale fall speed by SpeedController and progressive catch-speed multiplier
    const baseSpeed = Phaser.Math.Between(cfg.fallSpeed.min, cfg.fallSpeed.max);
    const speed     = baseSpeed * SpeedController.value * this._catchSpeedMult;

    const item = this.add.text(
      Phaser.Math.Between(20, width - 20),
      -30,
      symbol,
      { fontSize: '32px' }
    ).setData({ good: isGood, speed });

    this._items.add(item);
  }

  update(time, delta) {
    if (!this._active) return;
    const { height } = this.scale;
    const bx = this._basket.x;
    const by = this._basket.y;
    const dt = delta / 1000;

    const children = this._items.getChildren().slice();
    children.forEach((item) => {
      item.y += item.getData('speed') * dt;
      const dx = Math.abs(item.x - bx);
      const dy = Math.abs(item.y - by);
      if (dx < 40 && dy < 30) {
        if (item.getData('good')) {
          this._caught++;
          this._scoreText.setText(`${this._caught} / ${this._cfg.required}`);

          // ── Combo system ─────────────────────────────────────────────────────
          this._combo++;
          if (this._combo > this._maxCombo) this._maxCombo = this._combo;
          const comboIdx = COMBO_THRESHOLDS.findLastIndex(t => this._combo >= t);
          this._comboMultiplier = comboIdx >= 0 ? comboIdx + 2 : 1;
          this._updateComboHUD();

          // ── Progressive speed ramp ────────────────────────────────────────
          if (this._cfg.speedRamp) {
            this._catchSpeedMult = Math.min(SPEED_RAMP_MAX,
              this._catchSpeedMult + SPEED_RAMP_RATE);
            this._drawSpeedMeter();
          }

          this._flashBasket(0x00ff00);

          // ── Note pulse animation (Dzintars) ───────────────────────────────
          if (this._cfg.locationId === 'dzintars') {
            NoteSound.play(item.text);
            this._pulseNote(item);
          } else {
            item.destroy();
          }

          if (this._caught >= this._cfg.required) this._finish(true);
        } else {
          // ── Bad item: reset combo ─────────────────────────────────────────
          this._combo = 0;
          this._comboMultiplier = 1;
          this._updateComboHUD();
          this._flashBasket(0xff0000);
          item.destroy();
        }
      } else if (item.y > height + 40) {
        item.destroy();
      }
    });
  }

  _tick() {
    if (!this._active) return;
    this._timeLeft--;
    this._timerText.setText(`${this._timeLeft}s`);
    if (this._timeLeft <= 5) this._timerText.setColor('#ff4444');
    if (this._timeLeft <= 0) this._finish(false);
  }

  _flashBasket(color) {
    if (color != null) this._basket.setTint(color);
    this.tweens.add({
      targets:  this._basket,
      alpha:    0.3,
      duration: SpeedController.scale(80),
      yoyo:     true,
      onComplete: () => { this._basket.clearTint(); },
    });
  }

  /** Animate the note item with a scale pulse before destroying it */
  _pulseNote(item) {
    this._items.remove(item, false, false);
    this.tweens.add({
      targets:  item,
      scaleX:   1.8,
      scaleY:   1.8,
      alpha:    0,
      duration: SpeedController.scale(220),
      ease:     'Power2',
      onComplete: () => item.destroy(),
    });
  }

  /** Update the combo counter HUD text */
  _updateComboHUD() {
    if (!this._comboText) return;
    if (this._combo >= COMBO_THRESHOLDS[0]) {
      this._comboText
        .setText(`🔥 ×${this._comboMultiplier} COMBO (${this._combo})`)
        .setAlpha(1);
    } else if (this._combo > 0) {
      this._comboText.setText(`${this._combo} hit`).setAlpha(0.75);
    } else {
      this._comboText.setAlpha(0);
    }
  }

  /** Draw/redraw the progressive speed meter (for speedRamp games) */
  _drawSpeedMeter() {
    if (!this._speedMeterBg || !this._speedMeterFg) return;
    const { width, height } = this.scale;
    const barW   = 80;
    const barH   = 7;
    const x      = width - barW - 12;
    const y      = height - 26;
    const fill   = Math.min(1, (this._catchSpeedMult - 1) / (SPEED_RAMP_MAX - 1));

    this._speedMeterBg.clear();
    this._speedMeterBg.fillStyle(0x333333, 0.8);
    this._speedMeterBg.fillRoundedRect(x, y, barW, barH, 3);

    this._speedMeterFg.clear();
    if (fill > 0) {
      // Colour shifts from green → red as speed increases
      const r = Math.round(fill * 255);
      const g = Math.round((1 - fill) * 180);
      const colour = (r << 16) | (g << 8);
      this._speedMeterFg.fillStyle(colour, 1);
      this._speedMeterFg.fillRoundedRect(x, y, Math.max(4, barW * fill), barH, 3);
    }
  }

  _finish(success) {
    if (!this._active) return;
    this._active = false;
    this._spawnTimer?.remove();
    this._countdownTimer?.remove();
    // Unsubscribe co-op listeners
    this._coopUnsubs?.forEach(u => u());

    const { width, height } = this.scale;
    // Bonus points: time bonus + combo bonus (1 extra pt per combo tier reached, max 2)
    const timeBonus  = success ? (this._timeLeft > this._cfg.timeLimit * 0.5 ? 5 : 3) : 0;
    const comboBonus = success ? Math.min(2, COMBO_THRESHOLDS.filter(t => this._maxCombo >= t).length) : 0;
    const pts        = Math.min(5, timeBonus + comboBonus);

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    this.add
      .text(width / 2, height / 2 - 20, success ? '✓ Labi padarīts!' : '✗ Laiks beidzās!', {
        fontSize:   '26px',
        fontFamily: 'Poppins, Arial',
        color:      success ? '#4caf50' : '#f44336',
      })
      .setOrigin(0.5);

    if (success && this._maxCombo >= COMBO_THRESHOLDS[0]) {
      // Calculate the highest multiplier tier achieved during the game
      const maxComboIdx  = COMBO_THRESHOLDS.findLastIndex(t => this._maxCombo >= t);
      const maxComboMult = maxComboIdx >= 0 ? maxComboIdx + 2 : 1;
      this.add.text(width / 2, height / 2 + 18, `🔥 Labākais kombo: ×${maxComboMult}`, {
        fontSize: '15px', fontFamily: 'Poppins, Arial', color: '#ffaa00',
      }).setOrigin(0.5);
    }

    this.time.delayedCall(SpeedController.scale(1400), () => {
      EventBridge.emit('MINIGAME_COMPLETE', { success, bonusPoints: pts });
    });
  }
}
