"""
routes/weather.py — GET /api/weather

Flow:
  1. Validate lat/lon with Pydantic (FastAPI does this automatically)
  2. Build cache key (lat/lon rounded to 2dp to avoid noise-level misses)
  3. Cache hit → return immediately with cached=True
  4. Cache miss → call Weather-AI, apply risk logic, cache result, return
  5. All errors are caught and returned as typed JSON, never a stack trace
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.cache import weather_cache
from app.models import LocationInfo, RiskAssessmentResponse
from app.risk import evaluate_risk
from app.weather_client import (
    AuthError,
    PlanGatingError,
    RateLimitError,
    ServerError,
    WeatherAPIError,
    fetch_weather,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _build_cache_key(lat: float, lon: float, days: int, units: str, lang: str) -> str:
    """
    Round lat/lon to 2 decimal places before keying.
    This avoids cache misses caused by noise-level coordinate differences
    (e.g., 36.8219 vs 36.8221 are the same location for weather purposes).
    """
    return f"{lat:.2f}:{lon:.2f}:{days}:{units}:{lang}"


def _extract_location(data: dict, lat: float, lon: float) -> LocationInfo:
    """Extract city/country from response if present."""
    loc = data.get("location") or data.get("city") or {}
    if isinstance(loc, dict):
        return LocationInfo(
            lat=lat,
            lon=lon,
            city=loc.get("name") or loc.get("city"),
            country=loc.get("country"),
        )
    return LocationInfo(lat=lat, lon=lon)


def _extract_ai_summary(data: dict) -> str | None:
    """Try several common field names for the AI-generated summary."""
    for key in ("ai_summary", "summary", "ai_analysis", "gemini_summary", "analysis"):
        val = data.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


@router.get("/weather", response_model=RiskAssessmentResponse)
async def get_weather(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    days: int = Query(7, ge=1, le=7, description="Forecast days (1-7)"),
    units: str = Query("metric", pattern="^(metric|imperial)$"),
    lang: str = Query("en", max_length=5),
) -> JSONResponse:
    cache_key = _build_cache_key(lat, lon, days, units, lang)

    # --- Cache check --------------------------------------------------------
    hit, cached_payload = weather_cache.get(cache_key)
    if hit:
        logger.info("Cache HIT for key=%s", cache_key)
        cached_payload["cached"] = True
        return JSONResponse(content=cached_payload)

    logger.info("Cache MISS for key=%s — fetching from Weather-AI", cache_key)

    # --- Fetch from Weather-AI ---------------------------------------------
    try:
        raw = await fetch_weather(lat=lat, lon=lon, days=days, units=units, lang=lang)
    except RateLimitError as e:
        raise HTTPException(
            status_code=429,
            detail={"error": "quota_exceeded", "message": str(e), "retry_after": e.reset_at},
        )
    except AuthError as e:
        raise HTTPException(status_code=401, detail={"error": "auth_error", "message": "Service configuration error. Please contact support."})
    except PlanGatingError as e:
        raise HTTPException(status_code=403, detail={"error": "plan_gating", "message": str(e)})
    except ServerError as e:
        raise HTTPException(
            status_code=502,
            detail={"error": "upstream_error", "message": "Weather service unavailable. Please try again shortly."},
        )
    except WeatherAPIError as e:
        raise HTTPException(status_code=502, detail={"error": "api_error", "message": str(e)})

    # --- Apply risk logic ---------------------------------------------------
    risk_level, flags = evaluate_risk(raw)

    # --- Build response -----------------------------------------------------
    location = _extract_location(raw, lat, lon)
    ai_summary = _extract_ai_summary(raw)
    forecast = raw.get("daily") or raw.get("forecast") or raw.get("days") or []

    payload = RiskAssessmentResponse(
        location=location,
        risk_level=risk_level,
        flags=flags,
        ai_summary=ai_summary,
        forecast=forecast,
        cached=False,
        fetched_at=datetime.now(tz=timezone.utc).isoformat(),
    ).model_dump()

    # --- Store in cache (store without cached flag — it's set on retrieval) -
    weather_cache.set(cache_key, payload)

    return JSONResponse(content=payload)
