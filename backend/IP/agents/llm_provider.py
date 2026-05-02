"""
LLM Provider Abstraction for Akshara-Flow.

Priority chain:
  1. Vertex AI (google-cloud-aiplatform) — if GCP credentials are available
  2. Gemini API (google-genai)            — free tier fallback
  3. Hard-coded defaults                  — if both fail (NFR-03 fail-safe)

Why this structure:
- Vertex AI gives you enterprise SLAs, no rate limits, data residency,
  and audit logs — important for an app handling children's data.
- Gemini free tier is identical model quality, just rate-limited.
  Perfect for development and small-scale pilots.
- Both use the same Gemini model under the hood so outputs are consistent.

Setup:
  Vertex AI  →  gcloud auth application-default login
                export GOOGLE_CLOUD_PROJECT=your-project-id
                export GOOGLE_CLOUD_LOCATION=us-central1   (or asia-south1 for India)

  Gemini API →  export GEMINI_API_KEY=your-key
                (get free key at aistudio.google.com)
"""

import os
import json
import logging
from abc import ABC, abstractmethod
from enum import Enum

logger = logging.getLogger(__name__)


class ProviderType(str, Enum):
    VERTEX_AI  = "vertex_ai"
    GEMINI_API = "gemini_api"
    FALLBACK   = "fallback"


class LLMResponse:
    def __init__(self, text: str, provider_used: ProviderType):
        self.text          = text
        self.provider_used = provider_used


class BaseLLMProvider(ABC):
    @abstractmethod
    def is_available(self) -> bool:
        """Check if this provider can be used right now."""

    @abstractmethod
    def complete(self, system_prompt: str, user_prompt: str) -> str:
        """Return raw text response."""


# ── Provider 1: Vertex AI ─────────────────────────────────────────────────────

class VertexAIProvider(BaseLLMProvider):
    """
    Uses google-cloud-aiplatform SDK.
    Preferred for production — no rate limits, GCP audit logs, data stays in region.

    Install: pip install google-cloud-aiplatform
    Auth:    gcloud auth application-default login
             OR set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
    """

    MODEL = "gemini-2.0-flash-001"   # fast + capable; swap to gemini-1.5-pro for harder tasks

    def __init__(self):
        self._project  = os.environ.get("GOOGLE_CLOUD_PROJECT")
        self._location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
        self._client   = None

    def is_available(self) -> bool:
        if not self._project:
            logger.debug("[VertexAI] GOOGLE_CLOUD_PROJECT not set — skipping.")
            return False
        try:
            import google.cloud.aiplatform as aiplatform
            from vertexai.generative_models import GenerativeModel  # noqa: F401
            aiplatform.init(project=self._project, location=self._location)
            return True
        except ImportError:
            logger.debug("[VertexAI] google-cloud-aiplatform not installed — skipping.")
            return False
        except Exception as e:
            logger.debug(f"[VertexAI] Availability check failed: {e}")
            return False

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        import google.cloud.aiplatform as aiplatform
        from vertexai.generative_models import GenerativeModel, GenerationConfig

        aiplatform.init(project=self._project, location=self._location)
        model = GenerativeModel(
            self.MODEL,
            system_instruction=system_prompt,
        )
        response = model.generate_content(
            user_prompt,
            generation_config=GenerationConfig(
                temperature=0.2,      # low temp → consistent, structured JSON
                max_output_tokens=512,
                response_mime_type="application/json",  # forces valid JSON output
            ),
        )
        return response.text


# ── Provider 2: Gemini API (free tier) ───────────────────────────────────────

class GeminiAPIProvider(BaseLLMProvider):
    """
    Uses google-genai SDK (the newer unified SDK).
    Free tier at aistudio.google.com — rate limited but good for dev/pilots.

    Install: pip install google-genai
    Auth:    export GEMINI_API_KEY=your-key
    """

    def __init__(self, model: str = "gemini-2.5-flash"):
        self._api_key = os.environ.get("GEMINI_API_KEY")
        self._model   = model

    def is_available(self) -> bool:
        if not self._api_key:
            logger.debug("[GeminiAPI] GEMINI_API_KEY not set — skipping.")
            return False
        try:
            import google.genai  # noqa: F401
            return True
        except ImportError:
            logger.debug("[GeminiAPI] google-genai not installed — skipping.")
            return False

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self._api_key)
        response = client.models.generate_content(
            model=self._model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.2,
                max_output_tokens=512,
                response_mime_type="application/json",
            ),
        )
        return response.text


# ── Provider router ───────────────────────────────────────────────────────────

class LLMProviderRouter:
    """
    Tries providers in priority order.
    Falls back gracefully — never raises, always returns an LLMResponse.

    Usage:
        router = LLMProviderRouter()
        result = router.complete(system_prompt, user_prompt)
        print(result.text, result.provider_used)
    """

    def __init__(self, providers: list[BaseLLMProvider] | None = None):
        self._providers = providers or [
            GeminiAPIProvider("gemini-3.1-flash-lite-preview"),  # preferred: latest
            GeminiAPIProvider("gemini-2.5-flash"),         # fallback 1: stable capable
            GeminiAPIProvider("gemini-2.0-flash"),         # fallback 2: high capacity
        ]

    @property
    def active_provider(self) -> ProviderType:
        for p in self._providers:
            if p.is_available():
                return ProviderType.GEMINI_API
        return ProviderType.FALLBACK

    def complete(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> LLMResponse:
        """
        Try each Gemini model in order — 2.5-flash-lite first, 2.0-flash as fallback.
        503 UNAVAILABLE on the first model automatically tries the next.
        Returns LLMResponse("", ProviderType.FALLBACK) only if both fail.
        """
        for provider in self._providers:
            if not provider.is_available():
                continue
            try:
                logger.info(f"[LLMRouter] Trying model: {provider._model}")
                text = provider.complete(system_prompt, user_prompt)
                logger.info(f"[LLMRouter] Success with: {provider._model}")
                return LLMResponse(text=text, provider_used=ProviderType.GEMINI_API)
            except Exception as e:
                logger.warning(f"[LLMRouter] {provider._model} failed: {e}. Trying next.")

        logger.error("[LLMRouter] All Gemini models failed. Returning hard-coded fallback.")
        return LLMResponse(text="", provider_used=ProviderType.FALLBACK)
