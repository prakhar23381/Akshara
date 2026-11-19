let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Chime 1 (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    // Chime 2 (E5) after a tiny delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.68);

    // Chime 3 (G5) after another tiny delay
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(783.99, now + 0.16); // G5
    gain3.gain.setValueAtTime(0.15, now + 0.16);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.76);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.6);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.68);
    osc3.start(now + 0.16);
    osc3.stop(now + 0.76);
  } catch (e) {
    console.error("Failed to play success sound", e);
  }
}

export function playErrorSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Low gentle warning tone (not a harsh buzzer) to avoid anxiety
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle"; // softer than saw/square
    osc.frequency.setValueAtTime(180, now); // low pitch G3
    osc.frequency.linearRampToValueAtTime(130, now + 0.35); // frequency slide down
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    console.error("Failed to play error sound", e);
  }
}

export function playEncouragementSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Gentle upward warm chord to say "it's okay, try again"
    const notes = [261.63, 329.63, 392.00]; // C4, E4, G4 chord
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + index * 0.05);
      gain.gain.setValueAtTime(0.12, now + index * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.05);
      osc.stop(now + 0.5);
    });
  } catch (e) {
    console.error("Failed to play encouragement sound", e);
  }
}

// ── The small sounds of docs/11 §3.10 (G4) ───────────────────────────────────
// Synthesised, so they need no files: a tap, a card flip, a chest shake and
// pop, a sticker "thwip", Mitthu's chirp. Drawn up in the play lab.

let sfxCtx: AudioContext | null = null;
function sfxAudio(): AudioContext | null {
  try {
    sfxCtx ??= new AudioContext();
    if (sfxCtx.state === "suspended") void sfxCtx.resume();
    return sfxCtx;
  } catch {
    return null;
  }
}

function tone(freq: number, to: number, dur: number, type: OscillatorType = "sine", vol = 0.12, delay = 0) {
  const a = sfxAudio();
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
export const buzz = (ms = 30): void => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
};
