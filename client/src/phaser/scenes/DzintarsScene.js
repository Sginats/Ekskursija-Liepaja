import Phaser from 'phaser';

const AMBER_NEEDED = 5;
const GAME_TIME    = 20;

export class DzintarsScene extends Phaser.Scene {
  constructor() { super({ key: 'DzintarsScene' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail     = data.onFail     || (() => {});
    this.isMobile   = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  create() {
    const { width, height } = this.scale;
    this.amberCaught = 0;
    this.timeLeft    = GAME_TIME;
    this.gameActive  = true;
    this.objects     = [];

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0800, 0x1a0800, 0x0d0400, 0x0d0400, 1);
    bg.fillRect(0, 0, width, height);

    const border = this.add.graphics();
    border.lineStyle(2, 0xff8800, 1);
    border.strokeRect(2, 2, width - 4, height - 4);

    this.add.text(width / 2, 14, 'Savāc 5 dzintarus!', {
      fontFamily: 'Poppins, Arial', fontSize: '15px', color: '#ff8800',
    }).setOrigin(0.5, 0);

    this.timerText = this.add.text(12, 14, `${GAME_TIME}s`, {
      fontFamily: 'Poppins, Arial', fontSize: '15px', color: '#ffcc00',
    });
    this.countText = this.add.text(width - 12, 14, `0/${AMBER_NEEDED}`, {
      fontFamily: 'Poppins, Arial', fontSize: '15px', color: '#ffffff',
    }).setOrigin(1, 0);

    // Decoy stones
    for (let i = 0; i < 6; i++) this._spawnStone();
    // Initial ambers
    for (let i = 0; i < 3; i++) this._spawnAmber();

    // Periodic movement
    this.time.addEvent({ delay: 1400, loop: true, callback: this._moveAll, callbackScope: this });

    // Countdown
    this.timerEvent = this.time.addEvent({
      delay: 1000, repeat: GAME_TIME - 1,
      callback: () => {
        this.timeLeft--;
        if (this.timerText) this.timerText.setText(`${this.timeLeft}s`);
        if (this.timerText && this.timeLeft <= 5) this.timerText.setColor('#f44336');
        if (this.timeLeft <= 0 && this.gameActive) this._endGame(false);
      },
    });
  }

  _spawnStone() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillStyle(0x555555, 1);
    g.fillCircle(0, 0, 13);
    g.fillStyle(0x777777, 0.6);
    g.fillCircle(-4, -4, 5);
    g.x = Phaser.Math.Between(35, width - 35);
    g.y = Phaser.Math.Between(45, height - 20);
    this.objects.push({ g, type: 'stone' });
  }

  _spawnAmber() {
    if (!this.gameActive) return;
    const { width, height } = this.scale;
    const r  = this.isMobile ? 20 : 14;
    const g  = this.add.graphics();
    g.fillStyle(0xff8800, 1);
    g.fillCircle(0, 0, r);
    g.fillStyle(0xffdd00, 0.7);
    g.fillCircle(-3, -3, r * 0.45);
    g.x = Phaser.Math.Between(40, width - 40);
    g.y = Phaser.Math.Between(46, height - 22);

    g.setInteractive(new Phaser.Geom.Circle(0, 0, r + (this.isMobile ? 14 : 7)), Phaser.Geom.Circle.Contains);
    g.on('pointerdown', () => {
      if (!this.gameActive) return;
      this.amberCaught++;
      this.countText.setText(`${this.amberCaught}/${AMBER_NEEDED}`);
      const idx = this.objects.findIndex(o => o.g === g);
      if (idx !== -1) this.objects.splice(idx, 1);
      this.tweens.add({ targets: g, alpha: 0, scaleX: 2.2, scaleY: 2.2, duration: 200, onComplete: () => g.destroy() });
      if (this.amberCaught >= AMBER_NEEDED) {
        this._endGame(true);
      } else {
        this.time.delayedCall(400, this._spawnAmber, [], this);
      }
    });
    this.objects.push({ g, type: 'amber' });
  }

  _moveAll() {
    if (!this.gameActive) return;
    const { width, height } = this.scale;
    this.objects.forEach(({ g }) => {
      const nx = Phaser.Math.Between(35, width - 35);
      const ny = Phaser.Math.Between(45, height - 20);
      this.tweens.add({ targets: g, x: nx, y: ny, duration: 700, ease: 'Sine.easeInOut' });
    });
  }

  _endGame(success) {
    if (!this.gameActive) return;
    this.gameActive = false;
    if (this.timerEvent) this.timerEvent.remove();
    if (success) this.onComplete(10); else this.onFail();
  }
}
