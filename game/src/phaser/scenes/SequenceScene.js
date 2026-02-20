import Phaser from 'phaser';
import EventBridge from '../../utils/EventBridge.js';
import { getDayNightState, getSkyColors } from '../../utils/DayNight.js';

const BTN_SIZE = 80;
const BTN_GAP = 14;

export default class SequenceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SequenceScene' });
  }

  init(data) {
    this._cfg = data;
    this._seq = [];
    this._playerIdx = 0;
    this._round = 0;
    this._active = false;
    this._inputEnabled = false;
    const dn = getDayNightState();
    this._sky = getSkyColors(dn.isNight, dn.isGoldenHour);
    this._nightMode = dn.isNight;
  }

  create() {
    const { width, height } = this.scale;
    const sky = this._sky;

    const bg = this.add.graphics();
    bg.fillGradientStyle(sky.top, sky.top, sky.bottom, sky.bottom, 1);
    bg.fillRect(0, 0, width, height);

    if (this._nightMode) {
      const ng = this.add.graphics();
      for (let i = 0; i < 18; i++) {
        ng.fillStyle(0xffffff, 0.15 + Math.random() * 0.25);
        ng.fillCircle(Math.random() * width, Math.random() * height * 0.6, Math.random() * 2 + 0.5);
      }
    }

    this._statusText = this.add
      .text(width / 2, 22, 'Vēro secību...', {
        fontSize: '20px',
        fontFamily: 'Poppins, Arial',
        color: '#ffaa00',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this._roundText = this.add
      .text(width / 2, height - 22, `Kārta 0/${this._cfg.rounds}`, {
        fontSize: '15px',
        fontFamily: 'Poppins, Arial',
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 1)
      .setDepth(10);

    this._buttons = this._buildButtons(width, height);
    this.time.delayedCall(400, () => this._nextRound());
  }

  _buildButtons(width, height) {
    const elems = this._cfg.elements;
    const cols = 2;
    const rows = Math.ceil(elems.length / cols);
    const totalW = cols * BTN_SIZE + (cols - 1) * BTN_GAP;
    const totalH = rows * BTN_SIZE + (rows - 1) * BTN_GAP;
    const startX = (width - totalW) / 2 + BTN_SIZE / 2;
    const startY = (height - totalH) / 2 + BTN_SIZE / 2 + 20;

    return elems.map((el, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (BTN_SIZE + BTN_GAP);
      const y = startY + row * (BTN_SIZE + BTN_GAP);

      const bg = this.add.graphics().setDepth(4);
      bg.fillStyle(el.color, 0.85);
      bg.fillRoundedRect(x - BTN_SIZE / 2, y - BTN_SIZE / 2, BTN_SIZE, BTN_SIZE, 14);
      bg.lineStyle(3, 0xffffff, 0.25);
      bg.strokeRoundedRect(x - BTN_SIZE / 2, y - BTN_SIZE / 2, BTN_SIZE, BTN_SIZE, 14);

      const label = this.add
        .text(x, y, el.symbol, { fontSize: '36px' })
        .setOrigin(0.5)
        .setDepth(5);

      const zone = this.add.zone(x, y, BTN_SIZE, BTN_SIZE).setInteractive();
      zone.on('pointerdown', () => this._onBtnPress(i));

      return { bg, label, zone, el, x, y };
    });
  }

  _nextRound() {
    this._active = true;
    this._round++;
    this._playerIdx = 0;
    this._inputEnabled = false;
    const el = this._cfg.elements[Math.floor(Math.random() * this._cfg.elements.length)];
    this._seq.push(el);
    this._roundText.setText(`Kārta ${this._round}/${this._cfg.rounds}`);
    this._statusText.setText('Vēro secību...').setColor('#ffaa00');
    this._playSequence();
  }

  _playSequence() {
    this._seq.forEach((el, i) => {
      const btnIdx = this._cfg.elements.indexOf(el);
      const delay = this._cfg.showDuration * i + 300;
      this.time.delayedCall(delay, () => this._flash(btnIdx, true));
      this.time.delayedCall(delay + this._cfg.showDuration - this._cfg.gapDuration, () => this._flash(btnIdx, false));
    });

    const totalDelay = this._cfg.showDuration * this._seq.length + 500;
    this.time.delayedCall(totalDelay, () => {
      this._inputEnabled = true;
      this._statusText.setText('Tava kārta!').setColor('#4caf50');
    });
  }

  _flash(btnIdx, on) {
    const btn = this._buttons[btnIdx];
    if (!btn) return;
    btn.bg.clear();
    const alpha = on ? 1 : 0.85;
    btn.bg.fillStyle(btn.el.color, alpha);
    btn.bg.fillRoundedRect(btn.x - BTN_SIZE / 2, btn.y - BTN_SIZE / 2, BTN_SIZE, BTN_SIZE, 14);
    btn.label.setScale(on ? 1.25 : 1);
    if (on) btn.label.setTint(0xffffff);
    else btn.label.clearTint();
  }

  _onBtnPress(btnIdx) {
    if (!this._inputEnabled || !this._active) return;
    const expected = this._cfg.elements.indexOf(this._seq[this._playerIdx]);
    this._flash(btnIdx, true);
    this.time.delayedCall(180, () => this._flash(btnIdx, false));

    if (btnIdx !== expected) {
      this._inputEnabled = false;
      this._active = false;
      this._statusText.setText('Nepareizi!').setColor('#f44336');
      this.time.delayedCall(1200, () =>
        EventBridge.emit('MINIGAME_COMPLETE', { success: false, bonusPoints: 0 })
      );
      return;
    }

    this._playerIdx++;
    if (this._playerIdx < this._seq.length) return;

    this._inputEnabled = false;
    if (this._round >= this._cfg.rounds) {
      this._statusText.setText('Lieliski! ✓').setColor('#4caf50');
      this.time.delayedCall(900, () =>
        EventBridge.emit('MINIGAME_COMPLETE', { success: true, bonusPoints: 5 })
      );
    } else {
      this._statusText.setText('Pareizi! Nākamā kārta...').setColor('#4caf50');
      this.time.delayedCall(800, () => this._nextRound());
    }
  }
}
