import Phaser from 'phaser';
import EventBridge from '../../utils/EventBridge.js';

export default class CatcherScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CatcherScene' });
  }

  init(data) {
    this._cfg = data;
    this._caught = 0;
    this._timeLeft = data.timeLimit;
    this._active = true;
    this._spawnTimer = null;
    this._countdownTimer = null;
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

    this._spawnTimer = this.time.addEvent({
      delay: cfg.spawnRate,
      callback: this._spawnItem,
      callbackScope: this,
      loop: true,
    });

    this._countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: this._tick,
      callbackScope: this,
      loop: true,
    });

    this.input.on('pointermove', (ptr) => {
      if (this._active) this._basket.x = Phaser.Math.Clamp(ptr.x, 24, width - 24);
    });

    this._spawnItem();
  }

  _spawnItem() {
    if (!this._active) return;
    const cfg = this._cfg;
    const { width } = this.scale;
    const allItems = [...cfg.collect, ...cfg.avoid];
    const symbol = allItems[Math.floor(Math.random() * allItems.length)];
    const isGood = cfg.collect.includes(symbol);
    const speed = Phaser.Math.Between(cfg.fallSpeed.min, cfg.fallSpeed.max);

    const item = this.add.text(
      Phaser.Math.Between(20, width - 20),
      -30,
      symbol,
      { fontSize: '32px' }
    ).setData({ good: isGood, speed });

    this._items.add(item);
  }

  update() {
    if (!this._active) return;
    const { height } = this.scale;
    const bx = this._basket.x;
    const by = this._basket.y;

    this._items.getChildren().forEach((item) => {
      item.y += item.getData('speed') * (1 / 60);
      const dx = Math.abs(item.x - bx);
      const dy = Math.abs(item.y - by);
      if (dx < 40 && dy < 30) {
        if (item.getData('good')) {
          this._caught++;
          this._scoreText.setText(`${this._caught} / ${this._cfg.required}`);
          this._flashBasket(0x00ff00);
          if (this._caught >= this._cfg.required) this._finish(true);
        } else {
          this._flashBasket(0xff0000);
        }
        item.destroy();
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
    this.tweens.add({
      targets: this._basket,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
    });
  }

  _finish(success) {
    if (!this._active) return;
    this._active = false;
    this._spawnTimer?.remove();
    this._countdownTimer?.remove();

    const { width, height } = this.scale;
    const pts = success ? (this._timeLeft > this._cfg.timeLimit * 0.5 ? 5 : 3) : 0;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    this.add
      .text(width / 2, height / 2 - 20, success ? '✓ Labi padarīts!' : '✗ Laiks beidzās!', {
        fontSize: '26px',
        fontFamily: 'Poppins, Arial',
        color: success ? '#4caf50' : '#f44336',
      })
      .setOrigin(0.5);

    this.time.delayedCall(1400, () => {
      EventBridge.emit('MINIGAME_COMPLETE', { success, bonusPoints: pts });
    });
  }
}
