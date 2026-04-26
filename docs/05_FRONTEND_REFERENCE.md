# Akshara-Flow — Frontend Reference

All frontend code lives in `src/`. The entry point is `src/main.tsx` → `src/app/App.tsx`.

```
src/app/
├── App.tsx                      Root component, context wiring, auth guard
├── routes.tsx                   React Router v7 route definitions (15 routes)
├── api/
│   └── client.ts                Backend API calls + fallback configs
├── contexts/
│   ├── AuthContext.tsx           Supabase auth state
│   └── ProfileSetupContext.tsx   Onboarding name/age/avatar state
├── hooks/
│   ├── useLevelConfig.tsx        Letter progression + level config state
│   └── useSessionTracker.ts      In-memory session attempt tracking
├── types/
│   └── levelConfig.ts            TypeScript types + constants
├── data/
│   └── letterContent.ts          Per-letter pronunciation hints + example words
├── lib/
│   └── supabase.ts               Supabase client initialisation
├── components/
│   ├── AksharaButton.tsx         Reusable primary/secondary button
│   ├── AvatarCircle.tsx          Circular emoji avatar with selection
│   ├── LetterDisplay.tsx         Large letter with optional audio
│   ├── OptionCard.tsx            Multiple-choice card with 5 states
│   ├── ProgressBar.tsx           Animated width progress bar
│   ├── TopBar.tsx                Header with avatar, progress, exit
│   └── TracingCanvas.tsx         Interactive canvas for letter tracing
└── screens/
    ├── HomeRedirect.tsx           / → profile check → redirect
    ├── LoginScreen.tsx            Google OAuth
    ├── WelcomeScreen.tsx          First-time welcome
    ├── UserTypeScreen.tsx         Child/Parent/Teacher selector
    ├── ProfileNameScreen.tsx      Name input
    ├── ProfileAgeScreen.tsx       Age selector (5-10)
    ├── ProfileAvatarScreen.tsx    Avatar picker + Supabase save
    ├── ResumeScreen.tsx           Home / dashboard
    ├── AnimationScreen.tsx        Letter introduction (3s)
    ├── PronunciationScreen.tsx    Sound + pronunciation hint
    ├── ExampleWordsScreen.tsx     3 vocabulary examples
    ├── TracingScreen.tsx          Letter tracing practice
    ├── GameScreen.tsx             Core identification task
    ├── RewardScreen.tsx           Celebration + session submission
    ├── ProgressScreen.tsx         AI progress report
    ├── AssessmentScreen.tsx       (Standalone diagnostic, not in main flow)
    └── TransitionScreen.tsx       Loading screen between lessons
```

---

## `App.tsx` — Root Component

Wraps the entire app in the required context hierarchy and handles the auth-loading gate.

```typescript
App
└── AuthProvider
    └── AppContent
        ├── if loading → full-screen spinner (bouncing dots)
        ├── if !user → <LoginScreen />
        └── if user →
            ProfileSetupProvider
              └── LevelConfigProvider
                  └── RouterProvider (router from routes.tsx)
```

**Why `LoginScreen` is rendered outside the router:**
Unauthenticated users should never reach any route. Rendering `LoginScreen` unconditionally before the router provides a simpler, more secure auth gate than route-level guards.

---

## `routes.tsx` — Route Definitions

15 routes mapped to screen components. Uses `createBrowserRouter` from React Router v7.

| Path | Component | Purpose |
|---|---|---|
| `/` | `HomeRedirect` | Checks DB for profile_complete, redirects |
| `/welcome` | `WelcomeScreen` | First-time onboarding start |
| `/user-type` | `UserTypeScreen` | Child / Parent / Teacher |
| `/profile/name` | `ProfileNameScreen` | Enter child's name |
| `/profile/age` | `ProfileAgeScreen` | Select age (5–10) |
| `/profile/avatar` | `ProfileAvatarScreen` | Pick avatar + save profile |
| `/assessment` | `AssessmentScreen` | Optional standalone diagnostic |
| `/resume` | `ResumeScreen` | Home dashboard |
| `/animation` | `AnimationScreen` | Animated letter intro |
| `/pronunciation` | `PronunciationScreen` | Sound + hint |
| `/example-words` | `ExampleWordsScreen` | Vocabulary examples |
| `/game` | `GameScreen` | Core identification game |
| `/tracing` | `TracingScreen` | Letter tracing |
| `/reward` | `RewardScreen` | Session end + progression |
| `/progress` | `ProgressScreen` | AI learning report |
| `/transition` | `TransitionScreen` | Loading between lessons |

---

## `api/client.ts` — API Client

### Constants

**`FALLBACK_LEVEL_CONFIG`**
Used when the backend is unreachable. Defaults to:
- Target: म, State: insufficient_data
- Distractors: ल ह स भ
- Timers: 14s / 19s (generous, for offline use)
- Scaffold: 0.55

**`BASE_URL`**
Read from `VITE_API_URL` env var, falls back to `http://localhost:5050`.

### Functions

**`analyzeSession(payload: SessionPayload) → AnalyzeSessionResponse`**
- POST `/analyze_session` with JWT header
- 8-second timeout
- On any error: returns `makeFallbackResponse(payload)` — never throws

**`fetchProgressReport() → ProgressReport | null`**
- GET `/progress_report` with JWT header
- 15-second timeout (LLM is slower for the report)
- Returns `null` on any error

**`getAuthHeaders() → Record<string, string>`**
Async function that reads the current Supabase session and returns `{ "Content-Type": "application/json", "Authorization": "Bearer <token>" }`. Token is omitted if no session exists.

### TypeScript Interfaces

```typescript
interface LetterStat {
  sessions_count:       number;
  mastered:             boolean;
  last_cognitive_state: string;
  avg_error_rate_pct:   number | null;
  trend:                "improving" | "stable" | "needs attention";
  confused_with:        string[];
}

interface ProgressReport {
  status:           "ok";
  empty?:           boolean;
  display_name:     string;
  total_sessions:   number;
  letters_mastered: number;
  letter_stats:     Record<string, LetterStat>;
  ai_insights: {
    overall_message:  string;
    encouragement:    string;
    strengths:        string[];
    focus_areas:      string[];
    letter_insights:  Record<string, string>;
  };
  provider: string;
}
```

---

## `contexts/AuthContext.tsx` — Auth Context

### What it provides
```typescript
{
  user:               User | null,        // Supabase User object
  session:            Session | null,     // Full session (token, expiry)
  loading:            boolean,            // true during initial session load
  signInWithGoogle:   () => Promise<void>,
  signOut:            () => Promise<void>,
}
```

### Lifecycle
1. On mount: `supabase.auth.getSession()` loads existing session from storage
2. `supabase.auth.onAuthStateChange()` subscribes to all auth events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
3. On sign-in: `user` and `session` are set
4. On sign-out: both are set to `null`

**Google OAuth:** Uses `signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })`. After the OAuth redirect, Supabase processes the token and fires `SIGNED_IN` event.

---

## `contexts/ProfileSetupContext.tsx` — Profile Setup Context

Temporary state for the onboarding flow. Data lives here until `ProfileAvatarScreen` saves it to Supabase.

```typescript
{
  name:     string,         // "" initially
  setName:  (n) => void,
  age:      number | null,
  setAge:   (a) => void,
  avatar:   string | null,  // emoji string e.g. "🐻"
  setAvatar:(a) => void,
}
```

Data in this context is transient. If the user navigates away during onboarding without completing it, the context resets on next app load and they start onboarding again (the `profile_complete` flag will still be `false`).

---

## `hooks/useLevelConfig.tsx` — Level Config Hook

The most-read piece of state in the app. Consumed by every screen.

### State
```typescript
levelConfig:       LevelConfig    // Current level parameters
sessionNumber:     number         // 1-indexed, increments per game
letterIndex:       number         // 0-4 (index into LETTER_SEQUENCE)
lastAvgLatencyMs:  number         // Last measured response speed
```

### Key Actions

**`setLevelConfig(config)`** — Called after `analyzeSession()` returns. Updates all game parameters for the next session.

**`incrementSessionNumber()`** — Called in `RewardScreen` after session submission. Increments session number for the same letter.

**`advanceLetter()`** — Called in `RewardScreen.handleNextLetter()`. Increments `letterIndex`, resets `sessionNumber` to 1.

**`jumpToLetterIndex(index)`** — Called in `ResumeScreen.loadAll()`. Single atomic update to both `letterIndex` and `sessionNumber = 1`. This is critical — it avoids the compounding bug where multiple `advanceLetter()` calls fire sequentially as the effect runs multiple times.

### Derived Values
```typescript
currentLetter = LETTER_SEQUENCE[letterIndex]   // "म", "ग", etc.
nextLetter    = LETTER_SEQUENCE[letterIndex+1] // null if last
```

---

## `hooks/useSessionTracker.ts` — Session Tracker Hook

Manages in-memory session state across a game session. Keyed by `${userId}::${targetAlphabet}::${sessionNumber}` — this prevents cross-session contamination.

### State per Key
```typescript
{
  sessionId:           string,                // UUID for the session
  attempts:            QuestionAttempt[],
  consecutiveFails:    number,
  consecutiveFailsPeak:number,
  audioEndTime:        number | null,         // timestamp when audio finished
}
```

### Functions

**`markAudioEnd()`** — Records `Date.now()` as the audio completion time. Response latency = tap time − `audioEndTime`.

**`recordAttempt({ targetLetter, selectedLetter, moduleType, wasGuidedWin })`**
- Calculates `time_to_interact_ms` from `audioEndTime`
- Resets `audioEndTime` for next question
- Appends to `attempts[]`
- Updates consecutive fails counter (resets on correct answer, increments on wrong)

**`recordGuidedWin(targetLetter, moduleType)`** — Shorthand to record a `was_guided_win: true` attempt. Called when hesitation auto-win or FAIL_FORCE triggers.

**`getConsecutiveFails() → number`** — Current fail streak (used by GameScreen for FAIL_FORCE logic).

**`endLevel() → Promise<AnalyzeSessionResponse>`**
1. Calculates final `avg_latency_ms` from all attempts' `time_to_interact_ms`
2. POSTs session to `/analyze_session` via `analyzeSession()`
3. Clears the tracker state for this key
4. Returns the backend's `AnalyzeSessionResponse`

---

## `types/levelConfig.ts` — Types and Constants

### `LETTER_SEQUENCE`
```typescript
export const LETTER_SEQUENCE = ["म", "ग", "घ", "ध", "ब"] as const;
```
The 5 learning letters in order. `as const` makes this a tuple type, enabling `indexOf` to be type-safe. Both frontend and backend use the same sequence (also defined in `level_generator.py`).

### `FEATURE_HIGHLIGHT_POSITIONS`
```typescript
export const FEATURE_HIGHLIGHT_POSITIONS: Record<
  string,
  { top?: string; right?: string; left?: string; bottom?: string }
> = {
  arch_top_center:       { top: "10%", left: "50%" },
  right_bar_upper:       { top: "22%", right: "6%" },
  knot_upper_right:      { top: "10%", right: "10%" },
  open_arch_top:         { top: "5%",  right: "35%" },
  open_curve_top:        { top: "8%",  right: "25%" },
  bump_left_bottom:      { bottom: "15%", left: "10%" },
  tail_bottom_right:     { bottom: "10%", right: "10%" },
  // ... 16 positions total
}
```

These CSS positioning values are spread directly into the feature dot's `style` prop in `GameScreen`. If the LLM returns an unknown key, `FEATURE_HIGHLIGHT_POSITIONS[key]` returns `undefined` and no dot is rendered — safe failure.

---

## `data/letterContent.ts` — Letter Content

Static data for the three intro screens (Animation, Pronunciation, ExampleWords).

```typescript
interface LetterContent {
  letter:            string;
  pronunciationHint: string;    // Technique description
  mouthEmoji:        string;    // Visual pronunciation aid
  exampleWords:      Array<{
    word:    string;    // Hindi word in Devanagari
    image:   string;    // Emoji representing the word
    meaning: string;    // English translation
  }>;
}
```

**Example (म):**
```typescript
{
  letter: "म",
  pronunciationHint: "Press your lips gently together, hum through your nose",
  mouthEmoji: "😌",
  exampleWords: [
    { word: "मछली", image: "🐟", meaning: "Fish" },
    { word: "माँ",  image: "👩", meaning: "Mother" },
    { word: "मेज",  image: "🪑", meaning: "Table" },
  ]
}
```

**`getLetterContent(letter: string) → LetterContent`**
Returns content for the given letter, with a safe fallback for letters not in the dictionary.

---

## Screen-by-Screen Reference

### `HomeRedirect.tsx`
Runs on every app load (`/` route). Queries `user_profiles` to check `profile_complete`.

```typescript
// Queries DB — never trusts auth metadata
const { data } = await supabase.from("user_profiles")
  .select("profile_complete")
  .eq("id", user!.id)
  .single();

if (data?.profile_complete) navigate("/resume", { replace: true });
else navigate("/welcome", { replace: true });
```

**Why query the DB?** Google OAuth can overwrite `raw_user_meta_data` on re-login. Trusting auth metadata would route returning users to onboarding after a sign-out/sign-in cycle. The DB is the authoritative source.

---

### `ResumeScreen.tsx`
The home screen for returning users. Key logic:

**Profile loading:**
```typescript
const [profileRes, progressRes] = await Promise.all([
  supabase.from("user_profiles").select("display_name, avatar").eq("id", user!.id).single(),
  supabase.from("letter_progress")
    .select("letter_index, mastered, last_avg_latency_ms")
    .eq("user_id", user!.id)
    .order("letter_index", { ascending: false })  // get highest letter
    .limit(1).single(),
]);
```

**Letter restoration:**
```typescript
const targetIndex = mastered
  ? Math.min(letter_index + 1, LETTER_SEQUENCE.length - 1)
  : letter_index;
jumpToLetterIndex(targetIndex);  // single atomic update — prevents compounding bug
```

**Initialisation call:**
When "Continue Learning" is tapped, an API call with `attempts: []` is sent to get the initial `LevelConfig` for the current letter. This triggers the cross-letter carry-forward logic on the backend.

---

### `AnimationScreen.tsx`
Displays the target letter with animated scale+rotate loop. Auto-transitions to `/pronunciation` after 3 seconds. Uses `currentLetter` from `useLevelConfig()` — always shows the correct current letter.

---

### `PronunciationScreen.tsx`
Shows the letter, pronunciation hint, and mouth emoji from `letterContent.ts`. Has a "Replay Sound" button (audio implementation pending) and a "Next" button to `/example-words`.

---

### `ExampleWordsScreen.tsx`
Shows 3 vocabulary words for the current letter. The "Play Game" button routes conditionally:
```typescript
navigate(levelConfig.input_mode === "trace" ? "/tracing" : "/game")
```
Button label also changes: "Trace the Letter" vs "Play Game".

---

### `TracingScreen.tsx`
Shown only when `input_mode === "trace"` (GROSS_SHAPE_BLINDNESS state).

```typescript
const { currentLetter } = useLevelConfig();
// ...
<TracingCanvas letter={currentLetter} />
<AksharaButton onClick={() => navigate("/game")}>Now find it!</AksharaButton>
```

After tracing, navigates to `/game` — the child now plays the identification game with motor memory of the letter fresh in mind.

---

### `GameScreen.tsx`
The core interaction. Key implementation details:

**Option generation (memo):**
```typescript
const { correctAnswer, options } = useMemo(() => {
  const pool = levelConfig.distractor_pool.filter(l => l !== correct).slice(0, 3);
  const opts = [correct, ...pool];
  // Fisher-Yates shuffle
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { correctAnswer: correct, options: opts };
}, [levelConfig]);
```

**Module type derivation:**
```typescript
const moduleType: ModuleType =
  levelConfig.distractor_similarity === "low"
    ? "dissimilar"
    : levelConfig.visual_aid_intensity === "none"
      ? "similar"
      : "scaffold";
```

**Hesitation timers (three-stage):**
```typescript
useEffect(() => {
  const stage1 = levelConfig.hesitation_trigger_stage1_ms;
  const stage2 = levelConfig.hesitation_trigger_stage2_ms;
  const stage3 = stage2 + 12000;

  const t1 = setTimeout(() => {
    if (gameStateRef.current === "default") setGameState("hesitation");
  }, stage1);
  const t2 = setTimeout(() => {
    if (gameStateRef.current === "hesitation") setGameState("hint");
  }, stage2);
  const t3 = setTimeout(() => {
    if (gameStateRef.current === "hint") {
      tracker.recordGuidedWin(correctAnswer, moduleType);
      setGameState("correct");
      setTimeout(() => navigate("/reward"), 3000);
    }
  }, stage3);
  return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
}, [/* stable deps */]);
```

**Feature dot logic:**
```typescript
const isAssessmentSession = levelConfig.cognitive_state === "insufficient_data";
const proactive = !isAssessmentSession && levelConfig.visual_aid_intensity === "animated";
const showDot   = !isAssessmentSession && (proactive || isHintActive);
const glowOpacity = isHintActive ? 1.0 : levelConfig.scaffold_intensity;
const dotSize     = proactive ? 20 : isHintActive ? 16 : 10;
// Animation: "breathe 2s ease-in-out infinite" → scale(1.12) at 50%
```

**Dev panel:**
In `import.meta.env.DEV` mode, a debug bar shows current game state, cognitive state, fail count, scaffold intensity, and provider.

---

### `RewardScreen.tsx`
Session end screen. Called once on mount (guarded by `apiCalled` ref).

**Session submission:**
```typescript
tracker.endLevel().then(async (response) => {
  // Update level config for next session
  setLevelConfig(newConfig);
  incrementSessionNumber();

  // Persist to Supabase
  await supabase.from("learning_sessions").insert({ ... });
  await supabase.from("letter_progress").upsert(
    { user_id, letter, letter_index: LETTER_SEQUENCE.indexOf(letter), ... },
    { onConflict: "user_id,letter" }
  );
});
```

**`storedIndex`** uses `LETTER_SEQUENCE.indexOf(levelConfig.target_alphabet)` — not the `letterIndex` context variable. This prevents a stale-closure bug where the closure captured an old letterIndex value.

---

### `ProgressScreen.tsx`
Full progress report with animated components.

**Key components:**
- **Hero card:** Amber gradient, rotating avatar, mastery progress bar with letter pills
- **AI Summary:** `ai_insights.overall_message` in a white card
- **Strengths / Focus areas:** Two-column grid, green and amber cards
- **Letter selector pills:** Tap to select letter for detail view
- **LetterPanel:** Shows cognitive state, session count, trend badge, error bar (animated width), confused pairs
- **Coming up:** Dashed outlines for unstarted letters

**`TrendBadge`:** Color-coded badge → green ↑ Improving, yellow → Steady, red ↓ Needs practice

**`ErrorBar`:** Animated width bar: green <15%, orange 15-35%, red >35%

---

## Components Reference

### `OptionCard.tsx`

5 states with distinct visual treatments:

| State | Visual | Animation |
|---|---|---|
| `default` | White, gray border | Scale 0.95 on tap |
| `correct` | Green (#4CAF50) + glow shadow | Scale bounce |
| `wrong` | White, red border (#E76F51) | Horizontal shake |
| `hint` | Yellow (#FFD166) + pulse | Animate-pulse |
| `dimmed` | White, 30% opacity, no click | None |

### `TracingCanvas.tsx`

Canvas-based letter tracing component. Key details:
- 400×400px canvas
- Letter outline drawn in gray (lineWidth 8)
- 6 guide dots in yellow (#FFD166, radius 10)
- User stroke: blue (#4A90E2, lineWidth 12, round cap/join)
- Both mouse and touch events supported
- Progress tracked (simulated, increments on draw strokes)
- Sparkle ✨ appears at >70% progress

**Current limitation:** The letter outline and guide dot positions are simplified/generic. Production would require per-letter SVG stroke data for accurate tracing paths.

### `AksharaButton.tsx`

Primary branded button. Two variants × two sizes:

| | Primary | Secondary |
|---|---|---|
| **Large** | Blue bg, 2xl text | White bg, blue border |
| **Small** | Blue bg, lg text | White bg, blue border |

Disabled state: 50% opacity, no pointer events, no scale animation.
