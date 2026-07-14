"""
routes/trees.py — POST /api/trees

Multipart passthrough to /v1/trees/analyze.
Available on all plans (5 analyses/month on Free).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from app.models import TreeAnalysisResult
from app.weather_client import (
    AuthError,
    PlanGatingError,
    RateLimitError,
    WeatherAPIError,
    post_trees_analyze,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Max image size: 10MB
MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}


@router.post("/trees")
async def analyze_trees(image: UploadFile = File(...)) -> JSONResponse:
    # Validate file type
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_file", "message": f"Unsupported file type '{image.content_type}'. Use JPEG, PNG, or WebP."},
        )

    # Read and size-check
    image_bytes = await image.read()
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=400,
            detail={"error": "file_too_large", "message": "Image must be under 10MB."},
        )

    try:
        raw = await post_trees_analyze(
            image_bytes=image_bytes,
            filename=image.filename or "farm.jpg",
            content_type=image.content_type,
        )
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail={"error": "quota_exceeded", "message": str(e), "retry_after": e.reset_at})
    except AuthError:
        raise HTTPException(status_code=401, detail={"error": "auth_error", "message": "Service configuration error."})
    except PlanGatingError as e:
        raise HTTPException(status_code=403, detail={"error": "plan_gating", "message": str(e)})
    except WeatherAPIError as e:
        raise HTTPException(status_code=502, detail={"error": "api_error", "message": str(e)})

    # Normalise response
    result = TreeAnalysisResult(
        total_tree_count=raw.get("total_tree_count") or raw.get("tree_count") or raw.get("trees"),
        canopy_coverage_pct=raw.get("canopy_coverage_pct") or raw.get("canopy_coverage") or raw.get("coverage_pct"),
        health_status=raw.get("health_status") or raw.get("health") or raw.get("canopy_health"),
        overlay_image_url=raw.get("overlay_image_url") or raw.get("overlay_url") or raw.get("image_url"),
        raw=raw,
    )

    return JSONResponse(content=result.model_dump())
