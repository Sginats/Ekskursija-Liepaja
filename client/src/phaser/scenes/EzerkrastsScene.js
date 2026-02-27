import Phaser from 'phaser';

const GAME_TIME  = 22;
const SCOPE_R    = 55; // binocular viewport radius

export class EzerkrastsScene extends Phaser.Scene {
  constructor() { super({ key: 'EzerkrastsScene' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail     = data.onFail     || (() => {});
    this.isMobile   = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  create() {
    const { width, height } = this.scale;
    this.timeLeft   = GAME_TIME;
    this.gameActive = true;
    this.scopeX     = width / 2;
    this.scopeY     = height / 2;

    // Lake background
    this.add.graphics().fillStyle(0x0d3349, 1).fillRect(0, 0, width, height);
    // Reed silhouettes along bottom
    const reeds = this.add.graphics();
    reeds.fillStyle(0x1b3a1b, 1);
    for (let x = 0; x < width; x += 14) {
      const h = Phaser.Math.Between(40, 80);
      reeds.fillRect(x + 3, height - h, 5, h);
    }
    reeds.fillStyle(0x0d2a0d, 1);
    for (let x = 0; x < width; x += 20) {
      const h = Phaser.Math.Between(25, 55);
      reeds.fillRect(x + 8, height - h, 7, h);
    }

    // Hidden swan (white oval) at random position in upper 60 % of canvas
    this.birdX = Phaser.Math.Between(40, width - 40);
    this.birdY = Phaser.Math.Between(40, height * 0.6);
    const bird = this.add.graphics();
    bird.fillStyle(0xf5f5f5, 1);
    bird.fillEllipse(0, 0, 34, 22);
    bird.fillStyle(0xffcc99, 1);
    bird.fillEllipse(14, -6, 10, 8);    // head
    bird.fillStyle(0xff8800, 1);
    bird.fillTriangle(18, -4, 24, -8, 24, -2); // beak
    bird.x = this.birdX;
    bird.y = this.birdY;
    this.birdObj = bird;

    // Dark fog overlay — drawn as a rectangle mask effect using a large dark rect with an opaque fill
    // We redraw the scope circle on top each frame via _drawScope()
    this.overlay = this.add.graphics();
    this._drawScope();

    // Scope circle (viewport indicator ring)
    this.scopeRing = this.add.graphics();
    this._drawRing();

    // HUD
    this.timerText = this.add.text(12, 12, `${GAME_TIME}s`, {
      fontFamily: 'Poppins, Arial', fontSize: '15px', color: '#aaffaa',
    }).setDepth(10);
    this.add.text(width / 2, 12, 'Atrod paslēpto gulbi!', {
      fontFamily: 'Poppins, Arial', fontSize: '13px', color: '#aaddff',
    }).setOrigin(0.5, 0).setDepth(10);

    this.input.on('pointermove', (ptr) => {
      this.scopeX = ptr.x;
      this.scopeY = ptr.y;
    });
    this.input.on('pointerdown', (ptr) => {
      this.scopeX = ptr.x;
      this.scopeY = ptr.y;
    });

    // Timer countdown
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

  update() {
    if (!this.gameActive) return;
    this._drawScope();
    this._drawRing();

    // Check if scope covers bird
    const dx = this.scopeX - this.birdX;
    const dy = this.scopeY - this.birdY;
    if (Math.sqrt(dx * dx + dy * dy) < SCOPE_R - 12) {
      // Flash bird visible then win
      this.birdObj.setVisible(true);
      this._endGame(true);
    }
  }

  _drawScope() {
    if (!this.overlay) return;
    const { width, height } = this.scale;
    this.overlay.clear();
    // Full dark overlay
    this.overlay.fillStyle(0x000a14, 0.92);
    this.overlay.fillRect(0, 0, width, height);
    // Punch-out circle (clear it by using a contrasting lighter colour — approximation)
    // This simulates a binocular view; the bird is only revealed when inside the scope area.
    // We simply hide the overlay within the scope radius by drawing a semi-transparent circle.
    this.overlay.fillStyle(0x000a14, 0); // transparent
    this.overlay.fillCircle(this.scopeX, this.scopeY, SCOPE_R);
    // Draw actual lake colour in scope
    this.overlay.fillStyle(0x0d3349, 1);
    // We can't truly punch a hole; instead keep the bird visible only when scope overlaps it.
    // The bird object visibility is managed in update().
    this.birdObj?.setVisible(false);
  }

  _drawRing() {
    if (!this.scopeRing) return;
    this.scopeRing.clear();
    this.scopeRing.lineStyle(3, 0x88ccff, 1);
    this.scopeRing.strokeCircle(this.scopeX, this.scopeY, SCOPE_R);
    // Cross-hairs
    this.scopeRing.lineStyle(1, 0x88ccff, 0.5);
    this.scopeRing.lineBetween(this.scopeX - SCOPE_R, this.scopeY, this.scopeX + SCOPE_R, this.scopeY);
    this.scopeRing.lineBetween(this.scopeX, this.scopeY - SCOPE_R, this.scopeX, this.scopeY + SCOPE_R);
  }

  _endGame(success) {
    if (!this.gameActive) return;
    this.gameActive = false;
    if (this.timerEvent) this.timerEvent.remove();
    if (success) {
      // Flash bird
      this.birdObj?.setVisible(true);
      this.tweens.add({
        targets: this.birdObj, scaleX: 1.8, scaleY: 1.8, duration: 300,
        onComplete: () => this.onComplete(10),
      });
    } else {
      this.onFail();
    }
  }
}
