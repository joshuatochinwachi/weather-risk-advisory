"""
config.py — load environment variables for the backend.

All secrets are read from the environment (or a .env file via python-dotenv).
The API key is NEVER returned to the frontend — it stays server-side only.
"""

import os
from dotenv import load_dotenv, find_dotenv

# find_dotenv() searches upward from cwd until it finds a .env file.
# This works whether you run from backend/ or the repo root.
load_dotenv(find_dotenv(usecwd=True, raise_error_if_not_found=False))


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(
            f"Required environment variable '{key}' is not set. "
            f"Copy .env.example to .env and fill it in."
        )
    return value


# Weather-AI API key — kept server-side only, never sent to client
WEATHER_AI_API_KEY: str = _require("WEATHER_AI_API_KEY")

# Base URL for the Weather-AI API
WEATHER_AI_BASE_URL: str = "https://api.weather-ai.co"

# CORS allowed origins — comma-separated list in the env var
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://your-app.vercel.app",
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]
