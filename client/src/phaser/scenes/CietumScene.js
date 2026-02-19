import Phaser from 'phaser';

const ROUNDS_NEEDED = 3;
const HIGHLIGHT_TIME = 1800; // ms the correct key glows

export class CietumScene extends Phaser.Scene {
  constructor() { super({ key: 'CietumScene' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail     = data.onFail     || (() => {});
    this.isMobile   = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  create() {
    const { width, height } = this.scale;
    this.roundsPassed = 0;
    this.gameActive   = true;

    // Dark cell background
    const bg = this.add.graphics();
    bg.fillStyle(0x111111, 1).fillRect(0, 0, width, height);
    bg.lineStyle(3, 0x444444, 1).strokeRect(2, 2, width - 4, height - 4);
    // Horizontal brick lines
    for (let y = 20; y < height; y += 22) {
      bg.lineStyle(1, 0x1e1e1e, 1).lineBetween(0, y, width, y);
    }

    this.add.text(width / 2, 12, 'Atceries pareizo atslēgu!', {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#ffaa44',
    }).setOrigin(0.5, 0);

    this.roundText = this.add.text(width - 12, 12, `${this.roundsPassed}/${ROUNDS_NEEDED}`, {
      fontFamily: 'Poppins, Arial', fontSize: '14px', color: '#ffffff',
    }).setOrigin(1, 0);

    this.hintText = this.add.text(width / 2, height - 18, 'Skatīties…', {
      fontFamily: 'Poppins, Arial', fontSize: '13px', color: '#aaaaaa',
    }).setOrigin(0.5, 1);

    this._startRound();
  }

  _startRound() {
    if (!this.gameActive) return;

    // Clear old keys
    if (this.keyObjects) this.keyObjects.forEach(k => k.destroy());
    this.keyObjects = [];

    const { width, height } = this.scale;
    const KEY_SHAPES = ['🗝', '🔑', '⬡', '⬢', '✦', '⬤', '▲', '◆'];
    const correctIdx = Phaser.Math.Between(0, KEY_SHAPES.length - 1);
    this.correctShape = KEY_SHAPES[correctIdx];
    this.revealed = false;

    const cols = 4, rows = 2;
    const cellW = (width - 24) / cols;
    const cellH = 80;
    const startY = height / 2 - cellH * rows / 2 + 8;

    KEY_SHAPES.forEach((shape, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x   = 12 + col * cellW + cellW / 2;
      const y   = startY + row * cellH;

      const box = this.add.graphics();
      const isCorrect = i === correctIdx;

      // Draw key box (highlighted briefly at start)
      const drawBox = (highlight) => {
        box.clear();
        box.lineStyle(2, highlight ? 0xffd700 : 0x444444, 1);
        box.fillStyle(highlight ? 0x3a2a00 : 0x1a1a1a, 1);
        box.fillRoundedRect(-cellW / 2 + 4, -cellH / 2 + 4, cellW - 8, cellH - 8, 6);
        box.strokeRoundedRect(-cellW / 2 + 4, -cellH / 2 + 4, cellW - 8, cellH - 8, 6);
      };
      drawBox(isCorrect);
      box.x = x; box.y = y;

      const label = this.add.text(x, y, shape, {
        fontFamily: 'Poppins, Arial', fontSize: this.isMobile ? '26px' : '22px',
        color: isCorrect ? '#ffd700' : '#888888',
      }).setOrigin(0.5);

      const hitW = cellW - 8, hitH = cellH - 8;
      box.setInteractive(new Phaser.Geom.Rectangle(-hitW / 2, -hitH / 2, hitW, hitH), Phaser.Geom.Rectangle.Contains);

      box.on('pointerdown', () => {
        if (!this.gameActive || !this.revealed) return;
        if (shape === this.correctShape) {
          this.roundsPassed++;
          this.roundText.setText(`${this.roundsPassed}/${ROUNDS_NEEDED}`);
          this.hintText.setText('Pareizi! ✓').setColor('#4caf50');
          if (this.roundsPassed >= ROUNDS_NEEDED) {
            this.time.delayedCall(600, () => this._endGame(true));
          } else {
            this.time.delayedCall(700, () => this._startRound());
          }
        } else {
          this.hintText.setText('Nepareizi! Mēģini velreiz.').setColor('#f44336');
          this._endGame(false);
        }
      });

      this.keyObjects.push(box, label);

      // Remove highlight after HIGHLIGHT_TIME
      this.time.delayedCall(HIGHLIGHT_TIME, () => {
        if (!this.gameActive) return;
        drawBox(false);
        label.setColor('#888888');
        if (i === correctIdx) {
          // All revealed — player can now click
          this.revealed = true;
          this.hintText.setText('Kurā bija zelta atslēga?').setColor('#ffaa44');
        }
      });
    });
  }

  _endGame(success) {
    if (!this.gameActive) return;
    this.gameActive = false;
    if (success) this.onComplete(10); else this.onFail();
  }
}
