"""
cache.py — simple in-memory TTL cache.

Why in-memory and not Redis?
  - The Free plan allows 1,000 req/mo. Without caching, aggressive testing
    by either developer or reviewer could exhaust quota before the demo is seen.
  - A 10-minute TTL means weather data is fresh enough for a demo while
    providing real protection against redundant API calls.
  - No external infra needed — keeps Railway deployment dead-simple.
"""

import time
from threading import Lock
from typing import Any

# Cache TTL in seconds (10 minutes)
DEFAULT_TTL: int = 600


class TTLCache:
    """
    Thread-safe in-memory cache with per-entry TTL.

    Keys are plain strings; values can be any Python object.
    Expired entries are evicted lazily on read.
    """

    def __init__(self, ttl: int = DEFAULT_TTL) -> None:
        self._ttl = ttl
        self._store: dict[str, tuple[Any, float]] = {}  # key → (value, expires_at)
        self._lock = Lock()

    def get(self, key: str) -> tuple[bool, Any]:
        """
        Return (hit, value).  hit=False means the key is absent or expired.
        """
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return False, None
            value, expires_at = entry
            if time.time() > expires_at:
                del self._store[key]
                return False, None
            return True, value

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        effective_ttl = ttl if ttl is not None else self._ttl
        with self._lock:
            self._store[key] = (value, time.time() + effective_ttl)

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._store)


# Module-level singleton shared across the application
weather_cache = TTLCache(ttl=DEFAULT_TTL)
