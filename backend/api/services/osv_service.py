# -*- coding: utf-8 -*-
"""
OSV.dev Batch Vulnerability Lookup Service for RippleGuard.

This module provides batch vulnerability querying from Google's Open Source Vulnerabilities
(OSV.dev API v1). Every CVE badge, severity rating, CVSS score, and fix version displayed
across RippleGuard dependency graphs originates from this service.

API Endpoint:
POST https://api.osv.dev/v1/querybatch

Ecosystem Conversion Rule:
Internal RippleGuard ecosystem identifiers are strictly lowercase ("npm" / "pypi").
When constructing OSV query payloads, "pypi" is converted to "PyPI" while "npm" remains "npm".
This conversion happens exclusively within this service file.

Downstream Contract:
Vulnerability lists parsed by this module attach to node dictionaries as follows:
{
    "id": "GHSA-xxxx-xxxx-xxxx",
    "summary": "Prototype pollution in lodash",
    "severity": "HIGH",
    "cvss_score": 7.5,
    "fixed_version": "4.17.21"
}
"""

import asyncio
from typing import Dict, List, Optional
import httpx

OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"


def _extract_cvss(vuln: dict) -> float:
    """Extract float CVSS score from CVSS_V3 vector string or database_specific fields."""
    for item in vuln.get("severity", []):
        if isinstance(item, dict):
            score_str = str(item.get("score", "")).strip()
            if score_str:
                if "/" in score_str:
                    parts = score_str.split("/")
                    for p in reversed(parts):
                        try:
                            val = float(p)
                            if 0.0 <= val <= 10.0:
                                return val
                        except ValueError:
                            continue
                else:
                    try:
                        val = float(score_str)
                        if 0.0 <= val <= 10.0:
                            return val
                    except ValueError:
                        pass

    db_spec = vuln.get("database_specific", {})
    if isinstance(db_spec, dict):
        for key in ("cvss_score", "score", "cvss"):
            raw_val = db_spec.get(key)
            if isinstance(raw_val, (int, float)):
                return float(raw_val)
            elif isinstance(raw_val, dict) and "score" in raw_val:
                try:
                    return float(raw_val["score"])
                except (ValueError, TypeError):
                    pass
            elif isinstance(raw_val, str):
                try:
                    return float(raw_val)
                except ValueError:
                    pass

    return 0.0


def _extract_severity(vuln: dict) -> str:
    """Extract human-readable severity string (CRITICAL/HIGH/MEDIUM/LOW/UNKNOWN)."""
    db_spec = vuln.get("database_specific", {})
    if isinstance(db_spec, dict):
        sev = db_spec.get("severity")
        if sev:
            sev_str = str(sev).upper()
            if sev_str == "MODERATE":
                return "MEDIUM"
            if sev_str in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
                return sev_str

    for item in vuln.get("severity", []):
        if isinstance(item, dict):
            score = str(item.get("score", "")).upper()
            for level in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
                if level in score:
                    return level
            if "MODERATE" in score:
                return "MEDIUM"

    cvss = _extract_cvss(vuln)
    if cvss >= 9.0:
        return "CRITICAL"
    elif cvss >= 7.0:
        return "HIGH"
    elif cvss >= 4.0:
        return "MEDIUM"
    elif cvss > 0.0:
        return "LOW"

    return "UNKNOWN"


def _extract_fix(vuln: dict, pkg_name: str) -> Optional[str]:
    """Extract fixed version string from affected ranges."""
    for affected in vuln.get("affected", []):
        if not isinstance(affected, dict):
            continue
        aff_pkg = affected.get("package", {})
        # Check if package matches or if package name check is optional across ranges
        if not aff_pkg or aff_pkg.get("name", "").lower() == pkg_name.lower():
            for range_item in affected.get("ranges", []):
                if isinstance(range_item, dict):
                    for event in range_item.get("events", []):
                        if isinstance(event, dict) and "fixed" in event:
                            return str(event["fixed"])

    # Fallback check across all ranges regardless of pkg_name mismatch
    for affected in vuln.get("affected", []):
        if isinstance(affected, dict):
            for range_item in affected.get("ranges", []):
                if isinstance(range_item, dict):
                    for event in range_item.get("events", []):
                        if isinstance(event, dict) and "fixed" in event:
                            return str(event["fixed"])

    return None


async def query_vulnerabilities_batch(packages: List[dict]) -> Dict[str, list]:
    """
    Batch query OSV.dev for known vulnerabilities across a list of package node dictionaries.

    Args:
        packages: List of {"name": str, "version": str, "ecosystem": str}

    Returns:
        Dict mapping "package@version" to list of parsed vulnerability objects.
        Returns {} on empty input or API failure (never raises).
    """
    if not packages:
        return {}

    queries = []
    for pkg in packages:
        eco = "PyPI" if pkg.get("ecosystem", "").lower() == "pypi" else "npm"
        queries.append({
            "version": pkg.get("version", ""),
            "package": {
                "name": pkg.get("name", ""),
                "ecosystem": eco
            }
        })

    payload = {"queries": queries}

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(OSV_BATCH_URL, json=payload)
            if response.status_code != 200:
                return {}
            data = response.json()
            results = data.get("results", [])

            vuln_map = {}
            for i, result in enumerate(results):
                if i >= len(packages):
                    break
                pkg = packages[i]
                pkg_key = f"{pkg['name']}@{pkg['version']}"
                vulns_raw = result.get("vulns", [])

                parsed_vulns = []
                for v in vulns_raw:
                    parsed_vulns.append({
                        "id": v.get("id", ""),
                        "summary": v.get("summary", ""),
                        "severity": _extract_severity(v),
                        "cvss_score": _extract_cvss(v),
                        "fixed_version": _extract_fix(v, pkg["name"])
                    })

                vuln_map[pkg_key] = parsed_vulns

            return vuln_map
    except (httpx.HTTPError, httpx.TimeoutException, Exception):
        return {}


if __name__ == "__main__":
    async def main():
        print("--- Testing query_vulnerabilities_batch for 5 Test Packages ---")
        test_packages = [
            {"name": "lodash", "version": "4.17.21", "ecosystem": "npm"},
            {"name": "minimatch", "version": "3.0.4", "ecosystem": "npm"},
            {"name": "requests", "version": "2.31.0", "ecosystem": "pypi"},
            {"name": "express", "version": "4.18.2", "ecosystem": "npm"},
            {"name": "Pillow", "version": "9.0.0", "ecosystem": "pypi"},
        ]

        batch_result = await query_vulnerabilities_batch(test_packages)

        for pkg in test_packages:
            pkg_key = f"{pkg['name']}@{pkg['version']}"
            vulns = batch_result.get(pkg_key, [])
            print(f"\nPackage: {pkg_key} ({pkg['ecosystem']})")
            print(f"  Vulnerabilities found: {len(vulns)}")
            if vulns:
                first_vuln = vulns[0]
                print(f"  First Vuln ID: {first_vuln['id']}")
                print(f"  Severity: {first_vuln['severity']}")
                print(f"  CVSS Score: {first_vuln['cvss_score']}")
                print(f"  Fixed Version: {first_vuln['fixed_version']}")

        print("\n--- Testing Empty Input Test ---")
        empty_res = await query_vulnerabilities_batch([])
        if empty_res == {}:
            print("empty input returned correctly")
        else:
            print(f"Unexpected empty input result: {empty_res}")

    asyncio.run(main())
