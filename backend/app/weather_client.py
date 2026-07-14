"""
weather_client.py — httpx async client for the Weather-AI API.

Engineering decisions:
  - Retry only on 500/503 (server errors).  Never retry 4xx — those are
    caller errors and retrying wastes quota.
  - Exponential backoff: 1s → 2s → 4s, max 3 attempts.
  - Cache check happens BEFORE this client is called (in the route handler).
    This module is purely responsible for making the raw HTTP call safely.
  - Rate-limit headers (X-RateLimit-*) are captured and surfaced in raised
    exceptions so the route layer can return useful messages to the frontend.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from app.config import WEATHER_AI_API_KEY, WEATHER_AI_BASE_URL

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exceptions — typed errors so callers can react specifically
# ---------------------------------------------------------------------------


class WeatherAPIError(Exception):
    """Base class for all Weather-AI API errors."""
    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.status_code = status_code


class RateLimitError(WeatherAPIError):
    """Raised on HTTP 429.  Includes the reset timestamp."""
    def __init__(self, reset_at: str | None = None) -> None:
        self.reset_at = reset_at
        msg = f"Weather-AI quota exceeded. Try again at {reset_at}." if reset_at else "Weather-AI quota exceeded."
        super().__init__(msg, status_code=429)


class AuthError(WeatherAPIError):
    """Raised on HTTP 401 — bad or revoked key."""
    def __init__(self) -> None:
        super().__init__("Invalid or revoked API key.", status_code=401)


class PlanGatingError(WeatherAPIError):
    """Raised on HTTP 403 — endpoint not on current plan."""
    def __init__(self, endpoint: str = "") -> None:
        super().__init__(
            f"Endpoint {endpoint!r} is not available on the current Weather-AI plan.",
            status_code=403,
        )


class ServerError(WeatherAPIError):
    """Raised on 500/503 after all retries are exhausted."""
    def __init__(self, status_code: int = 500) -> None:
        super().__init__(
            "Weather-AI server error. Please try again in a moment.",
            status_code=status_code,
        )


# ---------------------------------------------------------------------------
# Retry predicate — only retry on server errors, never on 4xx
# ---------------------------------------------------------------------------

def _is_server_error(exc: BaseException) -> bool:
    return isinstance(exc, ServerError)


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------

_HEADERS = {
    "Authorization": f"Bearer {WEATHER_AI_API_KEY}",
    "Accept": "application/json",
}


def _parse_rate_limit_reset(headers: httpx.Headers) -> str | None:
    """Convert X-RateLimit-Reset (unix epoch) to a human-readable ISO string."""
    raw = headers.get("X-RateLimit-Reset")
    if raw:
        try:
            ts = int(raw)
            dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            return dt.isoformat()
        except (ValueError, OSError):
            return raw
    return None


def _raise_for_status(response: httpx.Response, endpoint: str) -> None:
    """Map HTTP status codes to typed exceptions."""
    if response.status_code == 401:
        logger.error("Weather-AI returned 401 — check API key. Endpoint: %s", endpoint)
        raise AuthError()
    if response.status_code == 403:
        logger.warning("Weather-AI returned 403 — plan gating. Endpoint: %s", endpoint)
        raise PlanGatingError(endpoint)
    if response.status_code == 429:
        reset_at = _parse_rate_limit_reset(response.headers)
        logger.warning("Weather-AI quota exceeded. Resets at: %s", reset_at)
        raise RateLimitError(reset_at=reset_at)
    if response.status_code == 404:
        logger.warning("Weather-AI 404 on endpoint: %s — endpoint may not exist or path differs", endpoint)
        raise WeatherAPIError(
            f"Endpoint '{endpoint}' not found. It may not be available on this plan or the path has changed.",
            status_code=404,
        )
    if response.status_code in (500, 503):
        logger.warning("Weather-AI server error %d. Will retry.", response.status_code)
        raise ServerError(status_code=response.status_code)
    if response.status_code >= 400:
        logger.error(
            "Weather-AI unexpected %d on %s: %s",
            response.status_code,
            endpoint,
            response.text[:200],
        )
        raise WeatherAPIError(
            f"Unexpected error from Weather-AI ({response.status_code}).",
            status_code=response.status_code,
        )


@retry(
    retry=retry_if_exception(_is_server_error),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def _get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    """
    Make an authenticated GET to Weather-AI with retry on 500/503.
    Returns parsed JSON dict on success.
    """
    url = f"{WEATHER_AI_BASE_URL}{path}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        logger.info("GET %s params=%s", url, params)
        try:
            response = await client.get(url, params=params, headers=_HEADERS)
        except httpx.ConnectError as e:
            raise WeatherAPIError(
                f"Cannot reach Weather-AI API ({e}). Check network connectivity.",
                status_code=503,
            ) from e
        except httpx.TimeoutException as e:
            raise WeatherAPIError(
                "Weather-AI API request timed out. Please try again.",
                status_code=504,
            ) from e
        _raise_for_status(response, path)
        return response.json()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def fetch_weather(
    lat: float,
    lon: float,
    days: int = 7,
    units: str = "metric",
    lang: str = "en",
) -> dict[str, Any]:
    """Fetch weather + AI summary from /v1/weather."""
    return await _get(
        "/v1/weather",
        {
            "lat": lat,
            "lon": lon,
            "days": days,
            "ai": "true",
            "units": units,
            "lang": lang,
        },
    )


async def fetch_usage() -> dict[str, Any]:
    """Fetch quota/usage data from /v1/usage."""
    return await _get("/v1/usage", {})


async def post_trees_analyze(image_bytes: bytes, filename: str, content_type: str) -> dict[str, Any]:
    """
    POST a farm image to /v1/trees/analyze (multipart).
    Not retried — image uploads are expensive on the quota.
    """
    url = f"{WEATHER_AI_BASE_URL}/v1/trees/analyze"
    async with httpx.AsyncClient(timeout=60.0) as client:
        files = {"image": (filename, image_bytes, content_type)}
        logger.info("POST %s filename=%s", url, filename)
        response = await client.post(url, files=files, headers=_HEADERS)
        _raise_for_status(response, "/v1/trees/analyze")
        return response.json()
