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


async def get_monthly_downloads(package: str) -> int:
    """Fetch the monthly download count for a given npm package."""
    url = f"https://api.npmjs.org/downloads/point/last-month/{package}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                return data.get("downloads", 0)
            return 0
    except (httpx.HTTPError, httpx.TimeoutException, Exception):
        # Returning 0 on failure allows blast radius scoring calculations to continue
        # gracefully without crashing when an external API endpoint fails or rate-limits.
        return 0


async def get_downloads_batch(packages: list[str]) -> dict[str, int]:
    """Fetch monthly download counts concurrently for a list of npm packages."""
    tasks = [get_monthly_downloads(pkg) for pkg in packages]
    results = await asyncio.gather(*tasks)
    return dict(zip(packages, results))


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

    asyncio.run(main())
