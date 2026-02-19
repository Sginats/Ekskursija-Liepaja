import Phaser from 'phaser';

const CFG = {
  TENSION_INCREASE: 0.6,
  TENSION_DECREASE: 0.4,
  START_DISTANCE: 15.0,
  PROGRESS_DECAY: 0.005,
  DEADLINE_THRESHOLD: 80,
  FAIL_TIME_MAX: 1.5,
  FISH_PULL_CHANCE: 0.015,
  FISH_PULL_STRENGTH: 0.5,
  EXCELLENT_TIME: 10,
  GOOD_TIME: 20,
  EXCELLENT_POINTS: 15,
  GOOD_POINTS: 10,
  NORMAL_POINTS: 5,
};

export class FishingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FishingScene' });
  }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail = data.onFail || (() => {});
  }

  create() {
    const { width, height } = this.scale;
    this.holding = false;
    this.tension = 0;
    this.distance = CFG.START_DISTANCE;
    this.failTimer = 0;
    this.fishPullTimer = 0;
    this.waveOffset = 0;
    this.active_ = true;
    this.startTime = this.time.now;
    this.isMobile = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

    // ---- Water sky gradient ----
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x5fb8e0, 0x5fb8e0, 0x3a8fbf, 0x3a8fbf, 1);
    sky.fillRect(0, 0, width, height * 0.5);
    const water = this.add.graphics();
    water.fillGradientStyle(0x3a8fbf, 0x3a8fbf, 0x0e3d5e, 0x0e3d5e, 1);
    water.fillRect(0, height * 0.5, width, height * 0.5);

    // ---- Canvas for dynamic drawing ----
    this.fishCanvas = this.add.graphics();

    // ---- Tension bar background ----
    const barW = Math.min(200, width * 0.5);
    this.tensionBarBg = this.add
      .rectangle(width / 2, 28, barW + 4, 22, 0x000000, 0.5)
      .setOrigin(0.5);
    this.tensionBar = this.add
      .rectangle(width / 2 - barW / 2, 28, 0, 18, 0x44ff44)
      .setOrigin(0, 0.5);
    this.tensionBarWidth = barW;
    this.tensionBarX = width / 2 - barW / 2;

    this.tensionLabel = this.add
      .text(width / 2, 44, 'Spriegums', {
        fontFamily: 'Poppins, Arial',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.8)',
      })
      .setOrigin(0.5, 0);

    this.warningText = this.add
      .text(width / 2, 58, '', {
        fontFamily: 'Poppins, Arial',
        fontSize: '14px',
        color: '#ff3232',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);

    // ---- Distance text ----
    this.distanceText = this.add
      .text(width / 2, height - 30, `${CFG.START_DISTANCE.toFixed(2)} m`, {
        fontFamily: 'Poppins, Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 1);

    this.distLabel = this.add
      .text(width / 2, height - 14, 'Attālums lidz zivij', {
        fontFamily: 'Poppins, Arial',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.5)',
      })
      .setOrigin(0.5, 1);

    // ---- Hold button ----
    const btnSize = this.isMobile ? 70 : 60;
    this.holdBtn = this.add
      .circle(width - btnSize / 2 - 15, height - btnSize / 2 - 15, btnSize / 2, 0xffd700)
      .setInteractive({ useHandCursor: true, draggable: false });

    this.holdBtnLabel = this.add
      .text(
        width - btnSize / 2 - 15,
        height - btnSize / 2 - 15,
        this.isMobile ? 'TURI' : 'SPACE',
        { fontFamily: 'Poppins, Arial', fontSize: '13px', color: '#333333', fontStyle: 'bold' }
      )
      .setOrigin(0.5);

    this.holdBtn.on('pointerdown', () => { this.holding = true; });
    this.holdBtn.on('pointerup', () => { this.holding = false; });
    this.holdBtn.on('pointerout', () => { this.holding = false; });

    this.input.keyboard.on('keydown-SPACE', () => { this.holding = true; });
    this.input.keyboard.on('keyup-SPACE', () => { this.holding = false; });

    // ---- Game loop ----
    this.time.addEvent({ delay: 16, loop: true, callback: this.gameLoop, callbackScope: this });
  }

  gameLoop() {
    if (!this.active_) return;
    const { width, height } = this.scale;

    // Fish random pull
    if (Math.random() < CFG.FISH_PULL_CHANCE) this.fishPullTimer = 15;
    const fishPulling = this.fishPullTimer > 0;
    if (this.fishPullTimer > 0) this.fishPullTimer--;

    // Physics
    if (this.holding) {
      this.tension += CFG.TENSION_INCREASE + (fishPulling ? CFG.FISH_PULL_STRENGTH : 0);
      this.distance -= 0.05;
    } else {
      this.tension -= CFG.TENSION_DECREASE;
      this.distance += CFG.PROGRESS_DECAY + (fishPulling ? 0.02 : 0);
    }
    this.tension = Phaser.Math.Clamp(this.tension, 0, 100);
    this.distance = Phaser.Math.Clamp(this.distance, 0, CFG.START_DISTANCE);

    // Fail condition
    if (this.tension >= CFG.DEADLINE_THRESHOLD) {
      this.failTimer += 0.016;
      if (this.failTimer >= CFG.FAIL_TIME_MAX || this.tension >= 100) {
        this.endGame(false);
        return;
      }
    } else {
      this.failTimer = Math.max(0, this.failTimer - 0.01);
    }

    if (this.distance <= 0) { this.endGame(true); return; }

    // Update UI
    this.waveOffset += 0.03;

    // Tension bar color
    const ratio = this.tension / 100;
    const r = Math.min(255, Math.round(ratio * 510));
    const g = Math.min(255, Math.round((1 - ratio) * 510));
    this.tensionBar.width = (this.tension / 100) * this.tensionBarWidth;
    this.tensionBar.fillColor = Phaser.Display.Color.GetColor(r, g, 50);
    this.tensionBar.x = this.tensionBarX;

    this.warningText.setText(
      this.tension > CFG.DEADLINE_THRESHOLD ? 'UZMANIETIES!' : ''
    );

    this.distanceText.setText(`${this.distance.toFixed(2)} m`);

    // Pulse hold button when fish pulling
    if (this.holdBtn) {
      this.holdBtn.fillColor = fishPulling ? 0xff9900 : 0xffd700;
    }
  }

  endGame(success) {
    if (!this.active_) return;
    this.active_ = false;
    const elapsed = (this.time.now - this.startTime) / 1000;
    if (success) {
      let pts = CFG.NORMAL_POINTS;
      if (elapsed < CFG.EXCELLENT_TIME) pts = CFG.EXCELLENT_POINTS;
      else if (elapsed < CFG.GOOD_TIME) pts = CFG.GOOD_POINTS;
      this.onComplete(pts, elapsed.toFixed(1));
    } else {
      this.onFail();
    }
  }
}
