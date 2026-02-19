import Phaser from 'phaser';

const COINS_NEEDED = 10;
const GAME_TIME    = 20;

export class LSEZScene extends Phaser.Scene {
  constructor() { super({ key: 'LSEZScene' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail     = data.onFail     || (() => {});
    this.isMobile   = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  create() {
    const { width, height } = this.scale;
    this.coinsCaught = 0;
    this.timeLeft    = GAME_TIME;
    this.gameActive  = true;

    // Background
    this.add.graphics().fillStyle(0x0a1a30, 1).fillRect(0, 0, width, height);
    this.add.graphics().lineStyle(2, 0x1565c0, 1).strokeRect(2, 2, width - 4, height - 4);

    // HUD
    this.add.text(width / 2, 12, `Savāc ${COINS_NEEDED} investīciju monētas!`, {
      fontFamily: 'Poppins, Arial', fontSize: '13px', color: '#ffd700',
    }).setOrigin(0.5, 0);

    this.timerText = this.add.text(12, 12, `${GAME_TIME}s`, {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#aaffaa',
    });
    this.countText = this.add.text(width - 12, 12, `0/${COINS_NEEDED}`, {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#ffd700',
    }).setOrigin(1, 0);

    // Basket
    const bw = this.isMobile ? 64 : 50;
    this.basket = this.add.graphics();
    this.basket.fillStyle(0x4a90d9, 1);
    this.basket.fillRect(-bw / 2, -12, bw, 24);
    this.basket.fillStyle(0x6cb4f0, 0.5);
    this.basket.fillRect(-bw / 2 + 4, -8, bw - 8, 10);
    this.basket.x = width / 2;
    this.basket.y = height - 22;
    this._bw = bw;

    // Follow pointer / touch
    this.input.on('pointermove', (ptr) => { this.basket.x = Phaser.Math.Clamp(ptr.x, bw / 2, width - bw / 2); });

    // Spawn coins
    this.time.addEvent({ delay: 650, loop: true, callback: this._spawnCoin, callbackScope: this });

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

    this.coins = [];
  }

  _spawnCoin() {
    if (!this.gameActive) return;
    const { width } = this.scale;
    const coin = this.add.graphics();
    coin.fillStyle(0xffd700, 1);
    coin.fillCircle(0, 0, 10);
    coin.fillStyle(0xffee88, 0.7);
    coin.fillCircle(-3, -3, 4);
    coin.x = Phaser.Math.Between(16, width - 16);
    coin.y = -10;
    this.coins.push(coin);
  }

  update(time, delta) {
    if (!this.gameActive) return;
    const speed = 200 * (delta / 1000);
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (!c.active) { this.coins.splice(i, 1); continue; }
      c.y += speed;
      // Catch check
      if (
        c.y >= this.basket.y - 20 &&
        c.y <= this.basket.y + 12 &&
        Math.abs(c.x - this.basket.x) < this._bw / 2 + 10
      ) {
        c.destroy();
        this.coins.splice(i, 1);
        this.coinsCaught++;
        this.countText.setText(`${this.coinsCaught}/${COINS_NEEDED}`);
        if (this.coinsCaught >= COINS_NEEDED) this._endGame(true);
      } else if (c.y > this.scale.height + 20) {
        c.destroy();
        this.coins.splice(i, 1);
      }
    }
  }

  _endGame(success) {
    if (!this.gameActive) return;
    this.gameActive = false;
    if (this.timerEvent) this.timerEvent.remove();
    if (success) this.onComplete(10); else this.onFail();
  }
}
