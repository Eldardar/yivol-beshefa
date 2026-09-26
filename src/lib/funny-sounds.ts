// Silly synthesized sound effects (Web Audio, no asset files).

type Sound = (ctx: AudioContext, t: number, out: AudioNode) => void;

function envelope(ctx: AudioContext, out: AudioNode, t: number, peak: number, attack: number, duration: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  gain.connect(out);
  return gain;
}

function tone(ctx: AudioContext, type: OscillatorType, freqs: Array<[number, number]>, t: number, duration: number, target: AudioNode) {
  const osc = ctx.createOscillator();
  osc.type = type;
  freqs.forEach(([freq, at], i) =>
    i === 0 ? osc.frequency.setValueAtTime(freq, t + at) : osc.frequency.linearRampToValueAtTime(freq, t + at));
  osc.connect(target);
  osc.start(t);
  osc.stop(t + duration);
  return osc;
}

const fart: Sound = (ctx, t, out) => {
  const duration = 0.7;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  filter.connect(envelope(ctx, out, t, 0.9, 0.03, duration));
  const osc = tone(ctx, "sawtooth", [[95, 0], [70, 0.35], [55, duration]], t, duration, filter);
  // Wobble the pitch for the flappy texture.
  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  lfo.frequency.value = 22;
  depth.gain.value = 25;
  lfo.connect(depth).connect(osc.frequency);
  lfo.start(t);
  lfo.stop(t + duration);
};

const yell: Sound = (ctx, t, out) => {
  const duration = 0.9;
  const formant = ctx.createBiquadFilter();
  formant.type = "bandpass";
  formant.frequency.value = 900;
  formant.Q.value = 2;
  formant.connect(envelope(ctx, out, t, 1, 0.05, duration));
  const osc = tone(ctx, "sawtooth", [[300, 0], [520, 0.25], [480, 0.6], [260, duration]], t, duration, formant);
  const vibrato = ctx.createOscillator();
  const depth = ctx.createGain();
  vibrato.frequency.value = 7;
  depth.gain.value = 18;
  vibrato.connect(depth).connect(osc.frequency);
  vibrato.start(t);
  vibrato.stop(t + duration);
};

const bell: Sound = (ctx, t, out) => {
  const duration = 1.8;
  for (const [ratio, level] of [[1, 0.5], [2.76, 0.25], [5.4, 0.12]] as const)
    tone(ctx, "sine", [[880 * ratio, 0]], t, duration, envelope(ctx, out, t, level, 0.005, duration / ratio));
};

const boing: Sound = (ctx, t, out) => {
  const duration = 0.6;
  const osc = tone(ctx, "triangle", [[150, 0]], t, duration, envelope(ctx, out, t, 0.7, 0.01, duration));
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  lfo.frequency.value = 14;
  depth.gain.value = 60;
  lfo.connect(depth).connect(osc.frequency);
  lfo.start(t);
  lfo.stop(t + duration);
};

const slideWhistle: Sound = (ctx, t, out) => {
  tone(ctx, "sine", [[500, 0], [1600, 0.35], [400, 0.8]], t, 0.8, envelope(ctx, out, t, 0.5, 0.05, 0.8));
};

const quack: Sound = (ctx, t, out) => {
  for (const offset of [0, 0.22]) {
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 3;
    filter.connect(envelope(ctx, out, t + offset, 1, 0.01, 0.18));
    tone(ctx, "sawtooth", [[480, 0], [380, 0.18]], t + offset, 0.2, filter);
  }
};

const laser: Sound = (ctx, t, out) => {
  const osc = tone(ctx, "square", [[1800, 0]], t, 0.4, envelope(ctx, out, t, 0.3, 0.005, 0.4));
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.4);
};

const tada: Sound = (ctx, t, out) => {
  [523, 659, 784, 1047].forEach((freq, i) => {
    const start = t + i * 0.09;
    const hold = i === 3 ? 0.7 : 0.15;
    tone(ctx, "triangle", [[freq, 0]], start, hold, envelope(ctx, out, start, 0.4, 0.01, hold));
  });
};

const SOUNDS = [fart, yell, bell, boing, slideWhistle, quack, laser, tada];

let context: AudioContext | null = null;
let lastIndex = -1;

// Plays a random sound, never the same one twice in a row.
export function playRandomFunnySound() {
  if (typeof window === "undefined") return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    let index = Math.floor(Math.random() * (lastIndex < 0 ? SOUNDS.length : SOUNDS.length - 1));
    if (lastIndex >= 0 && index >= lastIndex) index++;
    lastIndex = index;
    const master = context.createGain();
    master.gain.value = 0.6;
    master.connect(context.destination);
    SOUNDS[index]!(context, context.currentTime + 0.01, master);
  } catch {
    // Audio unavailable — stay silent.
  }
}
