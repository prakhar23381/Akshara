"""
Flask route: GET /progress_report

Loads all Supabase session history for the authenticated user, builds per-letter
stats, calls the LLM to generate parent-facing insights, and returns a structured
progress report JSON.
"""
import json
import logging
from collections import defaultdict

from flask import Blueprint, request, jsonify
from ..agents.llm_provider import LLMProviderRouter, ProviderType

logger = logging.getLogger(__name__)

progress_bp = Blueprint("progress", __name__)

_router = LLMProviderRouter()

LETTER_SEQUENCE = [
    "क", "ख", "ग", "घ", "ङ",
    "च", "छ", "ज", "झ", "ञ",
    "ट", "ठ", "ड", "ढ", "ण",
    "त", "थ", "द", "ध", "न",
    "प", "फ", "ब", "भ", "म",
    "य", "र", "ल", "व",
    "श", "ष", "स", "ह"
]

PROGRESS_SYSTEM_PROMPT = """
You are a compassionate learning specialist analyzing a child's progress in
learning Hindi letters (Devanagari script) in an app designed for children
with dyslexia.

Your audience is parents and teachers. Be warm, specific, and encouraging.

Analyze the session data and return ONLY valid JSON with this exact structure:
{
  "overall_message": "2-3 warm sentences summarizing the child's journey so far",
  "encouragement": "one short sentence directed at the child (use 'you', e.g. 'You are doing amazing!')",
  "strengths": ["specific strength (max 15 words)", "specific strength (max 15 words)"],
  "focus_areas": ["specific suggestion with letter name (max 20 words)"],
  "letter_insights": {
    "<letter>": "one sentence about this letter's specific progress"
  }
}

Rules:
- strengths: 2-3 items, reference specific letters or patterns
- focus_areas: 1-2 items max, actionable suggestions
- letter_insights: only include letters the child has actually practiced
- Never use clinical language (no "dyslexia", "disorder", "deficit", "impairment")
- Be specific — mention actual letters, confusion pairs, improvements
- Cognitive states translate as: insufficient_data=just started, gross_shape_blindness=learning shapes, feature_neglect=learning fine details, visual_mastery=mastered
- Output ONLY JSON, no markdown, no prose outside the JSON
"""


def _build_letter_stats(sessions: list[dict], progress: list[dict]) -> dict:
    """Aggregate per-letter stats from raw session rows."""
    by_letter = defaultdict(list)
    for s in sessions:
        letter = s.get("letter")
        if letter:
            by_letter[letter].append(s)

    progress_map = {p["letter"]: p for p in progress}

    stats = {}
    for letter in LETTER_SEQUENCE:
        letter_sessions = by_letter.get(letter, [])
        prog = progress_map.get(letter)

        if not letter_sessions and not prog:
            continue

        error_rates = [
            s["error_rate_pct"] for s in letter_sessions
            if s.get("error_rate_pct") is not None
        ]
        avg_err = round(sum(error_rates) / len(error_rates), 1) if error_rates else None

        # Confused pairs across all sessions
        confused = []
        for s in letter_sessions:
            pairs = s.get("confused_pairs", {})
            if isinstance(pairs, dict):
                confused.extend(pairs.get("confused_pairs", []))
            elif isinstance(pairs, list):
                confused.extend(pairs)

        confused_flat = [
            f"{p[0]}→{p[1]}" for p in confused
            if isinstance(p, (list, tuple)) and len(p) == 2
        ]
        from collections import Counter
        top_confused = [pair for pair, _ in Counter(confused_flat).most_common(3)]

        # Trend: compare first half vs second half error rates
        trend = "stable"
        if len(error_rates) >= 4:
            mid = len(error_rates) // 2
            early_avg = sum(error_rates[mid:]) / len(error_rates[mid:])
            recent_avg = sum(error_rates[:mid]) / len(error_rates[:mid])
            if recent_avg < early_avg - 5:
                trend = "improving"
            elif recent_avg > early_avg + 5:
                trend = "needs attention"

        stats[letter] = {
            "sessions_count":       len(letter_sessions),
            "mastered":             prog.get("mastered", False) if prog else False,
            "last_cognitive_state": (
                prog.get("last_cognitive_state")
                or (letter_sessions[0].get("cognitive_state") if letter_sessions else "insufficient_data")
            ),
            "avg_error_rate_pct":   avg_err,
            "trend":                trend,
            "confused_with":        top_confused,
        }

    return stats


def _call_llm(letter_stats: dict, total_sessions: int, display_name: str) -> dict | None:
    lines = []
    for letter, s in letter_stats.items():
        mastered_str = "MASTERED" if s["mastered"] else "in progress"
        lines.append(
            f"  {letter}: {mastered_str} | {s['sessions_count']} sessions | "
            f"state={s['last_cognitive_state']} | "
            f"avg_error={s['avg_error_rate_pct']}% | "
            f"trend={s['trend']} | confused_with={s['confused_with']}"
        )

    prompt = f"""
Child name: {display_name}
Total sessions completed: {total_sessions}
Letters practiced: {list(letter_stats.keys())}
Letters mastered: {[l for l, s in letter_stats.items() if s["mastered"]]}

Per-letter breakdown:
{chr(10).join(lines)}

Generate the progress report JSON now.
"""
    response = _router.complete(system_prompt=PROGRESS_SYSTEM_PROMPT, user_prompt=prompt)

    if not response.text or response.provider_used == ProviderType.FALLBACK:
        return None

    try:
        raw = response.text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.warning(f"[Progress] LLM JSON parse failed: {e}. Raw: {response.text[:300]!r}")
        return None


def _hard_fallback(letter_stats: dict) -> dict:
    mastered = [l for l, s in letter_stats.items() if s["mastered"]]
    in_progress = [l for l, s in letter_stats.items() if not s["mastered"]]
    return {
        "overall_message": (
            f"Great work so far! "
            + (f"{', '.join(mastered)} {'has' if len(mastered)==1 else 'have'} been mastered. " if mastered else "")
            + (f"Currently working on {in_progress[0]}." if in_progress else "")
        ),
        "encouragement": "Keep going — you are doing great!",
        "strengths": [
            "Showing up and practising every day",
            f"Already completed {sum(s['sessions_count'] for s in letter_stats.values())} practice sessions",
        ],
        "focus_areas": [
            f"Keep practising {in_progress[0]} — focus on its unique shape" if in_progress else "Practise all letters to keep them fresh"
        ],
        "letter_insights": {
            letter: (
                "Mastered! Keep it fresh with occasional review."
                if s["mastered"]
                else f"Still learning — {s['sessions_count']} sessions done so far."
            )
            for letter, s in letter_stats.items()
        },
    }


@progress_bp.route("/progress_report", methods=["GET", "OPTIONS"])
def progress_report():
    if request.method == "OPTIONS":
        return "", 204

    # ── Auth ──────────────────────────────────────────────────────────────────
    try:
        from db import verify_jwt, load_all_sessions, load_letter_progress
    except Exception as e:
        logger.error(f"[Progress] DB import failed: {e}")
        return jsonify({"error": "Service unavailable"}), 503

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Authentication required"}), 401

    raw_jwt = auth_header[7:]
    user_id = verify_jwt(raw_jwt)
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401

    # ── Load data from Supabase ───────────────────────────────────────────────
    sessions  = load_all_sessions(user_id, raw_jwt)
    progress  = load_letter_progress(user_id, raw_jwt)

    if not sessions and not progress:
        return jsonify({
            "status": "ok",
            "empty": True,
            "message": "No sessions found yet. Complete some practice to see your report!",
        }), 200

    # ── Build stats ───────────────────────────────────────────────────────────
    letter_stats  = _build_letter_stats(sessions, progress)
    total_sessions = len(sessions)

    # Try to get display name from profile
    display_name = "the student"
    try:
        from db import _authed
        profile_resp = (
            _authed(raw_jwt)
            .from_("user_profiles")
            .select("display_name")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if profile_resp.data and profile_resp.data.get("display_name"):
            display_name = profile_resp.data["display_name"]
    except Exception:
        pass

    # ── AI insights ───────────────────────────────────────────────────────────
    ai_insights = _call_llm(letter_stats, total_sessions, display_name)
    if not ai_insights:
        ai_insights = _hard_fallback(letter_stats)
        provider = "fallback"
    else:
        provider = "gemini"

    # ── Assemble response ─────────────────────────────────────────────────────
    return jsonify({
        "status":        "ok",
        "display_name":  display_name,
        "total_sessions": total_sessions,
        "letters_mastered": sum(1 for s in letter_stats.values() if s["mastered"]),
        "letter_stats":  letter_stats,
        "ai_insights":   ai_insights,
        "provider":      provider,
    }), 200
