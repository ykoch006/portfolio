// sound effects only: a soft tyre hiss on slides, thuds on hits, crunchy footsteps.
// music comes from the radio panel.
export class TruckSound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private skid!: GainNode;
  private noise!: AudioBuffer;
  on = true;

  start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.on ? 0.5 : 0;
    this.master.connect(ctx.destination);

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 700;
    band.Q.value = 0.6;
    this.skid = ctx.createGain();
    this.skid.gain.value = 0;
    src.connect(band).connect(this.skid).connect(this.master);
    src.start();
  }

  update(slip: number, grounded: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    const hiss = grounded ? Math.min(0.08, Math.max(0, slip - 2.5) * 0.015) : 0;
    this.skid.gain.setTargetAtTime(hiss, ctx.currentTime, 0.12);
  }

  thud(strength: number) {
    const ctx = this.ctx;
    if (!ctx || !this.on || strength < 0.6) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 180 + Math.min(strength, 12) * 30;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(Math.min(0.9, 0.12 + strength * 0.07), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5, 0.4);
  }

  // short filtered crunch for a boot in snow
  step(run: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.on) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 700 + Math.random() * 500;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(run ? 0.16 : 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.8, 0.14);
  }

  setOn(on: boolean) {
    this.on = on;
    if (this.ctx) this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.05);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
