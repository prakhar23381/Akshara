"""
Test the full Akshara-Flow agent pipeline without a running server.
Tests the DiagnosisAgent and the deterministic parts of LevelGenerator.

Run from backend/:
    python tests/test_pipeline.py
"""
import sys
import os
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)
sys.path.insert(0, os.path.dirname(__file__))

from IP.models.session import (
    SessionPayload, QuestionAttempt, ModuleType, CognitiveState
)
from IP.agents.diagnosis_agent import DiagnosisAgent


def make_session(attempts_data: list[dict]) -> SessionPayload:
    attempts = [
        QuestionAttempt(
            target_letter      = a["target"],
            selected_letter    = a["selected"],
            module_type        = ModuleType(a["module"]),
            time_to_interact_ms= a.get("latency_ms", 3000),
            was_guided_win     = a.get("guided", False),
        )
        for a in attempts_data
    ]
    latencies = [a.time_to_interact_ms for a in attempts]
    return SessionPayload(
        user_id         = "test_user_01",
        target_alphabet = "घ",
        session_id      = "sess_001",
        attempts        = attempts,
        avg_latency_ms  = sum(latencies) / len(latencies) if latencies else 4000,
    )


def run_test(name: str, attempts_data: list[dict], expected_state: CognitiveState):
    print(f"\n{'═'*60}")
    print(f"TEST: {name}")
    print(f"{'─'*60}")

    session = make_session(attempts_data)
    agent = DiagnosisAgent()
    state, reasoning = agent.diagnose(session)

    print(f"  Target letter  : {session.target_alphabet}")
    print(f"  Total attempts : {session.total_attempts}")
    print(f"  Error rate     : {round(session.error_rate * 100, 1)}%")
    print(f"  Confused pairs : {session.confused_pairs()}")
    print(f"  Diagnosed state: {state.value}")
    print(f"  Reasoning      : {reasoning}")

    status = "✓ PASS" if state == expected_state else f"✗ FAIL (expected {expected_state.value})"
    print(f"  Result         : {status}")
    return state == expected_state


def main():
    print("Akshara-Flow — Agent Pipeline Tests")
    print("Target letter for all tests: घ (Gha)")

    results = []

    # ── Test 1: Gross shape blindness ─────────────────────────────────────
    results.append(run_test(
        name = "Gross shape blindness — fails even dissimilar",
        attempts_data = [
            # Student picks wrong even when distractor is very different
            {"target": "घ", "selected": "ल",  "module": "dissimilar", "latency_ms": 6000},
            {"target": "घ", "selected": "म",  "module": "dissimilar", "latency_ms": 7000},
            {"target": "घ", "selected": "घ",  "module": "dissimilar", "latency_ms": 4000},
            {"target": "घ", "selected": "त",  "module": "dissimilar", "latency_ms": 5000},
            {"target": "घ", "selected": "घ",  "module": "dissimilar", "latency_ms": 3500},
        ],
        expected_state = CognitiveState.GROSS_SHAPE_BLINDNESS
    ))

    # ── Test 2: Feature neglect ───────────────────────────────────────────
    results.append(run_test(
        name = "Feature neglect — passes dissimilar, fails similar",
        attempts_data = [
            # Passes dissimilar
            {"target": "घ", "selected": "घ",  "module": "dissimilar", "latency_ms": 3000},
            {"target": "घ", "selected": "घ",  "module": "dissimilar", "latency_ms": 2800},
            {"target": "घ", "selected": "घ",  "module": "dissimilar", "latency_ms": 3200},
            # Fails similar (confuses with ध which looks alike)
            {"target": "घ", "selected": "ध",  "module": "similar",    "latency_ms": 5500},
            {"target": "घ", "selected": "ध",  "module": "similar",    "latency_ms": 6000},
            {"target": "घ", "selected": "घ",  "module": "similar",    "latency_ms": 4000},
            {"target": "घ", "selected": "ध",  "module": "similar",    "latency_ms": 5000},
        ],
        expected_state = CognitiveState.FEATURE_NEGLECT
    ))

    # ── Test 3: Visual mastery ────────────────────────────────────────────
    results.append(run_test(
        name = "Visual mastery — almost perfect on similar",
        attempts_data = [
            {"target": "घ", "selected": "घ",  "module": "dissimilar", "latency_ms": 2000},
            {"target": "घ", "selected": "घ",  "module": "dissimilar", "latency_ms": 1800},
            {"target": "घ", "selected": "घ",  "module": "dissimilar", "latency_ms": 2200},
            {"target": "घ", "selected": "घ",  "module": "similar",    "latency_ms": 2500},
            {"target": "घ", "selected": "घ",  "module": "similar",    "latency_ms": 2300},
            {"target": "घ", "selected": "घ",  "module": "similar",    "latency_ms": 2100},
            {"target": "घ", "selected": "घ",  "module": "similar",    "latency_ms": 2400},
            {"target": "घ", "selected": "ध",  "module": "similar",    "latency_ms": 2800},  # 1 mistake in 11
            {"target": "घ", "selected": "घ",  "module": "similar",    "latency_ms": 2200},
            {"target": "घ", "selected": "घ",  "module": "similar",    "latency_ms": 2000},
            {"target": "घ", "selected": "घ",  "module": "similar",    "latency_ms": 2100},
            {"target": "घ", "selected": "घ",  "module": "similar",    "latency_ms": 2300},
            {"target": "घ", "selected": "घ",  "module": "similar",    "latency_ms": 1900},
            {"target": "घ", "selected": "घ",  "module": "similar",    "latency_ms": 2050},
        ],
        expected_state = CognitiveState.VISUAL_MASTERY
    ))

    # ── Test 4: Insufficient data ─────────────────────────────────────────
    results.append(run_test(
        name = "Insufficient data — no attempts logged",
        attempts_data = [],
        expected_state = CognitiveState.INSUFFICIENT_DATA
    ))

    # ── Test 5: Passed dissimilar, advance to similar module ──────────────
    # Bug regression test: previously returned INSUFFICIENT_DATA (LOW similarity)
    # keeping student stuck on easy levels. Should now return FEATURE_NEGLECT
    # (HIGH similarity) to advance them to the similar-contrast module.
    results.append(run_test(
        name = "Advance to similar — passed dissimilar, no similar data yet",
        attempts_data = [
            {"target": "घ", "selected": "घ", "module": "dissimilar", "latency_ms": 3200},
            {"target": "घ", "selected": "घ", "module": "dissimilar", "latency_ms": 2900},
            {"target": "घ", "selected": "घ", "module": "dissimilar", "latency_ms": 3100},
            {"target": "घ", "selected": "घ", "module": "dissimilar", "latency_ms": 2800},
        ],
        expected_state = CognitiveState.FEATURE_NEGLECT
    ))

    # ── Test 6: Struggling on dissimilar — must NOT advance to similar ───
    results.append(run_test(
        name = "In-progress dissimilar — should stay on dissimilar (not advance)",
        attempts_data = [
            {"target": "घ", "selected": "घ", "module": "dissimilar", "latency_ms": 4000},
            {"target": "घ", "selected": "ल", "module": "dissimilar", "latency_ms": 5000},
            {"target": "घ", "selected": "घ", "module": "dissimilar", "latency_ms": 4500},
            {"target": "घ", "selected": "घ", "module": "dissimilar", "latency_ms": 3800},
            # 1 wrong out of 4 = 25% error — above mastery (10%) so should stay on dissimilar
        ],
        expected_state = CognitiveState.GROSS_SHAPE_BLINDNESS
    ))

    # ── Summary ───────────────────────────────────────────────────────────
    print(f"\n{'═'*60}")
    passed = sum(results)
    total  = len(results)
    print(f"RESULTS: {passed}/{total} tests passed")

    if passed == total:
        print("All tests passed. Diagnosis agent is working correctly.")
    else:
        print("Some tests failed. Review the logic above.")


if __name__ == "__main__":
    main()
