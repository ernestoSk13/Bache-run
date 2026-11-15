/** Audio generado con WebAudio: motor, golpes y pitidos. Sin archivos. */
export class Sfx {
  private ctx?: AudioContext; private osc?: OscillatorNode; private gain?: GainNode; private filt?: BiquadFilterNode; private noise?: AudioBuffer;
  muted = false;
  start() {
    if (this.ctx) { void this.ctx.resume(); return; }
    try {
      const c = this.ctx = new AudioContext();
      this.osc = c.createOscillator(); this.osc.type = 'sawtooth'; this.filt = c.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.frequency.value = 500;
      this.gain = c.createGain(); this.gain.gain.value = 0; this.osc.connect(this.filt).connect(this.gain).connect(c.destination); this.osc.start();
      this.noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    } catch { /* sin audio */ }
  }
  engine(speed: number, on: boolean) {
    if (!this.ctx || !this.osc || !this.gain || !this.filt) return; const t = this.ctx.currentTime;
    this.osc.frequency.setTargetAtTime(55 + speed * 4.2, t, 0.05); this.filt.frequency.setTargetAtTime(350 + speed * 30, t, 0.05);
    this.gain.gain.setTargetAtTime(on && !this.muted ? 0.045 : 0, t, 0.08);
  }
  thump(strength = 1) {
    if (!this.ctx || !this.noise || this.muted) return; const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = this.noise; f.type = 'lowpass'; f.frequency.value = 220 + strength * 120; g.gain.value = 0.35 * strength; s.connect(f).connect(g).connect(c.destination); s.start();
  }
  beep(freq: number, dur = 0.15, vol = 0.12) {
    if (!this.ctx || this.muted) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  }
}
