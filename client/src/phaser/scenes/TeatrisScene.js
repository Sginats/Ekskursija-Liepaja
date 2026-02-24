import Phaser from 'phaser';

const QUESTIONS = [
  { q: 'Kurā gadā dibināts Liepājas teātris?', a: '1907', opts: ['1888', '1907', '1925', '1940'] },
  { q: 'Kādā stilā celta teātra ēka?', a: 'Jūgendstils', opts: ['Baroks', 'Klasicisms', 'Jūgendstils', 'Modernisms'] },
  { q: 'Vai teātris ir vecākais profesionālais Latvijā?', a: 'Jā', opts: ['Jā', 'Nē', 'Daļēji', 'Nezināms'] },
];

export class TeatrisScene extends Phaser.Scene {
  constructor() { super({ key: 'Teatris' }); }

  init(data) {
    this.onComplete = data.onComplete || (() => {});
  }

  create() {
    const { width, height } = this.scale;
    this.correct = 0;
    this.index = 0;

    this.add.rectangle(width / 2, height / 2, width, height, 0x120f16);
    this.add.rectangle(width / 2, height * 0.88, width, 60, 0x3b2a1a);
    this.title = this.add.text(width / 2, 10, 'Teātra uzdevums', { color: '#fbbf24', fontSize: '15px' }).setOrigin(0.5, 0);
    this.status = this.add.text(width / 2, 30, 'Punkti netiek atņemti par kļūdām', { color: '#d1d5db', fontSize: '12px' }).setOrigin(0.5, 0);

    this.qText = this.add.text(width / 2, 66, '', { color: '#fff', fontSize: '13px', align: 'center', wordWrap: { width: width - 30 } }).setOrigin(0.5, 0);
    this.buttons = [];
    this.feedback = this.add.text(width / 2, height - 26, '', { color: '#fff', fontSize: '12px' }).setOrigin(0.5, 1);

    this.renderQuestion();
  }

  renderQuestion() {
    this.buttons.forEach(b => b.destroy());
    this.buttons = [];
    const { width } = this.scale;
    const item = QUESTIONS[this.index];
    this.qText.setText(`${this.index + 1}/${QUESTIONS.length}: ${item.q}`);

    item.opts.forEach((opt, i) => {
      const y = 120 + i * 46;
      const btn = this.add.rectangle(width / 2, y, width - 30, 36, 0x1f2937).setStrokeStyle(1, 0x6b7280, 0.8).setInteractive({ useHandCursor: true });
      const txt = this.add.text(width / 2, y, opt, { color: '#fff', fontSize: '12px' }).setOrigin(0.5);
      btn.on('pointerdown', () => this.answer(opt, item.a));
      this.buttons.push(btn, txt);
    });
  }

  answer(value, correct) {
    const ok = value === correct;
    this.feedback.setText(ok ? 'Pareizi' : 'Nepareizi, mēģini nākamo');
    this.feedback.setColor(ok ? '#22c55e' : '#f87171');
    if (ok) this.correct += 1;
    this.applause(ok);

    this.time.delayedCall(500, () => {
      this.index += 1;
      if (this.index >= QUESTIONS.length) {
        const pts = Math.max(4, Math.min(10, this.correct * 3));
        this.onComplete(pts);
      } else {
        this.renderQuestion();
      }
    });
  }

  applause(ok) {
    const { width } = this.scale;
    for (let i = 0; i < 10; i++) {
      const p = this.add.rectangle(20 + i * ((width - 40) / 9), 96, 4, 4, ok ? 0x22c55e : 0xf87171);
      this.tweens.add({ targets: p, y: 50 + Math.random() * 120, alpha: 0, duration: 500, onComplete: () => p.destroy() });
    }
    this.soundBurst(ok);
  }

  soundBurst(ok) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [0, 0.04, 0.08].forEach((off, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = ok ? 520 + i * 80 : 180 - i * 30;
        o.type = ok ? 'triangle' : 'sawtooth';
        g.gain.setValueAtTime(0.07, now + off);
        g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.12);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + off); o.stop(now + off + 0.12);
      });
    } catch {}
  }
}
