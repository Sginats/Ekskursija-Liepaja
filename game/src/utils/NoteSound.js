/**
 * NoteSound
 *
 * Generates distinct musical tones via the Web Audio API for note
 * interactions in the Dzintars (concert hall) mini-game.
 *
 * Each note symbol maps to a unique frequency so every collected
 * note produces a recognisable audio cue.
 *
 * Design goals:
 *   - Low latency (oscillator created on-demand, no file loading)
 *   - No excessive overlap (short decay, polyphony limit)
 *   - Controlled volume (gain capped at 0.18)
 */

const NOTE_FREQ = {
  '♩': 523.25,  // C5
  '♪': 587.33,  // D5
  '♫': 659.25,  // E5
  '♬': 783.99,  // G5
};

const GAIN    = 0.18;
const DECAY   = 0.25;   // seconds
const MAX_VOICES = 4;

let _ctx      = null;
let _voices   = 0;

function _ensureCtx() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

const NoteSound = {
  /**
   * Play a short tone for the given note symbol.
   * @param {string} symbol  One of ♩ ♪ ♫ ♬
   */
  play(symbol) {
    const freq = NOTE_FREQ[symbol];
    if (!freq) return;
    if (_voices >= MAX_VOICES) return;

    const ctx = _ensureCtx();
    if (!ctx) return;

    _voices++;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type            = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(GAIN, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + DECAY);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + DECAY);

    osc.onended = () => { _voices = Math.max(0, _voices - 1); };
  },
};

export default NoteSound;
