# Akshara-Flow — Curriculum and Lesson Plan

*How the app should move a child from their first letter to reading words with
matras, step by step and getting harder in kind, not only in degree. Built from
a literature review on 20 October 2026. It is a **draft for expert review**:
nothing in it is built yet, and §8 lists the questions it needs answered.*

**Who this is for:** the project's dyslexia specialist and nursery-teacher
trainer, who will check the teaching; then the development team. No
programming knowledge is needed outside the appendix.

**Read with:** [design_guidelines.md](design_guidelines.md) (the rules that keep
a child out of failure; they win any clash) and
[11_GAMIFICATION_UX.md](11_GAMIFICATION_UX.md) (the path, the companion and the
rewards this plan plugs into).

---

## Contents

1. [The problem](#1-the-problem)
2. [What the research says](#2-what-the-research-says)
3. [Design principles](#3-design-principles)
4. [The course: four parts](#4-the-course-four-parts)
5. [A letter: three lessons](#5-a-letter-three-lessons)
6. [Review, contrast and checkpoints](#6-review-contrast-and-checkpoints)
7. [New activities](#7-new-activities)
8. [Questions for the experts](#8-questions-for-the-experts)
9. [Build phases](#9-build-phases)
10. [Sources](#10-sources)
- [Appendix: what changes in the code](#appendix-what-changes-in-the-code)

---

## 1. The problem

Every session today is the same sequence, whatever the letter, the child's
stage or how many times they have played it:

> Meet the letter → How to say it → Example words → Matras (the next 4 of 12)
> → Tracing (early stages only) → Memory → Listen & tap ×5 → Fill the blank ×3
> → Spelling ×3 → Reward

What changes between sessions is small: which wrong choices appear, the guiding
dot, whether tracing is shown, and which four matras. So:

- **A child's fifth session on क opens with "Meet the letter" again.**
- **The skill never climbs.** Letter 33 is taught exactly like letter 1, and the
  child is never asked to *read* anything made of the letters they know.
- **Nothing old comes back.** Once a child moves to the next letter, earlier
  letters return only through one check question (when a mastered letter has
  been mixed up twice).
- **Look-alike letters are taught back to back** (क ख, ग घ, ट ठ…), the order
  the varnamala gives them (design_guidelines §9, point 5).

---

## 2. What the research says

Each finding, how strong the evidence is, and what it implies. *Strength* is a
judgement: **strong** means replicated findings or reviews; **moderate**, a few
good studies; **weak**, practice wisdom or indirect evidence.

### 2.1 About aksharas and Indian scripts

| Finding | Strength | Implication |
|---|---|---|
| In Kannada, consonants with their inherent vowel are known by the end of Grade I; consonants with vowel signs and joined consonants are only partly known by Grade II, and learning goes on beyond Grade IV. What makes an akshara hard is its form (Nag, 2007) | strong for Kannada; Hindi is assumed similar but less complex | **Teach plain consonants first, matras later, joined letters last.** Do not mix matras into early consonant lessons as something to learn |
| Vowel signs need extra processing, more so when the sign is written out of speaking order (ि is written *before* the consonant it follows in speech) (reviews of Indic-script reading, 2014–2025) | moderate | **ा before ि**, and ि gets its own care |
| Children in Grades 4–5 still struggle to *build* an akshara from consonant and vowel sign, with errors on small marks (Nag, Treiman & Snowling, 2010) | moderate | Building syllables and words from parts is a later, harder skill and worth practising explicitly |
| Poor Kannada readers have poor akshara knowledge, along with weaker syllable and phoneme awareness, rapid naming and oral language (Nag & Snowling, 2012) | moderate | Akshara knowledge is the core target; sound work (hearing the difference) belongs in the lessons, not only shape work |
| A Hindi mobile game improved recognition and reading of complex aksharas in Grade 4 (second-language) children; spaced and massed versions worked equally (Bhide et al., 2019) | moderate, not a dyslexic sample | A game can teach akshara knowledge; spacing is not a magic ingredient on its own |
| Pratham's Teaching at the Right Level groups children by level (letter → word → paragraph → story), not age or grade, and doubled the share reading a paragraph in Uttar Pradesh camps (J-PAL evaluations) | strong for the approach | **Progress through levels of reading, from letter to word to text.** Place a child by what they can do |

### 2.2 About order and contrast

| Finding | Strength | Implication |
|---|---|---|
| Letters that look or sound alike should be introduced apart in time, and new letters added cumulatively to the ones already known (Carnine, 1976; standard practice in structured literacy) | moderate (the 1976 study) and widely adopted | **Do not teach ग and घ in the same week.** Change the order |
| Alternating between categories (interleaving) helps most when they are *highly similar*; grouping them (blocking) helps when they are dissimilar. Interleaving works by forcing comparison (Carvalho & Goldstone, 2014) | strong in adults; not tested on letters in children | **Once both look-alikes are known, practise them mixed together** — a dedicated contrast lesson |
| Near-miss practice teaches discrimination (Kornell & Bjork, 2008; already cited in design_guidelines) | strong | Contrast lessons should use the child's own look-alikes |

So the order question has an answer that is not "varnamala or not": **separate
look-alikes when they are first taught, then bring them together on purpose
once both are known.**

### 2.3 About practice, review and difficulty

| Finding | Strength | Implication |
|---|---|---|
| Effective lessons open with a short review of earlier learning, review weekly and monthly, teach in small steps, and aim for about **80 % success** — not 95–100 %, which is too easy (Rosenshine, 2012) | strong (a synthesis) | Every lesson starts with a warm-up on old letters; aim for ~80 % right |
| GraphoGame, the most-studied letter–sound game for children at risk of dyslexia, adapts to keep success around 80 % (Richardson & Lyytinen, 2014, and evaluations) | moderate–strong | Same target; it matches the engine's existing 10 % / 30 % lines well |
| Explicit instruction runs **I do, we do, you do**: show, practise with support, practise alone, with distributed and cumulative practice (Archer & Hughes, 2011) | strong | A letter's lessons should move from shown to supported to independent across sessions, not all in one sitting |
| Teaching letters faster with **repeated review cycles** beat one letter a week in preschool (Jones & Reutzel, 2012) | moderate | Move on regularly and keep cycling back, rather than drilling one letter until perfect |
| Spaced retrieval helps young children's word learning, including children with language disorder, in small lab studies (Haebig et al., 2019; Leonard et al., 2024). But in real Grade 2–6 vocabulary lessons, neither spacing nor retrieval practice showed a benefit (Goossens et al., 2016) | moderate in the lab, unproven in classrooms | Spaced review is worth having but is not guaranteed to help; for the youngest, review should **show and hear** as well as quiz, and the prototype should measure whether review helps |
| Children with dyslexia take longer to make a skill automatic (Nicolson & Fawcett's automatisation account) | moderate; disputed in parts | Expect more practice per letter than for other children; mastery should be confirmed, not assumed |
| How strict a "mastered" rule should be is unsettled. Clinicians most often use 80 % over three sessions; when 60 %, 80 % and 100 % (each over three sessions) were compared, only 100 % reliably held up at later checks for children with developmental disabilities (Richling et al., 2019; replicated by Pitts & Hoerger, 2021). Direct comparisons are few | weak–moderate, not a dyslexia sample | Ask for mastery on **more than one day**; how many is an expert call |
| Duolingo began with a simple box system for review and moved to a learned model (half-life regression) once it had millions of learners' data (Settles & Meeder, 2016) | strong for Duolingo | Start with a simple, explainable review rule; a learned one needs data the project does not have |

### 2.4 About motivation (from doc 11)

| Finding | Strength | Implication |
|---|---|---|
| Learners who think they are *teaching* a character try harder and learn more, especially low achievers, and are more willing to admit their own errors (Chase et al., 2009) | moderate | "Teach Mitthu" framing for contrast lessons (§7) |

### 2.5 What is missing

- **No randomised trial of a Hindi dyslexia intervention turned up.** The
  strongest Indian-script evidence is for Kannada, and for typically developing
  children or second-language learners. Hindi has fewer joined letters than
  Kannada, so the Kannada timeline is probably an upper bound.
- **No published teaching order for Hindi consonants was found** beyond the
  varnamala itself and commercial primers. The order in §4 is derived from the
  principles, not taken from a study.
- **No Hindi letter-frequency table was found.** "Letters that make many simple
  words" in §4 is a judgement to be checked.
- Several sources above were read through abstracts or secondary summaries
  (marked in §10). Check them before citing in the BTP report.

---

## 3. Design principles

What the plan is built on, each traced to §2.

1. **Levels of reading, in order:** letter → syllable → word → phrase. The child
   always knows the next step and never meets a harder kind of task before the
   easier one (Nag; TaRL).
2. **Separate, then contrast.** Look-alikes are introduced apart and practised
   together once both are known (Carnine; Carvalho & Goldstone).
3. **Show, then help, then alone — across sessions.** A letter takes three
   short lessons, not one long one (Archer & Hughes).
4. **Every lesson opens with review** of older letters, chosen by what is due
   (Rosenshine; spaced retrieval — lab evidence, so the prototype measures it).
5. **Aim for about 80 % right**, using the engine that already exists (Rosenshine;
   GraphoGame).
6. **Read for meaning early.** As soon as the child knows enough letters to make
   real words, they read them (TaRL's word level; motivation).
7. **Move forward by finishing, confirm mastery over days.** The path never
   holds a child on a lesson they "failed", but "mastered" means it held on
   more than one day (design_guidelines §4; mastery criteria).
8. **Fixed, explainable rules.** Every choice the app makes can be explained to
   a teacher (design_guidelines §3.2).

---

## 4. The course: four parts

| Part | The child learns to… | Example | Status |
|---|---|---|---|
| **1. Letters** | hear a consonant and find it; tell it from its look-alikes | क among फ ट ठ | redesign of today's app |
| **2. First words** | read and build words of plain letters, no matras | जल, कमल, शहर | new; woven into Part 1 |
| **3. Matras** | read vowels and their signs, syllables, then words with matras | आ ा → का → काला | new; this is W6 |
| **4. Reading** | joined letters, phrases, short sentences | कमल जल में है | later; out of scope here |

### 4.1 Part 1: letters in a new order

The draft order below follows three rules:

1. **No two look-alikes in the same unit.** Checked by script against the app's
   own look-alike table (`DISTRACTOR_POOLS`); all eight units pass.
2. **Letters that make many simple words come first,** so Part 2 can start
   after unit 1.
3. **Each "puff of air" letter comes after its plain partner,** so it is taught
   as a contrast (क → ख, ग → घ…). The app already teaches this in its
   pronunciation hints ("Like ग but with a puff of breath").

The rare letters, which need joined letters to appear in any word, come last.

| Unit | Letters | Words the child can read after it (no matras; for the teacher to check) |
|---|---|---|
| 1 | क ल र ज प | जल, कल, पल, कर, पर |
| 2 | म स द य ड | कमल, कमर, मकर, सरल, दस, डर |
| 3 | न ह च व श | नल, नमक, हल, हम, चल, वन, शहर, शहद, नहर, चमक |
| 4 | त ट ब ग | बस, मटर, बटन, नगर, गरम, कटहल |
| 5 | ख फ छ भ ठ *(puff of air)* | खत, फल, छत, फसल, बतख, भजन |
| 6 | घ थ झ ढ *(puff of air)* | घर, झटपट |
| 7 | ध ष ण | धन |
| 8 | ङ ञ *(only in joined letters)* | recognition only, through the existing example words |

The look-alike pairs that land in **neighbouring** units (for example म in
unit 2 and न in unit 3) are the main thing the order cannot avoid with 33
letters. The contrast lessons in §6.2 exist for exactly these pairs.

**Trade-off, for the teacher trainer:** this is not the order children meet at
school. A child may be learning क ख ग घ ङ in class and क ल र ज प here. The
order is a data table in the app, so the varnamala order can be restored in one
change if the experts prefer it; the contrast lessons would then do the
separating work instead.

### 4.2 Part 2: first words

After each unit from unit 1 on, a **word node** on the path holds one or two
lessons of reading words made only from letters the child knows (the table
above). The activities are *Read and pick the picture* and *Build the word*
(§7). This is the TaRL "word" level, reached weeks earlier than it would be if
all 33 letters came first.

Words without matras are pronounced without the final inherent vowel (कमल is
"kamal", not "kamala"). Whether to teach that explicitly is a question for the
teacher trainer (§8).

### 4.3 Part 3: matras

One unit per vowel, each teaching **the vowel letter and its sign together**
(आ and ा). The app has never taught the independent vowels at all; Hindi
primers start with them.

| Order | Vowel and sign | Why here |
|---|---|---|
| 1 | आ ा | written after the consonant, in speaking order; the simplest |
| 2 | ई ी | after the consonant |
| 3 | इ ि | written *before* the consonant: harder (§2.1) |
| — | **contrast ि / ी** | short/long, the most common matra confusion |
| 4–5 | उ ु, ऊ ू | below the letter |
| — | **contrast ु / ू** | |
| 6–7 | ए े, ऐ ै | above |
| — | **contrast े / ै** | |
| 8–9 | ओ ो, औ ौ | above and after |
| — | **contrast ो / ौ** | |
| 10 | ं ँ | nasal marks |
| 11 | ः ृ | rare |

Each matra unit uses the consonants the child already knows: hear and choose
the syllable (का among कि की…), read syllables, then read words (काला, नाना,
राजा). The barakhadi screen that today shows four matras in every consonant
session **moves here**, where it is the lesson rather than a preview.

---

## 5. A letter: three lessons

Each lesson is about **5 minutes**: a warm-up, three activities, the
celebration. Today's single session is around 10 minutes and is the same every
time.

| Lesson | Role (§3.3) | Activities |
|---|---|---|
| **1. Meet** *(नमस्ते क)* | I do, we do | warm-up (2 old letters) · meet the letter, its sound and mouth, example words · tracing · Listen & tap ×3 among *different-shape* letters |
| **2. Find it** *(क ढूँढो)* | you do: the letter | warm-up · Listen & tap ×5 (choices set by the child's stage, as today) · See & match ×3 (no sound) · Memory |
| **3. In words** *(शब्दों में क)* | you do: the letter in text | warm-up · Letter hunt · Fill the blank ×3 · Spelling ×3 |

- **"Meet" is only ever played once.** Later visits to a letter go straight to
  practice.
- **The engine still sets the difficulty** inside each lesson, as today: which
  wrong choices appear, the guiding dot, tracing. The path is the same for
  every child; the difficulty is personal.
- **Finishing lesson 3 completes the letter** and moves the path on (principle
  7). The letter turns **gold** when the engine's mastery rule has held on two
  different days (§8, question E3).
- **A practice node appears** if two or more letters in the current unit are
  still at *learning the shape* when the unit's letters are done: two mixed
  practice lessons before the unit checkpoint. That is the compromise between
  "never hold a child back" and "do not build on sand" (§8, question E4).
- **Pace:** three lessons per letter at one lesson a day is one new letter
  every three days, inside the commonly cited range of one every 2–3 days.
  Part 1 takes about 4 months at one lesson a day, about 2 at two.

---

## 6. Review, contrast and checkpoints

### 6.1 The warm-up: spaced review

Every lesson except the very first opens with **2 questions on older letters**,
picked by a simple box rule:

- Each known letter sits in a box: 1, 2, 3, 4 or 5. A letter is **due** after
  1, 2, 4, 7 or 14 days in its box.
- Right without help: up one box. Wrong or supplied: back to box 1.
- The warm-up asks the most overdue letters, *learning the shape* letters
  first.
- **Young children see and hear before answering:** the letter is shown and
  spoken first, then the question follows, since classroom evidence for pure
  quizzing is weak (§2.3, Goossens et al., 2016).

Warm-up answers are recorded against the letter asked about. They feed the
child's mix-ups and the report; they change a letter's stage **only through
the existing check-question rule** (two mistaken picks of a mastered letter →
one check question). That keeps the stage rules as they are today.

### 6.2 Contrast lessons

When both letters of a look-alike pair are complete, a **contrast node**
appears on the path: one lesson of the two letters mixed together.

- **Sound pairs** (क/ख, ग/घ and the other seven puff-of-air pairs): listen and
  choose, plus *Teach Mitthu* (§7). Hearing practice, which also separates a
  hearing mistake from a seeing mistake.
- **Shape pairs** (म/भ, ब/व, घ/ध…): See & match without sound, the guiding dot
  on the telling stroke.
- **Matra pairs** (ि/ी, ु/ू, े/ै, ो/ौ) in Part 3.
- The child's **own** mix-ups take priority: a pair the child has actually
  confused gets its contrast node even if it is not in the fixed list.

### 6.3 Unit checkpoints

The last node of every unit: one lesson of all the unit's letters, mixed, plus
the most overdue older ones. Its answers feed mix-ups and the report. It is
**not a test that can be failed**: finishing it opens the chest and the next
unit (doc 11, §3.6).

### 6.4 Later: placement

An older child who already knows letters should not start at क. A short
placement round (in the spirit of the ASER/TaRL assessment) could skip whole
units: get a unit's checkpoint mostly right and the unit is marked complete.
Not in the first build.

---

## 7. New activities

| Activity | What the child does | Teaches | Evidence | Lesson |
|---|---|---|---|---|
| **See & match** | sees a letter, finds the same one among look-alikes; no sound | shape discrimination alone | separates seeing from hearing (design_guidelines §9.2) | Find it, shape contrasts |
| **Letter hunt** | taps every क in 3–4 pictured words | finding the letter in text | recognition in text (Jones & Reutzel) | In words |
| **Read and pick the picture** | reads a word (with sound only on request), taps its picture | reading for meaning | TaRL's word level | word nodes, matras |
| **Build the word** | hears a word, builds it from akshara tiles | building words from parts | Nag, Treiman & Snowling | word nodes, matras |
| **Teach Mitthu** | Mitthu says which letter he thinks it is; the child says whether he's right | judging, with the error belonging to Mitthu | Chase et al. (protégé effect) | sound contrasts only |
| **Listen for the syllable** | hears का, chooses among का कि की | matra discrimination | Part 3 | matras |

Every new activity gets the hesitation ladder from the start (dim, glow,
supply; TODO E4) and records its answers the way today's games do.

**About Teach Mitthu:** it shows the child a wrong pairing on purpose, which
sits uneasily with errorless learning (design_guidelines §3.1). It is limited
to contrast lessons, when both letters are already known, and it is a question
for the dyslexia expert (§8).

---

## 8. Questions for the experts

The prototype will be built on the defaults in the right-hand column, so it
can be shown and changed. Each question can be changed without rebuilding.

### For the dyslexia specialist

| # | Question | Prototype default |
|---|---|---|
| E1 | Separating look-alikes at introduction (§4.1) instead of the varnamala order: does the benefit outweigh the mismatch with school? | the new order |
| E2 | Contrast lessons once both letters are known (§6.2): right timing, or should contrast wait until both are mastered? | when both are complete |
| E3 | "Mastered" = the existing rule (under 10 % missed on look-alikes) holding on **two different days**. Two, three, or another rule? | two days |
| E4 | Moving on by completion, with a practice node when 2+ letters in a unit are struggling (§5). Is that enough protection? | as described |
| E5 | Teach Mitthu shows a wrong pairing on purpose. Acceptable in contrast lessons only, or never? | contrast lessons only |
| E6 | Hearing contrasts (क/ख) as their own lessons: worth it for children whose difficulty is mainly phonological? | yes |
| E7 | Warm-up: two review questions per lesson; see-and-hear first for younger children. Right amount? | 2 questions |

### For the nursery-teacher trainer

| # | Question | Prototype default |
|---|---|---|
| T1 | The draft letter order and units (§4.1): workable for children who also learn the varnamala at school? | the new order |
| T2 | The word lists after each unit (§4.1): are these words a 5–8-year-old knows? Any to remove? | the table, pending review |
| T3 | Should independent vowels (अ आ इ…) come earlier, before or alongside consonants, as in many primers? | with their matras, in Part 3 |
| T4 | Matra order (§4.3): ा, ी, ि, then ु ू, े ै, ो ौ, ं, ः. Matches classroom practice? | as listed |
| T5 | Should "कमल is read *kamal*, not *kamala*" be taught explicitly? | not taught; heard in the audio |
| T6 | Lesson length about 5 minutes, one or two a day: right for ages 5–10? | 5 minutes |
| T7 | The Hindi wording Mitthu speaks (doc 11 §3.1): natural for this age? | as drafted |

---

## 9. Build phases

Each phase goes on its own branch; a branch push gives a preview link to show
the experts without touching production.

| Phase | Builds | Uses |
|---|---|---|
| **G1 — Lessons** | the three lessons per letter from today's activities; "Meet" only once; the barakhadi leaves consonant lessons; the letter order as a switchable table | existing games only |
| **G2 — Review** | warm-up box rule; contrast nodes; unit checkpoints; practice nodes; gold over two days | existing games |
| **G3 — New games** | See & match, Letter hunt, Read and pick, Build the word, Teach Mitthu | new |
| **G4 — The path** | the path UI, Mitthu, the celebration beats (doc 11) | new UI |
| **G5 — First words** | word nodes and their word lists (after T2) | G3 games |
| **G6 — Matras (W6)** | Part 3 | G3 games + Listen for the syllable |

**What to show the experts:** after G1–G3 the whole teaching structure works,
even though the screens still look like today's. The path (G4) can follow
their feedback.

---

## 10. Sources

*Checked* = read beyond the abstract. *Abstract* = abstract or catalogue
record only. *Secondary* = known through a review or summary. Check all but the
first kind before citing in the BTP report. **None of these was read in full
text.** Every citation's existence and bibliographic details were re-checked on
20 October 2026 against a publisher, repository or citing-paper record; the
DOIs below are the quickest way to find each one. Several are paywalled
(Taylor & Francis, Springer, Oxford), so a plain web search often finds only
citations of them. The college library or Google Scholar's "All versions" link
usually finds a copy.

| Source | Used for | Read as |
|---|---|---|
| Nag, S. (2007). Early reading in Kannada: the pace of acquisition of orthographic knowledge and phonemic awareness. *Journal of Research in Reading*, 30(1), 7–22 (DOI not confirmed; find it through the journal's Wiley page) | akshara types learned in order over years. The grade-by-grade finding is as reported by Usha et al. (2020), *F1000Research* 9:978, which also found Kannada akshara knowledge still rising until Grade V–VI | abstract + secondary |
| Nag, S. & Snowling, M. J. (2012). Reading in an alphasyllabary: implications for a language-universal theory of learning to read. *Scientific Studies of Reading*, 16(5), 404–423. doi:10.1080/10888438.2011.576352 | aksharas as the unit; profile of poor readers | abstract + secondary |
| Nag, S., Treiman, R. & Snowling, M. J. (2010). Learning to spell in an alphasyllabary: the case of Kannada. *Writing Systems Research*, 2(1), 41–52. doi:10.1093/wsr/wsq001 | building aksharas from parts is hard; errors on small diacritic marks | abstract |
| Bhide, A., Luo, W., Vijay, N., Perfetti, C., Wang, J., Maries, A. & Nag, S. (2019). Improving Hindi decoding skills via a mobile game. *Reading and Writing*. doi:10.1007/s11145-019-09934-x | a game can teach Hindi akshara knowledge | abstract |
| Gupta, A. (2004). Reading difficulties of Hindi-speaking children with developmental dyslexia. *Reading and Writing*, 17, 79–99 (some lists give 2003, the online date) | Hindi dyslexia background (findings not retrieved) | catalogue record |
| J-PAL / Pratham, *Teaching at the Right Level* — a programme and its evaluations, not a single paper: povertyactionlab.org/scale-ups/teaching-right-level | levels of reading; grouping by level | secondary |
| Carnine, D. W. (1976). Similar sound separation and cumulative introduction in learning letter-sound correspondences. *Journal of Educational Research*, 69, 368–372 | separate look-alikes; add cumulatively | catalogue record + secondary |
| Carvalho, P. F. & Goldstone, R. L. (2014). Effects of interleaved and blocked study on delayed test of category learning generalization. *Frontiers in Psychology*, 5, 936 | interleave similar categories | abstract |
| Kornell, N. & Bjork, R. A. (2008). Learning concepts and categories: is spacing the "enemy of induction"? *Psychological Science*, 19(6) | interleaving aids discrimination | secondary (already in design_guidelines) |
| Rosenshine, B. (2012). Principles of instruction. *American Educator*, 36(1) | daily/weekly review; ~80 % success; small steps | secondary |
| Archer, A. L. & Hughes, C. A. (2011). *Explicit Instruction: Effective and Efficient Teaching*. Guilford | I do, we do, you do; cumulative practice | secondary |
| Jones, C. D. & Reutzel, D. R. (2012). Enhanced alphabet knowledge instruction. *Reading Psychology*, 33(5), 448–464 | faster letters with review cycles; recognition in text | abstract |
| Richardson, U. & Lyytinen, H. (2014). The GraphoGame method: the theoretical and methodological background of the technology-enhanced learning environment for learning to read. *Human Technology*, 10(1), 39–60. doi:10.17011/ht/urn.201405281859 (open access, JYX repository) | ~80 % success target (the figure itself is from secondary summaries; check it in this paper) | abstract + secondary |
| Haebig, E. et al. (2019), *JSLHR*; Leonard, L. B. et al. (2024), *JSLHR* | spaced retrieval in young children, including with language disorder | abstract |
| Goossens, N. A. M. C., Camp, G., Verkoeijen, P. P. J. L., Tabbers, H. K., Bouwmeester, S. & Zwaan, R. A. (2016). Distributed practice and retrieval practice in primary school vocabulary learning: a multi-classroom study. *Applied Cognitive Psychology*, 30(5), 700–712. doi:10.1002/acp.3245 | no benefit of spacing or retrieval in real classrooms | abstract |
| Nicolson, R. I. & Fawcett, A. J. (1990). Automaticity: a new framework for dyslexia research? *Cognition*, 35(2), 159–182 | more practice needed for automaticity | catalogue record |
| Richling, S. M., Williams, W. L. & Carr, J. E. (2019). The effects of different mastery criteria on the skill maintenance of children with developmental disabilities. *Journal of Applied Behavior Analysis*, 52(3) | a survey of clinicians' mastery rules, then 60/80/100 % compared | secondary |
| Pitts, L. & Hoerger, M. L. (2021). Mastery criteria and the maintenance of skills in children with developmental disabilities. *Behavioral Interventions* | 100 % held up better than 80 % or 90 % (four children with autism) | secondary |
| Settles, B. & Meeder, B. (2016). A trainable spaced repetition model for language learning. *ACL 2016* | Duolingo's review model | abstract |
| Chase, C. C., Chin, D. B., Oppezzo, M. A. & Schwartz, D. L. (2009). Teachable agents and the protégé effect. *Journal of Science Education and Technology*, 18(4), 334–352 | Teach Mitthu | abstract |

---

## Appendix: what changes in the code

For the development team.

| Change | Where | Note |
|---|---|---|
| Letter order as data, with units | `types/levelConfig.ts` (`LETTER_SEQUENCE`) → a new curriculum table | statuses are keyed by letter, so saved progress survives a reorder; `ResumeScreen`'s "furthest letter" and `letterStatus.ts` pages change |
| A lesson in the config | `LevelConfig` gains `lesson` and a snapshot of `steps` | `buildStepOrder()` returns the snapshot when present and today's order otherwise, so old sessions keep their completion figures (see the comment at `types/session.ts:86`) |
| Which lesson is next | new `planLesson()` next to `planSession()` | derived from saved sessions on read, like letter status; no new table |
| Warm-up and box rule | `learnerProfile.ts` | the check question (E3) becomes one case of review |
| Gold over two days | `letterStatus.ts` | judged on read, so it applies to past sessions too: some gold letters would turn back. Decide whether the rule applies only to sessions after a date |
| New activities | `screens/play/steps/` + `ActivityType` | each through `useHesitationLadder`; See & match feeds the stage (`module_type`), the others feed the report only at first |
| Report | `report-v2/model.ts`, `10_REPORT_DESIGN.md` | Skills gains the new activities; the lab's play fixtures need lessons |
| Tests | `tests/session`, `engine`, `playthrough`, `letterStatus`, `reportModel` | |
| Backend | none | production never calls it; a backend config has no `steps`, so it falls back to today's order |
