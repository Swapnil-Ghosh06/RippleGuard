# STUB — replace with Hari's real implementation from hari-backend before merging to main.
# Interface must not change:
#   async def get_pypi_metadata(package: str, version: str = None) -> dict
#   def parse_pypi_deps(requires_dist: list[str]) -> list[dict]

import asyncio
import re
from typing import List, Optional, Dict, Any

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
    }
}

from api.services.exceptions import PackageNotFoundError, ServiceTimeoutError

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
