# STUB — replace with Hari's real implementation from hari-backend before merging to main.
# Interface must not change:
#   async def get_latest_version(package: str) -> str
#   async def get_monthly_downloads(package: str) -> int
#   async def get_downloads_batch(packages: list[str]) -> dict[str, int]

import asyncio
from typing import List, Dict

MOCK_DOWNLOADS = {
    "lodash": 82000000,
    "express": 35000000,
    "webpack": 28000000,
    "next": 18000000,
    "axios": 45000000,
    "react": 95000000,
}

from api.services.exceptions import PackageNotFoundError, ServiceTimeoutError

async def get_latest_version(package: str) -> str:
    """Mock fetching the latest published version string for an npm package."""
    await asyncio.sleep(0.01)
    pkg_clean = package.lower().strip()
    if pkg_clean in ["not-found", "nonexistent-pkg", "invalid-package", "unknown-package"] or pkg_clean.startswith("nonexistent"):
        raise PackageNotFoundError(f"Package '{package}' not found in npm registry")
    if pkg_clean in ["timeout", "timeout-pkg", "service-timeout"]:
        raise ServiceTimeoutError(f"Connection to registry.npmjs.org timed out for '{package}'")
    if pkg_clean == "lodash":
        return "4.17.21"
    return "1.0.0"

async def get_monthly_downloads(package: str) -> int:
    """Mock fetching monthly download count for an npm package."""
    await asyncio.sleep(0.01)
    return MOCK_DOWNLOADS.get(package.lower(), 500000)

async def get_downloads_batch(packages: List[str]) -> Dict[str, int]:
    """Mock fetching monthly downloads concurrently for a list of npm packages."""
    await asyncio.sleep(0.01)
    return {pkg: MOCK_DOWNLOADS.get(pkg.lower(), 500000) for pkg in packages}
