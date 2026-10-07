"""
Flask route: POST /analyze_session

Orchestrates: SessionPayload -> DiagnosisAgent -> LevelGeneratorAgent -> LevelConfig JSON.

Stateless by design: a pure function of its request body. It reads no database
and writes none.

It used to do both, and that was the bug. The client calls this endpoint twice
per letter -- once to initialise (zero attempts) and once at the end -- and each
call ran an INSERT, so a single sitting produced two server rows on top of the
one the client itself writes. Three rows, two of them without a session_id,
for one session.

The client is now the only writer. It owns the session id, writes through at
every activity rather than once at the end, and therefore keeps a child who
quits half-way. It also supplies `prior_cognitive_state`, which is the one
thing this endpoint previously needed a query for.
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

    # ── Parse ─────────────────────────────────────────────────────────────────
    try:
        session = _parse_payload(data)
    except (KeyError, ValueError) as e:
        return jsonify({"error": f"Payload parse error: {str(e)}"}), 422

    # ── Diagnose ──────────────────────────────────────────────────────────────
    state, reasoning = diagnosis_agent.diagnose(session)

    # ── Carry the learning profile forward when starting a new letter ─────────
    # INSUFFICIENT_DATA means this payload has 0 attempts: the initialisation
    # call for a letter the child is opening. Cold-starting there would hand a
    # child who has mastered four letters the same assessment as one who has
    # never seen Devanagari.
    #
    # The prior state arrives in the request. It used to be a SELECT per level,
    # which meant this endpoint needed a database and a verified JWT to do a
    # piece of arithmetic; the caller already holds its own history.
    prior_state_str = data.get("prior_cognitive_state")
    if state == CognitiveState.INSUFFICIENT_DATA and prior_state_str:
        try:
            prior_state = CognitiveState(prior_state_str)
        except ValueError:
            prior_state = None
        if prior_state and prior_state != CognitiveState.INSUFFICIENT_DATA:
            # Cap at FEATURE_NEGLECT for brand-new letters (don't skip shape recognition)
            state = _NEW_LETTER_STATE_CAP.get(prior_state, prior_state)
            reasoning = (
                f"Carrying forward learning profile from prior letter. "
                f"Prior state: {prior_state_str} -> starting {session.target_alphabet} "
                f"at {state.value}."
            )

    # ── Generate level config ─────────────────────────────────────────────────
    # user_history personalises the LLM's distractor choice. It came from the
    # database; the client can send it, and until it does an empty list simply
    # means the prompt carries no cross-session colour.
    level_config = level_agent.generate(
        session        = session,
        state          = state,
        reasoning      = reasoning,
        user_history   = data.get("user_history") or [],
        session_number = session.session_number,
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
            "carried_forward": bool(prior_state_str) and session.total_attempts == 0,
        }
    }), 200
