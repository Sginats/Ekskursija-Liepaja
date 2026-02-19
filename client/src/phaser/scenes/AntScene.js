import Phaser from 'phaser';

const ANTS_REQUIRED = 5;
const GAME_TIME = 15;
const ANT_SIZE_MOBILE = 44;
const ANT_SIZE_DESKTOP = 28;

export class AntScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AntScene' });
  }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail = data.onFail || (() => {});
    this.isMobile =
      navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  create() {
    const { width, height } = this.scale;
    this.antsCaught = 0;
    this.timeLeft = GAME_TIME;
    this.gameActive = true;

    // Background
    this.add
      .rectangle(0, 0, width, height, 0x0a3a0a, 0.5)
      .setOrigin(0, 0);

    // Border
    const border = this.add.graphics();
    border.lineStyle(2, 0x4caf50, 1);
    border.strokeRect(2, 2, width - 4, height - 4);

    // Timer text
    this.timerText = this.add
      .text(width / 2, 20, `Laiks: ${GAME_TIME}s`, {
        fontFamily: 'Poppins, Arial',
        fontSize: '18px',
        color: '#ffaa00',
      })
      .setOrigin(0.5, 0);

    // Count text
    this.countText = this.add
      .text(width / 2, 48, `Nokerti: 0/${ANTS_REQUIRED}`, {
        fontFamily: 'Poppins, Arial',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    // Timer event
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: GAME_TIME - 1,
      callback: () => {
        this.timeLeft--;
        if (this.timerText) {
          this.timerText.setText(`Laiks: ${this.timeLeft}s`);
        }
        if (this.timeLeft <= 0 && this.gameActive) {
          this.endGame(false);
        }
      },
    });

    this.spawnAnt();
  }

  spawnAnt() {
    if (!this.gameActive) return;
    const { width, height } = this.scale;
    const size = this.isMobile ? ANT_SIZE_MOBILE : ANT_SIZE_DESKTOP;
    const hitPad = this.isMobile ? 16 : 6;
    const margin = size + hitPad + 10;

    const x = Phaser.Math.Between(margin, width - margin);
    const y = Phaser.Math.Between(margin + 60, height - margin);

    const ant = this.add
      .text(x, y, 'X', {
        fontFamily: 'Poppins, monospace',
        fontSize: `${size}px`,
        color: '#c0392b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive(
        new Phaser.Geom.Circle(0, 0, size / 2 + hitPad),
        Phaser.Geom.Circle.Contains
      );

    ant.on('pointerdown', () => {
      if (!this.gameActive) return;
      this.antsCaught++;
      this.countText.setText(`Nokerti: ${this.antsCaught}/${ANTS_REQUIRED}`);

      // Feedback flash
      this.tweens.add({
        targets: ant,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 180,
        onComplete: () => ant.destroy(),
      });

      if (this.antsCaught >= ANTS_REQUIRED) {
        this.endGame(true);
      } else {
        this.time.delayedCall(300, () => this.spawnAnt());
      }
    });

    // Extra ants after catching a few
    if (this.antsCaught > 2 && this.gameActive) {
      const moveDelay = this.isMobile ? 1600 : 900;
      this.time.addEvent({
        delay: moveDelay,
        loop: true,
        callback: () => {
          if (!ant.active || !this.gameActive) return;
          const nx = Phaser.Math.Between(margin, width - margin);
          const ny = Phaser.Math.Between(margin + 60, height - margin);
          this.tweens.add({ targets: ant, x: nx, y: ny, duration: 300 });
        },
      });
    }
  }

  endGame(success) {
    if (!this.gameActive) return;
    this.gameActive = false;
    if (this.timerEvent) this.timerEvent.remove();

    if (success) {
      this.onComplete(10);
    } else {
      this.onFail();
    }
  }
}
