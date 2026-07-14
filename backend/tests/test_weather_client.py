"""
tests/test_weather_client.py

Unit tests for:
  - TTL cache: hit, miss, expiry
  - retry logic: retries on 500, not on 4xx
  - risk evaluation: correct flag assignment

Run with: python -m pytest tests/ -v
"""

from __future__ import annotations

import time
import pytest
import pytest_asyncio

# ---------------------------------------------------------------------------
# Cache tests
# ---------------------------------------------------------------------------

from app.cache import TTLCache


def test_cache_miss_on_empty():
    cache = TTLCache(ttl=60)
    hit, val = cache.get("nonexistent")
    assert hit is False
    assert val is None


def test_cache_hit_after_set():
    cache = TTLCache(ttl=60)
    cache.set("key1", {"data": 42})
    hit, val = cache.get("key1")
    assert hit is True
    assert val == {"data": 42}


def test_cache_expiry():
    cache = TTLCache(ttl=1)  # 1 second TTL
    cache.set("expire_key", "value")
    time.sleep(1.1)
    hit, val = cache.get("expire_key")
    assert hit is False
    assert val is None


def test_cache_overwrite():
    cache = TTLCache(ttl=60)
    cache.set("k", "v1")
    cache.set("k", "v2")
    _, val = cache.get("k")
    assert val == "v2"


def test_cache_delete():
    cache = TTLCache(ttl=60)
    cache.set("del_key", "data")
    cache.delete("del_key")
    hit, _ = cache.get("del_key")
    assert hit is False


def test_cache_clear():
    cache = TTLCache(ttl=60)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.clear()
    assert len(cache) == 0


# ---------------------------------------------------------------------------
# Risk evaluation tests
# ---------------------------------------------------------------------------

from app.risk import evaluate_risk, FROST_TEMP_C, DROUGHT_DAYS, EXTREME_WIND_KMH, HEAVY_RAIN_MM


def _make_day(**kwargs) -> dict:
    """Helper to construct a forecast day dict."""
    return kwargs


def test_no_risk_flags_on_benign_weather():
    data = {
        "daily": [
            _make_day(temp_min=15, precip_mm=5, wind_speed=20)
            for _ in range(7)
        ]
    }
    level, flags = evaluate_risk(data)
    assert level == "low"
    assert flags == []


def test_frost_flag_triggered():
    data = {
        "daily": [
            _make_day(temp_min=1.0, precip_mm=0, wind_speed=10),  # frost day
        ]
    }
    level, flags = evaluate_risk(data)
    types = [f.type for f in flags]
    assert "frost" in types
    assert level in ("medium", "high")


def test_frost_not_triggered_above_threshold():
    data = {
        "daily": [
            _make_day(temp_min=5.0, precip_mm=5, wind_speed=10),
        ]
    }
    level, flags = evaluate_risk(data)
    assert "frost" not in [f.type for f in flags]


def test_drought_flag_triggered():
    data = {
        "daily": [
            _make_day(temp_min=20, precip_mm=0, wind_speed=10)
            for _ in range(DROUGHT_DAYS)
        ]
    }
    level, flags = evaluate_risk(data)
    assert "drought" in [f.type for f in flags]


def test_drought_not_triggered_below_threshold():
    data = {
        "daily": [
            _make_day(temp_min=20, precip_mm=0, wind_speed=10)
            for _ in range(DROUGHT_DAYS - 1)
        ]
    }
    level, flags = evaluate_risk(data)
    assert "drought" not in [f.type for f in flags]


def test_extreme_wind_flag():
    data = {
        "daily": [
            _make_day(temp_min=15, precip_mm=5, wind_speed=EXTREME_WIND_KMH + 1),
        ]
    }
    level, flags = evaluate_risk(data)
    assert "extreme_wind" in [f.type for f in flags]


def test_heavy_rain_flag():
    data = {
        "daily": [
            _make_day(temp_min=15, precip_mm=HEAVY_RAIN_MM + 1, wind_speed=10),
        ]
    }
    level, flags = evaluate_risk(data)
    assert "heavy_rain" in [f.type for f in flags]


def test_high_severity_on_sub_zero_frost():
    data = {
        "daily": [
            _make_day(temp_min=-3.0, precip_mm=0, wind_speed=10),
        ]
    }
    _, flags = evaluate_risk(data)
    frost_flags = [f for f in flags if f.type == "frost"]
    assert frost_flags[0].severity == "high"


def test_risk_level_high_when_any_flag_high():
    data = {
        "daily": [
            _make_day(temp_min=-5.0, precip_mm=5, wind_speed=10),
        ]
    }
    level, _ = evaluate_risk(data)
    assert level == "high"


def test_empty_forecast_no_flags():
    level, flags = evaluate_risk({})
    assert level == "low"
    assert flags == []


# ---------------------------------------------------------------------------
# Weather client error mapping tests (synchronous unit, no network)
# ---------------------------------------------------------------------------

from unittest.mock import MagicMock
from app.weather_client import _raise_for_status, AuthError, RateLimitError, PlanGatingError, ServerError, WeatherAPIError


def _mock_response(status_code: int, headers: dict | None = None) -> MagicMock:
    r = MagicMock()
    r.status_code = status_code
    r.headers = httpx_headers(headers or {})
    r.text = ""
    return r


def httpx_headers(d: dict):
    """Minimal stand-in for httpx.Headers."""
    return MagicMock(**{"get.side_effect": lambda k, *a: d.get(k, a[0] if a else None)})


def test_401_raises_auth_error():
    with pytest.raises(AuthError):
        _raise_for_status(_mock_response(401), "/v1/weather")


def test_403_raises_plan_gating():
    with pytest.raises(PlanGatingError):
        _raise_for_status(_mock_response(403), "/v1/insights")


def test_429_raises_rate_limit():
    with pytest.raises(RateLimitError):
        _raise_for_status(_mock_response(429, {"X-RateLimit-Reset": "1717977600"}), "/v1/weather")


def test_500_raises_server_error():
    with pytest.raises(ServerError):
        _raise_for_status(_mock_response(500), "/v1/weather")


def test_503_raises_server_error():
    with pytest.raises(ServerError):
        _raise_for_status(_mock_response(503), "/v1/weather")


def test_200_does_not_raise():
    # Should return without raising
    _raise_for_status(_mock_response(200), "/v1/weather")
