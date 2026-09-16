# -*- coding: utf-8 -*-
"""
OSV.dev Batch Vulnerability Lookup Service for RippleGuard.

This module provides batch vulnerability querying from Google's Open Source Vulnerabilities
(OSV.dev API v1). Every CVE badge, severity rating, CVSS score, and fix version displayed
across RippleGuard dependency graphs originates from what this service returns.

API Endpoint:
    POST https://api.osv.dev/v1/querybatch

Ecosystem Conversion Rule:
    Internal RippleGuard ecosystem identifiers are strictly lowercase ("npm" / "pypi").
    When constructing OSV query payloads, "pypi" is converted to "PyPI" while "npm" remains "npm".
    This conversion happens exclusively within this service file, nowhere else.

Downstream Integration:
    Feeds vulnerability overlays (Feature F3) and risk calculations into Zahid's graph engine.
"""

import asyncio
from typing import Dict, List, Optional
import httpx

OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"


def _extract_severity(vuln: dict) -> str:
    """
    Extract human-readable severity string (CRITICAL/HIGH/MEDIUM/LOW/UNKNOWN).
    Checks database_specific.severity first (uppercased), then scans severity list scores.
    """
    db_spec = vuln.get("database_specific")
    if isinstance(db_spec, dict) and db_spec.get("severity"):
        return str(db_spec["severity"]).upper()

    severity_list = vuln.get("severity")
    if isinstance(severity_list, list):
        for entry in severity_list:
            if isinstance(entry, dict):
                score_str = str(entry.get("score", "")).upper()
                for level in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
                    if level in score_str:
                        return level

    return "UNKNOWN"


def _extract_cvss(vuln: dict) -> float:
    """
    Extract float CVSS score from severity list entry where type == 'CVSS_V3'.
    The score field is a CVSS vector string like 'CVSS:3.1/AV:N/AC:L/.../9.8'.
    The numeric score is the last segment after the final '/'.
    Returns 0.0 if anything fails or no CVSS_V3 entry exists.
    """
    severity_list = vuln.get("severity")
    if isinstance(severity_list, list):
        for entry in severity_list:
            if isinstance(entry, dict) and entry.get("type") == "CVSS_V3":
                score_str = str(entry.get("score", ""))
                if score_str:
                    parts = score_str.split("/")
                    last_part = parts[-1]
                    try:
                        return float(last_part)
                    except ValueError:
                        pass
    return 0.0


def _extract_fix(vuln: dict, pkg_name: str) -> Optional[str]:
    """
    Extract fixed version string for the specified package.
    Matches package name inside affected, then searches ranges -> events for 'fixed' key.
    Returns None if no fix version is found.
    """
    affected_list = vuln.get("affected")
    if isinstance(affected_list, list):
        for affected in affected_list:
            if isinstance(affected, dict):
                pkg = affected.get("package", {})
                if isinstance(pkg, dict) and pkg.get("name") == pkg_name:
                    ranges = affected.get("ranges", [])
                    if isinstance(ranges, list):
                        for range_entry in ranges:
                            if isinstance(range_entry, dict):
                                events = range_entry.get("events", [])
                                if isinstance(events, list):
                                    for event in events:
                                        if isinstance(event, dict) and "fixed" in event:
                                            return str(event["fixed"])
    return None


async def query_vulnerabilities_batch(packages: List[dict]) -> Dict[str, list]:
    """
    Hits https://api.osv.dev/v1/querybatch via POST to query vulnerabilities in batch.

    Input: packages is a list of {"name": ..., "version": ..., "ecosystem": ...} dicts (lowercase ecosystem).
    Returns: Dict mapping "pkg_name@version" to list of parsed vulnerability dicts.
    """
    if not packages:
        return {}

    queries = [
        {
            "version": pkg["version"],
            "package": {
                "name": pkg["name"],
                "ecosystem": "PyPI" if pkg.get("ecosystem") == "pypi" else "npm"
            }
        }
        for pkg in packages
    ]

    payload = {"queries": queries}

    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(OSV_BATCH_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])

            vuln_map = {}
            for i, result in enumerate(results):
                if i >= len(packages):
                    break
                pkg = packages[i]
                pkg_key = f"{pkg['name']}@{pkg['version']}"
                raw_vulns = result.get("vulns", [])

                parsed_list = []
                for v in raw_vulns:
                    parsed_list.append({
                        "id": v.get("id", ""),
                        "summary": v.get("summary", ""),
                        "severity": _extract_severity(v),
                        "cvss_score": _extract_cvss(v),
                        "fixed_version": _extract_fix(v, pkg["name"])
                    })

                vuln_map[pkg_key] = parsed_list

            return vuln_map
    except Exception:
        return {}


if __name__ == "__main__":
    async def main():
        print("=== Step 4 Verification: OSV Batch Vulnerability Service ===")

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

        print("\n--- Testing Empty Input ---")
        empty_res = await query_vulnerabilities_batch([])
        if empty_res == {}:
            print("empty input returned correctly")

    asyncio.run(main())
