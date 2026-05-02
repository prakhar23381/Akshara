export interface LetterContent {
  letter: string;
  pronunciationHint: string;
  mouthEmoji: string;
  exampleWords: { word: string; image: string; meaning: string }[];
}

export const LETTER_CONTENT: Record<string, LetterContent> = {
  "म": {
    letter: "म",
    pronunciationHint: "Press your lips together, hum through your nose",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "मछली", image: "🐟", meaning: "Fish" },
      { word: "मकान", image: "🏠", meaning: "House" },
      { word: "माँ",   image: "👩", meaning: "Mother" },
    ],
  },
  "ग": {
    letter: "ग",
    pronunciationHint: "Sound comes from the back of your throat",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "गाय",  image: "🐄", meaning: "Cow" },
      { word: "गाजर", image: "🥕", meaning: "Carrot" },
      { word: "गाना", image: "🎵", meaning: "Song" },
    ],
  },
  "घ": {
    letter: "घ",
    pronunciationHint: "Like ग but with a puff of breath",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "घर",   image: "🏡", meaning: "Home" },
      { word: "घड़ी", image: "⏰", meaning: "Clock" },
      { word: "घास",  image: "🌿", meaning: "Grass" },
    ],
  },
  "ध": {
    letter: "ध",
    pronunciationHint: "Touch tongue to teeth, add a breathy sound",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "धन",    image: "💰", meaning: "Wealth" },
      { word: "धरती",  image: "🌍", meaning: "Earth" },
      { word: "धनुष",  image: "🏹", meaning: "Bow" },
    ],
  },
  "ब": {
    letter: "ब",
    pronunciationHint: "Press your lips together, then open them",
    mouthEmoji: "😮",
    exampleWords: [
      { word: "बस",    image: "🚌", meaning: "Bus" },
      { word: "बकरी",  image: "🐐", meaning: "Goat" },
      { word: "बादल",  image: "☁️", meaning: "Cloud" },
    ],
  },
};

// Maps each Hindi letter to its audio file in /public/audio/
export const LETTER_AUDIO: Record<string, string> = {
  "म": "/audio/ma.mp3",
  "ग": "/audio/ga.mp3",
  "घ": "/audio/gha.mp3",
  "ध": "/audio/dha.mp3",
  "ब": "/audio/ba.mp3",
};

export function getLetterAudio(letter: string): string | null {
  return LETTER_AUDIO[letter] ?? null;
}

export function getLetterContent(letter: string): LetterContent {
  return (
    LETTER_CONTENT[letter] ?? {
      letter,
      pronunciationHint: "Listen carefully and repeat",
      mouthEmoji: "😮",
      exampleWords: [],
    }
  );
}
