// Procedural fire ambience: a low brown-noise roar plus random crackle pops. No audio files.
export type Crackle = { setLevel: (v: number) => void; stop: () => void };

export function startCrackle(): Crackle | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.2;
  }
  const roar = ctx.createBufferSource();
  roar.buffer = buf;
  roar.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  const roarGain = ctx.createGain();
  roarGain.gain.value = 0.55;
  roar.connect(lp).connect(roarGain).connect(master);
  roar.start();

  const popBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
  const pd = popBuf.getChannelData(0);
  for (let i = 0; i < pd.length; i++) pd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / pd.length, 3);

  let timer = 0;
  const pop = () => {
    const src = ctx.createBufferSource();
    src.buffer = popBuf;
    src.playbackRate.value = 0.6 + Math.random() * 1.6;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1200 + Math.random() * 3000;
    const g = ctx.createGain();
    g.gain.value = 0.15 + Math.random() * 0.5;
    src.connect(bp).connect(g).connect(master);
    src.start();
    timer = window.setTimeout(pop, 40 + Math.random() * (Math.random() > 0.8 ? 900 : 260));
  };
  pop();

  let level = 0.25;
  master.gain.linearRampToValueAtTime(level, ctx.currentTime + 1.2);

  return {
    setLevel(v) {
      if (v === level) return;
      level = v;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.8);
    },
    stop() {
      window.clearTimeout(timer);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      window.setTimeout(() => ctx.close(), 400);
    },
  };
}
