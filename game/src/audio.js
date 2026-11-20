// audio.js — WebAudio synth only, no assets. Inits on first user gesture. M toggles mute.
export class SynthAudio {
  constructor() { this.ctx = null; this.muted = false; this.bassTimer = 0; this.step = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
  }
  tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur);
  }
  punch() { this.tone(140, 0.08, 'square', 0.12, -80); }
  cash() { this.tone(880, 0.09, 'square', 0.07); setTimeout(() => this.tone(1320, 0.12, 'square', 0.07), 70); }
  complete() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.1), i * 110)); }
  sirenTick(dt, active) {
    if (!active || !this.ctx || this.muted) return;
    this._sirenT = (this._sirenT || 0) + dt;
    if (this._sirenT > 0.45) { this._sirenT = 0; this._sirenHigh = !this._sirenHigh; this.tone(this._sirenHigh ? 880 : 660, 0.4, 'sine', 0.025); }
  }
  engineTick(speedRatio) {
    if (!this.ctx || this.muted) return;
    this._engT = (this._engT || 0) + 1;
    if (this._engT % 6 === 0) this.tone(55 + speedRatio * 90, 0.09, 'sawtooth', 0.02);
  }
  bassline(dt, playing) {
    if (!playing || !this.ctx || this.muted) return;
    this.bassTimer += dt;
    const notes = [55, 55, 65.4, 55, 49, 55, 73.4, 82.4];
    if (this.bassTimer > 0.24) { this.bassTimer = 0; this.tone(notes[this.step % notes.length], 0.22, 'triangle', 0.05); this.step++; }
  }
}
