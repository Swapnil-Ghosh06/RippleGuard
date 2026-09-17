# -*- coding: utf-8 -*-
"""
PyPI JSON API Service for RippleGuard.

This module provides async interface functions and dependency parsing for PyPI packages:
1. PyPI JSON API (https://pypi.org/pypi/{package}/json) - fetches package metadata.
2. parse_pypi_deps() - normalizes PEP 508 dependency specifiers into ecosystem dicts.

Downstream Contract:
Package objects normalized by this service adhere to the flat ecosystem contract:
{
    "name": "requests",
    "version": "2.31.0",
    "ecosystem": "pypi",
    "monthly_downloads": 0,  # PyPI has no official download count endpoint
    "vulnerabilities": [],   # Populated downstream by osv_service
    "risk_score": 0.0        # Calculated downstream by graph_service
}

Note: Internal ecosystem identifiers are strictly lowercase "pypi".
"""

import asyncio
import logging
import re
from typing import Optional

import httpx

import json
from pathlib import Path

logger = logging.getLogger("rippleguard.pypi")

_CACHE_DIR = Path(__file__).resolve().parent.parent.parent / ".cache"
_CACHE_FILE = _CACHE_DIR / "pypistats_cache.json"

_pypi_downloads_cache: dict[str, Optional[int]] = {}


def normalize_pypi_package_name(name: str) -> str:
    """
    Normalizes a PyPI package name according to PEP 503:
    Lowercase and collapse any run of [-_.] characters into a single hyphen '-'.
    """
    if not name:
        return ""
    return re.sub(r"[-_.]+", "-", name.strip()).lower()


def _init_downloads_cache():
    if _CACHE_FILE.exists():
        try:
            with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    for k, v in data.items():
                        if isinstance(v, int):
                            _pypi_downloads_cache[normalize_pypi_package_name(k)] = v
        except Exception as e:
            logger.warning("Failed to load pypistats cache file: %s", e)


def _persist_cache_item(package: str, downloads: int):
    norm_pkg = normalize_pypi_package_name(package)
    _pypi_downloads_cache[norm_pkg] = downloads
    try:
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cached_data = {}
        if _CACHE_FILE.exists():
            try:
                with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
            except Exception:
                cached_data = {}
        cached_data[norm_pkg] = downloads
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cached_data, f, indent=2)
    except Exception as e:
        logger.debug("Failed to write to pypistats cache file: %s", e)


_init_downloads_cache()



async def get_pypi_metadata(package: str, version: str = None) -> dict:
    """Fetch package metadata from PyPI JSON API for a given package and version."""
    norm_pkg = normalize_pypi_package_name(package)
    if not version or version == "latest":
        url = f"https://pypi.org/pypi/{norm_pkg}/json"
    else:
        url = f"https://pypi.org/pypi/{norm_pkg}/{version}/json"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 404:
                raise ValueError(f"Package '{package}' not found on PyPI")
            response.raise_for_status()
            data = response.json()
            info = data.get("info", {})
            return {
                "name": info.get("name", package),
                "version": info.get("version", ""),
                "description": info.get("summary", "") or info.get("description", ""),
                "requires_dist": info.get("requires_dist") or []
            }
    except ValueError:
        raise
    except (httpx.HTTPError, httpx.TimeoutException, Exception) as e:
        raise RuntimeError(f"PyPI fetch failed for '{package}': {e}")


def parse_pypi_deps(requires_dist: list[str]) -> list[dict]:
    """
    Synchronously parse PEP 508 dependency strings from requires_dist into clean dicts.

    Strips environment markers (;), extras ([]), parenthesized constraints (()),
    and version operators (>=, <=, ==, !=, ~=, >, <).
    """
    if not requires_dist:
        return []

    deps = []
    for item in requires_dist:
        if not item:
            continue
        # Strip environment markers (e.g. "; python_version > '3'")
        no_marker = item.split(";")[0]
        # Strip extras in brackets (e.g. "cryptography[ssh]")
        no_extras = re.sub(r"\[.*?\]", "", no_marker)
        # Strip parenthesized version constraints (e.g. "(>=1.21)")
        no_parens = re.sub(r"\(.*?\)", "", no_extras)
        # Strip version specifiers (e.g. ">=2.0", "==1.0", "~=3.0")
        clean_name = re.split(r"[<>=!~]", no_parens)[0].strip()

        if clean_name:
            deps.append({
                "name": normalize_pypi_package_name(clean_name),
                "version": "latest",
                "ecosystem": "pypi"
            })
    return deps


async def get_monthly_downloads(package: str) -> Optional[int]:
    """
    Fetch monthly download counts for a PyPI package from pypistats.org.

    Integrates against the public pypistats.org REST API (GET https://pypistats.org/api/packages/<package>/recent).
    If the package is not found (404), rate-limited (429), or the upstream service fails/times out,
    returns None and logs a clear warning without fabricating numbers.
    """
    if not package:
        return None

    clean_pkg = normalize_pypi_package_name(package)

    if clean_pkg in _pypi_downloads_cache:
        return _pypi_downloads_cache[clean_pkg]

    url = f"https://pypistats.org/api/packages/{clean_pkg}/recent"
    headers = {
        "User-Agent": "RippleGuard/1.0 (https://github.com/syedzahidsaleem/rippleguard)"
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 429:
                # Brief wait and single retry on rate limit
                await asyncio.sleep(1.2)
                response = await client.get(url, headers=headers)

            if response.status_code == 200:
                data = response.json().get("data", {})
                downloads = data.get("last_month")
                if downloads is not None:
                    dl_int = int(downloads)
                    _persist_cache_item(clean_pkg, dl_int)
                    return dl_int
                _pypi_downloads_cache[clean_pkg] = None
                return None

            if response.status_code == 404:
                logger.warning(
                    "Package '%s' not found on pypistats.org (404). Download statistics unavailable.",
                    package,
                )
                _pypi_downloads_cache[clean_pkg] = None
                return None

            if response.status_code == 429:
                logger.warning(
                    "pypistats.org rate limit exceeded (429) for package '%s'. Download statistics temporarily unavailable.",
                    package,
                )
                return None

            logger.warning(
                "pypistats.org returned HTTP %d for package '%s'. Download statistics unavailable.",
                response.status_code,
                package,
            )
            return None

    except httpx.TimeoutException as te:
        logger.warning(
            "pypistats.org request timed out for package '%s': %s. Download statistics unavailable.",
            package,
            te,
        )
        return None
    except Exception as exc:
        logger.warning(
            "Error querying pypistats.org for package '%s': %s. Download statistics unavailable.",
            package,
            exc,
        )
        return None


async def _fetch_pypi_download_throttled(
    client: httpx.AsyncClient,
    package: str,
    sem: asyncio.Semaphore
) -> tuple[str, Optional[int]]:
    clean_pkg = normalize_pypi_package_name(package)
    if clean_pkg in _pypi_downloads_cache:
        return package, _pypi_downloads_cache[clean_pkg]

    async with sem:
        # Pacing: sleep 0.25s between calls to strictly respect pypistats 5 req/sec limit
        await asyncio.sleep(0.25)
        if clean_pkg in _pypi_downloads_cache:
            return package, _pypi_downloads_cache[clean_pkg]

        url = f"https://pypistats.org/api/packages/{clean_pkg}/recent"
        headers = {
            "User-Agent": "RippleGuard/1.0 (https://github.com/syedzahidsaleem/rippleguard)"
        }
        try:
            response = await client.get(url, headers=headers)
            if response.status_code == 429:
                await asyncio.sleep(1.2)
                response = await client.get(url, headers=headers)

            if response.status_code == 200:
                data = response.json().get("data", {})
                downloads = data.get("last_month")
                if downloads is not None:
                    dl_int = int(downloads)
                    _persist_cache_item(clean_pkg, dl_int)
                    return package, dl_int
                _pypi_downloads_cache[clean_pkg] = None
                return package, None

            if response.status_code == 404:
                logger.warning(
                    "Package '%s' not found on pypistats.org (404). Download statistics unavailable.",
                    package,
                )
                _pypi_downloads_cache[clean_pkg] = None
                return package, None

            if response.status_code == 429:
                logger.warning(
                    "pypistats.org rate limit exceeded (429) for package '%s'. Download statistics temporarily unavailable.",
                    package,
                )
                return package, None

            logger.warning(
                "pypistats.org returned HTTP %d for package '%s'. Download statistics unavailable.",
                response.status_code,
                package,
            )
            return package, None

        except httpx.TimeoutException as te:
            logger.warning(
                "pypistats.org request timed out for package '%s': %s. Download statistics unavailable.",
                package,
                te,
            )
            return package, None
        except Exception as exc:
            logger.warning(
                "Error querying pypistats.org for package '%s': %s. Download statistics unavailable.",
                package,
                exc,
            )
            return package, None


async def get_downloads_batch(packages: list[str]) -> dict[str, Optional[int]]:
    """
    Fetch monthly download counts concurrently for a list of PyPI packages using pooled connections.
    Uses gentle concurrency (Semaphore(1)) and pacing to strictly respect pypistats.org rate limits.
    """
    if not packages:
        return {}

    # Deduplicate packages using PEP 503 normalized representation
    norm_to_orig = {}
    for p in packages:
        if p and p.strip():
            norm = normalize_pypi_package_name(p)
            if norm not in norm_to_orig:
                norm_to_orig[norm] = p.strip()

    sem = asyncio.Semaphore(1)

    async with httpx.AsyncClient(
        limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
        timeout=8.0
    ) as client:
        tasks = [_fetch_pypi_download_throttled(client, norm, sem) for norm in norm_to_orig.keys()]
        results = await asyncio.gather(*tasks)

    res_dict = dict(results)
    return {
        pkg: res_dict.get(
            normalize_pypi_package_name(pkg),
            _pypi_downloads_cache.get(normalize_pypi_package_name(pkg))
        )
        for pkg in packages
    }




if __name__ == "__main__":
    async def main():
        print("--- Testing get_pypi_metadata for 'requests' ---")
        requests_meta = await get_pypi_metadata("requests")
        print(f"Name: {requests_meta['name']}")
        print(f"Version: {requests_meta['version']}")
        print(f"Description: {requests_meta['description']}")

        print("\n--- Testing get_pypi_metadata for 'numpy' ---")
        numpy_meta = await get_pypi_metadata("numpy")
        print(f"Name: {numpy_meta['name']}")
        print(f"Version: {numpy_meta['version']}")

        print("\n--- Testing parse_pypi_deps for 'requests' ---")
        cleaned_deps = parse_pypi_deps(requests_meta.get("requires_dist", []))
        print("Cleaned dependencies list:")
        for dep in cleaned_deps:
            print(f"  - {dep['name']} (ecosystem: {dep['ecosystem']}, version: {dep['version']})")

        print("\n--- Testing error case for non-existent package ---")
        try:
            await get_pypi_metadata("this-package-does-not-exist-xyz123")
        except ValueError as ve:
            print(f"Caught expected ValueError: {ve}")
        except Exception as ex:
            print(f"Unexpected exception: {ex}")

    asyncio.run(main())
