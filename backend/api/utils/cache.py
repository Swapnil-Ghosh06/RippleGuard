# -*- coding: utf-8 -*-
"""
Thread-Safe In-Memory Caching Layer for RippleGuard.

This module provides a pure Python thread-safe in-memory caching mechanism with TTL (Time-To-Live).
It prevents re-fetching external API data (npm, PyPI, deps.dev, OSV) during live demo queries
when judges analyze the same package multiple times.

Cache Key Format:
    "{ecosystem}:{package}:{version}:{depth}"
    Example: "npm:express:4.18.2:3"

Default TTL:
    300 seconds (5 minutes)

Concurrency Safety:
    Protected by a threading.Lock() to guarantee thread-safe operations across FastAPI worker threads.
"""

import time
import threading
from typing import Any, Dict, Optional

_CACHE: Dict[str, dict] = {}
_LOCK = threading.Lock()


def cache_get(key: str) -> Optional[Any]:
    """
    Retrieves data from cache for the given key.
    Deletes the key and returns None if the entry has expired.
    Returns None if key is not found.
    """
    with _LOCK:
        if key not in _CACHE:
            return None

        entry = _CACHE[key]
        if time.time() > entry["expires_at"]:
            del _CACHE[key]
            return None

        return entry["data"]


def cache_set(key: str, data: Any, ttl_seconds: int = 300) -> None:
    """
    Stores data in cache under the specified key with a TTL in seconds.
    """
    with _LOCK:
        _CACHE[key] = {
            "data": data,
            "expires_at": time.time() + ttl_seconds
        }


def cache_delete(key: str) -> None:
    """
    Deletes a specific key from the cache. Silently ignores if key does not exist.
    """
    with _LOCK:
        _CACHE.pop(key, None)


def cache_clear() -> None:
    """
    Clears all entries from the in-memory cache.
    Use between demo runs to force fresh data retrieval.
    """
    with _LOCK:
        _CACHE.clear()


def cache_stats() -> dict:
    """
    Returns statistics about the current cache state.
    Format: {"total_keys": int, "keys": list[str]}
    """
    with _LOCK:
        # Filter out expired keys during stats inspection
        now = time.time()
        expired_keys = [k for k, v in _CACHE.items() if now > v["expires_at"]]
        for k in expired_keys:
            del _CACHE[k]

        return {
            "total_keys": len(_CACHE),
            "keys": list(_CACHE.keys())
        }
