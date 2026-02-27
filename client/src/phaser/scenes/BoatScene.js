import Phaser from 'phaser';

const GAME_TIME = 25;
const TARGET_POINTS = 14;

export class BoatScene extends Phaser.Scene {
  constructor() { super({ key: 'OstasRegate' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail = data.onFail || (() => {});
  }

  create() {
    const { width, height } = this.scale;
    this.active = true;
    this.points = 0;
    this.timeLeft = GAME_TIME;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0b2942);
    this.add.rectangle(width / 2, height - 18, width, 36, 0x1f2937);

    this.info = this.add.text(width / 2, 10, 'Savāc kravu, izvairies no šķēršļiem', { color: '#e5e7eb', fontSize: '13px' }).setOrigin(0.5, 0);
    this.scoreText = this.add.text(12, 12, `Krava: 0/${TARGET_POINTS}`, { color: '#fff', fontSize: '14px' });
    this.timerText = this.add.text(width - 12, 12, `${GAME_TIME}s`, { color: '#fff', fontSize: '14px' }).setOrigin(1, 0);

    this.boat = this.add.rectangle(width / 2, height - 54, 46, 18, 0xf59e0b).setStrokeStyle(2, 0x111827, 0.8);
    this.physics.add.existing(this.boat);
    this.boat.body.setCollideWorldBounds(true);

    this.cargo = this.physics.add.group();
    this.rocks = this.physics.add.group();

    this.input.on('pointermove', p => {
      if (!this.active) return;
      this.boat.x = Phaser.Math.Clamp(p.x, 24, width - 24);
    });

    this.keys = this.input.keyboard.createCursorKeys();

    this.spawnEvent = this.time.addEvent({ delay: 700, loop: true, callback: () => this.spawnItem() });
    this.timerEvent = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });

    this.physics.add.overlap(this.boat, this.cargo, (_, item) => {
      item.destroy();
      this.points += 1;
      this.scoreText.setText(`Krava: ${this.points}/${TARGET_POINTS}`);
      if (this.points >= TARGET_POINTS) this.finish(true);
    });

    this.physics.add.overlap(this.boat, this.rocks, () => this.finish(false));
  }

  spawnItem() {
    if (!this.active) return;
    const { width } = this.scale;
    const isCargo = Math.random() > 0.35;
    const x = Phaser.Math.Between(24, width - 24);
    const y = -16;
    const color = isCargo ? 0x22c55e : 0xef4444;
    const w = isCargo ? 22 : 26;
    const h = isCargo ? 18 : 20;
    const rect = this.add.rectangle(x, y, w, h, color).setStrokeStyle(1, 0x111827, 0.6);
    this.physics.add.existing(rect);
    rect.body.setVelocityY(120 + this.points * 3);
    if (isCargo) this.cargo.add(rect); else this.rocks.add(rect);
  }

  tick() {
    if (!this.active) return;
    this.timeLeft -= 1;
    this.timerText.setText(`${this.timeLeft}s`);
    if (this.timeLeft <= 0) this.finish(this.points >= TARGET_POINTS);
  }

  update() {
    if (!this.active) return;
    if (this.keys.left?.isDown) this.boat.x -= 5;
    if (this.keys.right?.isDown) this.boat.x += 5;
  }

  finish(success) {
    if (!this.active) return;
    this.active = false;
    if (this.spawnEvent) this.spawnEvent.remove();
    if (this.timerEvent) this.timerEvent.remove();

    if (success) {
      const pts = Math.max(4, Math.min(10, Math.round(4 + (this.points / TARGET_POINTS) * 6)));
      this.onComplete(pts);
    } else {
      this.onFail();
    }
  }
}
