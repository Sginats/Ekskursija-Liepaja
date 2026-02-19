import Phaser from 'phaser';

const HITS_NEEDED = 5;
const MAX_MISS    = 3;
const FADE_TIME   = 1500; // ms spotlight stays

export class TeatrisScene extends Phaser.Scene {
  constructor() { super({ key: 'TeatrisScene' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail     = data.onFail     || (() => {});
    this.isMobile   = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  create() {
    const { width, height } = this.scale;
    this.hits       = 0;
    this.misses     = 0;
    this.gameActive = true;

    // Dark stage background
    this.add.graphics().fillStyle(0x0d0d0d, 1).fillRect(0, 0, width, height);
    // Stage floor stripe
    this.add.graphics().fillStyle(0x3b2a1a, 1).fillRect(0, height * 0.78, width, height * 0.22);
    // Curtain strips
    this.add.graphics().fillStyle(0x5c1a1a, 1).fillRect(0, 0, 28, height * 0.78);
    this.add.graphics().fillStyle(0x5c1a1a, 1).fillRect(width - 28, 0, 28, height * 0.78);

    this.add.text(width / 2, 14, `Klikšķini uz gaismas apliem!`, {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#ffdd88',
    }).setOrigin(0.5, 0);

    this.hitsText = this.add.text(12, 14, `✓ 0/${HITS_NEEDED}`, {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#4caf50',
    });
    this.missText = this.add.text(width - 12, 14, `✗ 0/${MAX_MISS}`, {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#f44336',
    }).setOrigin(1, 0);

    this._scheduleNext();
  }

  _scheduleNext() {
    if (!this.gameActive) return;
    const delay = Phaser.Math.Between(300, 900);
    this.time.delayedCall(delay, this._spawnSpotlight, [], this);
  }

  _spawnSpotlight() {
    if (!this.gameActive) return;
    const { width, height } = this.scale;
    const r = this.isMobile ? 38 : 26;
    const x = Phaser.Math.Between(40, width - 40);
    const y = Phaser.Math.Between(46, height * 0.72);

    const g = this.add.graphics();
    g.fillStyle(0xffee88, 0.9);
    g.fillCircle(0, 0, r);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(-r * 0.3, -r * 0.3, r * 0.3);
    g.x = x; g.y = y;

    g.setInteractive(new Phaser.Geom.Circle(0, 0, r + (this.isMobile ? 14 : 8)), Phaser.Geom.Circle.Contains);

    let clicked = false;
    g.on('pointerdown', () => {
      if (!this.gameActive || clicked) return;
      clicked = true;
      this.tweens.killTweensOf(g);
      this.tweens.add({ targets: g, alpha: 0, scaleX: 1.8, scaleY: 1.8, duration: 180, onComplete: () => g.destroy() });
      this.hits++;
      this.hitsText.setText(`✓ ${this.hits}/${HITS_NEEDED}`);
      if (this.hits >= HITS_NEEDED) { this._endGame(true); return; }
      this._scheduleNext();
    });

    // Auto-fade (miss)
    this.tweens.add({
      targets: g, alpha: 0, duration: FADE_TIME, ease: 'Linear',
      onComplete: () => {
        if (clicked || !this.gameActive) return;
        g.destroy();
        this.misses++;
        this.missText.setText(`✗ ${this.misses}/${MAX_MISS}`);
        if (this.misses >= MAX_MISS) { this._endGame(false); return; }
        this._scheduleNext();
      },
    });
  }

  _endGame(success) {
    if (!this.gameActive) return;
    this.gameActive = false;
    if (success) this.onComplete(10); else this.onFail();
  }
}
