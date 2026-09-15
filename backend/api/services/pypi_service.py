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
import re
import httpx


async def get_pypi_metadata(package: str, version: str = None) -> dict:
    """Fetch package metadata from PyPI JSON API for a given package and version."""
    if not version or version == "latest":
        url = f"https://pypi.org/pypi/{package}/json"
    else:
        url = f"https://pypi.org/pypi/{package}/{version}/json"

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
                "name": clean_name,
                "version": "latest",
                "ecosystem": "pypi"
            })
    return deps


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
