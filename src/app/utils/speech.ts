/**
 * Hindi Text-to-Speech utility using the Web Speech Synthesis API.
 * Provides reusable functions for playing Hindi word pronunciations
 * in the word-level dyslexia games.
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speaks the given Hindi text aloud using the browser's speech synthesis.
 * Cancels any currently playing utterance before starting a new one.
 *
 * @param text - The Hindi text to speak (e.g., "कमल")
 * @param onEnd - Optional callback fired when the utterance finishes
 * @returns A promise that resolves when the speech ends (or rejects on error)
 */
export function speakHindi(
  text: string,
  onEnd?: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      console.warn("[speech] SpeechSynthesis API not available in this browser.");
      onEnd?.();
      resolve();
      return;
    }

    // Cancel any in-progress speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    utterance.rate = 0.85; // Slightly slower for children
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a Hindi voice explicitly
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(
      (v) => v.lang === "hi-IN" || v.lang.startsWith("hi"),
    );
    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    utterance.onend = () => {
      currentUtterance = null;
      onEnd?.();
      resolve();
    };

    utterance.onerror = (event) => {
      currentUtterance = null;
      console.warn("[speech] SpeechSynthesis error:", event.error);
      onEnd?.();
      reject(event.error);
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stops any currently playing speech.
 */
export function stopSpeech(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}
