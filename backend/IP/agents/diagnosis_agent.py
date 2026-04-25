"""
Diagnosis Agent — The Analyst
Classifies the student's current cognitive state from session performance data.

This is deterministic (rule-based), not LLM-powered.
It runs fast and is the foundation for what the Level Generator does next.
"""
from ..models.session import (
    SessionPayload, CognitiveState, ModuleType
)


ERROR_THRESHOLD_FAIL    = 0.30   # >30% error rate → struggling
ERROR_THRESHOLD_MASTERY = 0.10   # <10% error rate → mastered


class DiagnosisAgent:
    """
    Implements the three-state classification from the SRS (Section 3.2).

    State logic:
    ─────────────────────────────────────────────────────────────────────
    GROSS_SHAPE_BLINDNESS  : error rate on DISSIMILAR module  > 30%
                             (can't tell घ from completely different shapes)

    FEATURE_NEGLECT        : DISSIMILAR error rate ≤ 30%
                             BUT SIMILAR error rate > 30%
                             (recognises the shape, misses knot/line-break)

    VISUAL_MASTERY         : SIMILAR error rate < 10%
                             (consistently distinguishes near-identical letters)

    INSUFFICIENT_DATA      : Not enough attempts in a module to classify.
    ─────────────────────────────────────────────────────────────────────
    """

    def diagnose(self, session: SessionPayload) -> tuple[CognitiveState, str]:
        """
        Returns (CognitiveState, reasoning_string).
        reasoning_string is stored in LevelConfig.reasoning for transparency.
        """
        dissimilar_err = session.error_rate_for_module(ModuleType.DISSIMILAR)
        similar_err    = session.error_rate_for_module(ModuleType.SIMILAR)

        # ── No data at all ────────────────────────────────────────────────
        if dissimilar_err is None and similar_err is None:
            return (
                CognitiveState.INSUFFICIENT_DATA,
                "No attempts found. Defaulting to standard L1 start."
            )

        # ── Dissimilar module present: check for gross blindness ──────────
        if dissimilar_err is not None:
            if dissimilar_err > ERROR_THRESHOLD_FAIL:
                pct = round(dissimilar_err * 100)
                confused = self._top_confused_pairs(session, ModuleType.DISSIMILAR)
                return (
                    CognitiveState.GROSS_SHAPE_BLINDNESS,
                    f"Student confused {pct}% of dissimilar-contrast questions. "
                    f"Top confusions: {confused}. "
                    f"Cannot distinguish {session.target_alphabet} from visually different shapes."
                )
            # No similar data yet — only advance to similar module if dissimilar is mastered.
            # In-progress on dissimilar (10–30% errors) keeps student on dissimilar.
            if similar_err is None:
                if dissimilar_err >= ERROR_THRESHOLD_MASTERY:
                    pct = round(dissimilar_err * 100)
                    return (
                        CognitiveState.GROSS_SHAPE_BLINDNESS,
                        f"Student still making {pct}% errors on dissimilar-contrast. "
                        f"Keeping on dissimilar module until error rate drops below {round(ERROR_THRESHOLD_MASTERY*100)}%."
                    )
                return (
                    CognitiveState.FEATURE_NEGLECT,
                    f"Mastered dissimilar module ({round(dissimilar_err*100)}% error). "
                    f"Advancing to similar-contrast module to test feature discrimination of {session.target_alphabet}."
                )

        # ── Similar module present: classify feature neglect vs mastery ───
        # Reached here either from dissimilar→similar progression,
        # or because this session only contained similar-module attempts
        # (student already past dissimilar stage).

        if similar_err > ERROR_THRESHOLD_FAIL:
            pct = round(similar_err * 100)
            confused = self._top_confused_pairs(session, ModuleType.SIMILAR)
            return (
                CognitiveState.FEATURE_NEGLECT,
                f"Confused {pct}% of similar-contrast questions. "
                f"Top confusions: {confused}. "
                f"Student ignores distinguishing features (knot, line-break) of {session.target_alphabet}."
            )

        if similar_err < ERROR_THRESHOLD_MASTERY:
            return (
                CognitiveState.VISUAL_MASTERY,
                f"Excellent performance: only {round(similar_err*100)}% errors on similar-contrast. "
                f"Student has mastered {session.target_alphabet}. Ready for next alphabet."
            )

        # ── In progress (10–30% on similar) ──────────────────────────────
        return (
            CognitiveState.FEATURE_NEGLECT,
            f"Moderate difficulty on similar-contrast ({round(similar_err*100)}% error). "
            f"Treating as Feature Neglect — reinforce distinguishing features."
        )

    def _top_confused_pairs(
        self,
        session: SessionPayload,
        module: ModuleType,
        top_n: int = 3
    ) -> list[str]:
        """Returns the most frequent wrong-pick pairs for a given module."""
        from collections import Counter
        wrong = [
            f"{a.target_letter}→{a.selected_letter}"
            for a in session.attempts
            if a.module_type == module and a.target_letter != a.selected_letter
        ]
        counts = Counter(wrong)
        return [pair for pair, _ in counts.most_common(top_n)]
    
