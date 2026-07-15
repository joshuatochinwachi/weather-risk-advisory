"""
main.py — FastAPI application entry point.

CORS is configured here, not in a route, not in a middleware function —
here, before any other setup, so integration issues surface immediately.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import ALLOWED_ORIGINS
from app.routes import geo, quota, weather

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Weather Risk Advisory API",
    description="Proxies Weather-AI data, applies agronomic risk logic, protects your API key.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — configured before route registration (do not move this)
# Set this up before writing a single frontend fetch call.
# CORS failures at integration time are the single most common cause of
# blown deadlines on exactly this kind of project.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
app.include_router(weather.router, prefix="/api")
app.include_router(quota.router, prefix="/api")
app.include_router(geo.router, prefix="/api")


# ---------------------------------------------------------------------------
# Global exception handler — never leak a stack trace to the client
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s: %s", request.url, exc)
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "message": "An unexpected error occurred. Please try again."},
    )


# ---------------------------------------------------------------------------
# Health check — Railway uses this to confirm the app is up
# ---------------------------------------------------------------------------
@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/")
async def root() -> dict:
    return {"name": "Weather Risk Advisory API", "version": "1.0.0", "docs": "/docs"}


# ---------------------------------------------------------------------------
# Entry point — allows running directly: python app/main.py
# uvicorn is imported here (not at module top) so the app stays importable
# in tests without uvicorn needing to be on PATH.
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    import os as _os

    _port = int(_os.getenv("PORT", "8000"))
    _dev = _os.getenv("RAILWAY_ENVIRONMENT") is None  # reload only when running locally

    # Run with: python -m app.main  (from the backend/ directory)
    # The -m flag ensures backend/ is on sys.path so `from app.xxx` imports resolve.
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=_port,
        reload=_dev,
        reload_dirs=["app"] if _dev else [],
    )
