# Akshara-Flow — Design Guidelines

*The choices behind the app, seen from a dyslexia specialist's side, with the
numbers that put each one into practice. Checked against the code on
12 October 2026 (branch `feat/report-v2`). Where an older document disagrees,
this one describes what the app does today.*

**Who this is for:** dyslexia specialists, special educators, Hindi teachers
and project reviewers. No programming knowledge is needed. The appendix lists
where each number lives in the code, for the development team.

**How to read it:** each section gives the guideline, then the reason for it,
then an *In numbers* table. Section 8 defines what the app measures. Section 9
lists where a specialist would push back, including what the numbers reveal.

> **On the development branches, not yet in the live app (G4, 19 November
> 2026, `feat/g4-path`).** These change what the sections below say:
>
> - **One child screen scrolls: the path** (§5.2). The user chose a single
>   winding path through the units, opening on the next lesson, over one unit
>   per screen — seeing how far you have walked is the point of a path. Every
>   other child screen still does not scroll.
> - **Colours** (§5): one colour per meaning. Primary buttons are teal
>   `#0E7C7B` with white (5.2 : 1, was blue 3.3 : 1); the correct tile is
>   `#2F7D32` with white (5.3 : 1, was 2.8 : 1); the wrong outline is
>   `#D9603F` (3.4 : 1 on the page, was 2.9 : 1). Everything pressable stands
>   on a darker lip.
> - **No numbers on a child's screen** (§9 point 8): no tracing score, memory
>   move count, question count or percentages.
> - **Mitthu speaks each game's instruction in Hindi** (§9 point 6), with the
>   English as a small caption, through the device's Hindi voice — recordings
>   are still needed (§9 point 7). His lines: `src/app/data/mitthuLines.ts`.
> - **A right answer the child found gets a green sheet** with a spoken praise
>   word and Continue (§4.4); a wrong one still gets only the soft outline.
> - **A 🐢 button** in Listen & tap lets the child slow the sound themselves,
>   unlabelled (§4.4, §6); an answer after it is still right first time.
> - **The celebration is four beats** (§4.5): Mitthu proud with the quality
>   cards the lesson earned (never a score), the letter collected, today's
>   sticker, and a chest when one is earned.
>
> What each phase built: docs/12 §9.1–9.4 and docs/11 §10.

---

## Contents

1. [The core teaching idea](#1-the-core-teaching-idea)
2. [How a session is built](#2-how-a-session-is-built)
3. [The four learning stages](#3-the-four-learning-stages)
4. [Keeping the child out of failure](#4-keeping-the-child-out-of-failure)
5. [Visual and reading access](#5-visual-and-reading-access)
6. [Sound](#6-sound)
7. [The adult side](#7-the-adult-side)
8. [What the app measures](#8-what-the-app-measures)
9. [Where a specialist would push back](#9-where-a-specialist-would-push-back)
10. [Sources](#10-sources)
- [Appendix: where the numbers live](#appendix-where-the-numbers-live)

---

## 1. The core teaching idea

### 1.1 Hear a sound, find the letter

The child hears a consonant and taps its written form. The letter's name is
never printed during the task.

**Why.** The core difficulty in dyslexia is linking speech sounds to written
symbols (Snowling, 2000; Vellutino et al., 2004). A printed name would let the
child match text to text and skip the very link being trained. Taking it away
means a correct answer shows that the sound-to-symbol link actually happened
(Ehri et al., 2001).

### 1.2 Teach in aksharas, not single characters

Devanagari is an alphasyllabary. A reader sees खि·लौ·ना as three units, not
the six characters ख·ि·ल·ौ·न·ा. Every word game works in aksharas:

- In *Fill the blank*, the blank is a whole akshara with its vowel sign
  attached. For गाय the choices are गा · मा · भा, never ग · म · भ beside a
  stray ा.
- In *Spelling*, each wrong spelling swaps one consonant and keeps its vowel
  sign.

**Why.** Akshara knowledge is the building block of reading in Indian scripts
(Nag & Snowling, 2012). Splitting a word into characters also misplaces ि,
which is written *before* its consonant: shown on its own, it reads in the
wrong order.

### 1.3 Matras as separate signs (the barakhadi)

Each row shows *consonant + sign = syllable*, for example क + ◌ा = का. The sign
sits on a dotted circle, the standard way to print a vowel sign by itself, with
the vowel it stands for underneath ("आ की मात्रा"). The consonant, sign and
syllable are drawn in three different colours. Tapping a row speaks the
syllable.

- Short and long forms sit side by side: ि next to ी, ु next to ू. Mixing these
  up is one of the most common Devanagari reading errors, and seeing them
  together is the point.
- The child must hear every row before moving on.

### In numbers

| Item | Value |
|---|---|
| Consonants taught | 33 (क to ह), in traditional varnamala order |
| Matras taught | 12: (none), ा, ि, ी, ु, ू, े, ै, ो, ौ, ं, ः |
| Matras per session | 4, so all 12 take 3 sessions |
| Matra rows to hear before moving on | 4 of 4 |
| Example words per letter | 3 (ण has 2, ष has 1) |
| Where the target letter sits in an example word | always at the start of a syllable, usually the first sound |

---

## 2. How a session is built

### 2.1 One fixed sequence, no choosing

A session is one letter, played through a fixed order of activities. The child
never chooses what to do next.

**Why.** Choosing and planning draw on executive function, which is often weak
alongside dyslexia. A fixed sequence also follows structured-literacy practice
(Orton-Gillingham): explicit, step by step and cumulative.

### 2.2 From showing, to doing, to testing

| # | Activity | Role |
|---|---|---|
| 1 | Meet the letter | Shown: the letter, large, with its sound |
| 2 | How to say it | Shown: where in the mouth the sound is made |
| 3 | Example words | Shown: pictured words, spoken when tapped |
| 4 | Matras | Shown: the barakhadi rows |
| 5 | Tracing | Done: draw the letter (only in some stages, see §3) |
| 6 | Memory match | Done: find matching letter pairs |
| 7 | Listen & tap | Tested: hear the sound, tap the letter |
| 8 | Fill the blank | Tested: complete a word |
| 9 | Spelling | Tested: pick the right spelling |
| — | Reward | Celebration |

**Why.** This is gradual release ("I do, we do, you do"): the child meets the
letter before being asked to produce it, and produces it before being tested on
it.

### 2.3 Multisensory on purpose

The child sees the letter, hears it, draws it and matches it.

**Why.** Building memory through several senses at once is the central idea of
Orton-Gillingham teaching. Drawing a letter in particular strengthens its
recognition (James & Gauthier, 2006; Longcamp et al., 2008).

### 2.4 What each activity is for

- **How to say it** names where the sound is made ("back of the throat", "a
  puff of air"). Awareness of how the mouth makes sounds is an established
  phonics technique, and the puff-of-air hint is exactly what separates ग from
  घ.
- **Example words** are everyday things you can picture (गाय 🐄, घर 🏡). The
  picture carries the meaning for a child who cannot read the caption.
- **Tracing**:
  - An animated demonstration shows the stroke order, ending with the headline
    (shirorekha).
  - The child then draws freely over a grey outline. Nothing snaps the
    drawing into place, so a scribble cannot pass.
  - Scoring is deliberately lenient, so a young or clumsy hand is not held
    back by handwriting.
- **Memory match** uses letters this child confuses. It is practice at telling
  them apart without the pressure of a test question.
- **Fill the blank and Spelling** put the letter inside real words. The wrong
  choices are this child's own look-alike letters.

### 2.5 Small doses

**Why.** Working memory is often limited in dyslexia, and several similar
choices at once overload it (Gathercole & Baddeley, 1990). Sessions are short
and every question has at most four choices.

### In numbers

| Item | Value |
|---|---|
| Activities per session | 8, or 9 when tracing is included (plus the reward screen) |
| Scored questions per session | up to 11: Listen & tap 5, Fill the blank 3, Spelling 3 |
| Choices per question | at most 4 (the answer + 3) |
| Memory match | 3 pairs (6 cards) |
| "Meet the letter" | moves on by itself after 3 s |
| Tracing included | in the *Just started* and *Learning the shape* stages only |
| Tracing pass mark (lenient model, in use) | score ≥ 45 %, **or** ≥ 50 % of the letter's path covered |
| Tracing pass mark (strict model, not in use) | score ≥ 75 % |
| Tracing tries | unlimited; the demonstration can be replayed |

---

## 3. The four learning stages

### 3.1 Stages, not "easy to hard"

Not telling म from ल (very different shapes) is a different problem from not
telling म from भ (one small stroke apart). So each child is placed in a stage,
separately for every letter.

| Stage (as adults see it) | What it means | What the app does | Why |
|---|---|---|---|
| Just started | No answers yet on this letter | Very different-looking choices, tracing, no hints | The first session is a clean check; hints would hide what the child knows |
| Learning the shape | Confuses the letter even with very different shapes | Easy choices, tracing, a guiding dot from the start | Keep success high (errorless learning; Terrace, 1963) so the child does not learn to give up (Seligman, 1972) |
| Learning fine detail | Knows the shape, misses the small stroke | Look-alike choices; the dot appears only if they hesitate | Near-miss practice teaches discrimination best (Kornell et al., 2009); recall first, help second (Roediger & Karpicke, 2006) |
| Mastered | Right even among look-alikes | Look-alikes kept, no dot | Consolidation, so gains are not lost |

### 3.2 How the stage is decided

The rules are simple and fixed, not AI. A teacher can see exactly why a child
moved, and the same answers always produce the same stage.

A **miss** is a wrong pick *or* an answer the app had to supply. Questions are
of two kinds:

- **Different-shape** questions: Listen & tap in *Just started* and *Learning
  the shape*.
- **Look-alike** questions: Listen & tap in the two later stages, every word-game
  question, and every check question.

| Evidence from the session | Stage given |
|---|---|
| More than 30 % of different-shape questions missed | Learning the shape |
| Only different-shape questions, 10–30 % missed | Learning the shape |
| Only different-shape questions, under 10 % missed | Learning fine detail |
| Look-alike questions: more than 30 % missed | Learning fine detail |
| Look-alike questions: 10–30 % missed | Learning fine detail |
| Look-alike questions: under 10 % missed | Mastered |

Only the session's questions about its own letter count.

### 3.3 The guiding dot

- **It marks the stroke that tells the letter apart** (the knot on घ, the arch
  on म), not a random spot. It teaches *which part to look at* (feature
  salience; Fiset et al., 2008).
- **It fades as the child improves**: always visible and strong while learning
  the shape, hidden until a pause while learning fine detail, gone at mastery.
  Gradually withdrawing support is the core of scaffolding (Wood, Bruner &
  Ross, 1976).
- **It "breathes" slowly instead of flashing.** Movement draws the eye;
  flashing feels like a countdown.

### 3.4 Built from this child's mistakes

- The letters this child has mixed up with the target are placed among the
  choices first. The fixed list only fills the remaining places.
- Recent mistakes count more; older ones fade, so a mix-up the child has grown
  out of stops steering their practice.
- In the early stages only one personal place is used, so an easy session stays
  easy.
- The fixed choices rotate between sessions so the child cannot memorise the
  grid. A known trouble letter is never rotated out.
- Each child has a separate profile, even on a shared classroom tablet, so one
  child's mistakes never steer another child's practice.

### 3.5 Moving through the alphabet

- **A new letter starts from the child's level on earlier letters**, but never
  above *Learning fine detail*. Skills carry over (Ehri, 2005), but each letter's
  telling stroke has to be learned fresh.
- **A mix-up counts for both letters.** If a mastered letter keeps being chosen
  by mistake, the next session on another letter asks one *check question*
  about it. The first answer decides: right keeps mastery, wrong or supplied
  returns it to *still learning*.
- **Stages are re-judged from the saved answers every time they are read**, so
  if a rule changes, every child's progress is corrected at once.

### In numbers

| Item | Value |
|---|---|
| "Struggling" line | more than 30 % missed |
| "Mastered" line | under 10 % missed |
| Different-shape choices (most letters) | ल ह स र |
| Look-alike choices | 4 per letter, e.g. म → भ ध न ब; ग → घ ध ज ञ; ब → व भ ध ण |
| Personal mix-ups placed among the choices | up to 1 (*Just started*, *Learning the shape*); up to 2 (*Learning fine detail*, *Mastered*) |
| Rotation | at least 1 fixed choice changes if the set would repeat last session's |
| Weight of an older mistake | × 0.8 per session back: 5 sessions back = 0.33, 10 back = 0.11 |
| Weight of a mistake for the other letter in the pair | half |
| Sessions used to find mix-ups | the most recent 30 |
| Starting stage on a new letter | the child's latest stage elsewhere, capped at *Learning fine detail* |
| Guiding dot size | about 10–18 px across, scaling with the screen |
| Dot "breathing" | 2-second cycle, growing to 118 % |
| Dot strength, *Learning the shape* | 70–100 % opacity (70 % + 40 % × the letter's miss rate) |
| Dot, *Learning fine detail* | hidden until the child hesitates, then full strength |
| Dot, *Just started* and *Mastered* | never shown |
| Check question trigger | a mastered letter chosen by mistake twice (unaided) |
| Check questions per session | at most 1, as the last Listen & tap question |
| Roadmap | 33 letters on 4 pages of 10 (the last page has 3) |
| A letter's roadmap score | 100 mastered · 60 learning fine detail · 25 learning the shape · 0 too few answers |
| Next roadmap page opens | when the previous page averages 75 %, or once the child has played on it |

---

## 4. Keeping the child out of failure

### 4.1 Help arrives in steps when the child pauses

If the child does not answer, the wrong choices fade, then the right one glows,
then the app supplies the answer. A child can never be stuck on a screen.

**Why.** Repeated failure is the main driver of reading anxiety and avoidance in
dyslexic children (Riddick, 2010). Every question ends on the right answer.

### 4.2 The timing follows the child's pace

Help is timed from the child's own typical response time, not a fixed clock. A
slow correct answer counts as correct.

**Why.** Dyslexic readers are typically slower (Shaywitz, 2003). This is the
same logic as extra time in exams: slowness is not a mistake, so it should not
trigger help.

### 4.3 Limited failure on any one question

In Listen & tap, two wrong tries end the question with the answer shown. In the
word games the child gets one try, then the right answer is shown.

### 4.4 Gentle feedback on errors

- A wrong choice gets only an orange outline, with no red fill and no shake.
- A soft, low tone plays, not a buzzer.
- In Listen & tap, a warm chord follows and the sound replays more slowly.
- Nothing on screen says "slow mode": slowing the sound helps the child, and
  labelling it would tell them they needed help.

### 4.5 Every session ends in celebration

Chime, confetti, "Great work!" and three stars, whatever the score. This praises
effort, not ability. A mastered letter adds a trophy and "Mastered!".

### 4.6 Quitting is allowed

There is always a way out. A stopped session is kept as information for adults
and is never held against the child.

### 4.7 The child's own progress page never shows mistakes

It shows a star for each practice and a collection of letters. A mastered
letter gets a star *as well as* a colour, so the meaning never depends on colour
alone.

### In numbers

| Item | Value |
|---|---|
| Child's typical response time | median of their unaided answers over the last 5 sessions, kept between 3 s and 12 s; 6 s for a new child |
| Step 1: wrong choices fade to 30 % and cannot be tapped | typical time + 8 s → **11–20 s** (14 s for a new child) |
| Step 2: right choice glows | typical time + 13 s → **16–25 s** (19 s) |
| Step 3: the app supplies the answer | step 2 + 12 s → **28–37 s** (31 s) |
| Wrong tries per Listen & tap question | 2, then the answer is supplied |
| Tries per word-game question | 1, then the right answer is shown |
| Pause after a wrong answer | 1.4 s |
| Pause after a right answer | 1.2 s (Listen & tap), 0.9 s (word games) |
| Sound speed after a wrong answer | 0.8 × |
| Stars at the end of every session | 3, whatever the score |
| Stars on the progress page | 1 per practice; up to 10 drawn, then "+N" |
| Unfinished session marked "stopped early" | after 6 hours |

---

## 5. Visual and reading access

### 5.1 Fonts

- **Lexend for all interface text.** It was designed to reduce visual crowding.
  The evidence for it is modest, but it costs nothing.
- **Noto Sans Devanagari for every Hindi letter, on every device.** The whole
  method depends on tiny strokes, and the fonts built into phones draw those
  strokes differently. Without one fixed font, a stroke learned on one phone
  could be missing on the next.
- **No extra letter-spacing on Hindi.** The headline joins the letters, and
  spacing breaks it. (The British Dyslexia Association's advice to widen letter
  spacing is written for Latin script and does not transfer.)

### 5.2 Calm, predictable screens

- A warm off-white background instead of pure white, to cut glare (British
  Dyslexia Association style guide).
- The same three-part layout on every screen: header, activity, one main button.
  Nothing scrolls on a child's screen (on the G4 branch, the path is the one
  exception — see the note at the top).
- One identical "Listen" button wherever there is sound. A speaker that
  sometimes does nothing teaches a child that speakers do not work.
- A progress bar for the session and dots for the questions. Knowing how much
  is left lowers anxiety.

### 5.3 Size and touch

- Letters scale with the screen. The letters to choose between fill about half
  of their tile.
- Every tap target is at least 44 px square, because coordination difficulties
  often come with dyslexia (Ramus, 2003).

### In numbers: sizes

Sizes run from a small phone (360 × 640 px) to a large tablet.

| Item | Size |
|---|---|
| Background colour | #F7F6F2 |
| Letter on "Meet the letter" | ≈ 43 px → 96 px |
| Letters to choose between (Listen & tap, Memory, Fill the blank) | 46 % of the tile's shorter side, 24 px → 104 px |
| Word in Fill the blank | ≈ 36 px → 60 px |
| Whole words in Spelling | ≈ 18 px → 42 px |
| Matra rows | 28 px → 52 px |
| Headings | ≈ 17–20 px → 22–31 px |
| Instruction and body text | ≈ 14.6 px → 17.3 px |
| Captions | ≈ 12.6 px → 14.7 px |
| Smallest tap target | 44 × 44 px |
| Button height | 44–56 px |
| Widest button | 448 px, or 92 % of the screen width |

### In numbers: colour contrast

Measured from the app's colours. The minimums are WCAG 2.2 AA: 4.5 : 1 for
ordinary text, 3 : 1 for large text (24 px, or 18.7 px bold) and for outlines.

| Colour pair | Contrast | Verdict |
|---|---|---|
| Main text (dark grey) on the background | 13.6 : 1 | passes |
| Secondary text (mid grey) on the background | 7.0 : 1 | passes |
| Dark text on the yellow "hint" glow | 10.2 : 1 | passes |
| Captions (grey) on the background | 4.47 : 1 | just under 4.5 |
| Orange matra sign, orange "wrong" outline, on white | 3.1 : 1 | passes for large text and outlines only |
| White on the blue buttons | 3.3 : 1 | passes for large text only |
| White letter on the green "correct" tile | 2.8 : 1 | fails |
| Light grey text ("Saving your progress…", the + and = in matra rows) | 2.4 : 1 | fails |

Feedback colours: correct = green fill (#4CAF50); wrong = orange outline
(#E76F51); hint = yellow glow (#FFD166); faded choices = 30 % opacity.

---

## 6. Sound

- The letter sound plays by itself when a letter appears, and the "Listen"
  button replays it at any time.
- The right-answer chime rises; the wrong-answer tone is soft and falls. Neither
  is harsh.

### In numbers

| Item | Value |
|---|---|
| Letter sounds | 33 pre-made clips (synthetic, from Google Translate's voice), played at 1.0 × |
| Letter sound after a wrong answer | 0.8 × |
| Words and syllables | the device's Hindi voice (hi-IN) at 0.85 × |
| Right answer | rising three-note chime (C–E–G), under 1 s |
| Wrong answer | soft tone sliding from 180 Hz to 130 Hz, 0.4 s, no buzzer |
| After a first wrong answer | warm three-note chord, 0.5 s |
| "Slow mode" shown to the child | never |

---

## 7. The adult side

### 7.1 Three audiences

- **The child** sees effort only: stars and a letter collection.
- **The parent** gets an on-screen report, layered from a one-screen summary
  down to individual letters and mix-up pairs.
- **On paper**, the same report prints in full for keeping or sharing.

### 7.2 An adult lock

Adults sign in; children are profiles the adult owns. A 4-digit PIN keeps the
child out of the adult area, so they never see a tally of their own mistakes.
(It replaced an addition sum that most 8-year-olds could solve.)

### 7.3 Plain, non-clinical language

- Stages are shown as *just starting*, *learning the shape*, *learning the fine
  detail* and *mastered*, never "dyslexia", "deficit" or "disorder".
- The engine's own reasoning notes are rewritten into these words before an
  adult sees them.
- The report gives a "Practise next" suggestion, an action rather than a
  verdict.
- The printed report's footer says it records practice and is not a test or a
  diagnosis.

### 7.4 Colour always comes with a mark and a word

Colour is never the only signal. Each status pairs a colour with a symbol and a
label, and the colour bands sit exactly where the app itself changes the
child's level: a colour always means "this is where the app's behaviour
changes".

### 7.5 Built by fixed rules, not AI

Every figure and sentence in the report comes from fixed rules, so the same
practice always produces the same report. A specialist can reproduce it.

### In numbers

| Item | Value |
|---|---|
| Adult PIN | 4 digits (10,000 combinations), stored only as a salted hash |
| Wrong PIN tries before a pause | 5, then a 30-second wait |
| Forgotten PIN | reset by signing in with Google again |
| Report periods | Week (from Monday), Month (from the 1st), All |
| Changes are compared with | the same span of the previous week or month |
| Base figure | *right first time* (see §8) |
| Colour bands, by share of answers missed | **Secure** under 10 % · **Developing** 10–30 % · **Needs support** over 30 % |
| Letter marks | ● learned (the app's mastery) · ◐ 70 % or more right first time last time · ▲ under 70 % · ○ not started |
| "Practise next" | the period's top mix-up, if it happened 2 or more times |
| Letters × skills shading | under 50 · 50–69 · 70–89 · 90+ % |
| Practice heat (minutes a day) | under 10 · 10–19 · 20–29 · 30+ |
| Printed layout | 680 px wide, so every chart fits A4 and US Letter |

---

## 8. What the app measures

| Metric | What it is | Used for |
|---|---|---|
| Miss | A wrong pick, or an answer the app supplied | Deciding the stage |
| Miss rate, by kind | Misses ÷ questions, separately for look-alike and different-shape questions | Deciding the stage; guiding-dot strength |
| Right first time | Answers correct without the app's help ÷ all answers (Listen & tap and both word games) | The report's base figure |
| App helped | Answers the app supplied ÷ all answers | Report |
| Mix-up | A wrong pick, counted per pair of letters (either way round) | Choosing distractors; check questions; report |
| Look-alike vs different shape | Share of wrong Listen & tap answers on each kind of question | Report: shape problem or detail problem |
| Response time (pacing) | Median of the child's unaided answers, last 5 sessions | Hesitation timing |
| Speed (report) | Median time to answer, right-first-time answers only | Report |
| Writing | Tracing score (best try in a session; the report shows the average) | Report |
| Tracing tries | Number of tries before passing | Stored |
| Memory moves and time | Pairs of cards turned, and how long it took | Stored |
| Time on shown screens | How long the child stayed on each "shown" screen | Stored |
| Finished or stopped early | Whether the session reached the end, and the step where it stopped | Report |
| Practice days, minutes, days in a row | Days with at least one session; minutes from start to end | Report |
| Letters learned | The app's mastery, re-judged from the saved answers on every read | Roadmap; report |

**Not measured yet:** matra knowledge (the matra step teaches but is not scored),
jittery or hesitant touches (recorded as zero), and age (asked for, never used).

---

## 9. Where a specialist would push back

### Fixed since the first review (10 October 2026)

- **Supplied answers were counted as right.** An answer the app gave was scored
  as the child's correct pick, so a child who answered nothing could be marked
  *Mastered*. Since 12 October it is a miss.
- **The adult gate was an addition sum** (two numbers from 6 to 13). It is now a
  4-digit PIN.
- **A mix-up only affected one letter.** It now counts for both, through the
  check question.
- **The report** now uses plain-language stage names and never shows colour
  without a mark and a word.

### Still open

Most important first.

1. **Hinted answers are recorded as unaided.**
   - After one wrong try in Listen & tap, the right choice glows, and the second
     pick is still recorded as independent.
   - Once the wrong choices fade (after 11–20 s) they cannot be tapped, so any
     tap is "correct".
   - Both raise *right first time* and can move a child up a stage early. These
     answers should be recorded as *prompted*.
2. **A hearing mistake looks like a seeing mistake.**
   - Nine of the look-alike pairs also *sound* alike, differing only by a puff
     of air: क/ख, ग/घ, च/छ, ज/झ, ट/ठ, ड/ढ, त/थ, प/फ, ब/भ.
   - In a hear-and-tap task, choosing घ for ग may be a hearing error. The app
     always reads it as "missed the fine detail", although the project's own
     science notes say dyslexia is mainly about sounds.
   - A see-and-match question with no sound would separate the two.
3. **The guiding dot sits only on the correct choice.** While learning the shape
   it is visible at 70–100 % strength from the first second, so a child can
   learn to tap the dot. Those same answers then decide when the child leaves
   the stage.
4. **Mastery rests on one session.**
   - With 6 look-alike questions, *Mastered* needs zero misses. With 11, it
     allows one.
   - Either way it is one sitting. Overlearning, which the project cites
     (Torgesen; Stanovich), would ask for mastery on at least 2 sessions on
     different days.
   - The check question softens this, but only once a letter has been mixed up
     twice.
5. **Confusable letters are taught back to back.** The varnamala order puts
   them next to each other: क ख, ग घ, ट ठ, ड ढ. Structured literacy separates
   confusable letters in time. The trade-off is that this order matches what
   schools teach.
6. **Instructions are written in English and never read aloud.** Examples are
   "Tap the letter you heard", "Which spelling is correct?" and the "Stop
   practising?" dialog. The children are 5 to 10 and struggle to read, so these
   should be spoken, ideally in Hindi.
7. **The audio is synthetic.**
   - Letter sounds come from Google Translate's voice. Words use whatever Hindi
     voice the device has, which varies and may be missing.
   - Synthetic voices are weakest at the puff-of-air differences in point 2.
   - Recordings by a native speaker, checked by a speech therapist, are needed.
8. **The child sees scores in two places.** Tracing says "You scored 30 %. Try
   again!" and the memory game shows a move count. Both break the app's own rule
   of no scores for children.
9. **Text is smaller than dyslexia guidance on phones.**
   - Instructions are ≈ 14.6 px and captions ≈ 12.6 px on a small phone. The
     British Dyslexia Association recommends 12–14 pt, about 16–19 px, or
     larger.
   - Spelling choices can drop to ≈ 18 px, although the difference between
     them is a single small stroke.
10. **Some colours fall short on contrast** (§5): white on the green "correct"
    tile is 2.8 : 1, light grey text 2.4 : 1, and white on the blue buttons
    3.3 : 1.
11. **Some things are claimed or collected but not used.** Jittery and hovering
    touches are always recorded as zero; age (5–10) is asked for but changes
    nothing; matras are taught but not scored (planned as W6).
12. **The 10 % and 30 % lines are not validated.** They are sensible practice
    rules, but labels such as *Needs support* make them look clinical. The
    not-a-diagnosis statement now appears only in the printed footer, by
    choice, because the app makes no screening claim. A specialist would still
    want the bands explained on screen as "where the app changes level".
13. **Smaller points:**
    - Three screens still add letter-spacing to Hindi words: the example words,
      the Fill-the-blank word and the spelling choices.
    - On "Meet the letter" the letter wobbles (up to 110 % size and ±5°
      rotation), which puts motion on the very thing to be studied. The screen
      also moves on after 3 s.
    - A Hindi teacher should confirm the traditional spellings used for ङ and ञ
      (गङ्गा, पङ्खा, अङ्गूर, चञ्चल, पञ्जा, मञ्च).
    - ण and ष have fewer example words than the other letters, so their
      sessions ask fewer word questions.
    - Pronunciation hints are written in English. They help the adult, not the
      child.
    - Two older documents are out of date: `01_PROJECT_OVERVIEW.md` says the
      first session has no tracing, and `07_DYSLEXIA_SCIENCE.md` says audio is
      not built.

---

## 10. Sources

Research named in this document. Entries marked *added* are not in the
project's science notes.

| Source | Used for |
|---|---|
| Snowling (2000); Vellutino et al. (2004) | Dyslexia as mainly a sound-to-symbol difficulty |
| Ehri et al. (2001), National Reading Panel | Training the core skill without confounding cues |
| Ehri (2005) | Letter knowledge carries over to new letters |
| Nag & Snowling (2012) *(added)* | Aksharas as the unit of reading in Indian scripts |
| Gathercole & Baddeley (1990) | Limited working memory |
| James & Gauthier (2006); Longcamp et al. (2008) | Drawing letters strengthens recognition |
| Fiset et al. (2008) | Letters are told apart by specific features |
| Wood, Bruner & Ross (1976) | Scaffolding that is withdrawn as skill grows |
| Roediger & Karpicke (2006) | Recall before help (the testing effect) |
| Kornell et al. (2009) | Near-miss practice strengthens learning |
| Terrace (1963) | Errorless learning |
| Seligman (1972) | Learned helplessness after repeated failure |
| Riddick (2010) | Reading anxiety in dyslexic children |
| Shaywitz (2003) | Slower reading is not a lack of mastery |
| Stanovich (1980); Torgesen (1977) | Overlearning for retention |
| Ramus (2003) | Motor-coordination difficulties alongside dyslexia |
| British Dyslexia Association, *Dyslexia Style Guide* *(added)* | Font size, background colour, spacing |
| W3C, *WCAG 2.2* *(added)* | Contrast (1.4.3, 1.4.11) and target size (2.5.5) |
| Orton-Gillingham / structured literacy *(added)* | Explicit, sequential, multisensory teaching (an approach, not a single source) |

Full references for the project's own citations are in
[07_DYSLEXIA_SCIENCE.md](07_DYSLEXIA_SCIENCE.md); check the *added* ones
against the original papers before citing them in the BTP report.

---

## Appendix: where the numbers live

For the development team. If a number here changes in the code, update this
document.

| Numbers | File |
|---|---|
| 10 % / 30 % lines, choice pools, guiding-dot strength, personal places, timer offsets, 3–12 s limits | `src/app/lib/adaptiveEngine.ts` |
| Guiding-dot positions per letter, letter order | `src/app/types/levelConfig.ts` |
| Recency weight, pair weight, 30 / 5 sessions | `src/app/lib/learnerProfile.ts` |
| Check question, roadmap scores, 75 % page rule | `src/app/lib/letterStatus.ts` |
| Activity order | `src/app/types/session.ts` |
| Questions per game, two-tries rule, pauses, dot size and breathing | `src/app/screens/play/steps/` |
| Hesitation ladder (word games) | `src/app/hooks/useHesitationLadder.ts` |
| Tracing pass marks | `src/app/utils/tracingEvaluator.ts` |
| Sound speeds and tones | `src/app/hooks/useLetterAudio.ts`, `src/app/utils/speech.ts`, `src/app/utils/soundEffects.ts` |
| Type scale, letter sizes, tap targets, fonts | `src/styles/fonts.css` |
| Colour bands and adult stage names | `src/app/lib/reportBands.ts` |
| Report figures and periods | `src/app/screens/report-v2/model.ts`; design in [10_REPORT_DESIGN.md](10_REPORT_DESIGN.md) |
| PIN tries and wait | `src/app/screens/account/UnlockScreen.tsx` |
| "Stopped early" after 6 h | `src/app/lib/sessionStore.ts` |
