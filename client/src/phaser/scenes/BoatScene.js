import Phaser from 'phaser';

const CONFIG = {
  REQUIRED_PRESSES: 10,
  EXCELLENT_TIME: 3,
  GOOD_TIME: 5,
  SLOW_TIME: 10,
  EXCELLENT_POINTS: 15,
  GOOD_POINTS: 12,
  NORMAL_POINTS: 10,
  SLOW_POINTS: 5,
};

export class BoatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BoatScene' });
  }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
  }

  create() {
    const { width, height } = this.scale;
    this.pressCount = 0;
    this.raceActive = false;
    this.startTime = 0;
    this.isMobile = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

    // Water background
    const grad = this.add.graphics();
    grad.fillGradientStyle(0x1e5a8a, 0x1e5a8a, 0x0e3d5e, 0x0e3d5e, 1);
    grad.fillRect(0, 0, width, height);

    // Title
    this.add
      .text(width / 2, 20, 'Ostas Regate', {
        fontFamily: 'Poppins, Arial',
        fontSize: '22px',
        color: '#ffaa00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);

    // Instruction
    const instruction = this.isMobile
      ? `Spied pogu ${CONFIG.REQUIRED_PRESSES} reizes pec iespeja atraki!`
      : `Spied SPACE ${CONFIG.REQUIRED_PRESSES} reizes pec iespeja atraki!`;

    this.instructionText = this.add
      .text(width / 2, 55, instruction, {
        fontFamily: 'Poppins, Arial',
        fontSize: '13px',
        color: '#cccccc',
        wordWrap: { width: width - 40 },
        align: 'center',
      })
      .setOrigin(0.5, 0);

    // Timer
    this.timerText = this.add
      .text(width / 2, height / 2 - 40, '0.00 s', {
        fontFamily: 'Poppins, Arial',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Progress
    this.progressText = this.add
      .text(width / 2, height / 2 + 10, `Spiedienu skaits: 0/${CONFIG.REQUIRED_PRESSES}`, {
        fontFamily: 'Poppins, Arial',
        fontSize: '16px',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    // Start / tap button
    const btnBg = this.add
      .rectangle(width / 2, height - 60, 200, 50, 0x332222)
      .setInteractive({ useHandCursor: true });
    btnBg.setStrokeStyle(2, 0xffaa00);

    this.btnText = this.add
      .text(width / 2, height - 60, 'SAKT', {
        fontFamily: 'Poppins, Arial',
        fontSize: '18px',
        color: '#ffaa00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    btnBg.on('pointerdown', () => this.handlePress());
    btnBg.on('pointerover', () => btnBg.setFillColor(0x4a3333));
    btnBg.on('pointerout', () => btnBg.setFillColor(0x332222));
    this.btnBg = btnBg;

    // Keyboard
    this.input.keyboard.on('keydown-SPACE', () => this.handlePress());
  }

  handlePress() {
    if (!this.raceActive) {
      this.startRace();
      return;
    }
    this.pressCount++;
    this.progressText.setText(
      `Spiedienu skaits: ${this.pressCount}/${CONFIG.REQUIRED_PRESSES}`
    );
    // Visual feedback
    this.tweens.add({
      targets: this.btnBg,
      scaleX: 0.92,
      scaleY: 0.92,
      duration: 60,
      yoyo: true,
    });
    if (this.pressCount >= CONFIG.REQUIRED_PRESSES) {
      this.finishRace();
    }
  }

  startRace() {
    this.raceActive = true;
    this.pressCount = 0;
    this.startTime = this.time.now;
    this.btnText.setText('SPIED!');

    this.timerUpdater = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!this.raceActive) return;
        const elapsed = ((this.time.now - this.startTime) / 1000).toFixed(2);
        if (this.timerText) this.timerText.setText(`${elapsed} s`);
      },
    });
  }

  finishRace() {
    this.raceActive = false;
    if (this.timerUpdater) this.timerUpdater.remove();

    const finalTime = ((this.time.now - this.startTime) / 1000).toFixed(2);
    let points = CONFIG.NORMAL_POINTS;
    if (finalTime < CONFIG.EXCELLENT_TIME) points = CONFIG.EXCELLENT_POINTS;
    else if (finalTime < CONFIG.GOOD_TIME) points = CONFIG.GOOD_POINTS;
    else if (finalTime > CONFIG.SLOW_TIME) points = CONFIG.SLOW_POINTS;

    this.onComplete(points, parseFloat(finalTime));
  }
}
