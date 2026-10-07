# Implementation Plan: Word-Level Dyslexia Games

This plan proposes the creation of two new games focusing on word-level dyslexia intervention:
1. **Word Fill-in-the-Blank:** Select the correct letter to complete a word (e.g., `क_ल` with choices `म` or `भ`).
2. **Word Spelling Selection:** Choose the correct spelling among confusable options (e.g., `कमल`, `कभल`, `कसल`).

Both games present the target word's visual icon/image, play Hindi speech dynamically via the Web Speech Synthesis API, and track hesitation latency via the telemetry tracker.

---

## Proposed Changes

### [Frontend Components & Screens]

#### [NEW] [WordFillBlankScreen.tsx](file:///Users/PrakharSaxena/Documents/College/YEAR%203/3.2/BTP/04-05-2026/Akshara/Akshara/src/app/screens/WordFillBlankScreen.tsx)
- Displays a card showing the word's image (e.g. `🪷` for `कमल`) and a replay button to play the audio.
- Renders the word with a blank space representing the target letter (e.g., `क _ ल`).
- Renders option buttons with the correct letter and confusable distractor letters pulled from `SIMILARITY_MAP` or student-specific cognitive profiles.
- Integrated hesitation timers to measure the duration before selection.
- Plays correct/incorrect sound effects on submission and moves to the next word.

#### [NEW] [WordSpellingScreen.tsx](file:///Users/PrakharSaxena/Documents/College/YEAR%203/3.2/BTP/04-05-2026/Akshara/Akshara/src/app/screens/WordSpellingScreen.tsx)
- Displays the word's image and a replay audio button.
- Generates 3-4 spelling options by replacing the target letter (and potentially other letters) with confusable alternatives (e.g., `कमल`, `कभल`, `कसल`).
- Tracks hesitation latency and plays corresponding sound effects.
- Directs the flow to the reward screen upon completion.

#### [MODIFY] [routes.tsx](file:///Users/PrakharSaxena/Documents/College/YEAR%203/3.2/BTP/04-05-2026/Akshara/Akshara/src/app/routes.tsx)
- Imports and registers `/word-fill` and `/word-spelling` pathways.

#### [MODIFY] [GameScreen.tsx](file:///Users/PrakharSaxena/Documents/College/YEAR%203/3.2/BTP/04-05-2026/Akshara/Akshara/src/app/screens/GameScreen.tsx)
- Updates redirect targets upon game completion to route to `/word-fill` instead of routing directly to `/reward`.

#### [MODIFY] [WordFillBlankScreen.tsx](file:///Users/PrakharSaxena/Documents/College/YEAR%203/3.2/BTP/04-05-2026/Akshara/Akshara/src/app/screens/WordFillBlankScreen.tsx)
- Updates completion navigation to route to `/word-spelling`.

#### [MODIFY] [WordSpellingScreen.tsx](file:///Users/PrakharSaxena/Documents/College/YEAR%203/3.2/BTP/04-05-2026/Akshara/Akshara/src/app/screens/WordSpellingScreen.tsx)
- Updates completion navigation to route to `/reward`.

### [Frontend Text-to-Speech Engine]

#### [NEW] [speech.ts](file:///Users/PrakharSaxena/Documents/College/YEAR%203/3.2/BTP/04-05-2026/Akshara/Akshara/src/app/utils/speech.ts)
- A reusable utility to play text in Hindi using the Web Speech Synthesis API (`window.speechSynthesis` with `hi-IN` locale).
- Includes browser fallbacks and volume adjustments.

---

## Design Rationale

1. **Phonological Awareness:** Coupling pronunciation with visual orthography is standard practice in dyslexia interventions. Dyslexic students will hear the target word pronounced in Hindi while viewing the glyphs, reinforcing the phonetic connection.
2. **Cognitive Distractors:** Distractors are generated using the existing `SIMILARITY_MAP` (e.g. replacing `म` with similar looking `भ` or `ध` or `म`) to target visual-spatial confusion directly.
3. **Hesitation Telemetry:** By recording time-to-interact via `useSessionTracker`, we track hesitation delays, which indicate processing struggle even if the final selection is correct.

---

## Verification Plan

### Manual Verification
- Launch the development server (`npm run dev`).
- Progress through the sequential roadmap flow (`Vocabulary -> Tracing -> Memory -> Identification -> Word Fill -> Word Spelling -> Reward`).
- Verify text-to-speech pronunciation sounds correct for words like `कमल`.
- Verify distractors are correctly generated based on visual similarity mappings.
- Verify screen styling complies with standard responsive height metrics and matches the premium glassmorphic visual system.
