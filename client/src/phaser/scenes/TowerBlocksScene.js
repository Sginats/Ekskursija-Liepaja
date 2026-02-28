import Phaser from 'phaser';

const FACTS = [
  'Liepājā aktīvi attīstās dzīvojamo ēku renovācija.',
  'Būvniecībā precizitāte samazina materiālu zudumus.',
  'Drošība būvlaukumā ir tikpat svarīga kā ātrums.',
  'Pareiza slodžu sadale ļauj ēkai kalpot ilgāk.',
];

export class TowerBlocksScene extends Phaser.Scene {
  constructor() { super({ key: 'TowerBlocks' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail = data.onFail || (() => {});
  }

  create() {
    const { width, height } = this.scale;
    this.level = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.stackWidth = 170;
    this.stackX = width / 2;
    this.y = height - 48;
    this.speed = 220;
    this.dir = 1;
    this.active = true;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0c1220);
    this.add.rectangle(width / 2, height - 18, width, 36, 0x1b263b);

    this.levelText = this.add.text(12, 10, 'Līmenis: 0', { color: '#ffffff', fontSize: '14px' });
    this.comboText = this.add.text(width - 12, 10, 'Kombo: 0', { color: '#7dd3fc', fontSize: '14px' }).setOrigin(1, 0);
    this.factText = this.add.text(width / 2, 34, '', { color: '#facc15', fontSize: '12px' }).setOrigin(0.5, 0);

    this.base = this.add.rectangle(this.stackX, this.y, this.stackWidth, 22, 0x60a5fa).setStrokeStyle(1, 0xffffff, 0.4);
    this.current = this.add.rectangle(50, this.y - 28, this.stackWidth, 22, 0x38bdf8).setStrokeStyle(1, 0xffffff, 0.5);

    this.input.on('pointerdown', () => this.lockBlock());
  }

  lockBlock() {
    if (!this.active) return;
    const cx = this.current.x;
    const overlap = this.stackWidth - Math.abs(cx - this.stackX);

    if (overlap <= 0) {
      this.active = false;
      this.onFail();
      return;
    }

    this.level += 1;
    this.combo = overlap > this.stackWidth * 0.85 ? this.combo + 1 : 0;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    this.stackWidth = overlap;
    this.stackX = (cx + this.stackX) / 2;
    this.y -= 24;

    this.levelText.setText(`Līmenis: ${this.level}`);
    this.comboText.setText(`Kombo: ${this.combo}`);

    this.current.destroy();
    this.add.rectangle(this.stackX, this.y + 24, this.stackWidth, 22, 0x60a5fa).setStrokeStyle(1, 0xffffff, 0.4);

    this.factText.setText(FACTS[(this.level - 1) % FACTS.length]);
    this.time.delayedCall(800, () => this.factText.setText(''));

    if (this.level >= 10 || this.y < 70) {
      this.active = false;
      const points = Math.max(1, Math.min(10, Math.round(this.level * 0.7 + this.maxCombo * 0.4)));
      this.onComplete(points);
      return;
    }

    this.current = this.add.rectangle(60, this.y, this.stackWidth, 22, 0x38bdf8).setStrokeStyle(1, 0xffffff, 0.5);
    this.speed = Math.min(360, this.speed + 8);
  }

  update(_, delta) {
    if (!this.active || !this.current) return;
    const { width } = this.scale;
    this.current.x += this.dir * (this.speed * delta / 1000);
    const half = this.current.width / 2;
    if (this.current.x > width - half) { this.current.x = width - half; this.dir = -1; }
    if (this.current.x < half) { this.current.x = half; this.dir = 1; }
  }
}
