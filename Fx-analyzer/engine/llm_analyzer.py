import os
import logging
import time
import json
import requests
from dotenv import load_dotenv

# Optional imports handled gracefully
try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    from groq import Groq
except ImportError:
    Groq = None

# Load environment variables
load_dotenv()

class LLMAnalyzer:
    """
    Analyzes market data using multiple Cloud LLM providers.
    Supports: OpenRouter (free models), DeepSeek (Reasoner), Groq (Llama3/Mixtral), Gemini (Flash).
    """
    def __init__(self):
        self.cache = {} # (symbol, action) -> {data, timestamp}
        self.provider = "openrouter" # Default
        self.model_name = "google/gemma-4-26b-a4b-it:free" # Default
        
        # API Keys
        self.keys = {
            "deepseek": os.getenv("DEEPSEEK_API_KEY"),
            "groq": os.getenv("GROQ_API_KEY"),
            "gemini": os.getenv("GEMINI_API_KEY"),
            "openrouter": os.getenv("OPENROUTER_API_KEY")
        }
        
        # Initialize Clients
        self.clients = {}
        self._init_clients()

        # Available Models Map (High Reasoning & Latest)
        self.available_models = {
            "OpenRouter Gemma 4 26B (Free)": {"provider": "openrouter", "model": "google/gemma-4-26b-a4b-it:free"},
            "OpenRouter Gemma 4 31B (Free)": {"provider": "openrouter", "model": "google/gemma-4-31b-it:free"},
            "OpenRouter Llama 3.3 70B (Free)": {"provider": "openrouter", "model": "meta-llama/llama-3.3-70b-instruct:free"},
            "OpenRouter Nemotron 3 Super 120B (Free)": {"provider": "openrouter", "model": "nvidia/nemotron-3-super-120b-a12b:free"},
            "OpenRouter Qwen3 Next 80B (Free)": {"provider": "openrouter", "model": "qwen/qwen3-next-80b-a3b-instruct:free"},
            "DeepSeek Reasoner (R1)": {"provider": "deepseek", "model": "deepseek-reasoner"},
            "Groq Llama 3.3 70B": {"provider": "groq", "model": "llama-3.3-70b-versatile"},
            "Groq DeepSeek R1 Distill": {"provider": "groq", "model": "deepseek-r1-distill-llama-70b"},
            "Gemini 1.5 Pro": {"provider": "gemini", "model": "gemini-1.5-pro"},
        }
        
        # Set initial valid model
        self.set_model("OpenRouter Gemma 4 26B (Free)")

    def _init_clients(self):
        """Initialize API clients based on available keys."""
        # OpenRouter (OpenAI Compatible)
        if self.keys["openrouter"] and OpenAI:
            try:
                self.clients["openrouter"] = OpenAI(api_key=self.keys["openrouter"], base_url="https://openrouter.ai/api/v1")
                logging.info("OpenRouter Client Initialized")
            except Exception as e: logging.error(f"OpenRouter Init Error: {e}")

        # DeepSeek (OpenAI Compatible)
        if self.keys["deepseek"] and OpenAI:
            try:
                self.clients["deepseek"] = OpenAI(api_key=self.keys["deepseek"], base_url="https://api.deepseek.com")
                logging.info("DeepSeek Client Initialized")
            except Exception as e: logging.error(f"DeepSeek Init Error: {e}")

        # Groq
        if self.keys["groq"] and Groq:
            try:
                self.clients["groq"] = Groq(api_key=self.keys["groq"])
                logging.info("Groq Client Initialized")
            except Exception as e: logging.error(f"Groq Init Error: {e}")

        # Gemini
        if self.keys["gemini"] and genai:
            try:
                genai.configure(api_key=self.keys["gemini"])
                self.clients["gemini"] = True # Gemini uses global config/static methods mostly, or genai.GenerativeModel
                logging.info("Gemini Client Initialized")
            except Exception as e: logging.error(f"Gemini Init Error: {e}")

    def get_available_models(self):
        """Returns list of models where the provider is configured."""
        available = []
        for friendly_name, config in self.available_models.items():
            if self.clients.get(config["provider"]):
                available.append(friendly_name)
        
        if not available:
            return ["No Providers Configured"]
        return available

    def set_model(self, friendly_name: str):
        """Sets the active provider and model."""
        if friendly_name not in self.available_models:
            # Fallback to first available if possible
            available = self.get_available_models()
            if available and available[0] != "No Providers Configured":
                friendly_name = available[0]
            else:
                logging.warning(f"Model {friendly_name} unavailable and no fallbacks.")
                return False

        config = self.available_models[friendly_name]
        self.provider = config["provider"]
        self.model_name = config["model"]
        logging.info(f"Switched to {friendly_name} ({self.provider}/{self.model_name})")
        return True

    def analyze_signal(self, symbol: str, action: str, technical_context: dict) -> dict:
        """Route analysis to the active provider."""
        client = self.clients.get(self.provider)
        if not client:
            return self._get_fallback_response(symbol, action, technical_context, reason=f"{self.provider} Config Missing")

        prompt = self._construct_prompt(symbol, action, technical_context)
        start_time = time.time()
        
        try:
            raw_response = ""
            
            # --- OpenRouter Execution ---
            if self.provider == "openrouter":
                response = client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": "You are a specialized Forex Analyst. Output strictly JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=1024
                )
                raw_response = response.choices[0].message.content

            # --- DeepSeek Execution ---
            elif self.provider == "deepseek":
                response = client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": "You are a specialized Forex Analyst. Output strictly JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    stream=False
                )
                raw_response = response.choices[0].message.content

            # --- Groq Execution ---
            elif self.provider == "groq":
                response = client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": "You are a specialized Forex Analyst. Output strictly JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=1024
                )
                raw_response = response.choices[0].message.content

            # --- Gemini Execution ---
            elif self.provider == "gemini":
                model = genai.GenerativeModel(self.model_name)
                response = model.generate_content(prompt)
                raw_response = response.text

            duration = time.time() - start_time
            logging.info(f"Analysis via {self.provider} took {duration:.2f}s")
            
            return self._parse_response(raw_response)

        except Exception as e:
            logging.error(f"Analysis Error ({self.provider}): {e}")
            return self._get_fallback_response(symbol, action, technical_context, reason=f"{self.provider} Error")

    def _construct_prompt(self, symbol, action, context):
        return f"""
        Analyze this Forex setup and output valid JSON only.
        
        Setup:
        - Pair: {symbol}
        - Action: {action}
        - Trend: {context.get('trend')}
        - RSI: {context.get('rsi')}
        - Price: {context.get('price')}
        
        Required JSON Structure:
        {{
            "logic": "One sentence reasoning.",
            "confidence": 0.85, (Float 0.0-1.0)
            "risk": "Short phrase risk factor."
        }}
        """

    def _parse_response(self, text):
        try:
            # Clean Markdown
            cleaned = text.replace('```json', '').replace('```', '').strip()
            # Handle DeepSeek <think> blocks if present (though 'reasoner' model separates them, chat might not)
            if "</think>" in cleaned:
                cleaned = cleaned.split("</think>")[-1].strip()
                
            data = json.loads(cleaned)
            return {
                "reasoning": data.get("logic", "Analysis delivered."),
                "confidence_score": float(data.get("confidence", 0.5)),
                "risk_assessment": data.get("risk", "Unknown")
            }
        except Exception:
            return {
                "reasoning": "Raw Analysis: " + text[:100] + "...",
                "confidence_score": 0.6,
                "risk_assessment": "Parse Error"
            }

    def _get_fallback_response(self, symbol, action, context, reason="Fallback"):
        trend_desc = "bullish" if action == "BUY" else "bearish"
        return {
            "reasoning": f"Technical momentum is {trend_desc}. {reason}.",
            "confidence_score": 0.5,
            "risk_assessment": f"Medium ({reason})"
        }
