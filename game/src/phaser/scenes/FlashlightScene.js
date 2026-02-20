import Phaser from 'phaser';
import EventBridge from '../../utils/EventBridge.js';
import SpeedController from '../../utils/SpeedController.js';
import { getDayNightState, getSkyColors, getCityLights } from '../../utils/DayNight.js';

export default class FlashlightScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FlashlightScene' });
  }

  init(data) {
    this._cfg = data;
    this._revealed = 0;
    this._totalCells = 0;
    this._active = true;
    this._timeLeft = data.timeLimit;
    this._countdownTimer = null;
    const dn = getDayNightState();
    this._sky = getSkyColors(dn.isNight, dn.isGoldenHour);
    this._cityLights = getCityLights(dn.isNight);
    this._nightMode = dn.isNight;
  }

  create() {
    const { width, height } = this.scale;
    const cfg = this._cfg;

    this._buildRevealGrid(width, height);
    this._drawBackground(width, height);
    this._drawRevealText(width, height);
    this._buildMask(width, height);

    this._timerText = this.add
      .text(width / 2, 18, `${cfg.timeLimit}s`, {
        fontSize: '20px',
        fontFamily: 'Poppins, Arial',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0)
      .setDepth(20);

    this._progressText = this.add
      .text(width / 2, height - 22, '0%', {
        fontSize: '16px',
        fontFamily: 'Poppins, Arial',
        color: '#ffaa00',
      })
      .setOrigin(0.5, 1)
      .setDepth(20);

    this._countdownTimer = this.time.addEvent({
      delay:         SpeedController.scale(1000),
      callback:      this._tick,
      callbackScope: this,
      loop:          true,
    });

    this.input.on('pointermove', this._onPointerMove, this);
    this.input.on('pointerdown', this._onPointerMove, this);

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

  _buildRevealGrid(width, height) {
    this._cellSize = 24;
    this._cols = Math.ceil(width / this._cellSize);
    this._rows = Math.ceil(height / this._cellSize);
    this._totalCells = this._cols * this._rows;
    this._grid = new Uint8Array(this._totalCells);
  }

  _drawBackground(width, height) {
    const sky = this._sky;
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(sky.top, sky.top, sky.bottom, sky.bottom, 1);
    bg.fillRect(0, 0, width, height);

    if (this._nightMode && this._cityLights.length) {
      const lg = this.add.graphics().setDepth(1);
      this._cityLights.forEach(l => {
        lg.fillStyle(l.color, 0.85);
        lg.fillCircle(l.x * width, l.y * height, l.r);
      });
    }
  }

  _drawRevealText(width, height) {
    const cfg = this._cfg;
    const lines = cfg.revealLines || [cfg.label || 'LIEPĀJA'];
    const cx = width / 2;
    const cy = height / 2;

    this._revealGroup = this.add.group();

    lines.forEach((line, i) => {
      const y = cy + (i - (lines.length - 1) / 2) * 52;
      const t = this.add
        .text(cx, y, line, {
          fontSize: i === 0 ? '36px' : '26px',
          fontFamily: 'Poppins, Arial',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(5);
      this._revealGroup.add(t);
    });

    this._darkOverlay = this.add.graphics().setDepth(10);
    this._darkOverlay.fillStyle(0x000000, 0.97);
    this._darkOverlay.fillRect(0, 0, width, height);
  }

  _buildMask(width, height) {
    this._maskGfx = this.add.graphics().setDepth(11);
    this._gradientGfx = this.add.graphics().setDepth(12);
    this._flashX = width / 2;
    this._flashY = height / 2;
  }

  _onPointerMove(ptr) {
    if (!this._active) return;
    this._flashX = ptr.x;
    this._flashY = ptr.y;
    this._revealCells(ptr.x, ptr.y);
  }

  _revealCells(px, py) {
    const r = this._cfg.flashRadius;
    const cx = Math.floor(px / this._cellSize);
    const cy = Math.floor(py / this._cellSize);
    const cr = Math.ceil(r / this._cellSize);
    let newReveals = 0;

    for (let dy = -cr; dy <= cr; dy++) {
      for (let dx = -cr; dx <= cr; dx++) {
        const gx = cx + dx;
        const gy = cy + dy;
        if (gx < 0 || gx >= this._cols || gy < 0 || gy >= this._rows) continue;
        const dist = Math.sqrt(dx * dx + dy * dy) * this._cellSize;
        if (dist <= r) {
          const idx = gy * this._cols + gx;
          if (!this._grid[idx]) {
            this._grid[idx] = 1;
            newReveals++;
          }
        }
      }
    }

    if (newReveals > 0) {
      this._revealed = this._grid.reduce((s, v) => s + v, 0);
      const pct = this._revealed / this._totalCells;
      this._progressText.setText(`${Math.round(pct * 100)}%`);
      if (pct >= this._cfg.requiredReveal) this._finish(true);
    }
  }

  update() {
    if (!this._active) return;
    const { width, height } = this.scale;
    this._darkOverlay.clear();
    this._darkOverlay.fillStyle(0x000000, 0.97);
    this._darkOverlay.fillRect(0, 0, width, height);

    const r = this._cfg.flashRadius;
    this._darkOverlay.fillStyle(0x000000, 0);
    this._darkOverlay.slice(this._flashX, this._flashY, r, 0, Math.PI * 2, false);
    this._darkOverlay.fillPath();

    this._gradientGfx.clear();
    const steps = 6;
    for (let i = steps; i >= 1; i--) {
      const alpha = (i / steps) * 0.55;
      const stepR = r * (1 + (steps - i) * 0.18);
      this._gradientGfx.fillStyle(0x000000, alpha);
      this._gradientGfx.slice(this._flashX, this._flashY, stepR, 0, Math.PI * 2, false);
      this._gradientGfx.fillPath();
    }
  }

  _tick() {
    if (!this._active) return;
    this._timeLeft--;
    this._timerText.setText(`${this._timeLeft}s`);
    if (this._timeLeft <= 5) this._timerText.setColor('#ff4444');
    if (this._timeLeft <= 0) this._finish(false);
  }

  _finish(success) {
    if (!this._active) return;
    this._active = false;
    this._countdownTimer?.remove();
    this._coopUnsubs?.forEach(u => u());

    const { width, height } = this.scale;
    const pts = success ? (this._timeLeft > this._cfg.timeLimit * 0.5 ? 5 : 3) : 0;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setDepth(30);
    this.add
      .text(width / 2, height / 2 - 16, success ? '✓ Atklāts!' : '✗ Laiks beidzās!', {
        fontSize: '28px',
        fontFamily: 'Poppins, Arial',
        color: success ? '#4caf50' : '#f44336',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.time.delayedCall(SpeedController.scale(1400), () => {
      EventBridge.emit('MINIGAME_COMPLETE', { success, bonusPoints: pts });
    });
  }
}
