import { speakHindi } from "../../app/utils/speech";
import { getLetterAudio } from "../../app/data/letterContent";

/**
 * The small sounds of docs/11 §3.10, synthesised so the lab needs no files:
 * a tap, a card flip, a chest shake and pop, a sticker "thwip", Mitthu's chirp.
 * The right-answer chime and the soft tone are the app's own (soundEffects.ts).
 */
// The small sounds moved into the app with G4.
export { sfx, buzz } from "../../app/utils/soundEffects";

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
