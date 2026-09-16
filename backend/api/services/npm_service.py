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
    "react-dom": 90000000,
    "scheduler": 85000000,
    "loose-envify": 40000000,
    "postcss": 50000000,
    "js-tokens": 35000000,
    "body-parser": 15000000,
    "cookie-parser": 12000000,
    "bytes": 25000000,
    "depd": 30000000,
    "cookie": 40000000,
    "cookie-signature": 15000000,
    "acorn": 65000000,
    "enhanced-resolve": 32000000,
    "graceful-fs": 70000000,
    "tapable": 45000000,
    "log4js": 15000000,
    "date-format": 8000000,
    "debug": 120000000,
    "flatted": 90000000,
    "rfdc": 45000000,
    "streamroller": 12000000,
    "fs-extra": 110000000,
    "jsonfile": 95000000,
    "universalify": 105000000,
    "ms": 130000000,
}

MOCK_VERSIONS = {
    "lodash": "4.17.21",
    "express": "4.18.2",
    "react": "18.2.0",
    "webpack": "5.88.0",
    "next": "13.4.0",
    "axios": "1.6.0",
    "log4js": "6.4.0",
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
    return MOCK_VERSIONS.get(pkg_clean, "1.0.0")

async def get_monthly_downloads(package: str) -> int:
    """Mock fetching monthly download count for an npm package."""
    await asyncio.sleep(0.01)
    return MOCK_DOWNLOADS.get(package.lower().strip(), 500000)

async def get_downloads_batch(packages: List[str]) -> Dict[str, int]:
    """Mock fetching monthly downloads concurrently for a list of npm packages."""
    await asyncio.sleep(0.01)
    return {pkg: MOCK_DOWNLOADS.get(pkg.lower().strip(), 500000) for pkg in packages}
