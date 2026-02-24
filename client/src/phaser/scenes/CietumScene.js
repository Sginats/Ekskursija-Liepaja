import Phaser from 'phaser';

const TARGET_HITS = 12;

export class CietumScene extends Phaser.Scene {
  constructor() { super({ key: 'Cietums' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail = data.onFail || (() => {});
  }

  create() {
    const { width, height } = this.scale;
    this.active = true;
    this.hits = 0;
    this.combo = 0;
    this.speed = 1;
    this.timeLimit = 1500;

    this.add.rectangle(width / 2, height / 2, width, height, 0x111111);
    this.add.text(width / 2, 12, 'Atrodi un nospied atslēgu', { color: '#f59e0b', fontSize: '14px' }).setOrigin(0.5, 0);
    this.hitText = this.add.text(12, 12, `Trāpījumi: 0/${TARGET_HITS}`, { color: '#fff', fontSize: '13px' });
    this.comboText = this.add.text(width - 12, 12, 'Kombo: 0', { color: '#a7f3d0', fontSize: '13px' }).setOrigin(1, 0);

    this.speedBarBg = this.add.rectangle(width / 2, height - 16, width - 28, 8, 0x1f2937);
    this.speedBar = this.add.rectangle(14, height - 16, 0, 8, 0x22c55e).setOrigin(0, 0.5);

    this.spawnTarget();
  }

  spawnTarget() {
    if (!this.active) return;
    const { width, height } = this.scale;
    if (this.target) this.target.destroy();

    const x = Phaser.Math.Between(28, width - 28);
    const y = Phaser.Math.Between(42, height - 42);
    this.target = this.add.rectangle(x, y, 34, 34, 0xfacc15).setStrokeStyle(2, 0x111, 0.8).setInteractive({ useHandCursor: true });

    const ttl = this.timeLimit / this.speed;
    this.target.on('pointerdown', () => {
      if (!this.active) return;
      this.hits += 1;
      this.combo += 1;
      this.speed = Math.min(3, this.speed + 0.12);
      this.timeLimit = Math.max(650, this.timeLimit - 35);
      this.updateHud();
      if (this.hits >= TARGET_HITS) {
        const pts = Math.max(5, Math.min(10, Math.round(6 + this.combo * 0.25)));
        this.active = false;
        this.onComplete(pts);
      } else {
        this.spawnTarget();
      }
    });

    if (this.timeoutEvent) this.timeoutEvent.remove();
    this.timeoutEvent = this.time.delayedCall(ttl, () => {
      this.combo = 0;
      this.speed = Math.max(1, this.speed - 0.15);
      this.updateHud();
      this.spawnTarget();
    });
  }

  updateHud() {
    this.hitText.setText(`Trāpījumi: ${this.hits}/${TARGET_HITS}`);
    this.comboText.setText(`Kombo: ${this.combo}`);
    const pct = (this.speed - 1) / 2;
    this.speedBar.width = (this.scale.width - 28) * pct;
  }
}
