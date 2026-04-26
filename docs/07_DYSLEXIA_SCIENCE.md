# Akshara-Flow — Dyslexia Science & Design Rationale

## Why This App Exists

Standard Hindi learning apps present letters, ask children to memorise them, and test recognition. For typically developing children this works. For children with dyslexia it frequently fails — not because the child lacks intelligence or effort, but because dyslexia involves specific differences in how the brain processes written symbols.

This document explains the scientific basis for every major design decision in Akshara-Flow. Each intervention is grounded in reading research, cognitive neuroscience, or evidence-based special education practice.

---

## What Dyslexia Actually Is

### Phonological Processing Deficit (Core)
The most replicated finding in dyslexia research (Snowling, 2000; Vellutino et al., 2004) is that dyslexia is primarily a **phonological processing deficit**: difficulty connecting sounds (phonemes) to their written symbols (graphemes).

For Devanagari, this means:
- The child may hear "म" (the sound /m/) clearly
- But struggle to reliably identify which visual symbol represents that sound
- Or confuse it with भ, ध, or other visually similar symbols

**Akshara-Flow's response:** The app's core task is explicitly phonological→orthographic mapping: *hear a sound, identify the letter*. Every session reinforces the specific link between an auditory stimulus and a visual symbol.

### Visual–Orthographic Processing Differences
Beyond phonology, many dyslexic children show differences in **visual symbol processing** (Vidyasagar & Pammer, 2010):
- Slower formation of stable letter representations in visual memory
- Greater susceptibility to confusion from visually similar letters
- Difficulty isolating small distinguishing features (strokes, serifs, dots)

**Akshara-Flow's response:** The four cognitive states directly correspond to progressive stages of visual–orthographic development. The system identifies *which* visual processing challenge a child faces and applies the appropriate intervention.

### Working Memory Constraints
Dyslexic children typically show reduced phonological working memory capacity (Gathercole & Baddeley, 1990). Presenting too many similar-looking options simultaneously overloads the system.

**Akshara-Flow's response:**
- Maximum 4 options (never more)
- Easy distractors (ल ह स र) during early stages reduce decision load
- Hard distractors introduced only after basic shape recognition is established

---

## Specific Design Decisions and Their Evidence Base

### 1. Audio-Only Letter Identification (No Text Label)

**Decision:** The game screen shows no text label for the target letter. The child hears the sound and must identify the letter visually.

**Rationale:** If the text label "म" were shown alongside the task, the child could use text-to-symbol matching rather than phonological→orthographic mapping. This would measure text recognition, not reading. By removing the text label, every correct answer requires the child to genuinely connect the phonological input (the sound) to the correct visual symbol — which is exactly the mapping that dyslexia disrupts.

**Research basis:** This is consistent with phonological awareness training principles (Ehri et al., 2001 — National Reading Panel). The core skill being trained must be isolated from confounding cues.

---

### 2. The Four-State Cognitive Model

**Decision:** Rather than a linear difficulty scale (easy → hard), the system uses four states representing qualitatively different cognitive profiles.

**Rationale:** Dyslexic children's difficulties are not uniformly distributed. A child may accurately distinguish म from ल (different shapes) but consistently confuse म with भ (similar shapes). Treating these as "easy" and "hard" versions of the same task misses the distinction. The four states identify *where* in the visual processing hierarchy the child needs support.

| State | Corresponds to |
|---|---|
| `gross_shape_blindness` | Visual–orthographic representation not yet formed for this letter |
| `feature_neglect` | Global shape encoded, fine features (knot, bar, tail) not yet salient |
| `visual_mastery` | Stable, accurate letter representation formed |
| `insufficient_data` | No data — assessment phase |

**Research basis:** This model draws on the **Dual Route Model of Reading** (Coltheart et al., 2001) and letter recognition research distinguishing global shape perception from fine-feature discrimination (Pelli et al., 2006; Fiset et al., 2008).

---

### 3. Tracing for GROSS_SHAPE_BLINDNESS

**Decision:** When a child cannot recognise the target letter's basic shape, they trace it before attempting identification.

**Rationale:** Multiple studies demonstrate that **motor learning strengthens letter representations** beyond what visual study alone achieves:

- James & Gauthier (2006): Children who traced letters showed stronger letter-selective neural activation in the reading network compared to those who viewed letters passively.
- Longcamp et al. (2008): Handwriting (and by extension, tracing) activates Broca's area during subsequent letter recognition — the motor memory directly supports visual processing.
- Berninger et al. (2006): For children with reading disabilities, kinesthetic/motor encoding is a compensatory pathway when the standard visual pathway is less efficient.

For Devanagari specifically, the letters have complex stroke patterns. Tracing activates spatial-motor memory of the stroke sequence, creating a secondary route for letter recognition that does not rely solely on visual feature extraction.

**Implementation note:** TracingCanvas currently uses simplified guide dots. In a full implementation, per-letter SVG stroke paths would provide accurate motor templates.

---

### 4. Proactive vs. Rescue Dot

**Decision:**
- GROSS_SHAPE_BLINDNESS: dot visible from question start (proactive)
- FEATURE_NEGLECT: dot appears only on hesitation (rescue)
- VISUAL_MASTERY: never

**Rationale:** This is an application of **scaffolded instruction** (Vygotsky's Zone of Proximal Development, operationalised by Wood, Bruner & Ross, 1976). The key principle is that support should be:

1. **Available when needed** (but not always present)
2. **Progressively withdrawn** as competence increases
3. **Responsive** to the learner's current state, not fixed

For GROSS_SHAPE_BLINDNESS, the child does not yet have a stable letter representation. Without the dot, they are guessing. The dot immediately focuses attention on the distinguishing feature, building the association between the sound and the feature from early attempts.

For FEATURE_NEGLECT, the child has the global shape. Providing the dot proactively would allow them to bypass the cognitive work of independent feature discrimination. By withholding it until hesitation, the system encourages independent recall first, then provides rescue when the child signals uncertainty. This forces active retrieval, which is a more durable memory consolidation mechanism than passive recognition (Roediger & Karpicke, 2006 — Testing Effect).

**The breathing animation (scale 1→1.12):**
The gentle pulsing serves two purposes:
1. **Attentional capture:** Motion is pre-attentively processed by the visual system (Treisman, 1986). A moving dot is more effective at directing attention than a static one, without being distractingly large.
2. **Non-threatening signal:** The slow, gentle animation is calibrated to avoid anxiety-triggering urgency. A fast flashing cue signals "you're running out of time"; a breathing pulse signals "here is something to notice."

---

### 5. Feature-Specific Dot Positions

**Decision:** The dot is placed at the specific structural feature that distinguishes each letter from its most common confusable, not at a generic position.

**Rationale:** Reading research on letter distinctiveness (Fiset et al., 2008; Changizi et al., 2008) shows that letters are distinguished primarily by their **diagnostic features** — the portions of the letter that carry the most information for discrimination. For Devanagari:

- म is confused with भ because they share a symmetric arch + two legs. The distinguishing feature is the short vertical bar on भ's upper-right (which म lacks). The dot on म points to `arch_top_center` — the identical feature that म and भ share — helping the child notice "this specific shape without the bar."
- घ is confused with ध because they have similar overall proportions. The distinguishing feature is घ's `knot_upper_right` (closed loop) vs. ध's open arch.

By placing the dot at the *most diagnostic location*, the system is doing **feature salience training**: teaching the child which specific visual attribute to use for discrimination. This is more effective than a generic "look at the letter" cue.

---

### 6. Hard Distractors: Confusable Letter Pairs

**Decision:** FEATURE_NEGLECT sessions use letters from the HIGH confusion pairs as distractors.

**Rationale:** The principle of **errorful generation** (Kornell et al., 2009) suggests that near-misses (attempting to discriminate very similar stimuli) produce stronger learning than discrimination between clearly different stimuli. For a child learning to tell म from भ, practising with भ as a foil is significantly more effective than practising with ल as a foil.

The HIGH confusion pairs are specifically documented Devanagari pairs that share the most visual features:

| Pair | Shared features | Distinguishing feature |
|---|---|---|
| म ↔ भ | Symmetric arch, two legs, header stroke | Short vertical bar upper-right on भ |
| घ ↔ ध | Similar proportions, curved forms | Knot/loop on घ vs. open arch on ध |
| ग ↔ घ | Similar base form | Closed knot top on घ vs. open curve on ग |
| ब ↔ व | Similar overall size, curved forms | Left bump on ब vs. V-notch bottom on व |
| ण ↔ न | Similar horizontal structure | Rightward tail at bottom-right on ण |

These are not generic "similar letters" — they are the pairs that dyslexic children learning Hindi most commonly confuse, identified through analysis of the Devanagari script's orthographic structure.

---

### 7. Easy Distractors for Early Stages

**Decision:** GROSS_SHAPE_BLINDNESS uses distractors (ल ह स र) that look completely different from the target.

**Rationale:** Presenting hard distractors to a child who cannot yet identify the basic shape creates **learned helplessness** (Seligman, 1972). When failure rate is very high (>50%), children attribute failure to fixed ability rather than specific, remediable difficulty. This causes disengagement and avoidance.

By ensuring the child can succeed (by using very different distractors), the system maintains **positive reinforcement** of the reading task while still providing accurate shape-recognition practice. Success at easy discrimination builds the confidence and motivation needed to persist to harder tasks.

This is consistent with **errorless learning** principles (Terrace, 1963; Mueller et al., 2007) applied to reading intervention — early success is scaffolded, then challenge is progressively increased.

---

### 8. Hesitation Detection and Guided Wins

**Decision:** If a child doesn't respond, the system answers for them. They always finish on a correct answer.

**Rationale:**

**Anxiety and reading:** Dyslexic children are significantly more likely to develop reading anxiety than typically developing peers (Riddick, 2010; Willcutt & Pennington, 2000). Reading anxiety is a secondary consequence of repeated failure experiences, and it creates a self-reinforcing cycle: anxiety → avoidance → less practice → less progress → more anxiety.

The guided win mechanism is a direct intervention against this cycle. By ensuring every question ends with the correct answer highlighted, the system creates a **consistent positive association** between the reading task and success — even when the child required assistance.

**Motor priming effect:** Seeing the correct answer highlighted (even without the child having chosen it) provides a visual exposure that contributes to letter memory formation, even if less strongly than independent correct response.

**Baseline-calibrated timers:** The hesitation timers adapt to the child's average response latency. A slow child gets more time before any hint appears. This prevents the system from misinterpreting genuine deliberation as confusion. Dyslexic children's reading is typically slower (Shaywitz, 2003), and a slow correct answer is still mastery.

---

### 9. Session Number and Repetition

**Decision:** Sessions are counted per letter. Multiple sessions for the same letter are normal and expected.

**Rationale:** For dyslexic learners, **overlearning** — practising beyond initial mastery — is a critical component of long-term retention (Stanovich, 1980; Torgesen, 1977). A child who achieves VISUAL_MASTERY on one session may regress without consolidation. The system continues to offer practice sessions even after mastery, using hard distractors.

The `sessions_count` field in `letter_progress` tracks how much practice each letter has received, which the AI uses to calibrate support level.

---

### 10. Cross-Letter Profile Transfer

**Decision:** When starting a new letter, the system uses the cognitive profile from previously learned letters as a starting point.

**Rationale:** Reading development is characterised by **transfer of orthographic knowledge** (Ehri, 2005). A child who has learned to discriminate fine features in म (arch vs. bar) has already developed the visual attention skills needed to discriminate fine features in other letters. Starting them at INSUFFICIENT_DATA for ग would ignore this genuine skill transfer and result in unnecessarily easy first sessions.

The VISUAL_MASTERY → FEATURE_NEGLECT cap is applied because each letter has unique fine features that are genuinely new. Even the best reader learning their second language must re-learn the specific distinguishing features of each new symbol.

---

### 11. Audio Slow Mode (0.8×)

**Decision:** After a wrong answer, subsequent audio plays at 0.8× speed.

**Rationale:** Many dyslexic children have comorbid **auditory processing difficulties** (Stein & McAnally, 1995) that affect their ability to rapidly process spoken phonemes. Slower speech rate provides more processing time without altering the phonemic content. This is consistent with speech rate modification used in phonological training programs (Fast ForWord, Scientific Learning Corporation).

---

### 12. Jitter Count Tracking

**Decision:** `QuestionAttempt` includes a `jitter_count` field tracking erratic movements.

**Rationale:** High jitter count (>5 per session) can indicate:
- Attention difficulties (ADHD frequently co-occurs with dyslexia — DuPaul & Stoner, 2003)
- Motor coordination difficulties (also more common in dyslexia — Ramus, 2003)
- General anxiety affecting fine motor control

The system includes jitter in the LLM prompt as a signal. The teacher-facing reasoning note may mention "difficulty with target precision — may indicate attention difficulty." This supports appropriate specialist referral.

---

### 13. AI Progress Report: Language Choices

**Decision:** The AI-generated progress report deliberately avoids clinical language ("dyslexia", "disorder", "deficit").

**Rationale:** Parent communication about learning differences requires careful framing. Research on parent perceptions (Glazzard, 2010) shows that deficit-focused language increases parental anxiety without improving outcomes. Strength-based framing maintains parental engagement with intervention.

The AI system prompt instructs: *"Never use clinical language. Be specific — reference actual letters, confusion pairs, improvements."* This produces reports that are actionable ("continue practising घ — focus on the knot feature at the top") rather than diagnostic ("shows signs of visual processing deficit").

---

## Limitations and Future Work

### Audio Implementation
The audio system (playing the letter sound on game entry) is currently not implemented. Audio is the primary input modality — without it, the child is reading the instruction text, which defeats the phonological→orthographic mapping goal. **This is the highest priority pending implementation.**

**Recommended approach:** Pre-recorded audio clips by a native Hindi speaker, one per letter, in standard pronunciation. Slower versions for the audio slow mode.

### TracingCanvas Fidelity
The current tracing canvas uses simplified, letter-independent guide dots. Accurate per-letter stroke paths would significantly improve the motor encoding benefit.

**Recommended approach:** SVG-based stroke paths for each of the 5 letters, with guided animation showing stroke order.

### Phonological Note Field
The `phonological_note` field exists in `LevelConfig` but is hardcoded to `""`. This was intentionally removed after early testing showed the LLM-generated phonological hints were too abstract for children.

**Future approach:** High-quality, pre-written phonological notes per letter, reviewed by a speech-language pathologist.

### Additional Letters
The current sequence covers 5 letters. The full Devanagari consonant inventory has 33. Extending requires:
- Confusion pair documentation for remaining letters
- Feature highlight positions for remaining letters
- Example words per letter
- Tracing stroke paths

### Assessment Screen
`AssessmentScreen.tsx` exists but is not integrated into the main learning flow. A formal baseline assessment before the first letter would allow better initial state seeding and teacher reporting.

### Parent/Teacher Dashboard
The `UserTypeScreen` shows Parent and Teacher options with "coming soon" alerts. A dedicated web dashboard for adults (separate from the child's learning interface) would significantly improve the product's value in educational settings.

### Attention and Focus Data
`jitter_count` and `hover_duration_ms` are tracked but currently only mentioned in the LLM reasoning note. A more systematic use of these signals could detect sessions where attention difficulties may be interfering with performance, allowing adaptive pacing adjustments.
