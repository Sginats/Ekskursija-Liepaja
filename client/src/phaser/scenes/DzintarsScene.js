import Phaser from 'phaser';

const TARGET = 8;
const GAME_TIME = 20;
const NOTE_SET = [
  { label: 'DO', f: 523.25, color: 0xf59e0b },
  { label: 'RE', f: 587.33, color: 0x84cc16 },
  { label: 'MI', f: 659.25, color: 0x38bdf8 },
  { label: 'SOL', f: 783.99, color: 0xa78bfa },
];

export class DzintarsScene extends Phaser.Scene {
  constructor() { super({ key: 'Dzintars' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
    this.onFail = data.onFail || (() => {});
  }

  create() {
    const { width, height } = this.scale;
    this.score = 0;
    this.timeLeft = GAME_TIME;
    this.active = true;
    this.ctx = null;
    this.master = null;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0d05);
    this.add.text(width / 2, 12, 'Nospied notis pareizā ritmā', { color: '#fbbf24', fontSize: '14px' }).setOrigin(0.5, 0);
    this.scoreText = this.add.text(12, 12, `Notis: 0/${TARGET}`, { color: '#fff', fontSize: '14px' });
    this.timerText = this.add.text(width - 12, 12, `${GAME_TIME}s`, { color: '#fff', fontSize: '14px' }).setOrigin(1, 0);

    NOTE_SET.forEach((n, i) => {
      const x = 55 + i * 70;
      const y = height * 0.55;
      const r = this.add.rectangle(x, y, 56, 56, n.color).setStrokeStyle(2, 0xffffff, 0.4).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, y, n.label, { color: '#111', fontSize: '14px', fontStyle: 'bold' }).setOrigin(0.5);
      r.on('pointerdown', () => this.hitNote(r, n));
      this.tweens.add({ targets: [r, t], y: y + 4, yoyo: true, repeat: -1, duration: 900 + i * 60, ease: 'Sine.easeInOut' });
    });

    this.timer = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (!this.active) return;
        this.timeLeft -= 1;
        this.timerText.setText(`${this.timeLeft}s`);
        if (this.timeLeft <= 0) this.finish(false);
      },
    });
  }

  hitNote(rect, note) {
    if (!this.active) return;
    this.score += 1;
    this.scoreText.setText(`Notis: ${this.score}/${TARGET}`);
    this.tweens.add({ targets: rect, scaleX: 1.12, scaleY: 1.12, yoyo: true, duration: 100 });
    this.playTone(note.f);
    if (this.score >= TARGET) this.finish(true);
  }

  playTone(freq) {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.08;
        this.master.connect(this.ctx.destination);
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  finish(success) {
    if (!this.active) return;
    this.active = false;
    if (this.timer) this.timer.remove();
    if (success) this.onComplete(10); else this.onFail();
  }
}
