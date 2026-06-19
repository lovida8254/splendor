// Original sound effects synthesized with the Web Audio API — no audio files,
// works offline, no licensing concerns. Lazily creates an AudioContext on the
// first user gesture (browser autoplay policy).

let ctx: AudioContext | null = null;
let enabled = true;

type WindowWithAudio = Window & { webkitAudioContext?: typeof AudioContext };

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setSoundEnabled(b: boolean): void {
  enabled = b;
}
export function isSoundEnabled(): boolean {
  return enabled;
}
/** Unlock the audio context within a user gesture (call on first click). */
export function unlockAudio(): void {
  ac();
}

function tone(
  c: AudioContext,
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  gain = 0.07,
  when = 0,
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + when;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export type SoundName =
  | "take"
  | "reserve"
  | "buy"
  | "score"
  | "noble"
  | "win"
  | "click";

export function playSound(name: SoundName): void {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  switch (name) {
    case "take":
      tone(c, 440, 0.12, "triangle", 0.06);
      break;
    case "reserve":
      tone(c, 330, 0.1, "sine", 0.06);
      tone(c, 494, 0.12, "sine", 0.05, 0.06);
      break;
    case "buy":
      tone(c, 523, 0.1, "square", 0.045);
      tone(c, 659, 0.1, "square", 0.045, 0.07);
      tone(c, 784, 0.16, "square", 0.045, 0.14);
      break;
    case "score":
      tone(c, 659, 0.1, "triangle", 0.07);
      tone(c, 880, 0.18, "triangle", 0.07, 0.08);
      break;
    case "noble":
      tone(c, 523, 0.14, "sine", 0.07);
      tone(c, 784, 0.18, "sine", 0.07, 0.1);
      tone(c, 1047, 0.24, "sine", 0.06, 0.2);
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) => tone(c, f, 0.24, "triangle", 0.07, i * 0.13));
      break;
    case "click":
      tone(c, 600, 0.05, "sine", 0.035);
      break;
  }
}
