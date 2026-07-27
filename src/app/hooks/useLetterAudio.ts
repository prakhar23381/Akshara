import { useRef, useCallback } from "react";
import { getLetterAudio } from "../data/letterContent";

export function useLetterAudio(
  letter: string,
  slowMode = false,
  onEnded?: () => void,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    const src = getLetterAudio(letter);
    if (!src) return;

    // Stop any currently playing instance
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(src);
    audio.playbackRate = slowMode ? 0.8 : 1.0;

    if (onEnded) {
      audio.addEventListener("ended", onEnded, { once: true });
    }

    audioRef.current = audio;
    audio.play().catch(() => {
      // Autoplay blocked by browser — call onEnded anyway so tracker isn't stuck
      onEnded?.();
    });
  }, [letter, slowMode, onEnded]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  return { play, stop };
}
