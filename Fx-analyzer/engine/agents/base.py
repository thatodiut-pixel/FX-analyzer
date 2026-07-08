import os
import asyncio
import logging
import time
import json
import warnings
from dotenv import load_dotenv

# Gemini
try:
    import google.generativeai as genai
except ImportError:
    genai = None

# OpenRouter via OpenAI-compatible SDK
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
load_dotenv()


# Free OpenRouter models (live list as of June 2026)
OPENROUTER_FREE_MODELS = {
    "Google Gemma 4 31B (Free)": "google/gemma-4-31b-it:free",
    "Google Gemma 4 26B (Free)": "google/gemma-4-26b-a4b-it:free",
    "Meta Llama 3.3 70B (Free)": "meta-llama/llama-3.3-70b-instruct:free",
    "Meta Llama 3.2 3B (Free)": "meta-llama/llama-3.2-3b-instruct:free",
    "NVIDIA Nemotron 3 Super 120B (Free)": "nvidia/nemotron-3-super-120b-a12b:free",
    "NVIDIA Nemotron 3 Nano 30B (Free)": "nvidia/nemotron-3-nano-30b-a3b:free",
    "Qwen Qwen3 Next 80B (Free)": "qwen/qwen3-next-80b-a3b-instruct:free",
    "Qwen Qwen3 Coder 480B (Free)": "qwen/qwen3-coder:free",
    "Nous Hermes 3 405B (Free)": "nousresearch/hermes-3-llama-3.1-405b:free",
    "Poolside Laguna M.1 (Free)": "poolside/laguna-m.1:free",
    "Cohere North Mini Code (Free)": "cohere/north-mini-code:free",
}

# Gemini models (available if GEMINI_API_KEY is set)
GEMINI_MODELS = {
    "Gemini 1.5 Flash": "gemini-1.5-flash",
    "Gemini 1.5 Pro": "gemini-1.5-pro",
    "Gemini 2.0 Flash": "gemini-2.0-flash",
    "Gemini 2.0 Flash Lite": "gemini-2.0-flash-lite",
}

PROVIDER_PREFIX_GEMINI = "gemini"
PROVIDER_PREFIX_OPENROUTER = "openrouter"


class BaseAgent:
    """
    Base class for all Expert Agents.
    Supports Gemini (google.generativeai) and OpenRouter (OpenAI-compatible API).
    Model strings use format: 'openrouter:model-id' or 'gemini:model-name'.
    Backward-compatible: bare model names default to Gemini.
    """

    def __init__(self, name: str, role: str, model_name: str = "gemini:gemini-1.5-flash"):
        self.name = name
        self.role = role
        self.rate_limited_until = 0
        self.consecutive_errors = 0
        self.base_backoff = 5
        self.max_backoff = 120

        # Parse provider + model
        self.provider = PROVIDER_PREFIX_GEMINI
        self.model_name = model_name
        self._parse_model_string(model_name)

        # API keys
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY")

        # --- Initialize Gemini client ---
        self.gemini_model = None
        if self.gemini_key and genai:
            try:
                genai.configure(api_key=self.gemini_key)
                if self.provider == PROVIDER_PREFIX_GEMINI:
                    self.gemini_model = genai.GenerativeModel(self.model_name)
                logging.info(f"Agent {self.name}: Gemini SDK ready")
            except Exception as e:
                logging.error(f"Agent {self.name} Gemini init failed: {e}")
        elif self.gemini_key and not genai:
            logging.warning(f"Agent {self.name}: GEMINI_API_KEY set but google.generativeai not installed")

        # --- Initialize OpenRouter client ---
        self.openrouter_client = None
        if self.openrouter_key and OpenAI:
            try:
                self.openrouter_client = OpenAI(
                    api_key=self.openrouter_key,
                    base_url="https://openrouter.ai/api/v1"
                )
                logging.info(f"Agent {self.name}: OpenRouter client ready")
            except Exception as e:
                logging.error(f"Agent {self.name} OpenRouter init failed: {e}")
        elif self.openrouter_key and not OpenAI:
            logging.warning(f"Agent {self.name}: OPENROUTER_API_KEY set but openai package not installed")

        logging.info(f"Agent {self.name} initialized — provider={self.provider}, model={self.model_name}")

    def _parse_model_string(self, model_string: str):
        """Parse 'openrouter:model-id' or 'gemini:model-name' or bare 'model-name' (defaults Gemini)."""
        if ":" in model_string:
            prefix, actual = model_string.split(":", 1)
            if prefix == PROVIDER_PREFIX_OPENROUTER:
                self.provider = PROVIDER_PREFIX_OPENROUTER
                self.model_name = actual
            else:
                # 'gemini:' prefix or unknown prefix — treat as Gemini
                self.provider = PROVIDER_PREFIX_GEMINI
                self.model_name = actual
        else:
            # No prefix — default to Gemini for backward compatibility
            self.provider = PROVIDER_PREFIX_GEMINI
            self.model_name = model_string

    def _make_model_string(self) -> str:
        """Reconstruct the full model string with provider prefix."""
        if self.provider == PROVIDER_PREFIX_OPENROUTER:
            return f"{PROVIDER_PREFIX_OPENROUTER}:{self.model_name}"
        return f"{PROVIDER_PREFIX_GEMINI}:{self.model_name}"

    @staticmethod
    def get_all_available_models():
        """
        Returns a dict of {display_name: model_string_with_prefix} for all
        models that the user could configure (independent of API keys).
        Used by the frontend to know what exists.
        """
        models = {}
        # Gemini models
        for display, model_id in GEMINI_MODELS.items():
            models[f"Gemini: {display}"] = f"{PROVIDER_PREFIX_GEMINI}:{model_id}"
        # OpenRouter free models
        for display, model_id in OPENROUTER_FREE_MODELS.items():
            models[f"OpenRouter: {display}"] = f"{PROVIDER_PREFIX_OPENROUTER}:{model_id}"
        return models

    @staticmethod
    def get_configured_models():
        """
        Returns models whose API keys are actually set in the environment.
        Used by bridge.py to report available models.
        """
        models = {}
        gemini_key = os.getenv("GEMINI_API_KEY")
        openrouter_key = os.getenv("OPENROUTER_API_KEY")

        if gemini_key:
            for display, model_id in GEMINI_MODELS.items():
                models[f"Gemini: {display}"] = f"{PROVIDER_PREFIX_GEMINI}:{model_id}"

        if openrouter_key:
            for display, model_id in OPENROUTER_FREE_MODELS.items():
                models[f"OpenRouter: {display}"] = f"{PROVIDER_PREFIX_OPENROUTER}:{model_id}"

        if not models:
            models["No Providers Configured"] = "gemini:gemini-1.5-flash"

        return models

    def update_model(self, model_string: str):
        """
        Updates the LLM model used by this agent.
        Accepts 'openrouter:model-id' or 'gemini:model-name' or bare 'model-name'.
        """
        old_provider = self.provider
        old_model = self.model_name

        self._parse_model_string(model_string)

        # Same provider + model — no-op
        if old_provider == self.provider and old_model == self.model_name:
            return True

        try:
            if self.provider == PROVIDER_PREFIX_GEMINI:
                if not self.gemini_key:
                    logging.warning(f"Cannot switch {self.name} to Gemini: GEMINI_API_KEY missing")
                    self.provider, self.model_name = old_provider, old_model
                    return False
                genai.configure(api_key=self.gemini_key)
                self.gemini_model = genai.GenerativeModel(self.model_name)
                self.openrouter_client = None  # not needed for Gemini

            elif self.provider == PROVIDER_PREFIX_OPENROUTER:
                if not self.openrouter_key or not self.openrouter_client:
                    logging.warning(f"Cannot switch {self.name} to OpenRouter: OPENROUTER_API_KEY missing")
                    self.provider, self.model_name = old_provider, old_model
                    return False
                self.gemini_model = None  # not needed for OpenRouter

            logging.info(f"Agent {self.name} switched to {self._make_model_string()}")
            return True

        except Exception as e:
            logging.error(f"Agent {self.name} failed to switch model: {e}")
            self.provider, self.model_name = old_provider, old_model
            return False

    async def _call_llm_async(self, prompt: str, system_prompt: str = None) -> str:
        """Route to provider-specific implementation."""
        if self.provider == PROVIDER_PREFIX_OPENROUTER:
            return await self._call_openrouter(prompt, system_prompt=system_prompt)
        return await self._call_gemini(prompt)

    async def _call_gemini(self, prompt: str) -> str:
        """Call Gemini via google.generativeai."""
        if not self.gemini_model:
            return None

        if time.time() < self.rate_limited_until:
            logging.warning(f"Agent {self.name} is rate limited (Gemini).")
            return None

        try:
            response = await self.gemini_model.generate_content_async(prompt)
            if self.consecutive_errors > 0:
                self.consecutive_errors = 0
            return response.text

        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "ResourceExhausted" in error_msg or "Quota" in error_msg:
                self.consecutive_errors += 1
                backoff = min(
                    self.base_backoff * (2 ** (self.consecutive_errors - 1)),
                    self.max_backoff,
                )
                self.rate_limited_until = time.time() + backoff
                logging.error(f"Agent {self.name} hit Gemini rate limit. Backoff {backoff}s.")
            else:
                logging.error(f"Agent {self.name} Gemini error: {e}")
            return None

    async def _call_openrouter(self, prompt: str, system_prompt: str = None) -> str:
        """Call OpenRouter via OpenAI-compatible API (offloaded to thread to avoid blocking)."""
        if not self.openrouter_client:
            return None

        if time.time() < self.rate_limited_until:
            logging.warning(f"Agent {self.name} is rate limited (OpenRouter).")
            return None

        try:
            messages = [
                {"role": "system", "content": system_prompt or f"You are a {self.role}. Output strictly JSON."},
                {"role": "user", "content": prompt}
            ]

            response = await asyncio.to_thread(
                self.openrouter_client.chat.completions.create,
                model=self.model_name,
                messages=messages,
                temperature=0.1,
                max_tokens=1024,
            )

            if self.consecutive_errors > 0:
                self.consecutive_errors = 0

            return response.choices[0].message.content

        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "Rate limit" in error_msg:
                self.consecutive_errors += 1
                backoff = min(
                    self.base_backoff * (2 ** (self.consecutive_errors - 1)),
                    self.max_backoff,
                )
                self.rate_limited_until = time.time() + backoff
                logging.error(f"Agent {self.name} hit OpenRouter rate limit. Backoff {backoff}s.")
            else:
                logging.error(f"Agent {self.name} OpenRouter error: {e}")
            return None

    def _clean_json(self, text: str) -> dict:
        """Attempts to parse JSON from the LLM response."""
        try:
            clean_text = text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except Exception:
            logging.warning(f"Agent {self.name} failed to parse JSON: {text[:50]}...")
            return None
