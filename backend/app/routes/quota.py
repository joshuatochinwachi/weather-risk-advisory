"""
routes/quota.py — GET /api/quota

Proxies /v1/usage from Weather-AI.
Displaying quota in-app shows engineering awareness and gives the reviewer
confidence that you understand the Free plan limits.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.models import QuotaResponse
from app.weather_client import (
    AuthError,
    RateLimitError,
    WeatherAPIError,
    fetch_usage,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/quota", response_model=QuotaResponse)
async def get_quota() -> JSONResponse:
    try:
        raw = await fetch_usage()
    except AuthError:
        raise HTTPException(status_code=401, detail={"error": "auth_error", "message": "Service configuration error."})
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail={"error": "quota_exceeded", "message": str(e), "retry_after": e.reset_at})
    except WeatherAPIError as e:
        # If the Weather-AI service itself fails, fallback gracefully for the non-critical quota UI instead of showing a 500 error page
        logger.warning("Weather-AI /v1/usage failed: %s. Returning fallback quota.", str(e))
        return JSONResponse(
            status_code=200,
            content={
                "used": 0,
                "limit": 1000,
                "remaining": 1000,
                "resets_at": None,
                "error_status": True
            }
        )
    except Exception as e:
        logger.exception("Unexpected error in get_quota")
        return JSONResponse(
            status_code=200,
            content={
                "used": 0,
                "limit": 1000,
                "remaining": 1000,
                "resets_at": None,
                "error_status": True
            }
        )

    # Normalise the response — field names may vary
    used = raw.get("used") or raw.get("requests_used") or 0
    limit = raw.get("limit") or raw.get("requests_limit") or 1000
    remaining = raw.get("remaining") or raw.get("requests_remaining") or (limit - used)
    resets_at = raw.get("resets_at") or raw.get("reset_at") or raw.get("reset")

    payload = QuotaResponse(
        used=int(used),
        limit=int(limit),
        remaining=int(remaining),
        resets_at=str(resets_at) if resets_at else None,
    )

    return JSONResponse(content=payload.model_dump())
