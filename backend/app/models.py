"""
models.py — Pydantic request/response models.

These define the contract between the frontend and this backend.
They are deliberately separate from the raw Weather-AI response shape
so that we can evolve our API independently.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class WeatherQuery(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude (-90 to 90)")
    lon: float = Field(..., ge=-180, le=180, description="Longitude (-180 to 180)")
    days: int = Field(7, ge=1, le=7, description="Forecast days (1-7, Free plan cap)")
    units: Literal["metric", "imperial"] = Field("metric")
    lang: str = Field("en", max_length=5)


# ---------------------------------------------------------------------------
# Risk models
# ---------------------------------------------------------------------------


class RiskFlag(BaseModel):
    type: Literal["frost", "drought", "extreme_wind", "heavy_rain"]
    severity: Literal["low", "medium", "high"]
    detail: str  # Human-readable explanation shown in the UI


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class LocationInfo(BaseModel):
    lat: float
    lon: float
    city: str | None = None
    country: str | None = None


class DailyForecast(BaseModel):
    date: str
    temp_min: float | None = None
    temp_max: float | None = None
    precip_mm: float | None = None
    wind_speed_kmh: float | None = None
    condition: str | None = None
    icon: str | None = None


class RiskAssessmentResponse(BaseModel):
    location: LocationInfo
    risk_level: Literal["low", "medium", "high"]
    flags: list[RiskFlag]
    ai_summary: str | None = None  # From Weather-AI's Gemini summary field
    forecast: list[dict[str, Any]]  # Pass-through daily forecast array
    current: dict[str, Any] | None = None  # Current conditions from Weather-AI
    hourly: list[dict[str, Any]] | None = None  # Hourly forecast array from Weather-AI
    cached: bool  # Was this served from cache — honest signal
    fetched_at: str  # ISO 8601 timestamp


class QuotaResponse(BaseModel):
    used: int
    limit: int
    remaining: int
    resets_at: str | None = None  # ISO timestamp or human-readable
    error_status: bool | None = None


# ---------------------------------------------------------------------------
# Error model (returned as JSON body alongside 4xx/5xx status codes)
# ---------------------------------------------------------------------------


class ErrorResponse(BaseModel):
    error: str
    code: int
    detail: str | None = None
    retry_after: str | None = None  # Populated on 429 — "try again at <time>"
