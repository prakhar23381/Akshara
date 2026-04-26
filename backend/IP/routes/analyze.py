"""
Flask route: POST /analyze_session

Orchestrates: SessionPayload → DiagnosisAgent → LevelGeneratorAgent → LevelConfig JSON.
If a valid Supabase JWT is present, loads real user history and persists results to DB.
"""
from flask import Blueprint, request, jsonify
from dataclasses import asdict

from ..models.session import (
    SessionPayload, QuestionAttempt, ModuleType, CognitiveState
)
from ..agents.diagnosis_agent import DiagnosisAgent
from ..agents.level_generator import LevelGeneratorAgent

analyze_bp = Blueprint("analyze", __name__)

diagnosis_agent = DiagnosisAgent()
level_agent     = LevelGeneratorAgent()

# VISUAL_MASTERY is capped at FEATURE_NEGLECT when starting a brand-new letter.
# The child hasn't seen the new letter yet — don't skip basic shape recognition.
_NEW_LETTER_STATE_CAP = {
    CognitiveState.VISUAL_MASTERY: CognitiveState.FEATURE_NEGLECT,
}


def _get_db():
    """Lazy import so the app still starts if Supabase creds are missing."""
    try:
        from db import verify_jwt, load_user_history, save_session, get_latest_cognitive_state
        return verify_jwt, load_user_history, save_session, get_latest_cognitive_state
    except Exception as e:
        import logging; logging.getLogger(__name__).warning(f"[DB] import failed: {e}")
        return None, None, None, None


def _parse_payload(data: dict) -> SessionPayload:
    raw_attempts = data.get("attempts", [])
    attempts = [
        QuestionAttempt(
            target_letter       = a["target_letter"],
            selected_letter     = a["selected_letter"],
            module_type         = ModuleType(a["module_type"]),
            time_to_interact_ms = float(a.get("time_to_interact_ms", 0)),
            was_guided_win      = bool(a.get("was_guided_win", False)),
            hover_duration_ms   = float(a.get("hover_duration_ms", 0)),
            jitter_count        = int(a.get("jitter_count", 0)),
        )
        for a in raw_attempts
    ]
    return SessionPayload(
        user_id               = data["user_id"],
        target_alphabet       = data["target_alphabet"],
        session_id            = data["session_id"],
        session_number        = int(data.get("session_number", 1)),
        attempts              = attempts,
        avg_latency_ms        = float(data.get("avg_latency_ms", 0)),
        consecutive_fails_peak= int(data.get("consecutive_fails_peak", 0)),
    )


@analyze_bp.route("/analyze_session", methods=["POST", "OPTIONS"])
def analyze_session():
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    missing = [k for k in ["user_id", "target_alphabet", "session_id"] if k not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    # ── Auth ──────────────────────────────────────────────────────────────────
    verify_jwt, load_user_history, save_session, get_latest_cognitive_state = _get_db()
    verified_user_id = None
    raw_jwt = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer ") and verify_jwt:
        raw_jwt = auth_header[7:]
        verified_user_id = verify_jwt(raw_jwt)

    effective_user_id = verified_user_id or data["user_id"]

    # ── Parse ─────────────────────────────────────────────────────────────────
    try:
        session = _parse_payload({**data, "user_id": effective_user_id})
    except (KeyError, ValueError) as e:
        return jsonify({"error": f"Payload parse error: {str(e)}"}), 422

    # ── Load letter-specific history for LLM personalisation ─────────────────
    user_history = []
    if verified_user_id and raw_jwt and load_user_history:
        user_history = load_user_history(verified_user_id, session.target_alphabet, raw_jwt)

    # ── Diagnose ──────────────────────────────────────────────────────────────
    state, reasoning = diagnosis_agent.diagnose(session)

    # ── Carry the learning profile forward when starting a new letter ─────────
    # INSUFFICIENT_DATA means the current session has 0 attempts (initialisation
    # call for a new letter). If the child has learned any previous letter, we
    # already know their cognitive profile — use it instead of cold-starting.
    if state == CognitiveState.INSUFFICIENT_DATA and verified_user_id and raw_jwt and get_latest_cognitive_state:
        prior_state_str = get_latest_cognitive_state(verified_user_id, raw_jwt)
        if prior_state_str and prior_state_str != CognitiveState.INSUFFICIENT_DATA.value:
            prior_state = CognitiveState(prior_state_str)
            # Cap at FEATURE_NEGLECT for brand-new letters (don't skip shape recognition)
            state = _NEW_LETTER_STATE_CAP.get(prior_state, prior_state)
            reasoning = (
                f"Carrying forward learning profile from prior letter. "
                f"Prior state: {prior_state_str} → starting {session.target_alphabet} "
                f"at {state.value}."
            )

    # ── Generate level config ─────────────────────────────────────────────────
    level_config = level_agent.generate(
        session        = session,
        state          = state,
        reasoning      = reasoning,
        user_history   = user_history,
        session_number = session.session_number,
    )

    # ── Persist to Supabase ───────────────────────────────────────────────────
    if verified_user_id and raw_jwt and save_session:
        save_session(
            user_id            = verified_user_id,
            letter             = session.target_alphabet,
            session_number     = session.session_number,
            cognitive_state    = state.value,
            distractor_pool    = level_config.distractor_pool,
            scaffold_intensity = level_config.scaffold_intensity,
            error_rate_pct     = round(session.error_rate * 100, 1),
            avg_latency_ms     = session.avg_latency_ms,
            confused_pairs     = [list(p) for p in session.confused_pairs()],
            provider_used      = level_config.provider_used,
            user_jwt           = raw_jwt,
        )

    # ── Respond ───────────────────────────────────────────────────────────────
    config_dict = asdict(level_config)
    for key in ("cognitive_state", "distractor_similarity", "visual_aid_intensity", "input_mode"):
        if hasattr(config_dict[key], "value"):
            config_dict[key] = config_dict[key].value

    return jsonify({
        "status":          "ok",
        "level_config":    config_dict,
        "letter_mastered": state == CognitiveState.VISUAL_MASTERY,
        "debug": {
            "total_attempts":  session.total_attempts,
            "error_rate_pct":  round(session.error_rate * 100, 1),
            "cognitive_state": state.value,
            "authenticated":   verified_user_id is not None,
        }
    }), 200
