# STUB — replace with Hari's real implementation from hari-backend before merging to main.
# Interface must not change:
#   async def get_pypi_metadata(package: str, version: str = None) -> dict
#   def parse_pypi_deps(requires_dist: list[str]) -> list[dict]
#   async def get_monthly_downloads(package: str) -> int
#   async def get_downloads_batch(packages: list[str]) -> dict[str, int]

import asyncio
import re
from typing import List, Optional, Dict, Any

from api.services.exceptions import PackageNotFoundError, ServiceTimeoutError

MOCK_PYPI_DATA = {
    "requests": {
        "name": "requests",
        "version": "2.31.0",
        "description": "Python HTTP for Humans.",
        "requires_dist": [
            "urllib3<3,>=1.21.1",
            "certifi>=2017.4.17",
            "charset-normalizer<4,>=2",
            "idna<4,>=2.5"
        ]
    },
    "flask": {
        "name": "flask",
        "version": "3.0.0",
        "description": "A simple framework for building complex web applications.",
        "requires_dist": [
            "Werkzeug>=3.0.0",
            "Jinja2>=3.1.2",
            "itsdangerous>=2.1.2",
            "click>=8.1.3",
            "blinker>=1.6.2"
        ]
    }
}

MOCK_PYPI_DOWNLOADS = {
    "requests": 90000000,
    "urllib3": 110000000,
    "certifi": 85000000,
    "charset-normalizer": 75000000,
    "idna": 80000000,
    "six": 60000000,
    "flask": 45000000,
    "werkzeug": 42000000,
    "jinja2": 55000000,
    "itsdangerous": 30000000,
    "click": 50000000,
    "blinker": 25000000,
    "markupsafe": 48000000,
}


async def get_pypi_metadata(package: str, version: Optional[str] = None) -> Dict[str, Any]:
    """Mock fetching package metadata from PyPI JSON API."""
    await asyncio.sleep(0.01)
    pkg_key = package.lower().strip()
    if pkg_key in ["not-found", "nonexistent-pkg", "invalid-package", "unknown-package"] or pkg_key.startswith("nonexistent"):
        raise PackageNotFoundError(f"Package '{package}' not found in PyPI registry")
    if pkg_key in ["timeout", "timeout-pkg", "service-timeout"]:
        raise ServiceTimeoutError(f"Connection to pypi.org timed out for '{package}'")
    if pkg_key in MOCK_PYPI_DATA:
        data = dict(MOCK_PYPI_DATA[pkg_key])
        if version and version != "latest":
            data["version"] = version
        return data

    return {
        "name": package,
        "version": version or "1.0.0",
        "description": f"Mock description for {package}",
        "requires_dist": ["mock-dep>=1.0.0"]
    }


async def get_monthly_downloads(package: str) -> int:
    """Mock fetching monthly download count for a PyPI package."""
    await asyncio.sleep(0.01)
    return MOCK_PYPI_DOWNLOADS.get(package.lower().strip(), 1000000)


async def get_downloads_batch(packages: List[str]) -> Dict[str, int]:
    """Mock fetching monthly download counts concurrently for a list of PyPI packages."""
    await asyncio.sleep(0.01)
    return {pkg: MOCK_PYPI_DOWNLOADS.get(pkg.lower().strip(), 1000000) for pkg in packages}


def parse_pypi_deps(requires_dist: List[str]) -> List[Dict[str, str]]:
    """Parse PEP 508 dependency strings into clean dicts."""
    if not requires_dist:
        return []

    deps = []
    for item in requires_dist:
        if not item:
            continue
        no_marker = item.split(";")[0]
        no_extras = re.sub(r"\[.*?\]", "", no_marker)
        no_parens = re.sub(r"\(.*?\)", "", no_extras)
        clean_name = re.split(r"[<>=!~]", no_parens)[0].strip()

        if clean_name:
            deps.append({
                "name": clean_name,
                "version": "latest",
                "ecosystem": "pypi"
            })
    return deps
