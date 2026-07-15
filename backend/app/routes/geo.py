"""
routes/geo.py — GET /api/weather-geo

Flow:
  1. Determine user's client IP.
  2. Cache hit → return immediately with cached=True
  3. Cache miss → call Weather-AI /v1/weather-geo, evaluate risk, cache, return
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request
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
    fetch_weather_geo,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _build_geo_cache_key(ip: str, days: int, units: str, lang: str) -> str:
    return f"geo:{ip}:{days}:{units}:{lang}"


def _extract_location(data: dict) -> LocationInfo:
    """Extract resolved geolocation coords and city/country from response."""
    loc = data.get("location") or data.get("city") or {}
    lat = 0.0
    lon = 0.0
    
    # Try resolving coordinates returned by weather-geo
    for key in ("lat", "latitude"):
        if key in data:
            lat = float(data[key])
        elif key in loc:
            lat = float(loc[key])

    for key in ("lon", "lng", "longitude"):
        if key in data:
            lon = float(data[key])
        elif key in loc:
            lon = float(loc[key])

    if isinstance(loc, dict):
        return LocationInfo(
            lat=lat,
            lon=lon,
            city=loc.get("name") or loc.get("city") or data.get("city"),
            country=loc.get("country") or data.get("country"),
        )
    return LocationInfo(lat=lat, lon=lon)


def _extract_ai_summary(data: dict) -> str | None:
    """Try several common field names for the AI-generated summary."""
    for key in ("ai_summary", "summary", "ai_analysis", "gemini_summary", "analysis"):
        val = data.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


@router.get("/weather-geo", response_model=RiskAssessmentResponse)
async def get_weather_geo(
    request: Request,
    ip: str = Query("auto", description="IP address or 'auto'"),
    days: int = Query(7, ge=1, le=7, description="Forecast days (1-7)"),
    units: str = Query("metric", pattern="^(metric|imperial)$"),
    lang: str = Query("en", max_length=5),
) -> JSONResponse:
    # Resolve client IP
    if ip == "auto":
        forwarded_for = request.headers.get("x-forwarded-for")
        real_ip = request.headers.get("x-real-ip")
        if forwarded_for:
            ip = forwarded_for.split(",")[0].strip()
        elif real_ip:
            ip = real_ip
        else:
            ip = request.client.host if request.client else "auto"

        # Fallback for local development environments
        if ip in ("127.0.0.1", "localhost", "::1", "testclient"):
            # Default to a Kenyan IP in Nairobi to facilitate local development testing
            ip = "102.222.144.0"

    cache_key = _build_geo_cache_key(ip, days, units, lang)

    # --- Cache check --------------------------------------------------------
    hit, cached_payload = weather_cache.get(cache_key)
    if hit:
        logger.info("Geo-Cache HIT for key=%s", cache_key)
        cached_payload["cached"] = True
        return JSONResponse(content=cached_payload)

    logger.info("Geo-Cache MISS for key=%s — fetching /v1/weather-geo", cache_key)

    # --- Fetch from Weather-AI ---------------------------------------------
    try:
        raw = await fetch_weather_geo(ip=ip, days=days, units=units, lang=lang)
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
    location = _extract_location(raw)
    ai_summary = _extract_ai_summary(raw)
    forecast = raw.get("daily") or raw.get("forecast") or raw.get("days") or []
    current = raw.get("current") or raw.get("current_weather")
    hourly = raw.get("hourly") or raw.get("hours") or []

    payload = RiskAssessmentResponse(
        location=location,
        risk_level=risk_level,
        flags=flags,
        ai_summary=ai_summary,
        forecast=forecast,
        current=current,
        hourly=hourly,
        cached=False,
        fetched_at=datetime.now(tz=timezone.utc).isoformat(),
    ).model_dump()

    # --- Store in cache -----------------------------------------------------
    weather_cache.set(cache_key, payload)

    return JSONResponse(content=payload)
