"""
Level Generator Agent — The Builder
Vertex AI preferred → Gemini API free tier → hard-coded fallback (NFR-03).

The LLM only handles personalisation decisions:
  • Which distractor letters to show (based on this child's confusion history)
  • Scaffold intensity (how much visual help, 0.0–1.0)
  • Which specific feature to highlight (e.g. "knot_upper_right")
  • A plain-language reasoning note for teachers

Everything else (similarity level, input mode, visual aid type) is decided
deterministically from the CognitiveState — no LLM needed for those.
"""
import json
import logging

from ..models.session import (
    SessionPayload, LevelConfig, CognitiveState,
    DistractorSimilarity, VisualAidIntensity, InputMode
)
from .llm_provider import LLMProviderRouter, ProviderType
from .prompts import SYSTEM_PROMPT, build_user_prompt

logger = logging.getLogger(__name__)


# ── Deterministic rules: CognitiveState → base parameters ────────────────────
STATE_RULES: dict[CognitiveState, dict] = {
    CognitiveState.GROSS_SHAPE_BLINDNESS: {
        "distractor_similarity": DistractorSimilarity.LOW,
        "visual_aid_intensity":  VisualAidIntensity.ANIMATED,
        "input_mode":            InputMode.TRACE,
        "scaffold_intensity":    0.85,
    },
    CognitiveState.FEATURE_NEGLECT: {
        "distractor_similarity": DistractorSimilarity.HIGH,
        "visual_aid_intensity":  VisualAidIntensity.STATIC,
        "input_mode":            InputMode.TAP,
        "scaffold_intensity":    0.55,
    },
    CognitiveState.VISUAL_MASTERY: {
        "distractor_similarity": DistractorSimilarity.HIGH,
        "visual_aid_intensity":  VisualAidIntensity.NONE,
        "input_mode":            InputMode.TAP,
        "scaffold_intensity":    0.0,
    },
    CognitiveState.INSUFFICIENT_DATA: {
        "distractor_similarity": DistractorSimilarity.LOW,
        "visual_aid_intensity":  VisualAidIntensity.NONE,  # first session = assessment, no cues
        "input_mode":            InputMode.TAP,
        "scaffold_intensity":    0.6,
    },
}

# The 5-letter learning sequence (must match frontend LETTER_SEQUENCE)
LETTER_SEQUENCE = ["म", "ग", "घ", "ध", "ब"]

# Two pools per letter: easy (dissimilar shapes) and hard (confusable pairs).
# Used when the LLM is unavailable.
FALLBACK_DISTRACTORS: dict[str, dict[str, list[str]]] = {
    "म": {"easy": ["ल", "ह", "स", "र"],   "hard": ["भ", "ध", "न", "ब"]},
    "ग": {"easy": ["ल", "ह", "स", "र"],   "hard": ["घ", "ध", "ज", "ञ"]},
    "घ": {"easy": ["ल", "ह", "स", "र"],   "hard": ["ग", "ध", "ज", "ञ"]},
    "ध": {"easy": ["ल", "ह", "स", "र"],   "hard": ["घ", "ग", "ज", "ञ"]},
    "ब": {"easy": ["ल", "ह", "स", "र"],   "hard": ["व", "भ", "ध", "ण"]},
    "भ": {"easy": ["ल", "ह", "स", "र"],   "hard": ["म", "ध", "न", "ब"]},
    "व": {"easy": ["ल", "ह", "स", "र"],   "hard": ["ब", "भ", "ध", "ण"]},
    "त": {"easy": ["ल", "ह", "स", "र"],   "hard": ["न", "ध", "म", "ब"]},
    "न": {"easy": ["ल", "ह", "स", "र"],   "hard": ["त", "ध", "म", "ब"]},
    "प": {"easy": ["ल", "ह", "स", "र"],   "hard": ["य", "ष", "फ", "ण"]},
    "य": {"easy": ["ल", "ह", "स", "र"],   "hard": ["प", "ष", "फ", "ण"]},
}
DEFAULT_DISTRACTOR_EASY = ["ल", "ह", "स", "र"]
DEFAULT_DISTRACTOR_HARD = ["भ", "ध", "न", "ब"]


class LevelGeneratorAgent:
    def __init__(self, router: LLMProviderRouter | None = None):
        self.router = router or LLMProviderRouter()

    def generate(
        self,
        session:        SessionPayload,
        state:          CognitiveState,
        reasoning:      str,
        user_history:   list[dict] | None = None,
        session_number: int = 1,
    ) -> LevelConfig:
        rules = STATE_RULES[state]

        baseline_ms = session.avg_latency_ms if session.avg_latency_ms > 0 else 6000.0
        
        # Calculate pacing compression for students with attention / coordination / anxiety cues
        jitter_total = sum(a.jitter_count for a in session.attempts)
        avg_hover = sum(a.hover_duration_ms for a in session.attempts) / len(session.attempts) if session.attempts else 0.0
        
        pacing_multiplier = 1.0
        if jitter_total > 5:
            # Reduce rescue delay up to 30% for high jitter (frustrated/erratic navigation)
            pacing_multiplier -= min(0.3, (jitter_total - 5) * 0.03)
        if avg_hover > 2000.0:
            # Reduce rescue delay up to 20% for prolonged option hovering
            pacing_multiplier -= min(0.2, (avg_hover - 2000.0) / 10000.0)
            
        pacing_multiplier = max(0.5, pacing_multiplier) # absolute floor to prevent flashing too rapidly
        
        stage1_ms   = baseline_ms + (8000 * pacing_multiplier)
        stage2_ms   = baseline_ms + (13000 * pacing_multiplier)

        llm_result, provider_used = self._call_llm(
            session=session, state=state, reasoning=reasoning,
            user_history=user_history or [], session_number=session_number,
        )

        logger.info(
            f"[LevelGenerator] provider={provider_used.value} | "
            f"pool={llm_result.get('distractor_pool')} | "
            f"scaffold={llm_result.get('scaffold_intensity')}"
        )

        scaffold = self._compute_scaffold(state, session)

        return LevelConfig(
            user_id                      = session.user_id,
            target_alphabet              = session.target_alphabet,
            cognitive_state              = state,
            distractor_similarity        = rules["distractor_similarity"],
            visual_aid_intensity         = rules["visual_aid_intensity"],
            input_mode                   = rules["input_mode"],
            scaffold_intensity           = scaffold,
            distractor_pool              = llm_result.get("distractor_pool", self._fallback_distractors(session.target_alphabet, state)),
            feature_to_highlight         = llm_result.get("feature_to_highlight", ""),
            phonological_note            = "",
            hesitation_trigger_stage1_ms = stage1_ms,
            hesitation_trigger_stage2_ms = stage2_ms,
            reasoning                    = llm_result.get("reasoning", reasoning),
            provider_used                = provider_used.value,
        )

    def _call_llm(self, session, state, reasoning, user_history, session_number):
        jitter_total = sum(a.jitter_count for a in session.attempts)
        user_prompt = build_user_prompt(
            target_alphabet=session.target_alphabet,
            cognitive_state=state.value,
            diagnosis_reasoning=reasoning,
            total_attempts=session.total_attempts,
            error_rate_pct=session.error_rate * 100,
            avg_latency_ms=session.avg_latency_ms,
            confused_pairs=session.confused_pairs(),
            jitter_count_total=jitter_total,
            session_number=session_number,
            user_history=user_history,
        )

        llm_response = self.router.complete(system_prompt=SYSTEM_PROMPT, user_prompt=user_prompt)

        if llm_response.provider_used == ProviderType.FALLBACK or not llm_response.text:
            return self._hard_fallback(state, session.target_alphabet), ProviderType.FALLBACK

        try:
            raw = llm_response.text.strip().replace("```json", "").replace("```", "").strip()
            parsed = json.loads(raw)
            self._validate_response(parsed, state, session.target_alphabet)
            return parsed, llm_response.provider_used
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(
                f"[LevelGenerator] Parse/validation failed: {e}. "
                f"Raw response was: {llm_response.text[:300]!r}"
            )
            return self._hard_fallback(state, session.target_alphabet), ProviderType.FALLBACK

    def _validate_response(self, data: dict, state: CognitiveState, target: str) -> None:
        pool = data.get("distractor_pool", [])
        if not isinstance(pool, list) or len(pool) < 2:
            raise ValueError(f"distractor_pool too small: {pool}")
        if target in pool:
            pool.remove(target)
            data["distractor_pool"] = pool

    def _compute_scaffold(self, state: CognitiveState, session: "SessionPayload") -> float:
        """
        Deterministic scaffold intensity from state + error rate.
        Removed from LLM control so it reliably decreases as student improves.

        GROSS_SHAPE_BLINDNESS : 0.70 – 1.0  (scales up with error rate)
        FEATURE_NEGLECT       : 0.35 – 0.65 (scales up with error rate)
        VISUAL_MASTERY        : 0.0          (no scaffolding needed)
        INSUFFICIENT_DATA     : 0.55         (moderate start, no data yet)
        """
        err = session.error_rate

        if state == CognitiveState.VISUAL_MASTERY:
            return 0.0

        if state == CognitiveState.GROSS_SHAPE_BLINDNESS:
            return round(min(1.0, max(0.70, 0.70 + err * 0.40)), 2)

        if state == CognitiveState.FEATURE_NEGLECT:
            return round(min(0.65, max(0.35, 0.35 + err * 0.50)), 2)

        # INSUFFICIENT_DATA
        return 0.55

    def _hard_fallback(self, state: CognitiveState, target: str) -> dict:
        return {
            "distractor_pool":      self._fallback_distractors(target, state),
            "feature_to_highlight": "",
            "reasoning":            f"System fallback — standard config for state: {state.value}",
        }

    def _fallback_distractors(self, target: str, state: CognitiveState) -> list[str]:
        pools = FALLBACK_DISTRACTORS.get(target)
        use_hard = state in (CognitiveState.FEATURE_NEGLECT, CognitiveState.VISUAL_MASTERY)
        if pools:
            return pools["hard"] if use_hard else pools["easy"]
        return DEFAULT_DISTRACTOR_HARD if use_hard else DEFAULT_DISTRACTOR_EASY
    
