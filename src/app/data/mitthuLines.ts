import type { ActivityType } from "../types/session";

/**
 * Everything Mitthu says, in one place, for the teacher trainer to check
 * (docs/12 question T7) — the Hindi a 5–10-year-old hears. He speaks Hindi
 * only (docs/11 D1); the English beside each line is a caption for adults.
 * Drafted by the development team; not yet reviewed by a native teacher.
 */
export type Line = { hi: string; en: string };

export const LINES = {
  greet: (name: string): Line => ({ hi: `नमस्ते ${name}! आज कौन-सा अक्षर?`, en: `Hello ${name}! Which letter today?` }),
  mission: { hi: "आज का मिशन", en: "Today's mission" },
  missionTask: { hi: "एक पाठ खेलो", en: "Play one lesson" },
  missionOpen: { hi: "खोलो!", en: "Open it!" },
  week: { hi: "मेरा हफ़्ता", en: "My week" },
  tree: { hi: "मिट्ठू का पेड़ — हर दिन एक नया पत्ता", en: "Mitthu's tree — a new leaf every day you play" },
  play: { hi: "चलो खेलें", en: "Let's play" },
  start: { hi: "शुरू करो", en: "Start" },
  pathHello: { hi: "यहाँ से शुरू करो!", en: "Start here!" },
  sticker: (word: string): Line => ({ hi: `वाह! ${word} का स्टिकर!`, en: `A ${word} sticker!` }),
  lessonIntro: (games: number): Line => ({
    hi: `${games} खेल, फिर सरप्राइज़!`,
    en: `${games} games, then a surprise!`,
  }),
  tryAgain: { hi: "फिर से सुनो", en: "Listen again" },
  proud: (name: string): Line => ({ hi: `शाबाश, ${name}! मुझे तुम पर गर्व है!`, en: `Well done, ${name}! I'm proud of you!` }),
  collected: (letter: string): Line => ({ hi: `${letter} तुम्हारे संग्रह में!`, en: `${letter} is in your collection!` }),
  mastered: (letter: string): Line => ({ hi: `${letter} अब तुम्हारा है!`, en: `${letter} is yours now!` }),
  todaySticker: { hi: "आज का स्टिकर!", en: "Today's sticker!" },
  chest: { hi: "एक संदूक! खोलो!", en: "A chest! Open it!" },
  next: { hi: "आगे", en: "Continue" },
};

/** Praise for a right answer, taken in turn so it does not repeat. */
export const PRAISE: Line[] = [
  { hi: "शाबाश!", en: "Well done!" },
  { hi: "वाह!", en: "Wow!" },
  { hi: "बहुत बढ़िया!", en: "Very good!" },
  { hi: "सही!", en: "Right!" },
];

/** Each game's instruction, said by Mitthu when it starts (fixes design_guidelines §9.6). */
export const INSTRUCTION: Partial<Record<ActivityType, Line>> = {
  warmup: { hi: "पहले, पुराने अक्षर! देखो और सुनो।", en: "First, old letters! Look and listen." },
  intro: { hi: "यह नया अक्षर है!", en: "This is a new letter!" },
  pronunciation: { hi: "ऐसे बोलते हैं।", en: "This is how we say it." },
  example_words: { hi: "इन शब्दों को छूकर सुनो।", en: "Touch the words to hear them." },
  matras: { hi: "मात्राएँ सुनो।", en: "Listen to the matras." },
  tracing: { hi: "उंगली से अक्षर बनाओ।", en: "Draw the letter with your finger." },
  memory: { hi: "एक जैसे दो कार्ड ढूँढो।", en: "Find two cards that match." },
  identify: { hi: "सुनो, फिर वही अक्षर छुओ।", en: "Listen, then touch that letter." },
  see_match: { hi: "बिल्कुल ऐसा ही अक्षर ढूँढो।", en: "Find the very same letter." },
  letter_hunt: { hi: "शब्दों में यह अक्षर ढूँढो।", en: "Find this letter in the words." },
  word_fill: { hi: "शब्द पूरा करो।", en: "Finish the word." },
  word_spelling: { hi: "सही शब्द चुनो।", en: "Choose the right word." },
  teach_mitthu: { hi: "मैं सही हूँ? मुझे बताओ!", en: "Am I right? Tell me!" },
};

/** The quality cards of the celebration (docs/11 §3.7): each praises something true. */
export const QUALITY = {
  sharpEyes: { icon: "👀", hi: "तेज़ आँखें", en: "Sharp eyes" },
  goodListener: { icon: "👂", hi: "अच्छे श्रोता", en: "Good listener" },
  steadyHand: { icon: "✍️", hi: "पक्का हाथ", en: "Steady hand" },
  memoryMagic: { icon: "🧠", hi: "याद का जादू", en: "Memory magic" },
  neverGaveUp: { icon: "💪", hi: "हिम्मत", en: "Never gave up" },
  finished: { icon: "✅", hi: "पूरा किया", en: "Finished!" },
} as const;
