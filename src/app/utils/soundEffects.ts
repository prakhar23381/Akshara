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
