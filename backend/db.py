"""
Supabase client and database helpers for Akshara-Flow backend.
"""
import os
import logging
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_base_client: Client | None = None


def _get_base() -> Client:
    """Anon client used only for JWT verification."""
    global _base_client
    if _base_client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_KEY", "")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        _base_client = create_client(url, key)
    return _base_client


def _authed(user_jwt: str) -> Client:
    """
    Return a client whose PostgREST calls are signed with the user's JWT.
    This makes auth.uid() resolve correctly so RLS policies pass.
    """
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    client = create_client(url, key)
    client.postgrest.auth(user_jwt)
    return client


def verify_jwt(token: str) -> str | None:
    """Verify a Supabase JWT and return the user_id, or None if invalid."""
    try:
        user_resp = _get_base().auth.get_user(token)
        return user_resp.user.id if user_resp.user else None
    except Exception as e:
        logger.warning(f"[Auth] JWT verification failed: {e}")
        return None


def load_user_history(user_id: str, letter: str, user_jwt: str, limit: int = 5) -> list[dict]:
    """
    Fetch the last N sessions for a user+letter.
    Returns list of dicts matching the format expected by build_user_prompt().
    """
    try:
        resp = (
            _authed(user_jwt)
            .from_("learning_sessions")
            .select(
                "session_number, cognitive_state, distractor_pool, "
                "scaffold_intensity, error_rate_pct, confused_pairs"
            )
            .eq("user_id", user_id)
            .eq("letter", letter)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        history = []
        for row in reversed(resp.data or []):
            history.append({
                "session_number":     row.get("session_number"),
                "pairs":              row.get("confused_pairs", {}).get("confused_pairs", []),
                "distractor_pool":    row.get("distractor_pool", []),
                "scaffold_intensity": row.get("scaffold_intensity"),
            })
        return history
    except Exception as e:
        logger.warning(f"[DB] load_user_history failed: {e}")
        return []


def get_latest_cognitive_state(user_id: str, user_jwt: str) -> str | None:
    """
    Return the most recent cognitive_state from any letter this user has learned.
    Used to seed the starting state for a new letter — so after the first letter
    the child is never treated as a cold start again.
    """
    try:
        resp = (
            _authed(user_jwt)
            .from_("learning_sessions")
            .select("cognitive_state")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        return rows[0]["cognitive_state"] if rows else None
    except Exception as e:
        logger.warning(f"[DB] get_latest_cognitive_state failed: {e}")
        return None


def load_all_sessions(user_id: str, user_jwt: str, limit: int = 60) -> list[dict]:
    """Load all learning sessions for a user, newest first."""
    try:
        resp = (
            _authed(user_jwt)
            .from_("learning_sessions")
            .select(
                "letter, session_number, cognitive_state, error_rate_pct, "
                "avg_latency_ms, scaffold_intensity, confused_pairs, created_at"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.warning(f"[DB] load_all_sessions failed: {e}")
        return []


def load_letter_progress(user_id: str, user_jwt: str) -> list[dict]:
    """Load all letter_progress rows for a user."""
    try:
        resp = (
            _authed(user_jwt)
            .from_("letter_progress")
            .select(
                "letter, letter_index, mastered, sessions_count, "
                "last_cognitive_state, last_scaffold_intensity, last_avg_latency_ms"
            )
            .eq("user_id", user_id)
            .order("letter_index", desc=False)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.warning(f"[DB] load_letter_progress failed: {e}")
        return []


def save_session(
    user_id: str,
    letter: str,
    session_number: int,
    cognitive_state: str,
    distractor_pool: list[str],
    scaffold_intensity: float,
    error_rate_pct: float,
    avg_latency_ms: float,
    confused_pairs: list,
    provider_used: str,
    user_jwt: str,
) -> None:
    """Persist a completed session to Supabase."""
    try:
        _authed(user_jwt).from_("learning_sessions").insert({
            "user_id":            user_id,
            "letter":             letter,
            "session_number":     session_number,
            "cognitive_state":    cognitive_state,
            "distractor_pool":    distractor_pool,
            "scaffold_intensity": scaffold_intensity,
            "error_rate_pct":     error_rate_pct,
            "avg_latency_ms":     avg_latency_ms,
            "confused_pairs":     {"confused_pairs": confused_pairs},
            "provider_used":      provider_used,
        }).execute()
    except Exception as e:
        logger.warning(f"[DB] save_session failed: {e}")
