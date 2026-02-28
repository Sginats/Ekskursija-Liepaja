import Phaser from 'phaser';
import EventBridge from '../../utils/EventBridge.js';
import SpeedController from '../../utils/SpeedController.js';

/**
 * RegattaScene
 * Simple dodge/survive mini-game:
 * - Move boat left/right with arrow keys (or A/D).
 * - Avoid floating hazards.
 * - Survive until timer hits 0 to win.
 *
 * Config (scene data):
 *   timeLimit seconds (default 30)
 */
export default class RegattaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RegattaScene' });
  }

  init(data) {
    this._cfg = data || {};
    this._timeLeft = this._cfg.timeLimit ?? 30;
    this._active = true;
    this._timer = null;
    this._spawn = null;
    this._hazards = null;
  }

  create() {
    const { width, height } = this.scale;

    // Background sea gradient
    const g = this.add.graphics();
    g.fillGradientStyle(0x001a3a, 0x001a3a, 0x000814, 0x000814, 1);
    g.fillRect(0, 0, width, height);

    // Light wave lines
    const waves = this.add.graphics();
    for (let i = 0; i < 10; i++) {
      waves.lineStyle(2, 0xffffff, 0.06);
      const y = 40 + i * 50;
      waves.beginPath();
      waves.moveTo(0, y);
      waves.quadraticCurveTo(width * 0.25, y + 10, width * 0.5, y);
      waves.quadraticCurveTo(width * 0.75, y - 10, width, y);
      waves.strokePath();
    }

    this.add.text(width / 2, 14, this._cfg.label || 'Ostas regate', {
      fontSize: '18px',
      fontFamily: 'Poppins, Arial',
      color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(10);

    this._timerText = this.add.text(width - 12, 12, `${this._timeLeft}s`, {
      fontSize: '18px',
      fontFamily: 'Poppins, Arial',
      color: '#ffffff',
    }).setOrigin(1, 0).setDepth(10);

    // Physics group for hazards
    this._hazards = this.physics.add.group();

    // Player boat
    this._boat = this.physics.add.image(width / 2, height - 60, null);
    // Use a text object as a texture-like display
    const boatText = this.add.text(this._boat.x, this._boat.y, '⛵', { fontSize: '40px' }).setOrigin(0.5);
    this._boat.setCircle(18);
    this._boat.setImmovable(true);
    this._boat.body.allowGravity = false;

    // Keep text synced to physics body
    this.events.on('update', () => {
      boatText.setPosition(this._boat.x, this._boat.y);
    });

    // Input
    this._cursors = this.input.keyboard.createCursorKeys();
    this._keys = this.input.keyboard.addKeys('A,D');

    // Collisions
    this.physics.add.overlap(this._boat, this._hazards, () => this._finish(false), null, this);

    // Hazard spawner
    this._spawn = this.time.addEvent({
      delay: SpeedController.scale(650),
      loop: true,
      callback: this._spawnHazard,
      callbackScope: this,
    });

    // Timer
    this._timer = this.time.addEvent({
      delay: SpeedController.scale(1000),
      loop: true,
      callback: this._tick,
      callbackScope: this,
    });
  }

  update() {
    if (!this._active) return;
    const { width } = this.scale;

    const left = this._cursors.left.isDown || this._keys.A.isDown;
    const right = this._cursors.right.isDown || this._keys.D.isDown;

    const speed = 240;
    if (left && !right) this._boat.setVelocityX(-speed);
    else if (right && !left) this._boat.setVelocityX(speed);
    else this._boat.setVelocityX(0);

    // Clamp inside screen
    this._boat.x = Phaser.Math.Clamp(this._boat.x, 26, width - 26);

    // Cleanup hazards that left screen
    this._hazards.children.iterate(h => {
      if (!h) return;
      if (h.y > this.scale.height + 40) h.destroy();
    });
  }

  _spawnHazard() {
    if (!this._active) return;
    const { width } = this.scale;

    const x = Phaser.Math.Between(30, width - 30);
    const y = -30;

    // Use physics image with no texture + a synced emoji text
    const body = this.physics.add.image(x, y, null);
    body.setCircle(16);
    body.body.allowGravity = false;
    body.setVelocityY(Phaser.Math.Between(120, 200));

    const emoji = Phaser.Math.RND.pick(['🪨', '⚓', '🌊']);
    const display = this.add.text(x, y, emoji, { fontSize: '34px' }).setOrigin(0.5);

    // Sync display to body and destroy together
    body._display = display;
    body.on('destroy', () => display.destroy());

    this.events.on('update', () => {
      if (!body.active) return;
      display.setPosition(body.x, body.y);
    });

    this._hazards.add(body);
  }

  _tick() {
    if (!this._active) return;
    this._timeLeft -= 1;
    this._timerText.setText(`${this._timeLeft}s`);
    if (this._timeLeft <= 5) this._timerText.setColor('#ff4444');
    if (this._timeLeft <= 0) this._finish(true);
  }

  _finish(success) {
    if (!this._active) return;
    this._active = false;

    this._timer?.remove();
    this._spawn?.remove();
    this._hazards?.clear(true, true);
    this._boat?.setVelocity(0, 0);

    const { width, height } = this.scale;
    const pts = success ? (this._timeLeft > (this._cfg.timeLimit ?? 30) * 0.5 ? 8 : 4) : 0;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    this.add.text(width / 2, height / 2 - 16, success ? '✓ Finišs!' : '✗ Sadursme!', {
      fontSize: '26px',
      fontFamily: 'Poppins, Arial',
      color: success ? '#4caf50' : '#f44336',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 18, success ? `+${pts} bonuss` : 'Izvairies no šķēršļiem!', {
      fontSize: '16px',
      fontFamily: 'Poppins, Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.time.delayedCall(SpeedController.scale(1200), () => {
      EventBridge.emit('MINIGAME_COMPLETE', { success, bonusPoints: pts });
    });
  }
}
