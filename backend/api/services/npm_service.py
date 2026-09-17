# -*- coding: utf-8 -*-
"""
npm Registry and Download Statistics Service for RippleGuard.

This module provides async interface functions to query live data from:
1. npm Registry API (https://registry.npmjs.org) - to fetch package version metadata.
2. npm Download Stats API (https://api.npmjs.org) - to fetch monthly download counts.

Downstream Consumers:
- Zahid's Graph Engine (backend/api/services/graph_service.py): Uses download counts
  to calculate Blast Radius Scores and populate package node metadata.
- /analyze and /simulate FastAPI contracts: Depends on normalized download metrics.
"""

import asyncio
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import httpx

logger = logging.getLogger("rippleguard.npm")

_CACHE_DIR = Path(__file__).resolve().parent.parent.parent / ".cache"
_CACHE_FILE = _CACHE_DIR / "npm_cache.json"

_npm_downloads_cache: Dict[str, Optional[int]] = {}


def _init_downloads_cache():
    if _CACHE_FILE.exists():
        try:
            with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    for k, v in data.items():
                        if isinstance(v, int):
                            _npm_downloads_cache[k.lower()] = v
        except Exception as e:
            logger.warning("Failed to load npm cache file: %s", e)


def _persist_cache_item(package: str, downloads: int):
    _npm_downloads_cache[package.lower()] = downloads
    try:
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cached_data = {}
        if _CACHE_FILE.exists():
            try:
                with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
            except Exception:
                cached_data = {}
        cached_data[package.lower()] = downloads
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cached_data, f, indent=2)
    except Exception as e:
        logger.debug("Failed to write to npm cache file: %s", e)


def _persist_cache_batch(items: Dict[str, int]):
    if not items:
        return
    for k, v in items.items():
        _npm_downloads_cache[k.lower()] = v
    try:
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cached_data = {}
        if _CACHE_FILE.exists():
            try:
                with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
            except Exception:
                cached_data = {}
        for k, v in items.items():
            cached_data[k.lower()] = v
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cached_data, f, indent=2)
    except Exception as e:
        logger.debug("Failed to write batch to npm cache file: %s", e)


_init_downloads_cache()


async def get_latest_version(package: str) -> str:
    """Fetch the latest published version string for a given npm package."""
    url = f"https://registry.npmjs.org/{package}/latest"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            return data.get("version", "latest")
    except (httpx.HTTPError, httpx.TimeoutException, Exception):
        # Returning "latest" on any HTTP, timeout, or parsing failure ensures
        # downstream deps.dev queries receive a valid fallback string rather than crashing.
        return "latest"


async def get_monthly_downloads(package: str) -> Optional[int]:
    """
    Fetch the monthly download count for a given npm package from api.npmjs.org.
    Returns None if the package does not exist (404), rate limits (429), or service is unavailable.
    Does NOT fabricate fallback counts.
    """
    if not package:
        return None

    clean_pkg = package.strip()
    if clean_pkg.lower() in _npm_downloads_cache:
        return _npm_downloads_cache[clean_pkg.lower()]

    url = f"https://api.npmjs.org/downloads/point/last-month/{clean_pkg}"
    headers = {
        "User-Agent": "RippleGuard/1.0 (https://github.com/syedzahidsaleem/rippleguard)"
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                dl = data.get("downloads")
                if dl is not None:
                    dl_int = int(dl)
                    _persist_cache_item(clean_pkg, dl_int)
                    return dl_int
                _npm_downloads_cache[clean_pkg.lower()] = None
                return None

            if response.status_code == 404:
                logger.warning(
                    "Package '%s' not found on npm downloads API (404). Download statistics unavailable.",
                    package,
                )
                _npm_downloads_cache[clean_pkg.lower()] = None
                return None

            if response.status_code == 429:
                logger.warning(
                    "npm downloads API rate limit exceeded (429) for package '%s'. Download statistics temporarily unavailable.",
                    package,
                )
                return None

            logger.warning(
                "npm downloads API returned HTTP %d for package '%s'. Download statistics unavailable.",
                response.status_code,
                package,
            )
            return None

    except httpx.TimeoutException as te:
        logger.warning(
            "npm downloads API request timed out for package '%s': %s. Download statistics unavailable.",
            package,
            te,
        )
        return None
    except Exception as exc:
        logger.warning(
            "Error querying npm downloads API for package '%s': %s. Download statistics unavailable.",
            package,
            exc,
        )
        return None


async def _fetch_scoped_single(
    client: httpx.AsyncClient,
    package: str,
    sem: asyncio.Semaphore,
    headers: dict
) -> Tuple[str, Optional[int]]:
    clean_pkg = package.strip()
    if clean_pkg.lower() in _npm_downloads_cache:
        return package, _npm_downloads_cache[clean_pkg.lower()]

    async with sem:
        url = f"https://api.npmjs.org/downloads/point/last-month/{clean_pkg}"
        try:
            res = await client.get(url, headers=headers, timeout=8.0)
            if res.status_code == 200:
                data = res.json()
                dl = data.get("downloads")
                if dl is not None:
                    return package, int(dl)
                return package, None
            if res.status_code == 404:
                logger.warning(
                    "Package '%s' not found on npm downloads API (404). Download statistics unavailable.",
                    package,
                )
            elif res.status_code == 429:
                logger.warning(
                    "npm downloads API rate limit exceeded (429) for package '%s'. Download statistics temporarily unavailable.",
                    package,
                )
            else:
                logger.warning(
                    "npm downloads API returned HTTP %d for package '%s'. Download statistics unavailable.",
                    res.status_code,
                    package,
                )
            return package, None
        except Exception as exc:
            logger.warning(
                "Error fetching npm downloads for '%s': %s. Download statistics unavailable.",
                package,
                exc,
            )
            return package, None


async def get_downloads_batch(packages: List[str]) -> Dict[str, Optional[int]]:
    """
    Fetch monthly download counts concurrently for a list of npm packages.
    Uses npm's bulk downloads API endpoint (api.npmjs.org/downloads/point/last-month/{pkg1},{pkg2},...)
    for unscoped packages up to 100 packages per call.
    Scoped packages (@scope/name) are queried individually as required by the npm API.
    """
    if not packages:
        return {}

    unique_pkgs = list({p.strip(): p for p in packages if p.strip()}.values())
    needed_pkgs = [p for p in unique_pkgs if p.lower() not in _npm_downloads_cache]

    new_cached_items: Dict[str, int] = {}
    headers = {
        "User-Agent": "RippleGuard/1.0 (https://github.com/syedzahidsaleem/rippleguard)"
    }

    if needed_pkgs:
        scoped = [p for p in needed_pkgs if p.startswith("@")]
        unscoped = [p for p in needed_pkgs if not p.startswith("@")]

        async with httpx.AsyncClient(
            limits=httpx.Limits(max_keepalive_connections=15, max_connections=25),
            timeout=10.0
        ) as client:
            # 1. Bulk queries for unscoped packages in chunks of <= 100
            for i in range(0, len(unscoped), 100):
                chunk = unscoped[i:i + 100]
                url = f"https://api.npmjs.org/downloads/point/last-month/{','.join(chunk)}"
                try:
                    res = await client.get(url, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        # If chunk is size 1, npm returns {"downloads": N, "package": "..."}
                        if "downloads" in data and "package" in data:
                            dl = data.get("downloads")
                            pkg = data["package"]
                            if dl is not None:
                                new_cached_items[pkg.lower()] = int(dl)
                            else:
                                _npm_downloads_cache[pkg.lower()] = None
                        else:
                            for pkg in chunk:
                                entry = data.get(pkg)
                                if entry is not None and isinstance(entry, dict) and "downloads" in entry:
                                    dl_val = entry["downloads"]
                                    if dl_val is not None:
                                        new_cached_items[pkg.lower()] = int(dl_val)
                                    else:
                                        _npm_downloads_cache[pkg.lower()] = None
                                else:
                                    logger.warning(
                                        "Package '%s' not found in npm bulk downloads response (404).",
                                        pkg,
                                    )
                                    _npm_downloads_cache[pkg.lower()] = None
                    elif res.status_code == 429:
                        logger.warning(
                            "npm downloads API rate limit exceeded (429) during bulk query. Download statistics temporarily unavailable."
                        )
                    else:
                        logger.warning(
                            "npm bulk downloads query returned HTTP %d. Download statistics unavailable.",
                            res.status_code,
                        )
                except Exception as exc:
                    logger.warning(
                        "npm bulk downloads query failed: %s. Download statistics unavailable.",
                        exc,
                    )

            # 2. Individual queries for scoped packages
            if scoped:
                sem = asyncio.Semaphore(8)
                tasks = [_fetch_scoped_single(client, p, sem, headers) for p in scoped]
                scoped_results = await asyncio.gather(*tasks)
                for pkg, dl in scoped_results:
                    if dl is not None:
                        new_cached_items[pkg.lower()] = dl
                    else:
                        _npm_downloads_cache[pkg.lower()] = None

        if new_cached_items:
            _persist_cache_batch(new_cached_items)

    return {pkg: _npm_downloads_cache.get(pkg.lower()) for pkg in packages}


async def get_package_metadata(package: str) -> dict:
    """Fetch full registry metadata for an npm package (maintainers, version publish times)."""
    url = f"https://registry.npmjs.org/{package}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                return response.json()
            return {}
    except Exception:
        return {}


async def calculate_maintainer_risk_score(package: str) -> float:
    """
    Calculate Maintainer Risk Score (Idea 6) based on maintainer count and last publish age.
    Higher score indicates higher human factor risk (abandonment or single point of failure).
    """
    metadata = await get_package_metadata(package)
    if not metadata:
        return 0.0

    score = 0.0
    maintainers = metadata.get("maintainers", [])
    maintainer_count = len(maintainers) if isinstance(maintainers, list) else 0

    if maintainer_count == 1:
        score += 40.0
    elif maintainer_count < 3:
        score += 20.0

    time_dict = metadata.get("time", {})
    if isinstance(time_dict, dict) and "modified" in time_dict:
        try:
            mod_str = time_dict["modified"].replace("Z", "+00:00")
            mod_dt = datetime.fromisoformat(mod_str)
            now = datetime.now(timezone.utc)
            days_old = (now - mod_dt).days
            if days_old > 730:
                score += 30.0
            elif days_old > 365:
                score += 15.0
        except Exception:
            pass

    return min(score, 100.0)


async def get_version_age_days(package: str, version: str) -> Optional[int]:
    """
    Calculate age in days of a specific package version (Idea 8 - Dependency Age Map).
    Pulls version publish date from npm registry time object.
    """
    metadata = await get_package_metadata(package)
    if not metadata:
        return None

    time_dict = metadata.get("time", {})
    if isinstance(time_dict, dict) and version in time_dict:
        try:
            pub_str = time_dict[version].replace("Z", "+00:00")
            pub_dt = datetime.fromisoformat(pub_str)
            now = datetime.now(timezone.utc)
            return (now - pub_dt).days
        except Exception:
            return None
    return None


if __name__ == "__main__":
    async def main():
        print("--- Testing get_latest_version ---")
        version = await get_latest_version("lodash")
        print(f"lodash latest version: {version}")

        print("\n--- Testing get_monthly_downloads ---")
        downloads = await get_monthly_downloads("express")
        print(f"express monthly downloads: {downloads}")

        print("\n--- Testing get_downloads_batch ---")
        test_packages = ["lodash", "react", "axios", "webpack", "typescript"]
        batch_results = await get_downloads_batch(test_packages)
        print("Batch download results:")
        for pkg, dl in batch_results.items():
            print(f"  {pkg}: {dl:,}")

        print("\n--- Testing calculate_maintainer_risk_score ---")
        risk = await calculate_maintainer_risk_score("lodash")
        print(f"lodash maintainer risk score: {risk}")

        print("\n--- Testing get_version_age_days ---")
        age = await get_version_age_days("express", "4.18.2")
        print(f"express@4.18.2 age in days: {age}")

    asyncio.run(main())

