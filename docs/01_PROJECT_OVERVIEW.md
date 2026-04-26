# Akshara-Flow — Project Overview

## What is Akshara-Flow?

Akshara-Flow is an **adaptive Hindi letter-learning app specifically designed for children with dyslexia**. It teaches five foundational Devanagari consonants (म ग घ ध ब) through audio-first identification tasks backed by a real-time AI system that silently adapts difficulty, scaffolding, and visual support to each child's exact cognitive profile.

The core philosophy: **the child should never feel they are struggling**. The system observes, diagnoses, and adapts invisibly — the child just taps letters they hear.

---

## Problem Statement

Children with dyslexia face specific and well-documented challenges with Devanagari script:

1. **Visual confusion** between letters that share similar global shapes (म ↔ भ, घ ↔ ध, ग ↔ घ)
2. **Feature-level confusion** — they recognise the overall shape but miss small distinguishing strokes (the extra bar on भ vs. म, the knot on घ vs. the open arch on ध)
3. **Phonological–orthographic disconnect** — they may know the sound but fail to reliably link it to the correct visual symbol
4. **Working memory load** — too many similar choices at once overwhelms processing capacity
5. **Anxiety and avoidance** — repeated failures cause withdrawal; the system must never create a dead-end

Existing Hindi learning apps use one-size-fits-all content. Akshara-Flow is the first to apply a real-time agentic AI pipeline that continuously re-evaluates each child's cognitive state and reconfigures the next session accordingly.

---

## Target Users

| User | Role |
|---|---|
| **Child (age 5–10)** | Primary learner — interacts with the app directly |
| **Parent** | Views progress report, monitors letter mastery |
| **Teacher / Specialist** | Reviews AI-generated reasoning and focus areas |

---

## Core Feature Set

### 1. Adaptive Cognitive Diagnosis
After every session the backend `DiagnosisAgent` classifies the child's current cognitive state using rule-based thresholds on session error rates. No LLM is involved in diagnosis — it is deterministic, fast, and explainable.

**Four states:**
- `insufficient_data` — First session of a new letter, no history
- `gross_shape_blindness` — Cannot reliably distinguish the target letter from shapes that look completely different
- `feature_neglect` — Recognises the overall shape but misses the fine distinguishing feature (knot, bar, tail)
- `visual_mastery` — Consistently picks the correct letter even among visually similar options

### 2. Personalised Level Generation (LLM)
The `LevelGeneratorAgent` calls Gemini (via Vertex AI or free API) to personalise three decisions per session:
- Which **distractor letters** to show (drawn from confusion history, not generic lists)
- Which **visual feature** to highlight with a guiding dot
- A plain-language **reasoning note** for parents and teachers

Everything else is decided deterministically from the cognitive state.

### 3. Three-Stage Visual Scaffolding
- **Animated breathing dot** — proactively highlights the distinguishing feature from the start (GROSS_SHAPE_BLINDNESS only)
- **Static rescue dot** — appears only if the child hesitates (FEATURE_NEGLECT)
- **No dot** — pure recall mode (VISUAL_MASTERY and assessment sessions)

The dot uses a gentle 2-second scale-to-1.12 breathing animation, never the jarring 1.5× pulse of a typical "hint" system.

### 4. Hesitation Detection & Guided Win
The system tracks response latency (time from audio end to tap). If the child doesn't respond within calibrated thresholds:
- **Stage 1** (stage1_ms = baseline_latency + 8s): Distractors dim, gently directing attention
- **Stage 2** (stage2_ms = baseline_latency + 13s): Correct answer pulses
- **Stage 3** (+12s after Stage 2): Automatic guided win — the system answers for the child so they always finish on success

This eliminates the possibility of a child becoming stuck or frustrated.

### 5. Letter Tracing (GROSS_SHAPE_BLINDNESS)
When the diagnosis indicates the child cannot identify the basic shape, they are routed through a **TracingScreen** before the tapping game. Drawing the letter activates motor memory and multi-sensory encoding — a well-established intervention for dyslexic learners.

### 6. Cross-Letter Learning Profile
When a child starts a new letter, the system does not cold-start them. It reads their **most recent cognitive state** from any previously learned letter and seeds the new letter at that level, capped at FEATURE_NEGLECT (because every letter's specific distinguishing features are new and must be learned fresh).

### 7. Audio-Only Letter Identification
The game screen **never shows the letter name in text** during the identification task. The child hears the letter via audio and must tap the correct symbol. This enforces phonological→orthographic mapping rather than text→symbol matching.

### 8. AI Progress Report
After sufficient sessions, parents and teachers can view a full **AI-generated progress report** showing:
- Letter mastery status across all 5 letters
- Per-letter error rate trends (improving / stable / needs attention)
- Confusion pair analysis (which letters are being confused with which)
- AI-generated strengths and focus areas
- An encouraging message personalised to the child

### 9. Distractor Difficulty Tiering
Two letter pools per target letter:
- **Easy pool** (LOW confusion): ल ह स र — completely different shapes used at GROSS_SHAPE_BLINDNESS and INSUFFICIENT_DATA stages
- **Hard pool** (HIGH confusion): letter-specific confusable pairs (e.g. भ ध न ब for म) used at FEATURE_NEGLECT and VISUAL_MASTERY stages

The LLM selects from the appropriate pool and rotates at least one letter per session to prevent pattern-memorisation.

### 10. Session Persistence & Resume
All sessions are stored in Supabase. When a child returns to the app, their exact letter and cognitive state are restored. The hesitation timers are calibrated to the child's last-known response latency.

---

## Technology Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Routing | React Router v7 |
| Build | Vite 6 |
| Animation | Motion (Framer Motion v12) |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Auth client | @supabase/supabase-js |

### Backend
| Layer | Technology |
|---|---|
| Server | Python 3.11 + Flask |
| AI Models | Gemini 2.0 Flash / 2.5 Flash Lite (via Vertex AI or Gemini API) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase JWT + OAuth (Google) |

### Infrastructure
| Service | Purpose |
|---|---|
| Supabase | Auth, database, Row Level Security |
| Google Vertex AI | Primary LLM provider (enterprise, no rate limits) |
| Gemini API | Fallback LLM (free tier) |
| Vite dev server | Local development |

---

## Key Design Decisions

### Why rule-based diagnosis, not LLM-based?
Diagnosis must be fast (<100ms), deterministic, and auditable. A misdiagnosis wastes the child's session. Rule-based thresholds on error rates are transparent, testable, and never hallucinate.

### Why LLM for level generation, not rules?
Distractor selection needs to respond to the *specific* letters a child has confused recently. A rule table cannot know that this child confuses घ with ध but not with ज. The LLM reads the confusion history and personalises accordingly.

### Why Gemini over GPT/Claude for the backend?
Gemini is Google's model, and Vertex AI gives GCP-hosted inference with data residency, no rate limits, and audit logs — important for an app handling children's data. The free Gemini API tier allows development without cost.

### Why not use React Native?
The current implementation is a web app (PWA-compatible) so it works on tablets in classrooms without app store distribution. React Router v7 provides sufficient native-like routing.

### Why Supabase over Firebase?
Supabase's Row Level Security (RLS) enforces data isolation at the database layer — no additional access-control code needed. Every child's data is automatically protected by their JWT identity.

---

## Learning Flow (Full Journey)

```
Login (Google OAuth)
      ↓
HomeRedirect → checks user_profiles.profile_complete
      ↓ (first time)                    ↓ (returning)
Welcome → UserType → Name → Age → Avatar    ResumeScreen
                         ↓                        ↓
                    ResumeScreen           "Continue Learning"
                         ↓
                  analyzeSession (empty attempts → init)
                         ↓
              AnimationScreen (3s letter intro)
                         ↓
              PronunciationScreen (sound + hint)
                         ↓
              ExampleWordsScreen (3 vocabulary words)
                         ↓
           input_mode == "trace"?
              ↓ yes            ↓ no
         TracingScreen      GameScreen (4-choice identification)
                                ↓
                          RewardScreen
                   ↓ mastered        ↓ not mastered
             Next letter →       Practice more →
             AnimationScreen       GameScreen
```

---

## Session Data Pipeline

```
GameScreen (attempts recorded in-memory)
      ↓ tracker.endLevel()
useSessionTracker → POST /analyze_session
      ↓
DiagnosisAgent.diagnose(session)
      ↓
[if new letter + prior history] → carry_forward_profile()
      ↓
LevelGeneratorAgent.generate(session, state, history)
      ↓ LLM call
LevelConfig JSON
      ↓ persisted to Supabase (learning_sessions + letter_progress)
      ↓ returned to frontend
RewardScreen displays result
      ↓
setLevelConfig → GameScreen uses new config next session
```
