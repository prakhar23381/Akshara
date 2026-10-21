# Akshara-Flow — Gamification and Child UX

*What Duolingo does to keep people coming back, which parts suit a 5–10-year-old
with dyslexia, and what each one becomes in Akshara. Written 19 October 2026
against `main`. It is a proposal: nothing here is in the app yet, but §9's
play lab prototypes it. The decisions it needs are listed in §7.*

**Read with:** [design_guidelines.md](design_guidelines.md). That document
holds the rules that keep the child out of failure, and **those rules win**
whenever they clash with an idea here. Every idea below has a *Guardrail* line
saying how it stays inside them.

**Screenshots referenced:** S1–S13, a Duolingo Hindi first-run taken on
19 October 2026: S1 lesson complete, S2 streak, S3 daily quest, S4 rare chest,
S5 age question, S6–S7 Duo's introduction, S8/S10 picture choice, S9/S11 tap
what you hear, S12 the path, S13 daily rewards.

---

## Contents

1. [Why the app feels flat today](#1-why-the-app-feels-flat-today)
2. [What motivates a child](#2-what-motivates-a-child)
3. [Duolingo's principles, and what they become here](#3-duolingos-principles-and-what-they-become-here)
4. [What not to copy](#4-what-not-to-copy)
5. [The proposed child journey](#5-the-proposed-child-journey)
6. [Build order](#6-build-order)
7. [Decisions needed](#7-decisions-needed)
8. [Sources](#8-sources)
9. [The play lab](#9-the-play-lab)

---

## 1. Why the app feels flat today

The teaching underneath is sound. What is missing is feeling: nothing on screen
is *someone*, nothing is waiting for the child, and the few numbers a child sees
are the wrong kind.

| What the child sees today | Where | Why it falls flat |
|---|---|---|
| "Progress on Page 1: **25 %** average" | `LetterRoadmapScreen.tsx` | A percentage is a grade. A 6-year-old reads 25 % as "bad", and it breaks the app's own no-scores rule |
| "**7 questions** answered" under the stars | `RewardStep.tsx` | A tally, not a celebration. It says what was done, not what was good about it |
| "You scored 30 %. Try again!" | Tracing (design_guidelines §9.8) | A score after a failure, the worst moment to show one |
| One reward screen: 🎉, "Great work!", ⭐⭐⭐ | `RewardStep.tsx` | Identical every time, so it means nothing by the third session |
| 4 pages of 10 letter tiles, whole pages locked | `LetterRoadmapScreen.tsx` | A grid is a spreadsheet. Nothing says "you are *here*, this is *next*" |
| Emoji avatar (🐻) that wobbles | `ResumeScreen.tsx`, `ProfileAvatarScreen.tsx` | The only character in the app, and it has no voice, no reactions, no name |
| Instructions in English text, never spoken | every step | The child cannot read them, so the app feels like it is talking to someone else |
| Flat blue buttons, medium weight text | `AksharaButton.tsx` | Nothing invites a tap. Duolingo's buttons look pressable before you touch them |
| No reason to open the app tomorrow | — | Duolingo spends 4 of the 13 screenshots (S2, S3, S4, S13) on tomorrow |

---

## 2. What motivates a child

Duolingo's gamification works on adults because it satisfies three needs that
self-determination theory names (Ryan & Deci, 2000). They hold for children too,
with a few changes for a child who struggles to read.

| Need | What it means | How Duolingo meets it | How Akshara should meet it |
|---|---|---|---|
| **Competence** | "I am getting better at this" | Progress bars, "Amazing!", a visible path | Show *growth* (letters collected, the path advancing), never accuracy |
| **Relatedness** | "Someone cares that I did this" | Duo is proud of you (S1), Duo greets you (S6) | A companion who knows the child's name and is happy to see them; a grown-up who sees the streak too |
| **Autonomy** | "I chose this" | Tap to open the chest (S4), choose to claim, "Can you practice every day?" (S2) is a question, not an order | Small real choices that cost the teaching nothing: open the chest, pick a sticker, choose where to put it, choose the companion's hat |

**Three cautions particular to children:**

1. **Rewards can crowd out interest.** Children promised a reward for an
   activity they already enjoy later do it less (Lepper, Greene & Nisbett, 1973;
   Deci, Koestner & Ryan, 1999). The damage comes from *expected, contingent*
   rewards. Surprise rewards and rewards that carry information ("you got
   faster at hearing ग") do far less harm. So: rewards should arrive as
   surprises and should describe what the child did well, never be traded for
   work ("do 3 more and get a sticker").
2. **Loss hurts more than gain helps** (Kahneman & Tversky, 1979). Duolingo's
   streak is powerful *because* losing it stings. For a dyslexic child who
   already associates reading with losing, a reward that can be taken away is a
   new way to fail. Every reward here is **kept forever**.
3. **The adult is the real daily trigger.** A 6-year-old does not open an app
   by themselves. The habit loop has to run through the parent: the parent gets
   the reminder; the child gets the joy.

---

## 3. Duolingo's principles, and what they become here

Each principle: **what Duolingo does** (with the screenshot), **why it works**,
**in Akshara**, and the **guardrail** that keeps it within design_guidelines.

### 3.1 A companion with feelings

**Duolingo.** Duo is on almost every non-exercise screen and has a different
emotion each time: waving hello (S6), starry-eyed excitement (S7), crying with
pride (S1), studying beside the streak flame (S2). Duo speaks in speech bubbles,
in the first person: "I'm proud of you already!!"

**Why it works.** People respond to a character's emotions as if they were
social (Reeves & Nass, 1996). Making Duo proud is a reason to practise that has
nothing to do with the language. For a child this is even stronger: a friend
who is happy to see you is a reason to come back.

**In Akshara.** One companion, used everywhere a child is not actively
answering. Recommended: **मिट्ठू (Mitthu), a parrot.** Parrots repeat sounds,
which is exactly the app's core task ("listen, then find"); "मिट्ठू" is a name
almost every Indian child already knows; a parrot is culturally neutral.

| Moment | Mitthu's state | Says (spoken in Hindi, shown in a bubble) |
|---|---|---|
| App opens | waving | "नमस्ते {name}! आज कौन-सा अक्षर?" |
| Session starts | excited, wings up | "चलो, सुनते हैं!" |
| Child is listening | head tilted, hand to ear | — |
| Right answer | small hop | one rotating praise word: "शाबाश!", "वाह!", "बहुत बढ़िया!" |
| Wrong answer | thinking, *not* sad | "फिर से सुनो" (listen again) |
| Child hesitates | leans toward the screen | — (the hint ladder does the work) |
| Session ends | proud, happy tears (like S1) | "मुझे तुम पर गर्व है!" |
| Letter mastered | trophy, dance | "{letter} अब तुम्हारा है!" |

**Guardrail.** Mitthu is **never disappointed, never sad at the child, never
impatient.** No "Mitthu misses you" guilt (§4). A wrong answer gets curiosity,
not sorrow. Mitthu does not move during a question except in the listening
pose, so it does not compete with the letter (§9.13 of design_guidelines warns
against motion on the thing to be studied).

**It also fixes an open issue.** design_guidelines §9.6: instructions are
English text that the child cannot read. If Mitthu *speaks* every instruction,
in Hindi, the child is addressed directly for the first time.

### 3.2 Conversation before forms

**Duolingo.** Before any question, Duo introduces itself (S6) and says how long
this will take: "Just **7 quick questions** before we start your first lesson!"
(S7). A number makes the effort feel finite. Sign-up comes *after* the first
lesson (S5), once you already care.

**In Akshara.** The adult does the account work (that is right, and stays).
What changes is the **handover**: once the adult has added the child, the device
is passed to the child and Mitthu introduces itself by the child's name. Each
session opens with a bubble that sets the size of the task in pictures, not
numbers the child must read: "3 खेल, फिर एक सरप्राइज़!" with three game
icons and a gift icon.

**Guardrail.** Short. Two bubbles at most before the first activity, and a
second visit skips the introduction.

### 3.3 The path, not the grid

**Duolingo.** The home screen is a single winding path (S12). One node is
current, bigger and ringed with progress; everything ahead is grey and locked;
a chest sits on the path as something to reach; a character waits further
along; the unit has a name ("Form basic sentences"). You never choose from a
menu. You go *forward*.

**Why it works.** A path turns "33 letters" into "the next step", which is a
goal a child can hold in mind. It also makes progress *spatial*: you can see
how far you have walked.

**In Akshara.** Replace the 4-page grid with one vertical, winding path of 33
letter nodes, grouped into **units by varga**. The varga is how Hindi already
groups its consonants, and each varga is a place in the mouth, which the "How to
say it" step already teaches:

| Unit | Letters | Child-facing name (suggestion) |
|---|---|---|
| 1 | क ख ग घ ङ | गले की आवाज़ें (throat sounds) |
| 2 | च छ ज झ ञ | तालु की आवाज़ें (palate sounds) |
| 3 | ट ठ ड ढ ण | जीभ मोड़ो (curl the tongue) |
| 4 | त थ द ध न | दाँत की आवाज़ें (teeth sounds) |
| 5 | प फ ब भ म | होंठ की आवाज़ें (lip sounds) |
| 6 | य र ल व | — |
| 7 | श ष स ह | — |

- The **current letter** is large, gently pulsing, with a "START / शुरू करो"
  tooltip, exactly like S12.
- A **chest** sits at the end of each unit (§3.6).
- **Mitthu** sits on the path beside the current letter, and moves along as
  the child does.
- Node look follows the existing stages, always with a mark as well as a colour
  (design_guidelines §7.4): not started (grey), practising (blue ring filling
  25 → 60), mastered (gold, with a crown).

**Guardrail.** No percentage anywhere on the path. The ring fills; the number
is for adults. The fixed sequence (design_guidelines §2.1) is untouched: a path
*is* a fixed sequence, made visible. Whether letters ahead are locked is a
decision (§7, D3).

### 3.4 One small mission a day

**Duolingo.** "Complete 1 lesson" with a fat progress bar ending in a chest
(S3). Tiny, certain to be met, and it pays out. Its headline is not "you did a
lesson", it is "**Daily Quest complete!**": the same action, now a win.

**In Akshara.** "आज का मिशन: 1 अक्षर" on the home screen, a bar with a chest at
the end. One session fills it. Optional bonus missions that reward *strategies*,
not scores:

| Mission | Met when |
|---|---|
| Play one letter | one session finished |
| Good listener | pressed Listen again on 3 questions (rewards help-seeking) |
| Draw it | finished tracing |
| Visit an old friend | replayed a mastered letter |

**Guardrail.** At most one mission is required, it is always achievable in one
session, and an unmet mission simply is not there tomorrow. It never shows as
"failed".

### 3.5 A streak that cannot be lost

**Duolingo.** The streak (S2) is Duolingo's strongest habit tool: a big number,
a flame, a week strip, and "Can you practice every day?" Its strength is fear of
losing it.

**Why it must change for us.** That fear is exactly what a struggling reader
should not be given (§2, caution 2). A 7-year-old who misses a day because of a
family wedding should not come back to "0".

**In Akshara.** Keep the joy and drop the loss:

- **A week strip of days practised** (like S2's Mo–Su row): each practised day
  gets a sticker. The strip shows *this week* and starts fresh on Monday with
  last week's stickers saved in the album. Nothing goes back to zero.
- **A growing thing instead of a counter.** Mitthu's tree grows one leaf per
  practice day, forever. Days off leave it as it was; it never wilts.
- **The days-in-a-row number goes to the adult**, who can use it, in the
  report the app already computes ("practice days, days in a row",
  design_guidelines §8).

**Guardrail.** No counter that resets, anywhere on a child's screen.

### 3.6 Surprise rewards the child opens

**Duolingo.** Chests (S3, S4, S12, S13) are rewards you *open*. S4 is a whole
screen for one action: "RARE", a chest, "Tap to open!". The tap gives the
player agency, the rarity label builds anticipation, and the contents are a
surprise.

**In Akshara.** A **sticker album**, filled from chests.

- Chests appear at the end of a unit (on the path) and when the daily mission
  is met. Each is "tap to open", with a shake, a pop and a sound.
- The **sticker is tied to the letter just learned** whenever possible: finish
  ग and the chest holds a गाय sticker, the example word's picture. The reward
  is also a second look at the word. Other stickers: animals, festivals,
  fruits, vehicles.
- Rarity is fine as decoration ("चमकीला!" shiny) but every chest **always**
  contains something; there is no empty or "bad" outcome.

**Guardrail.** No currency, no shop, no buying, nothing that can be spent or
lost. Chests are a surprise after the work, never a price for more work
("finish 3 more to unlock"), because of the over-justification risk in §2.

### 3.7 Celebrate in beats, not in one screen

**Duolingo.** The end of a lesson is a sequence (S1 → S2 → S3 → S4), each one
screen, one message, one button. Each beat gets its own moment instead of
competing for space.

S1 is the model screen. It names the qualities of the lesson with a positive
adjective over each number: **AMAZING** 100 %, **SPEEDY** 1:46. The label does
the praising.

**In Akshara.** Replace the single `RewardStep` with up to four beats, each one
tap to continue, the whole sequence under about 15 seconds:

1. **Mitthu is proud** (S1). Spoken "शाबाश, {name}!", three stars as today,
   and **three quality cards** like S1's, but each card praises something true
   the child did, never a score or a time:

   | Card | Icon | Shown when |
   |---|---|---|
   | तेज़ आँखें (Sharp eyes) | 👀 | got a look-alike question right without help |
   | अच्छे श्रोता (Good listener) | 👂 | pressed Listen again (help-seeking is a skill) |
   | पक्का हाथ (Steady hand) | ✍️ | finished tracing |
   | याद का जादू (Memory magic) | 🧠 | finished the memory game |
   | हिम्मत (Never gave up) | 💪 | finished the session after a wrong answer |
   | पूरा किया (Finished!) | ✅ | always, as the fallback |

   Pick the three that apply, in a fixed order of preference. There are always
   at least three, because every finished session ends Memory and has the
   fallback.
2. **The letter is collected.** The letter flips into the album as a card; a
   mastered letter turns gold with a crown.
3. **Today's sticker** lands on the week strip (§3.5).
4. **Chest**, only when one was earned (§3.6).

**Guardrail.** No accuracy, no time, no question count (S1's "100 %" and "1:46"
are exactly what not to copy). The "Speedy" idea is out: dyslexic readers are
slower, and design_guidelines §4.2 is built on slowness not being a mistake.

### 3.8 Exercise screens that feel alive

From S8–S11:

| Duolingo detail | Why it works | In Akshara |
|---|---|---|
| A **thick, rounded progress bar** at the top that grows with each answer | You always know how close the end is | Already have one; make it thicker, rounded, green |
| The bar **glows and says PERFECT** after a run of right answers (S11) | A combo makes a streak *inside* a lesson feel good | Glow after 3 right in a row. When the run ends, the glow just fades; nothing says "combo lost" |
| A **"NEW WORD"** tag (S8, S10) | Flags novelty, so the learner expects not to know it yet | "नया अक्षर" tag on Meet the letter |
| A **feedback sheet** slides up: green, ✓ **Amazing!**, the meaning (S11) | One consistent place for feedback; the meaning reinforces learning | On a right answer, a green sheet with Mitthu, a spoken praise word, and the picture of a word starting with the letter (गाय 🐄) |
| **Character speaking** the audio in a bubble (S9, S11) | The sound comes from *someone* | Mitthu "says" the sound in Listen & tap |
| A **SLOW** button (S9) | Lets the learner slow audio down themselves | A 🐢 button the child may press. See D5: design_guidelines §4.4 deliberately hides slowing |
| Word tiles leave a **grey ghost** behind when used (S11) | Shows where the tile came from, and where it can go back | Use in Spelling / Fill the blank if they ever become build-a-word |
| A **CHECK** button that only lights up once you choose (S8) | Lets you change your mind before committing | See D6: it adds a tap and changes what response time measures |

**Guardrail.** A wrong answer never gets the red sheet. Keep the existing
orange outline and soft tone (design_guidelines §4.4); the sheet only exists
for success, and for a wrong answer Mitthu just says "फिर से सुनो".

### 3.9 A visual language that invites touch

Duolingo's look is consistent and has a few unmistakable traits:

- **Chunky "3D" buttons.** Every button has a darker lip under it (S1's CLAIM
  XP, S6's CONTINUE); pressing it pushes the button down onto its lip. You can
  tell it is pressable before you touch it.
- **Bold, rounded type in capitals** for buttons and labels (CHECK, CONTINUE,
  NEW WORD).
- **Thick-bordered cards** with generous radius (S8, S1).
- **Saturated, flat colours, each with one job:** green = go and correct, blue
  = info and secondary, gold = reward, orange = streak.
- **Illustrations, not emoji.** Every object (book, apple, chest) is drawn in
  one consistent style.

**In Akshara.**

| Token | Today | Proposed |
|---|---|---|
| Primary button | flat `#4A90E2`, `font-medium` | green, **bold**, 4 px darker bottom lip; on press it moves down 4 px and the lip disappears |
| Secondary button | white with blue border | white, grey 2 px border with a grey lip |
| Cards / option tiles | thin border | 2 px border with a 4 px bottom lip; selected = blue border and tint |
| Colour roles | ad hoc blues, ambers, greys | one colour per meaning, written down in `theme.css` (go/correct, info, reward, streak, hint) |
| Type | Lexend, mostly medium | Lexend **bold/black** for buttons, labels and headings |
| Avatars and pictures | emoji | one illustration style (SVG) for Mitthu, avatars, stickers and chests |
| Background | warm off-white `#F7F6F2` | **keep it.** Duolingo's dark mode looks good but the off-white is a dyslexia choice (design_guidelines §5.2) |

**Guardrail.** Contrast must meet WCAG AA. design_guidelines §5 lists three
colour pairs that already fail, among them white on the green "correct" tile
(2.8 : 1); a green button with white text needs a darker green than `#4CAF50`.

### 3.10 Sound and touch you can feel

Duolingo's right-answer "ding" is so distinctive that people recognise it out
of context. Every action has a small sound.

**In Akshara.** The chime and soft tone already exist (`soundEffects.ts`).
Add: a soft tap on every button, a card flip, a chest shake and pop, a sticker
"thwip", Mitthu's chirp. On Android, a short vibration on a right answer and on
the chest (`navigator.vibrate`; iOS Safari does not support it). A mute switch
belongs in the grown-ups area.

---

## 4. What not to copy

| Duolingo feature | Why it is wrong here |
|---|---|
| **Hearts** (lose one per mistake, stop when empty) | Punishes mistakes and ends practice for the child who most needs it. Directly against design_guidelines §4 |
| **Leagues and leaderboards** (S12's trophy tab) | Comparison with other children is the last thing a struggling reader needs |
| **XP for speed, "SPEEDY 1:46"** (S1) | Rewards fast answers; slowness is not a mistake (§4.2) |
| **Accuracy %, "AMAZING 100 %"** (S1) | A score, shown to the child |
| **A streak that resets to 0** (S2) | Loss aversion turned on a child (§3.5) |
| **Guilt from the mascot** ("Duo is sad you didn't practise") | Shame is a known driver of reading avoidance (Riddick, 2010) |
| **Gems, a shop, buying things** (S12's 524 gems, S13) | A currency invites trading work for reward, and spending is a form of loss |
| **Timed rewards** ("Epic Chest 🔒 1H", S13) | Countdown pressure; also pushes a child to return for a timer, not for the letters |
| **Dark theme** | Looks great, but the off-white is a deliberate dyslexia choice |

---

## 5. The proposed child journey

```text
[Grown-up hands over the device]
        │
        ▼
 Home ─ Mitthu waves: "नमस्ते आरव!"          ← speech bubble, spoken
      ─ Today's mission bar  ▓▓▓░░ 🎁        ← §3.4
      ─ Week strip  Mo ★  Tu ★  We ·  …      ← §3.5
      ─ [ चलो खेलें ]  (big green 3D button)
        │
        ▼
 Path ─ Unit 1: गले की आवाज़ें
        (क ★)─(ख ★)─( ग ◔ START )─(घ)─(ङ)─🎁   ← §3.3, Mitthu beside ग
        │
        ▼
 Play ─ "3 खेल, फिर सरप्राइज़!"              ← §3.2
      ─ the existing activities, with Mitthu speaking instructions,
        the glow on 3 in a row and the green success sheet  ← §3.8
        │
        ▼
 Celebrate (tap through, ≤ 15 s)            ← §3.7
   1. Mitthu proud + 3 quality cards
   2. ग flips into the album
   3. today's sticker on the week strip
   4. 🎁 chest → गाय sticker  (only if earned)
        │
        ▼
 Back on the path, Mitthu one step further along
```

---

## 6. Build order

Ordered by impact for effort. Everything up to tier 2 fits the existing stack
(React, `motion`, SVG, `canvas-confetti`) with **no new dependency**.

### Tier 1: quick wins, mostly visual (days)

1. **Remove the numbers a child sees.** The page percentage on the roadmap,
   "N questions answered", the tracing percentage, the memory move count.
2. **3D buttons and colour roles** in `AksharaButton.tsx`, `OptionCard.tsx` and
   `theme.css` (§3.9).
3. **Spoken Hindi praise**, rotated, on right answers and at session end
   (`speech.ts` already speaks hi-IN).
4. **Quality cards** on the reward screen (§3.7, beat 1). Check first which of
   the facts in the table the session record already holds; replay presses may
   need recording.

### Tier 2: the structure (1–2 weeks)

5. **Mitthu**, as a set of static SVG poses with speech bubbles, then simple
   `motion` animation (hop, tilt, wave).
6. **The path** replacing the grid, grouped by varga (§3.3). Touches the page
   logic in `letterStatus.ts` (`LETTERS_PER_PAGE`, `pageOpen`) and its tests.
7. **Celebration beats** replacing the single reward screen (§3.7).
8. **Week strip and daily mission** on the home screen (§3.4, §3.5).

### Tier 3: depth (later)

9. **Sticker album and chests** (§3.6). Needs a small table or local store for
   collected stickers, and a set of illustrations.
10. **Mitthu speaks every instruction**, ideally recorded by a native speaker
    (pairs with design_guidelines §9.6 and §9.7).
11. **Cosmetic choices** (Mitthu's hat, the album's cover). Autonomy with no
    effect on teaching.
12. **A daily reminder for the grown-up** (email or PWA notification).

### How to tell whether it worked

The app already records what is needed (design_guidelines §8):

- **Practice days per week** per child, before and after.
- **Sessions stopped early**, as a share of sessions started. This is the most
  direct sign of a child losing interest mid-session.
- **Time to the first tap** on the home screen, as a rough sign of eagerness.

A pilot of a few children, two weeks on each version, is enough to see a
direction; it is not enough to claim an effect in the BTP report.

---

## 7. Decisions needed

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | **The companion** | Mitthu the parrot · an elephant · a peacock · a child character | Mitthu (§3.1) |
| D2 | **Where the art comes from** | commission an illustrator · draw simple SVGs ourselves · an open illustration set with a licence that allows it | Simple in-house SVGs for tier 2, commission later if the pilot shows the effect |
| D3 | **Letters ahead on the path** | locked like Duolingo (needs an unlock rule per unit instead of the 75 % page rule) · all open, with the next one highlighted | Locked within a unit, the next unit opens when the previous one is finished (played through), not scored |
| D4 | **Animation format for Mitthu** | SVG + `motion` (no new dependency) · Lottie or Rive (richer; adds a dependency, against the 9-dependency rule) | SVG + `motion` |
| D5 | **A 🐢 slow button the child can press** | add it (agency) · keep slowing automatic and unlabelled, as design_guidelines §4.4 decided | Add it, without the word "slow". Pressing it is the child's choice, not a label put on them. Reverses a recorded decision, so it needs a specialist's view |
| D6 | **Tap-then-CHECK, or answer on tap** | CHECK (lets the child change their mind; one more tap; response time ends at the CHECK) · answer on tap (as today) | Answer on tap. Fewer taps for small hands, and response time stays clean for the engine |
| D7 | **Continue button after the success sheet, or auto-advance** | button (child sets the pace) · auto-advance after 1.2 s (as today) | Button. Duolingo shows control of pace matters, and it gives the praise time to land |

**Answers (user, 19–20 October 2026):**

- **D1:** Mitthu, but it must not feel like a copy of Duo. Make him different
  in *role* (the child's pupil — "teach Mitthu"), in *look* (flat Indian
  folk-art line work, not a rounded blob) and in *voice* (Hindi only; he
  repeats). The app's own buttons should not use Duolingo green.
- **D2, D6, D7:** as recommended.
- **D3:** superseded by the curriculum plan, [12_CURRICULUM_PLAN.md](12_CURRICULUM_PLAN.md):
  the real problem is that every session repeats every game.
- **D4:** SVG + `motion`. The "9-dependency rule" is the rules file's
  (`akshara2.md` §1), set at the 2026-10-07 cleanup.
- **D5:** add the 🐢, unlabelled. It reverses no recorded decision (the table
  above overstated this); an answer given after pressing it still counts as
  right first time, like Listen again.

---

## 8. Sources

Entries are named for the ideas they support. Check each against the original
before citing it in the BTP report.

| Source | Used for |
|---|---|
| Ryan & Deci (2000), *Self-determination theory and the facilitation of intrinsic motivation* | Competence, relatedness and autonomy (§2) |
| Lepper, Greene & Nisbett (1973), the "overjustification" study | Expected rewards reduce later interest (§2) |
| Deci, Koestner & Ryan (1999), meta-analysis of rewards and intrinsic motivation | Which kinds of reward do the damage (§2) |
| Kahneman & Tversky (1979), prospect theory | Losses weigh more than gains (§2, §3.5) |
| Reeves & Nass (1996), *The Media Equation* | People respond socially to on-screen characters (§3.1) |
| Riddick (2010) | Shame and reading avoidance (§4); already cited in design_guidelines |
| Duolingo screenshots S1–S13 | The patterns themselves; taken 19 October 2026, not reproduced here |

---

## 9. The play lab

*Built 21 October 2026 on `feat/gamification-lab`.* The ideas above, as
clickable prototypes, so they can be judged on a screen rather than on paper.

**Where:** `npm run dev`, then `/playlab.html`. Development only, like the
report lab (user's choice): `vite build` never builds it, and `dist/` was
verified byte-identical with it present. Code in `src/lab/play/`, styled inline
because `src/lab` is outside the production stylesheet. Nothing in it is wired
into the app; each station is a self-contained mock.

The workbench shows one station at phone, tablet and desktop size at once;
**open alone** gives one frame at full size (show this one on a phone).
The address reproduces the view: `?station=lesson&variant=glow&size=all`.

| Station | Doc 11 | Variants | What to try |
|---|---|---|---|
| **Mitthu** | §3.1, D1 D2 D4 | all poses · each of the 8 | The folk-art parakeet in every pose, with his line spoken in Hindi (tap the bubble) |
| **Buttons & colours** | §3.9 | kit · colours | Press and hold the 3D buttons; every colour pair with its WCAG ratio, proposed and today's |
| **Path** | §3.3 | first letter · in unit 1 · midway | 33 letters by varga; Mitthu beside the current one; tap a grey letter and it wiggles |
| **Home** | §3.4–3.5 | Monday · missed a day · mission met | The week strip that starts fresh without loss; the tree; open the mission's chest |
| **In-lesson** | §3.8, D5 D6 D7 | play · run of 3 · success sheet · wrong answer | A five-question Listen & tap with the real recordings: glow on a run, the green sheet and Continue, the soft miss, the 🐢 |
| **Celebration** | §3.6–3.7 | good session · kept going · no tracing · mastered | The four beats; which quality cards a session earns; open the chest |

**Built from:** SVG and `motion` only (D4), no new dependency. Mitthu, the
chest and the tree are drawn in-house (D2); stickers and card icons are still
emoji placeholders. Sounds are the app's chime and soft tone plus small
synthesised ones (tap, flip, chest, sticker, chirp); Mitthu's voice is the
browser's hi-IN speech, so it varies by device.

**What the lab has already shown:**

1. **Today's wrong-answer outline fails AA.** `#E76F51` on the off-white page
   is 2.9 : 1; a non-text mark needs 3 : 1. The lab's "Not yet" role uses
   `#D9603F` (3.4 : 1), the nearest hue that passes. Today's white-on-blue
   primary button (3.3 : 1) and white-on-green correct tile (2.8 : 1) fail too,
   as design_guidelines §5 already says; every proposed role passes.
2. **"Always three quality cards" (§3.7) holds only while every session runs
   every game.** A lesson without tracing — what G1's three lessons per
   letter will produce — earns two (the "no tracing" variant). Either add a
   card that any lesson can earn, or let a beat show two.
3. **The "run of N" label needs a decision.** The lab says "✨ 4 लगातार!"
   (4 in a row); that is a number on a child's screen, if a kind one. It could
   be the glow alone.

**Still to judge on a real phone:** whether the hop and dance are too busy
during a lesson, the 🐢's playback speed (0.6×), how loud the synthesised
sounds are against the recordings, and vibration (Android only).
