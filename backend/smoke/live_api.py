"""
Live API test — hits the running Flask server on :5050 and validates
all four cognitive states produce correct, LLM-personalised configs.
"""
import json
import urllib.request
import urllib.error

BASE = "http://localhost:5050"

TESTS = [
    {
        "label": "INSUFFICIENT_DATA (no attempts — first ever session)",
        "expect_state": "insufficient_data",
        "expect_similarity": "low",
        "expect_aid": "static",
        "expect_mode": "tap",
        "payload": {
            "user_id": "test_001", "target_alphabet": "घ",
            "session_id": "s1", "session_number": 1,
            "avg_latency_ms": 0, "consecutive_fails_peak": 0,
            "attempts": [],
        },
    },
    {
        "label": "GROSS_SHAPE_BLINDNESS (80% fail on dissimilar)",
        "expect_state": "gross_shape_blindness",
        "expect_similarity": "low",
        "expect_aid": "animated",
        "expect_mode": "trace",
        "payload": {
            "user_id": "test_001", "target_alphabet": "घ",
            "session_id": "s2", "session_number": 2,
            "avg_latency_ms": 6200, "consecutive_fails_peak": 3,
            "attempts": [
                {"target_letter": "घ", "selected_letter": "ल", "module_type": "dissimilar",
                 "time_to_interact_ms": 7100, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 1},
                {"target_letter": "घ", "selected_letter": "म", "module_type": "dissimilar",
                 "time_to_interact_ms": 6800, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 2},
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "dissimilar",
                 "time_to_interact_ms": 5400, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
                {"target_letter": "घ", "selected_letter": "त", "module_type": "dissimilar",
                 "time_to_interact_ms": 8200, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 3},
                {"target_letter": "घ", "selected_letter": "ल", "module_type": "dissimilar",
                 "time_to_interact_ms": 7500, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 1},
            ],
        },
    },
    {
        "label": "FEATURE_NEGLECT (75% fail on similar only)",
        "expect_state": "feature_neglect",
        "expect_similarity": "high",
        "expect_aid": "static",
        "expect_mode": "tap",
        "payload": {
            "user_id": "test_001", "target_alphabet": "घ",
            "session_id": "s3", "session_number": 3,
            "avg_latency_ms": 4200, "consecutive_fails_peak": 2,
            "attempts": [
                {"target_letter": "घ", "selected_letter": "ध", "module_type": "similar",
                 "time_to_interact_ms": 5100, "was_guided_win": False, "hover_duration_ms": 1200, "jitter_count": 2},
                {"target_letter": "घ", "selected_letter": "ध", "module_type": "similar",
                 "time_to_interact_ms": 4800, "was_guided_win": False, "hover_duration_ms": 900, "jitter_count": 1},
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "similar",
                 "time_to_interact_ms": 4200, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
                {"target_letter": "घ", "selected_letter": "ध", "module_type": "similar",
                 "time_to_interact_ms": 5500, "was_guided_win": False, "hover_duration_ms": 1500, "jitter_count": 3},
            ],
        },
    },
    {
        "label": "VISUAL_MASTERY (9% fail on similar only — student past dissimilar stage)",
        "expect_state": "visual_mastery",
        "expect_similarity": "high",
        "expect_aid": "none",
        "expect_mode": "tap",
        "payload": {
            "user_id": "test_001", "target_alphabet": "घ",
            "session_id": "s4", "session_number": 4,
            "avg_latency_ms": 2800, "consecutive_fails_peak": 1,
            "attempts": [
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "similar",
                 "time_to_interact_ms": 2900, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "similar",
                 "time_to_interact_ms": 2700, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "similar",
                 "time_to_interact_ms": 2600, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "similar",
                 "time_to_interact_ms": 2800, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "similar",
                 "time_to_interact_ms": 3100, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "similar",
                 "time_to_interact_ms": 2700, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "similar",
                 "time_to_interact_ms": 2900, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "similar",
                 "time_to_interact_ms": 2800, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "similar",
                 "time_to_interact_ms": 2600, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
                {"target_letter": "घ", "selected_letter": "ध", "module_type": "similar",
                 "time_to_interact_ms": 3400, "was_guided_win": False, "hover_duration_ms": 800, "jitter_count": 1},
                {"target_letter": "घ", "selected_letter": "घ", "module_type": "similar",
                 "time_to_interact_ms": 2700, "was_guided_win": False, "hover_duration_ms": 0, "jitter_count": 0},
            ],
        },
    },
]


def post(payload: dict) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/analyze_session",
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


PASS = "\033[32m✓ PASS\033[0m"
FAIL = "\033[31m✗ FAIL\033[0m"

passed = 0
for i, t in enumerate(TESTS, 1):
    print(f"\n{'═'*65}")
    print(f"TEST {i}: {t['label']}")
    print(f"{'─'*65}")

    try:
        r = post(t["payload"])
        cfg = r["level_config"]

        checks = {
            "cognitive_state":       (cfg["cognitive_state"],        t["expect_state"]),
            "distractor_similarity": (cfg["distractor_similarity"],  t["expect_similarity"]),
            "visual_aid_intensity":  (cfg["visual_aid_intensity"],   t["expect_aid"]),
            "input_mode":            (cfg["input_mode"],             t["expect_mode"]),
        }

        ok = all(got == want for got, want in checks.values())
        if ok:
            passed += 1

        for field, (got, want) in checks.items():
            mark = "✓" if got == want else "✗"
            print(f"  {mark} {field:<28} {got}  (expected: {want})")

        print(f"  {'─'*40}")
        print(f"  provider_used        : {cfg['provider_used']}")
        print(f"  scaffold_intensity   : {cfg['scaffold_intensity']}")
        print(f"  distractor_pool      : {' '.join(cfg['distractor_pool'])}")
        print(f"  feature_to_highlight : {cfg['feature_to_highlight']}")
        print(f"  phonological_note    : {cfg['phonological_note']}")
        print(f"  reasoning            : {cfg['reasoning']}")
        print(f"\n  Result: {PASS if ok else FAIL}")

    except Exception as e:
        print(f"  ERROR: {e}")
        print(f"\n  Result: {FAIL}")

print(f"\n{'═'*65}")
print(f"RESULTS: {passed}/{len(TESTS)} tests passed")
if passed == len(TESTS):
    print("All live API tests passed. LLM adaptation is working correctly.")
else:
    print("Some tests failed — review above.")
