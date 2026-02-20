import Phaser from 'phaser';

const SHIPS_NEEDED = 3;
const SHIP_SPEED   = 90; // px/s

export class KanalsScene extends Phaser.Scene {
  constructor() { super({ key: 'KanalsScene' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail     = data.onFail     || (() => {});
    this.isMobile   = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  create() {
    const { width, height } = this.scale;
    this.shipsPassed  = 0;
    this.bridgeRaised = false;
    this.gameActive   = true;
    this.activeShip   = null;

    const midY = height / 2;

    // Sky
    this.add.graphics().fillStyle(0x1a3a5c, 1).fillRect(0, 0, width, midY - 18);
    // Canal water
    this.add.graphics().fillStyle(0x1a4a7a, 1).fillRect(0, midY - 18, width, 36);
    // Banks
    this.add.graphics().fillStyle(0x3a5a2a, 1).fillRect(0, midY + 18, width, height - midY - 18);
    this.add.graphics().fillStyle(0x3a5a2a, 1).fillRect(0, 0, width, midY - 18).setAlpha(0.01);

    // Bridge pillars
    const bx = width / 2;
    this.bridgeLeft  = this.add.graphics();
    this.bridgeRight = this.add.graphics();
    this._drawBridge(0); // 0 = down

    this.add.text(width / 2, 10, 'Spied pogu, lai celtu tiltu!', {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#ffdd44',
    }).setOrigin(0.5, 0);

    this.statusText = this.add.text(width / 2, height - 22, `Kuģi: 0/${SHIPS_NEEDED}`, {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5, 1);

    // Raise button
    const btnW = this.isMobile ? 90 : 70;
    const btn  = this.add.graphics();
    btn.fillStyle(0x1565c0, 1);
    btn.fillRoundedRect(0, 0, btnW, 34, 8);
    btn.x = width / 2 - btnW / 2;
    btn.y = height - 60;
    btn.setInteractive(new Phaser.Geom.Rectangle(0, 0, btnW, 34), Phaser.Geom.Rectangle.Contains);

    this.btnLabel = this.add.text(width / 2, height - 43, '▲ Celt', {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    btn.on('pointerdown', () => this._raiseBridge());
    this.input.keyboard?.on('keydown-SPACE', () => this._raiseBridge());

    this._spawnShip();
  }

  _drawBridge(angle) {
    // angle: 0 = horizontal (blocking), 70 = raised
    const { width, height } = this.scale;
    const midY = height / 2;
    const bx   = width / 2;
    const len  = 28;

    this.bridgeLeft.clear();
    this.bridgeRight.clear();
    this.bridgeLeft.fillStyle(0x8b6914, 1);
    this.bridgeRight.fillStyle(0x8b6914, 1);

    // Draw relative to each graphics object's origin (which is set to bx, midY)
    this.bridgeLeft.fillRect(-len - 3, -4, len, 8);
    this.bridgeRight.fillRect(3, -4, len, 8);

    this.bridgeLeft.setAngle(angle);
    this.bridgeLeft.x = bx;
    this.bridgeLeft.y = midY;
    this.bridgeRight.setAngle(-angle);
    this.bridgeRight.x = bx;
    this.bridgeRight.y = midY;
  }

  _raiseBridge() {
    if (!this.gameActive || this.bridgeRaised) return;
    this.bridgeRaised = true;

    this.tweens.add({
      targets: this.bridgeLeft,
      angle:   { from: 0, to: 65 },
      duration: 400,
    });
    this.tweens.add({
      targets: this.bridgeRight,
      angle:   { from: 0, to: -65 },
      duration: 400,
      onComplete: () => {
        // Lower after 2.2 s
        this.time.delayedCall(2200, () => {
          this.tweens.add({
            targets: this.bridgeLeft,
            angle:   { from: 65, to: 0 },
            duration: 400,
          });
          this.tweens.add({
            targets: this.bridgeRight,
            angle:   { from: -65, to: 0 },
            duration: 400,
            onComplete: () => { this.bridgeRaised = false; },
          });
        });
      },
    });
  }

  _spawnShip() {
    if (!this.gameActive) return;
    const { width, height } = this.scale;
    const midY = height / 2;

    const ship = this.add.graphics();
    ship.fillStyle(0xb71c1c, 1);
    ship.fillRect(-22, -9, 44, 18);
    ship.fillStyle(0x777777, 1);
    ship.fillRect(-8, -16, 14, 8);
    ship.x = -30;
    ship.y = midY;
    this.activeShip = ship;

    // Check collision every 60 ms
    this.shipTimer = this.time.addEvent({
      delay: 60, loop: true,
      callback: () => {
        if (!this.gameActive || !ship.active) return;
        ship.x += (SHIP_SPEED * 0.06);
        const bx = this.scale.width / 2;
        // Ship near bridge
        if (ship.x > bx - 30 && ship.x < bx + 30) {
          if (!this.bridgeRaised) {
            // Collision!
            this._collision(ship);
          }
        }
        if (ship.x > this.scale.width + 40) {
          this._shipPassed(ship);
        }
      },
    });
  }

  _collision(ship) {
    if (!this.gameActive) return;
    this.gameActive = false;
    this.shipTimer?.remove();
    this.tweens.add({ targets: ship, alpha: 0, duration: 400 });
    this._endGame(false);
  }

  _shipPassed(ship) {
    if (!this.gameActive) return;
    this.shipTimer?.remove();
    ship.destroy();
    this.shipsPassed++;
    this.statusText.setText(`Kuģi: ${this.shipsPassed}/${SHIPS_NEEDED}`);
    if (this.shipsPassed >= SHIPS_NEEDED) { this._endGame(true); return; }
    this.time.delayedCall(1200, this._spawnShip, [], this);
  }

  _endGame(success) {
    if (!this.gameActive) return;
    this.gameActive = false;
    if (success) this.onComplete(10); else this.onFail();
  }
}
