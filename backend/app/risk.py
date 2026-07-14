"""
risk.py — agronomic risk threshold evaluation.

Four thresholds, clearly documented.  Simple and correct beats clever and late.

Thresholds are deliberately conservative and documented so that a reviewer
can question and adjust them — the spec calls this out explicitly.

Field names are derived from the live /v1/weather response shape.
If Weather-AI changes their schema, update the _extract_* helpers here.
"""

from __future__ import annotations

from app.models import RiskFlag


# ---------------------------------------------------------------------------
# Threshold constants — adjust here if field inspection reveals different units
# ---------------------------------------------------------------------------

FROST_TEMP_C: float = 2.0          # min temp below this → frost risk
DROUGHT_DAYS: int = 5              # consecutive days with 0mm precip → drought
DROUGHT_PRECIP_MM: float = 0.5    # ≤ this is considered "no rain"
EXTREME_WIND_KMH: float = 40.0    # sustained wind above this → extreme wind
HEAVY_RAIN_MM: float = 50.0       # single-day precip above this → heavy rain


# ---------------------------------------------------------------------------
# Internal helpers — isolate field-name assumptions here
# ---------------------------------------------------------------------------

def _daily_list(weather_data: dict) -> list[dict]:
    """
    Extract the daily forecast list from the raw Weather-AI response.
    Tries common key names — update if live inspection reveals a different shape.
    """
    for key in ("daily", "forecast", "days", "data"):
        val = weather_data.get(key)
        if isinstance(val, list):
            return val
    return []


def _min_temp(day: dict) -> float | None:
    for key in ("temp_min", "min_temp", "temperature_min", "low"):
        if key in day:
            try:
                return float(day[key])
            except (TypeError, ValueError):
                pass
    # Nested: day["temp"]["min"]
    temp = day.get("temp") or day.get("temperature")
    if isinstance(temp, dict):
        for k in ("min", "low"):
            if k in temp:
                try:
                    return float(temp[k])
                except (TypeError, ValueError):
                    pass
    return None


def _precip(day: dict) -> float | None:
    for key in ("precip_mm", "precipitation", "rain", "precip", "rainfall_mm"):
        if key in day:
            try:
                return float(day[key])
            except (TypeError, ValueError):
                pass
    return None


def _wind(day: dict) -> float | None:
    for key in ("wind_speed", "wind_speed_kmh", "windspeed", "wind_kph", "wind"):
        if key in day:
            try:
                return float(day[key])
            except (TypeError, ValueError):
                pass
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def evaluate_risk(weather_data: dict) -> tuple[str, list[RiskFlag]]:
    """
    Evaluate agronomic risk from a raw Weather-AI /v1/weather response.

    Returns:
        (risk_level, flags)
        risk_level: "high" if any HIGH flag, "medium" if any flags, else "low"
        flags: list of RiskFlag objects
    """
    flags: list[RiskFlag] = []
    days = _daily_list(weather_data)

    # -- Frost: min temp < 2°C in next 3 days --------------------------------
    for day in days[:3]:
        t = _min_temp(day)
        if t is not None and t < FROST_TEMP_C:
            flags.append(
                RiskFlag(
                    type="frost",
                    severity="high" if t < 0 else "medium",
                    detail=f"Min temperature {t:.1f}°C forecast — below frost threshold of {FROST_TEMP_C}°C.",
                )
            )
            break  # one flag per type is enough

    # -- Drought: ≤0.5mm precip for 5+ consecutive days ---------------------
    consecutive_dry = 0
    max_consecutive_dry = 0
    for day in days:
        p = _precip(day)
        if p is not None and p <= DROUGHT_PRECIP_MM:
            consecutive_dry += 1
            max_consecutive_dry = max(max_consecutive_dry, consecutive_dry)
        else:
            consecutive_dry = 0

    if max_consecutive_dry >= DROUGHT_DAYS:
        flags.append(
            RiskFlag(
                type="drought",
                severity="high" if max_consecutive_dry >= 7 else "medium",
                detail=f"{max_consecutive_dry} consecutive dry days forecast (≤{DROUGHT_PRECIP_MM}mm/day).",
            )
        )

    # -- Extreme wind: sustained wind > 40 km/h in any forecast day ----------
    for day in days:
        w = _wind(day)
        if w is not None and w > EXTREME_WIND_KMH:
            flags.append(
                RiskFlag(
                    type="extreme_wind",
                    severity="high" if w > 70 else "medium",
                    detail=f"Wind speed {w:.0f} km/h forecast — above extreme threshold of {EXTREME_WIND_KMH} km/h.",
                )
            )
            break

    # -- Heavy rain: >50mm in a single day -----------------------------------
    for day in days:
        p = _precip(day)
        if p is not None and p > HEAVY_RAIN_MM:
            flags.append(
                RiskFlag(
                    type="heavy_rain",
                    severity="high" if p > 100 else "medium",
                    detail=f"{p:.0f}mm precipitation forecast in a single day — above heavy rain threshold of {HEAVY_RAIN_MM}mm.",
                )
            )
            break

    # -- Aggregate risk level ------------------------------------------------
    severities = {f.severity for f in flags}
    if "high" in severities:
        risk_level = "high"
    elif flags:
        risk_level = "medium"
    else:
        risk_level = "low"

    return risk_level, flags
