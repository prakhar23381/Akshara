"""
Data models for Akshara-Flow adaptive session analysis.
These are plain dataclasses — no DB dependency, easy to swap later.
"""
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class ModuleType(str, Enum):
    DISSIMILAR = "dissimilar"   # Module A: high contrast (e.g. घ vs ल)
    SIMILAR    = "similar"      # Module B: low contrast  (e.g. घ vs ध)
    SCAFFOLD   = "scaffold"     # Module C: feature-highlighted


class CognitiveState(str, Enum):
    GROSS_SHAPE_BLINDNESS = "gross_shape_blindness"
    FEATURE_NEGLECT       = "feature_neglect"
    VISUAL_MASTERY        = "visual_mastery"
    INSUFFICIENT_DATA     = "insufficient_data"


class DistractorSimilarity(str, Enum):
    HIGH   = "high"    # similar letters (घ vs ध)
    MEDIUM = "medium"
    LOW    = "low"     # dissimilar letters (घ vs ल)


class VisualAidIntensity(str, Enum):
    NONE     = "none"
    STATIC   = "static"
    ANIMATED = "animated"


class InputMode(str, Enum):
    TAP   = "tap"
    DRAG  = "drag"
    TRACE = "trace"


@dataclass
class QuestionAttempt:
    """One question attempt within a session."""
    target_letter: str          # e.g. "घ"
    selected_letter: str        # what the student picked
    module_type: ModuleType
    time_to_interact_ms: float  # latency after audio finished, in ms
    was_guided_win: bool = False
    hover_duration_ms: float = 0.0
    jitter_count: int = 0


@dataclass
class SessionPayload:
    """
    Full session data sent from client to /analyze_session.
    Mirrors the JSON structure the React Native app will POST.
    """
    user_id: str
    target_alphabet: str        # the Hindi letter being learned, e.g. "घ"
    session_id: str
    session_number: int = 1

    attempts: list[QuestionAttempt] = field(default_factory=list)

    # Pre-aggregated by client (Guardian) for convenience
    avg_latency_ms: float = 0.0
    consecutive_fails_peak: int = 0

    @property
    def total_attempts(self) -> int:
        return len(self.attempts)

    @property
    def true_wins(self) -> int:
        return sum(1 for a in self.attempts
                   if a.target_letter == a.selected_letter and not a.was_guided_win)

    @property
    def error_rate(self) -> float:
        if not self.attempts:
            return 0.0
        errors = sum(1 for a in self.attempts if a.target_letter != a.selected_letter)
        return errors / len(self.attempts)

    def error_rate_for_module(self, module: ModuleType) -> Optional[float]:
        # Scaffold uses high-similarity distractors with visual aid — count it as similar
        # so progression out of FEATURE_NEGLECT is possible without a pure "similar" session.
        if module == ModuleType.SIMILAR:
            relevant = [a for a in self.attempts
                        if a.module_type in (ModuleType.SIMILAR, ModuleType.SCAFFOLD)]
        else:
            relevant = [a for a in self.attempts if a.module_type == module]
        if not relevant:
            return None
        errors = sum(1 for a in relevant if a.target_letter != a.selected_letter)
        return errors / len(relevant)

    def confused_pairs(self) -> list[tuple[str, str]]:
        """Returns (target, selected) pairs where student was wrong."""
        return [(a.target_letter, a.selected_letter)
                for a in self.attempts
                if a.target_letter != a.selected_letter]


@dataclass
class LevelConfig:
    """
    The output the Architect produces for the next level.
    This JSON is sent back to the client.
    """
    user_id: str
    target_alphabet: str
    cognitive_state: CognitiveState

    distractor_similarity: DistractorSimilarity
    visual_aid_intensity: VisualAidIntensity
    input_mode: InputMode

    # Personalized distractor pool (letters that have caused confusion before)
    distractor_pool: list[str] = field(default_factory=list)

    # Guardian timing thresholds for next session (ms)
    hesitation_trigger_stage1_ms: float = 3000.0
    hesitation_trigger_stage2_ms: float = 5000.0

    # Scaffold intensity 0.0–1.0 (opacity/glow strength)
    scaffold_intensity: float = 0.5

    # Feature-level and phonological support for frontend guidance
    feature_to_highlight: str = ""
    phonological_note: str = ""

    # Provenance: which model/provider generated this config
    provider_used: str = "fallback"

    reasoning: str = ""  # Human-readable explanation from the agent
