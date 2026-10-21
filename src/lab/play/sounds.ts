import { speakHindi } from "../../app/utils/speech";
import { getLetterAudio } from "../../app/data/letterContent";

/**
 * The small sounds of docs/11 §3.10, synthesised so the lab needs no files:
 * a tap, a card flip, a chest shake and pop, a sticker "thwip", Mitthu's chirp.
 * The right-answer chime and the soft tone are the app's own (soundEffects.ts).
 */
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, to: number, dur: number, type: OscillatorType = "sine", vol = 0.12, delay = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export const sfx = {
  tap: () => tone(420, 300, 0.06, "triangle", 0.08),
  flip: () => {
    tone(300, 900, 0.12, "triangle", 0.08);
    tone(900, 1200, 0.08, "sine", 0.05, 0.1);
  },
  shake: () => [0, 0.09, 0.18].forEach((d) => tone(180, 140, 0.07, "square", 0.04, d)),
  pop: () => {
    tone(200, 1400, 0.18, "sine", 0.15);
    [0, 0.06, 0.12].forEach((d, i) => tone(1046 + i * 262, 1046 + i * 262, 0.25, "sine", 0.06, 0.15 + d));
  },
  thwip: () => tone(1400, 260, 0.14, "sawtooth", 0.05),
  chirp: () => {
    tone(1800, 2600, 0.07, "sine", 0.08);
    tone(2200, 3000, 0.07, "sine", 0.08, 0.09);
  },
};

/** A short buzz on Android; iOS Safari has no vibration API. */
export const buzz = (ms = 30) => navigator.vibrate?.(ms);

/** Mitthu speaks: the app's own hi-IN voice. Silently does nothing without one. */
export const say = (text: string) => void speakHindi(text).catch(() => {});

let letterClip: HTMLAudioElement | null = null;
/** The letter's real recording; `slow` is the 🐢 (D5), pitch kept. */
export function playLetter(letter: string, slow = false) {
  const src = getLetterAudio(letter);
  if (!src) return say(letter);
  letterClip?.pause();
  letterClip = new Audio(src);
  letterClip.playbackRate = slow ? 0.6 : 1;
  letterClip.preservesPitch = true;
  void letterClip.play().catch(() => say(letter));
}
