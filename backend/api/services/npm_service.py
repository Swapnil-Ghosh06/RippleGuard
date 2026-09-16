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
from typing import Optional
import httpx


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


DEFAULT_DOWNLOAD_FALLBACKS = {
    "lodash": 82_000_000,
    "express": 35_000_000,
    "minimatch": 45_000_000,
    "react": 90_000_000,
    "axios": 75_000_000,
    "webpack": 40_000_000,
    "typescript": 85_000_000,
    "debug": 120_000_000,
    "ms": 150_000_000,
    "mime": 60_000_000,
    "cookie": 50_000_000,
    "semver": 110_000_000
}


async def get_monthly_downloads(package: str) -> int:
    """
    Fetch the monthly download count for a given npm package.
    Falls back to curated/default download estimates if npm API rate-limits (HTTP 429) or fails.
    """
    url = f"https://api.npmjs.org/downloads/point/last-month/{package}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                dl = data.get("downloads", 0)
                if dl > 0:
                    return dl
    except Exception:
        pass

    # Resilient fallback for rate-limiting (429) or external downtime
    return DEFAULT_DOWNLOAD_FALLBACKS.get(package.lower(), 1_000_000)



async def get_downloads_batch(packages: list[str]) -> dict[str, int]:
    """Fetch monthly download counts concurrently for a list of npm packages."""
    tasks = [get_monthly_downloads(pkg) for pkg in packages]
    results = await asyncio.gather(*tasks)
    return dict(zip(packages, results))


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

