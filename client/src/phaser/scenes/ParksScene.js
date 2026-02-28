import Phaser from 'phaser';

const FLOWERS_NEEDED = 8;
const MAX_MISSED     = 4;
const BLOOM_LIFE     = 2400; // ms a flower stays before wilting

export class ParksScene extends Phaser.Scene {
  constructor() { super({ key: 'ParksScene' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail     = data.onFail     || (() => {});
    this.isMobile   = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  create() {
    const { width, height } = this.scale;
    this.flowersClicked = 0;
    this.flowersMissed  = 0;
    this.gameActive     = true;

    // Park background
    this.add.graphics().fillStyle(0x1b4d1b, 1).fillRect(0, 0, width, height);
    // Grass texture hints
    const g = this.add.graphics();
    g.fillStyle(0x236b23, 0.4);
    for (let y = 0; y < height; y += 18) {
      for (let x = (y % 36 === 0 ? 0 : 9); x < width; x += 18) {
        g.fillCircle(x, y, 6);
      }
    }
    g.lineStyle(2, 0x2e7d32, 1).strokeRect(2, 2, width - 4, height - 4);

    this.add.text(width / 2, 12, 'Nospied dzeltenas puķes pirms tās novīst!', {
      fontFamily: 'Poppins, Arial', fontSize: '12px', color: '#ffee58',
    }).setOrigin(0.5, 0);

    this.pickedText = this.add.text(12, 12, `✿ 0/${FLOWERS_NEEDED}`, {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#ffee58',
    });
    this.missedText = this.add.text(width - 12, 12, `✗ 0/${MAX_MISSED}`, {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#f44336',
    }).setOrigin(1, 0);

    // Spawn flowers periodically
    this.time.addEvent({ delay: 700, loop: true, callback: this._spawnFlower, callbackScope: this });
    // Initial burst
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 200, this._spawnFlower, [], this);
    }
  }

  _spawnFlower() {
    if (!this.gameActive) return;
    const { width, height } = this.scale;
    const r  = this.isMobile ? 22 : 16;
    const x  = Phaser.Math.Between(30, width - 30);
    const y  = Phaser.Math.Between(40, height - 20);

    const g = this.add.graphics();
    // Petals
    g.fillStyle(0xfdd835, 1);
    for (let a = 0; a < 5; a++) {
      const ax = Math.cos((a / 5) * Math.PI * 2) * r * 0.65;
      const ay = Math.sin((a / 5) * Math.PI * 2) * r * 0.65;
      g.fillEllipse(ax, ay, r * 0.8, r * 0.55);
    }
    // Centre
    g.fillStyle(0xff8f00, 1).fillCircle(0, 0, r * 0.36);
    g.x = x; g.y = y;

    let clicked = false;
    g.setInteractive(new Phaser.Geom.Circle(0, 0, r + (this.isMobile ? 12 : 7)), Phaser.Geom.Circle.Contains);
    g.on('pointerdown', () => {
      if (!this.gameActive || clicked) return;
      clicked = true;
      this.tweens.killTweensOf(g);
      this.tweens.add({ targets: g, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 200, onComplete: () => g.destroy() });
      this.flowersClicked++;
      this.pickedText.setText(`✿ ${this.flowersClicked}/${FLOWERS_NEEDED}`);
      if (this.flowersClicked >= FLOWERS_NEEDED) this._endGame(true);
    });

    // Wilt if not clicked
    this.tweens.add({
      targets: g, alpha: 0, duration: BLOOM_LIFE, ease: 'Linear',
      onComplete: () => {
        if (clicked || !this.gameActive) return;
        g.destroy();
        this.flowersMissed++;
        this.missedText.setText(`✗ ${this.flowersMissed}/${MAX_MISSED}`);
        if (this.flowersMissed >= MAX_MISSED) this._endGame(false);
      },
    });
  }

  _endGame(success) {
    if (!this.gameActive) return;
    this.gameActive = false;
    if (success) this.onComplete(10); else this.onFail();
  }
}
