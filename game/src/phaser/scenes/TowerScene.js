import Phaser from 'phaser';
import EventBridge from '../../utils/EventBridge.js';
import SpeedController from '../../utils/SpeedController.js';

/**
 * TowerScene — "Tower Blocks" style mini-game
 * - Moving block left/right
 * - Tap/click to drop
 * - Overhang gets chopped + falls
 * - Perfect hit bonus (snap)
 * - Smooth camera follow
 * - Alternating direction each level + speed scaling
 * - Sounds + juice (flash + particles)
 *
 * Scene data (from LocationData miniGame object):
 *   targetBlocks, timeLimit, baseWidth, minWidth, perfectPx, speedStart, speedStep,
 *   infoLines (array of strings)
 */
export default class TowerScene extends Phaser.Scene {
  constructor() {
    super('TowerScene');
  }

  init(data) {
    this.dataIn = data || {};

    this.blockH      = 34;
    this.target      = data?.targetBlocks ?? 12;
    this.timeLeft    = data?.timeLimit ?? 25;

    this.baseW       = data?.baseWidth ?? 220;
    this.minW        = data?.minWidth ?? 70;

    this.perfectPx   = data?.perfectPx ?? 7;

    this.speed       = data?.speedStart ?? 210;
    this.speedStep   = data?.speedStep ?? 14;

    this.score       = 0;
    this.bonusPoints = 0;
    this.perfectStreak = 0;

    this.dir = 1;
    this.stack = [];
    this.moving = null;
    this.isOver = false;

    this._audio = this._makeTinySynth();
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#121427');

    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('spark', 8, 8);
    g.destroy();

    this.particles = this.add.particles(0, 0, 'spark', {
      speed: { min: 40, max: 160 },
      lifespan: 380,
      gravityY: 260,
      scale: { start: 0.8, end: 0 },
      quantity: 0,
      emitting: false,
    });

    this.uiScore = this.add.text(16, 14, 'Torņa līmenis: 0', {
      fontFamily: 'Poppins, Arial',
      fontSize: '16px',
      color: '#ffffff',
    }).setScrollFactor(0);

    this.uiTimer = this.add.text(16, 36, `Laiks: ${this.timeLeft}`, {
      fontFamily: 'Poppins, Arial',
      fontSize: '16px',
      color: '#cfcfcf',
    }).setScrollFactor(0);

    this.uiHint = this.add.text(16, 58, 'Klikšķini / pieskaries, lai nomestu bloku', {
      fontFamily: 'Poppins, Arial',
      fontSize: '14px',
      color: '#b8b8b8',
    }).setScrollFactor(0);

    const infoLines = this.dataIn?.infoLines;
    if (Array.isArray(infoLines) && infoLines.length) {
      const box = this.add.rectangle(width / 2, 118, width - 28, 86, 0x000000, 0.35)
          .setScrollFactor(0)
          .setOrigin(0.5);

      this.add.text(width / 2, 118, infoLines.join('\n'), {
        fontFamily: 'Poppins, Arial',
        fontSize: '13px',
        color: '#ffe082',
        align: 'center',
        lineSpacing: 3,
      }).setScrollFactor(0).setOrigin(0.5);

      this.tweens.add({
        targets: box,
        alpha: 0,
        delay: SpeedController.scale(3800),
        duration: SpeedController.scale(600),
        onComplete: () => box.destroy(),
      });
    }

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isOver) return;
        this.timeLeft -= 1;
        this.uiTimer.setText(`Laiks: ${this.timeLeft}`);
        if (this.timeLeft <= 0) {
          // If you reached target by time end: win; else lose.
          this.finish(this.score >= this.target);
        }
      },
    });

    this.baseY = height - 64;
    const base = this._makeBlock(width / 2, this.baseY, this.baseW, 0x6ee7ff);
    this.stack.push({ x: base.x, y: base.y, w: base.width, rect: base });

    this.cameras.main.scrollY = 0;

    this._spawnMoving(this.baseW);

    this.input.on('pointerdown', () => {
      if (this.isOver) {
        this.scene.restart();
        return;
      }
      this._drop();
    });
  }

  update(_, dt) {
    if (this.isOver) return;
    if (!this.moving) return;

    const s = (dt / 1000) * this.speed * (SpeedController.value || 1);
    this.moving.rect.x += s * this.dir;
    this.moving.x = this.moving.rect.x;

    const { width } = this.scale;
    const leftEdge = 70;
    const rightEdge = width - 70;
    const half = this.moving.w / 2;

    if (this.moving.rect.x - half <= leftEdge) {
      this.moving.rect.x = leftEdge + half;
      this.dir = 1;
    } else if (this.moving.rect.x + half >= rightEdge) {
      this.moving.rect.x = rightEdge - half;
      this.dir = -1;
    }
  }

  _spawnMoving(w) {
    const { width } = this.scale;
    const top = this.stack[this.stack.length - 1];
    const y = top.y - this.blockH;

    // Alternate direction each level + spawn from that side
    this.dir *= -1;
    const startX = this.dir === 1 ? 90 + w / 2 : width - 90 - w / 2;

    const rect = this._makeBlock(startX, y, w, 0xa7f3d0);
    this.moving = { x: rect.x, y, w, rect };
  }

  _drop() {
    if (!this.moving) return;

    const prev = this.stack[this.stack.length - 1];
    const cur = this.moving;

    // Perfect hit check (snap)
    const dx = Math.abs(cur.x - prev.x);
    const isPerfect = dx <= this.perfectPx;

    if (isPerfect) {
      cur.rect.x = prev.x;
      cur.x = prev.x;

      // Keep exact width
      cur.rect.width = prev.w;
      cur.w = prev.w;

      this.perfectStreak += 1;
      const streakBonus = Math.min(3, this.perfectStreak); // cap streak bonus
      this.bonusPoints += streakBonus;

      this._juicePerfect(cur.x, cur.y, streakBonus);
      this._sound('perfect');
    } else {
      this.perfectStreak = 0;

      // Overlap math
      const prevL = prev.x - prev.w / 2;
      const prevR = prev.x + prev.w / 2;
      const curL  = cur.x - cur.w / 2;
      const curR  = cur.x + cur.w / 2;

      const oL = Math.max(prevL, curL);
      const oR = Math.min(prevR, curR);
      const oW = oR - oL;

      // No overlap => lose
      if (oW <= 0) {
        this._sound('fail');
        this.finish(false);
        return;
      }

      const newX = (oL + oR) / 2;
      const newW = Math.max(this.minW, oW);

      // Place trimmed block
      cur.rect.x = newX;
      cur.x = newX;
      cur.rect.width = newW;

      // Make overhang piece fall (visual juice)
      const overhangW = cur.w - newW;
      if (overhangW > 1) {
        const overhangOnRight = curR > prevR;
        const pieceX = overhangOnRight ? (oR + overhangW / 2) : (oL - overhangW / 2);
        const piece = this._makeBlock(pieceX, cur.y, overhangW, 0x34d399);

        this.tweens.add({
          targets: piece,
          y: piece.y + 260,
          angle: overhangOnRight ? 32 : -32,
          alpha: 0,
          duration: SpeedController.scale(520),
          ease: 'Cubic.easeIn',
          onComplete: () => piece.destroy(),
        });
      }

      // little drop sound
      this._sound('drop');
      this._juiceDrop(cur.x, cur.y);
    }

    // Save placed block
    this.stack.push({ x: cur.rect.x, y: cur.y, w: cur.rect.width, rect: cur.rect });
    this.moving = null;

    // Update score
    this.score += 1;
    this.uiScore.setText(`Torņa līmenis: ${this.score}`);

    // Win condition
    if (this.score >= this.target) {
      this.finish(true);
      return;
    }

    // Speed scaling like the original
    this.speed = Math.min(520, this.speed + this.speedStep);

    // Smooth camera follow
    this._cameraUp();

    // Next block
    const nextW = this.stack[this.stack.length - 1].w;
    this.time.delayedCall(SpeedController.scale(90), () => this._spawnMoving(nextW));
  }

  _cameraUp() {
    // Keep top block around ~60% of screen height
    const { height } = this.scale;
    const top = this.stack[this.stack.length - 1];

    const desiredWorldY = top.y - height * 0.6;
    const targetScrollY = Phaser.Math.Clamp(desiredWorldY, -99999, 99999);

    this.tweens.add({
      targets: this.cameras.main,
      scrollY: targetScrollY,
      duration: SpeedController.scale(220),
      ease: 'Sine.easeOut',
    });
  }

  finish(success) {
    if (this.isOver) return;
    this.isOver = true;

    if (this.timerEvent) this.timerEvent.remove(false);

    const { width } = this.scale;

    // Final points (blocks + bonus)
    const pts = Math.max(0, this.score * 2 + this.bonusPoints);

    // End overlay
    const camY = this.cameras.main.scrollY;
    this.add.rectangle(width / 2, camY + 250, width - 60, 170, 0x000000, 0.45)
        .setOrigin(0.5);

    const title = success ? 'UZVARA! 🏗️' : 'NEIZDEVĀS 😭';
    const subtitle = success
        ? `Tu uzbūvēji torni!`
        : `Pamēģini vēlreiz.`;

    this.add.text(width / 2, camY + 215, title, {
      fontFamily: 'Poppins, Arial',
      fontSize: '30px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, camY + 252, subtitle, {
      fontFamily: 'Poppins, Arial',
      fontSize: '16px',
      color: '#cfcfcf',
    }).setOrigin(0.5);

    this.add.text(width / 2, camY + 292, `Punkti: ${pts}  •  Perfekti: ${this.bonusPoints}`, {
      fontFamily: 'Poppins, Arial',
      fontSize: '15px',
      color: '#ffe082',
    }).setOrigin(0.5);

    this.add.text(width / 2, camY + 330, 'Klikšķini, lai restartētu', {
      fontFamily: 'Poppins, Arial',
      fontSize: '13px',
      color: '#b8b8b8',
    }).setOrigin(0.5);

    if (success) {
      this.cameras.main.flash(120, 255, 255, 255);
      this._sound('win');
    } else {
      this.cameras.main.shake(140, 0.01);
      this._sound('fail');
    }

    // Report to React / game flow
    this.time.delayedCall(SpeedController.scale(900), () => {
      EventBridge.emit('MINIGAME_COMPLETE', { success, bonusPoints: pts });
    });
  }

  _makeBlock(x, y, w, color) {
    const r = this.add.rectangle(x, y, w, this.blockH, color, 1);
    r.setOrigin(0.5);
    r.setStrokeStyle(2, 0x000000, 0.18);
    return r;
  }

  _juiceDrop(x, y) {
    this.particles.setPosition(x, y);
    this.particles.explode(10, x, y);

    // tiny screen flash (subtle)
    this.cameras.main.flash(40, 255, 255, 255);
  }

  _juicePerfect(x, y, bonus) {
    this.particles.setPosition(x, y);
    this.particles.explode(18 + bonus * 4, x, y);

    this.cameras.main.flash(70, 255, 255, 255);

    const txt = this.add.text(x, y - 16, `PERFECT +${bonus}`, {
      fontFamily: 'Poppins, Arial',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.25)',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: txt,
      y: y - 42,
      alpha: 0,
      duration: SpeedController.scale(520),
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  _makeTinySynth() {
    let ctx = null;
    const ensure = () => {
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch { return null; }
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };

    const play = (freq, duration = 0.08, type = 'sine', gainValue = 0.08) => {
      const c = ensure();
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;

      const t = c.currentTime;
      g.gain.setValueAtTime(gainValue, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);

      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + duration);
    };

    return { play };
  }

  _sound(kind) {
    if (!this._audio) return;
    if (kind === 'drop')    this._audio.play(220, 0.06, 'square', 0.06);
    if (kind === 'perfect') this._audio.play(660, 0.09, 'triangle', 0.08);
    if (kind === 'win')     this._audio.play(880, 0.12, 'sine', 0.08);
    if (kind === 'fail')    this._audio.play(140, 0.18, 'sawtooth', 0.05);
  }
}