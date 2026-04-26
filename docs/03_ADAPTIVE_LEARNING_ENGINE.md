# Akshara-Flow — Adaptive Learning Engine

## Overview

The adaptive learning engine is the intellectual core of Akshara-Flow. It operates as a continuous observation-diagnosis-response loop: after every session the system re-evaluates the child's cognitive state and reconfigures the next session accordingly. The child never knows this is happening — from their perspective, they just keep tapping letters.

This document explains every adaptation mechanism, the data it uses, the decisions it drives, and the dyslexia-specific research rationale behind each choice.

---

## The Four Cognitive States

Every child is always in exactly one of four states for each letter they are learning. The state is per-letter — a child can be VISUAL_MASTERY for म and GROSS_SHAPE_BLINDNESS for घ simultaneously.

### `insufficient_data`
**Meaning:** The system has not yet observed enough performance data to classify the child's cognitive profile for this letter.

**When it occurs:**
- Always on the very first session for any letter
- If the session was submitted with zero attempts (initialisation call)

**What happens:**
- Low-similarity distractors (ल ह स र — shapes that look nothing like the target)
- No visual aids (the child is being assessed, not helped)
- Tap input mode
- Scaffold intensity: 0.55 (moderate, precautionary)
- No dot, ever

**Why this matters for dyslexia:**
A first session is a diagnostic moment. Introducing scaffolding before knowing the child needs it would confound the assessment. If a child with dyslexia is shown the dot immediately and gets the answer right, the system cannot tell whether they understood the letter or just followed the dot. The first session must be clean assessment.

---

### `gross_shape_blindness`
**Meaning:** The child struggles to identify the target letter even when shown alongside letters that look completely different (e.g., can't distinguish घ from ल).

**Diagnosis trigger:** Error rate on DISSIMILAR module > 30%

**DISSIMILAR module distractors** (letters that look nothing like the target):
- ल ह स ञ ङ छ फ र ट ज

**What happens:**
- Easy distractors continue (child needs confidence-building at this stage)
- Animated breathing dot from the **very first question** — no waiting
- TRACE input mode → child traces the letter before the tapping game
- Scaffold intensity: 0.70–1.0 (scaled by error rate — higher errors = more scaffolding)
- Large dot (20px) with 2-second gentle breathe animation (scale 1→1.12→1)

**Dyslexia rationale:**
Gross shape blindness in Devanagari corresponds to what reading research calls **visual–orthographic processing deficit**. The child's visual system has not yet formed a stable representation of the letter's overall shape. Two interventions are applied:

1. **Tracing:** Motor encoding creates a secondary memory trace for the shape. Research on handwriting and reading (James & Gauthier, 2006; Longcamp et al., 2008) shows that tracing letters before identifying them significantly improves letter recognition accuracy in children with reading difficulties. The hand movement encodes spatial information that the visual pathway missed.

2. **Proactive dot:** The glowing dot highlights the distinguishing feature of the target letter from the start. For a child who cannot yet isolate the correct letter, the dot is a visual anchor that draws attention to the letter's most unique structural attribute (e.g., the double arch of म). Over sessions, the child builds an association between the sound and the specific feature, not just the overall shape.

---

### `feature_neglect`
**Meaning:** The child can identify the letter when distractors are clearly different shapes, but confuses it with visually similar letters that differ only in a small feature (e.g., confuses घ with ध because they look almost identical).

**Diagnosis trigger:**
- DISSIMILAR error rate ≤ 30% (mastered basic shape recognition)
- SIMILAR error rate > 30% (struggling with similar-looking letters)

**SIMILAR module distractors** (high-confusion pairs per letter):
| Target | Confusable distractors |
|---|---|
| म | भ ध न ब |
| ग | घ ध ज ञ |
| घ | ग ध ज ञ |
| ध | घ ग ज ञ |
| ब | व भ ध ण |

**What happens:**
- Hard distractors (visually similar confusable letters)
- Static dot — appears **only** when the child hesitates (stage 1 hesitation) or asks for a hint (stage 2)
- TAP input mode (no tracing — they can already identify the shape)
- Scaffold intensity: 0.35–0.65 (scales with error rate)
- Medium dot (16px), no animation unless hint-active

**Dyslexia rationale:**
Feature neglect corresponds to what reading research calls **letter feature discrimination deficit**. The child's visual attention does not automatically differentiate the small distinguishing strokes (the knot on घ vs. the open arch on ध; the right bar on भ vs. its absence on म).

The intervention here is **delayed scaffolding**: the dot is withheld initially to encourage the child to attempt recall independently. This is critical — if the dot is always present, the child learns to follow the dot rather than learning the letter. Presenting the dot only on hesitation trains the child's attention to the distinguishing feature *at the moment they are most receptive* (when their cognitive system is signalling uncertainty).

The hard distractor pool specifically includes letters the child has been historically confused by (read from the `confused_pairs` history in Supabase), making the task a targeted discrimination exercise rather than a generic test.

---

### `visual_mastery`
**Meaning:** The child consistently identifies the letter correctly even among visually similar alternatives.

**Diagnosis trigger:** SIMILAR error rate < 10%

**What happens:**
- Hard distractors maintained (consolidation)
- No dot, ever
- TAP input mode
- Scaffold intensity: 0.0 (no scaffolding)
- Hesitation triggers calibrated to child's response baseline (no lengthening)

**When `letter_mastered: true` is returned:**
The RewardScreen shows 🏆 and offers to advance to the next letter.

**Dyslexia rationale:**
Mastery for a dyslexic child means **consistent correct performance at the hardest challenge level, without any visual scaffolding**. At VISUAL_MASTERY, the child's phonological–orthographic mapping is stable. Maintaining hard distractors during this stage provides consolidation and prevents regression, which is especially important in dyslexia where gains can be fragile without continued practice.

---

## The Diagnosis Engine (`DiagnosisAgent`)

The `DiagnosisAgent` is a deterministic classifier — it applies rule-based thresholds to session error rates. There is no LLM, no probability, no ambiguity.

### Error Thresholds
```python
ERROR_THRESHOLD_FAIL    = 0.30   # >30% → struggling
ERROR_THRESHOLD_MASTERY = 0.10   # <10% → mastered
```

### Decision Tree
```
session received
      │
      ├─ no attempts → INSUFFICIENT_DATA
      │
      ├─ has DISSIMILAR attempts
      │     ├─ error > 30% → GROSS_SHAPE_BLINDNESS
      │     │
      │     ├─ error 10-30% → GROSS_SHAPE_BLINDNESS
      │     │   (still working, not mastered)
      │     │
      │     └─ error < 10% → advance to SIMILAR check
      │           ├─ no SIMILAR data yet → FEATURE_NEGLECT
      │           │   (ready to start harder module)
      │           └─ has SIMILAR data → see below
      │
      └─ has SIMILAR attempts (or both)
            ├─ error > 30% → FEATURE_NEGLECT
            ├─ error < 10% → VISUAL_MASTERY
            └─ error 10-30% → FEATURE_NEGLECT (in progress)
```

### SCAFFOLD treated as SIMILAR
This is a critical implementation detail. When a child practises on the SCAFFOLD module (hard distractors + visual dot), their attempts are **counted as SIMILAR attempts** for diagnosis purposes. Without this, a child in FEATURE_NEGLECT who receives scaffold-mode sessions would never accumulate SIMILAR attempts and would be permanently stuck in INSUFFICIENT_DATA.

```python
def error_rate_for_module(self, module: ModuleType) -> Optional[float]:
    if module == ModuleType.SIMILAR:
        relevant = [a for a in self.attempts
                    if a.module_type in (ModuleType.SIMILAR, ModuleType.SCAFFOLD)]
```

---

## The Level Generator (`LevelGeneratorAgent`)

### Deterministic Rules vs. LLM Personalisation

The level generator applies a two-layer decision process:

**Layer 1 — Deterministic (no LLM):**
The cognitive state maps rigidly to structural parameters:

```python
STATE_RULES = {
    GROSS_SHAPE_BLINDNESS: {
        distractor_similarity: LOW,
        visual_aid_intensity:  ANIMATED,
        input_mode:            TRACE,
        scaffold_intensity:    0.85,
    },
    FEATURE_NEGLECT: {
        distractor_similarity: HIGH,
        visual_aid_intensity:  STATIC,
        input_mode:            TAP,
        scaffold_intensity:    0.55,
    },
    VISUAL_MASTERY: {
        distractor_similarity: HIGH,
        visual_aid_intensity:  NONE,
        input_mode:            TAP,
        scaffold_intensity:    0.0,
    },
    INSUFFICIENT_DATA: {
        distractor_similarity: LOW,
        visual_aid_intensity:  NONE,
        input_mode:            TAP,
        scaffold_intensity:    0.6,
    },
}
```

**Layer 2 — LLM Personalisation:**
Given the cognitive state, the LLM selects the specific letters and feature key:
- `distractor_pool`: Which 3-5 specific letters to show (drawn from confusion history)
- `feature_to_highlight`: Which exact structural feature of the target letter to highlight
- `reasoning`: Plain-English explanation for teachers (max 20 words)

### Scaffold Intensity Computation
Scaffold intensity is computed deterministically, not by the LLM:

```
GROSS_SHAPE_BLINDNESS: min(1.0, max(0.70, 0.70 + error_rate × 0.40))
  → error_rate=0%:  0.70 (minimum support even if child is doing ok)
  → error_rate=50%: 0.90 (high errors = more help)
  → error_rate=100%: 1.0  (maximum support)

FEATURE_NEGLECT: min(0.65, max(0.35, 0.35 + error_rate × 0.50))
  → error_rate=0%:  0.35 (gentle reminder)
  → error_rate=50%: 0.60 (noticeable help)
  → error_rate=100%: 0.65 (strong but not overwhelming)

VISUAL_MASTERY: 0.0 (never)
INSUFFICIENT_DATA: 0.55 (fixed, moderate precaution)
```

The scaffold intensity controls the dot's opacity. A higher value means the dot is more visible. For GROSS_SHAPE_BLINDNESS, the dot is prominent (0.7–1.0). For FEATURE_NEGLECT, it is gentler (0.35–0.65). This creates a natural fade of support across states.

### Hesitation Timer Calibration
The hesitation timers adapt to the child's historical response speed:

```python
baseline_ms = session.avg_latency_ms if session.avg_latency_ms > 0 else 6000
stage1_ms   = baseline_ms + 8000   # 8s after typical response → show hesitation state
stage2_ms   = baseline_ms + 13000  # 13s after typical response → show hint
stage3       = stage2_ms + 12000   # 12s after hint → auto-guided win
```

This means a slow but accurate child (avg_latency = 10s) gets 18s before any hint appears, while a fast child (avg_latency = 2s) only gets 10s. The system never penalises a child for being slow — it adapts to their pace.

---

## Cross-Letter Profile Carry-Forward

When a child starts a **new letter** (e.g., advancing from म to ग), the system would normally classify them as `INSUFFICIENT_DATA` since there are zero sessions for ग. But this misses a key insight: **the child's cognitive profile learned from म is partially transferable to ग**.

### The Logic

```python
# In analyze.py route handler:
if state == CognitiveState.INSUFFICIENT_DATA and verified_user_id:
    prior_state_str = get_latest_cognitive_state(verified_user_id, raw_jwt)
    if prior_state_str and prior_state_str != "insufficient_data":
        prior_state = CognitiveState(prior_state_str)
        # Cap: never skip feature learning for a new letter
        state = _NEW_LETTER_STATE_CAP.get(prior_state, prior_state)

_NEW_LETTER_STATE_CAP = {
    CognitiveState.VISUAL_MASTERY: CognitiveState.FEATURE_NEGLECT,
}
```

### The Cap: Why Not Carry Over VISUAL_MASTERY?

A child who mastered म at VISUAL_MASTERY level could theoretically start ग at VISUAL_MASTERY. But this would skip feature-level learning for ग's specific distinguishing feature (the open curve top that distinguishes ग from घ). Every letter has unique fine features that must be learned fresh.

The cap ensures:
- If prior state was GROSS_SHAPE_BLINDNESS → start ग at GROSS_SHAPE_BLINDNESS ✓
- If prior state was FEATURE_NEGLECT → start ग at FEATURE_NEGLECT ✓
- If prior state was VISUAL_MASTERY → start ग at FEATURE_NEGLECT (capped) ✓
- Never cold-start as INSUFFICIENT_DATA once any letter is learned

**Dyslexia rationale:**
Research on reading generalisation (Ehri, 2005) shows that letter knowledge is partially transferable — a child who has learned to decode м knows to look for distinguishing features in new letters. However, each letter's specific features are unique. The cap respects both the generalisation (start higher than cold) and the specificity (never skip fine-feature learning).

---

## Distractor Pool Strategy

### Two-Tier System
The LLM is instructed to select from one of two pools depending on cognitive state:

**DISSIMILAR pool** (for GROSS_SHAPE_BLINDNESS and INSUFFICIENT_DATA):
```
ल  ह  स  ञ  ङ  छ  फ  र  ट  ज
```
These letters have completely different global shapes from the 5 target letters. A child identifying म should easily distinguish it from ल (which has a simple vertical stroke). Correct answers here demonstrate basic shape recognition.

**SIMILAR pool** (for FEATURE_NEGLECT and VISUAL_MASTERY):
Per-letter high-confusion pairs encoded in the LLM system prompt:
```
म ↔ भ   (भ adds a short vertical bar upper-right)
ग ↔ घ   (घ closes the top curve into a knot)
घ ↔ ध   (ध has an open arch; घ has a closed knot)
ध ↔ घ ग  (ध confused with both knot letters)
ब ↔ व   (ब curves left at bottom; व has a V-notch)
```

### Why LLM Distractor Selection?
The fallback pools are static. The LLM's value is in reading the confused_pairs history and prioritising letters the child has actually confused recently. If this child has never confused म with ध but frequently confuses म with भ, the LLM will consistently include भ in the pool and deprioritise ध.

### Rotation Rule
The LLM is explicitly instructed: *never repeat the exact same distractor pool as the last session*. This prevents the child from memorising which of four specific options is always correct, forcing them to read the letter rather than pattern-match the set.

---

## Visual Aid System

### The Three Intensities

**ANIMATED (GROSS_SHAPE_BLINDNESS)**
- Dot visible from the first question, before any hesitation
- 2-second breathing animation: `scale(1) → scale(1.12) → scale(1)` with ease-in-out
- Size: 20px (largest)
- Opacity: scaffold_intensity (0.70–1.0)
- Purpose: Proactively directs attention to the distinguishing feature while the child is actively working

**STATIC (FEATURE_NEGLECT)**
- Dot appears only when `gameState === "hesitation"` or `"hint"`
- No animation in default state
- Size: 16px (medium)
- Opacity: 1.0 when hint-active, scaffold_intensity otherwise
- Purpose: Rescue mechanism — only provides guidance when child signals uncertainty through hesitation

**NONE (VISUAL_MASTERY and INSUFFICIENT_DATA)**
- Dot never shown, regardless of game state
- Purpose: Pure recall assessment, no scaffolding contamination

### Feature Highlight Positions
The dot is positioned on the specific structural feature that distinguishes the target letter from its most common confusable. Positions are defined as CSS-style percentages relative to the letter card:

```typescript
FEATURE_HIGHLIGHT_POSITIONS = {
  arch_top_center:      { top: "10%", left: "50%" },   // म — double arch top
  right_bar_upper:      { top: "22%", right: "6%" },   // भ — extra bar
  knot_upper_right:     { top: "10%", right: "10%" },  // घ — closed knot
  open_arch_top:        { top: "5%",  right: "35%" },  // ध — open arch
  open_curve_top:       { top: "8%",  right: "25%" },  // ग — open curve
  bump_left_bottom:     { bottom: "15%", left: "10%" },// ब — left bump
  tail_bottom_right:    { bottom: "10%", right: "10%" },// ण — rightward tail
  // ... 16 positions total
}
```

The LLM selects the `feature_to_highlight` key from a fixed list in the system prompt. This prevents hallucination — if the LLM returns an invalid key, no dot is shown (safe failure).

---

## Hesitation Detection and Guided Win

This mechanism ensures the child never gets stuck and always finishes on a success experience.

### Three-Stage Response
```
Child hears audio
      │
      ├── Answers immediately → Record attempt, continue
      │
      ├── No answer after stage1_ms (baseline + 8s)
      │     → gameState = "hesitation"
      │     → Distractors dim to 30% opacity
      │     → Correct answer stands out by contrast
      │
      ├── No answer after stage2_ms (baseline + 13s)
      │     → gameState = "hint"
      │     → Correct answer card pulses (animate-pulse Tailwind)
      │     → Dot appears on correct answer (regardless of visual_aid_intensity)
      │
      └── No answer 12s after hint
            → recordGuidedWin(correctAnswer)
            → gameState = "correct"
            → Auto-navigate to reward
```

### Forced-Win After 2 Consecutive Failures (`FAIL_FORCE = 2`)
If the child gets the same question wrong twice in a row, the system immediately records a guided win and moves forward. This is separate from hesitation — it activates on active wrong answers, not silence.

**Dyslexia rationale:**
Research consistently shows that repeated failure experiences are the primary driver of reading anxiety and avoidance behaviour in dyslexic children (Riddick, 2010). The forced-win mechanism ensures every child exits every session on a correct answer, maintaining positive associations with the learning task. The child may not have answered correctly on their own, but they hear the celebratory sound and see the green card — positive reinforcement regardless of guided status.

### Audio Slow Mode
After the first incorrect attempt, `audioSlowMode` is set to `true`, which would trigger 0.8× speed audio playback (when audio is fully implemented). Slower speech rate aids phonological processing for children with auditory processing difficulties common in dyslexia.

---

## Session Submission Pipeline

### What is Sent
At the end of each game session, `tracker.endLevel()` sends:

```json
{
  "user_id": "uuid",
  "target_alphabet": "म",
  "session_id": "sess_1703123456789",
  "session_number": 3,
  "attempts": [
    {
      "target_letter": "म",
      "selected_letter": "भ",
      "module_type": "similar",
      "time_to_interact_ms": 4200,
      "was_guided_win": false,
      "hover_duration_ms": 0,
      "jitter_count": 2
    },
    ...
  ],
  "avg_latency_ms": 5800,
  "consecutive_fails_peak": 2
}
```

### What is Returned
```json
{
  "status": "ok",
  "level_config": { /* complete LevelConfig for next session */ },
  "letter_mastered": false,
  "debug": {
    "total_attempts": 6,
    "error_rate_pct": 33.3,
    "cognitive_state": "feature_neglect",
    "authenticated": true
  }
}
```

The `level_config` is immediately stored in `LevelConfigProvider` and used for all subsequent screens.

---

## Summary Table

| Parameter | INSUFFICIENT_DATA | GROSS_SHAPE_BLINDNESS | FEATURE_NEGLECT | VISUAL_MASTERY |
|---|---|---|---|---|
| Distractors | Easy (ल ह स र) | Easy (ल ह स र) | Hard (confusable pairs) | Hard (confusable pairs) |
| Visual dot | Never | Animated, always | Static, on hesitation only | Never |
| Dot size | — | 20px | 16px | — |
| Input mode | Tap | **Trace then tap** | Tap | Tap |
| Scaffold intensity | 0.55 (fixed) | 0.70–1.0 | 0.35–0.65 | 0.0 |
| Hesitation timers | Baseline-calibrated | Baseline-calibrated | Baseline-calibrated | Baseline-calibrated |
| LLM distractor tier | DISSIMILAR | DISSIMILAR | SIMILAR | SIMILAR |
| Carry-forward | N/A | Yes (from prior letter) | Yes | Yes (capped to FN) |
| Letter mastered? | No | No | No | **Yes** |
