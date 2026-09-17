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
OSV_VULN_URL = "https://api.osv.dev/v1/vulns"

_VULN_CACHE: Dict[str, dict] = {}


def _extract_severity(vuln: dict) -> str:
    """
    Extract human-readable severity string (CRITICAL/HIGH/MEDIUM/LOW/UNKNOWN).
    Checks database_specific.severity first (mapping MODERATE to MEDIUM), then scans severity list scores.
    """
    db_spec = vuln.get("database_specific")
    if isinstance(db_spec, dict) and db_spec.get("severity"):
        sev_str = str(db_spec["severity"]).upper()
        if sev_str == "MODERATE":
            return "MEDIUM"
        if sev_str in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
            return sev_str

    severity_list = vuln.get("severity")
    if isinstance(severity_list, list):
        for entry in severity_list:
            if isinstance(entry, dict):
                score_str = str(entry.get("score", "")).upper()
                for level in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
                    if level in score_str:
                        return level

    return "UNKNOWN"


def _extract_cvss(vuln: dict, severity: str) -> float:
    """
    Extract float CVSS score from severity list entry where type == 'CVSS_V3'.
    If no explicit CVSS vector score is found, provides a fallback based on calculated severity.
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
                        val = float(last_part)
                        if 0.0 <= val <= 10.0:
                            return val
                    except ValueError:
                        pass

    # Standard fallback CVSS floats based on severity rating
    severity_defaults = {
        "CRITICAL": 9.5,
        "HIGH": 7.5,
        "MEDIUM": 5.5,
        "LOW": 3.0,
        "UNKNOWN": 0.0
    }
    return severity_defaults.get(severity, 0.0)


def _extract_fix(vuln: dict, pkg_name: str) -> Optional[str]:
    """
    Extract fixed version string for the specified package.
    Matches package name inside affected, then searches ranges -> events for 'fixed' key.
    """
    affected_list = vuln.get("affected")
    if isinstance(affected_list, list):
        for affected in affected_list:
            if isinstance(affected, dict):
                pkg = affected.get("package", {})
                if isinstance(pkg, dict) and (pkg.get("name") == pkg_name or pkg_name in pkg.get("name", "")):
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


async def _fetch_single_vuln_detail(client: httpx.AsyncClient, vuln_id: str) -> dict:
    """Fetch and cache detailed OSV advisory record for a given vulnerability ID."""
    if vuln_id in _VULN_CACHE:
        return _VULN_CACHE[vuln_id]

    url = f"{OSV_VULN_URL}/{vuln_id}"
    try:
        response = await client.get(url)
        if response.status_code == 200:
            data = response.json()
            _VULN_CACHE[vuln_id] = data
            return data
    except Exception:
        pass
    return {}


async def query_vulnerabilities_batch(packages: List[dict]) -> Dict[str, list]:
    """
    Hits https://api.osv.dev/v1/querybatch via POST to query vulnerabilities in batch,
    then fetches rich advisory details concurrently for accurate severity, CVSS scores, and fixes.

    Input: packages is a list of {"name": ..., "version": ..., "ecosystem": ...} dicts.
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

            # Step 1: Collect all raw vulnerability stubs & unique vulnerability IDs
            batch_raw_map = {}
            all_vuln_ids = set()

            for i, result in enumerate(results):
                if i >= len(packages):
                    break
                pkg = packages[i]
                pkg_key = f"{pkg['name']}@{pkg['version']}"
                raw_vulns = result.get("vulns", [])
                batch_raw_map[pkg_key] = (pkg, raw_vulns)
                for v in raw_vulns:
                    vid = v.get("id")
                    if vid:
                        all_vuln_ids.add(vid)

            # Step 2: Fetch details concurrently for uncached vuln IDs
            uncached_ids = [vid for vid in all_vuln_ids if vid not in _VULN_CACHE]
            if uncached_ids:
                tasks = [_fetch_single_vuln_detail(client, vid) for vid in uncached_ids]
                await asyncio.gather(*tasks, return_exceptions=True)

            # Step 3: Build detailed parsed vulnerability objects per package
            vuln_map = {}
            for pkg_key, (pkg, raw_vulns) in batch_raw_map.items():
                parsed_list = []
                for v_stub in raw_vulns:
                    vid = v_stub.get("id", "")
                    v_detail = _VULN_CACHE.get(vid, v_stub)
                    
                    summary = v_detail.get("summary") or v_stub.get("summary") or f"Security advisory {vid}"
                    details = v_detail.get("details") or v_stub.get("details") or ""
                    db_spec = v_detail.get("database_specific")
                    cwe_ids = []
                    if isinstance(db_spec, dict):
                        raw_cwes = db_spec.get("cwe_ids", [])
                        if isinstance(raw_cwes, list):
                            cwe_ids = [str(c) for c in raw_cwes]

                    severity = _extract_severity(v_detail)
                    cvss = _extract_cvss(v_detail, severity)
                    fix_ver = _extract_fix(v_detail, pkg["name"])

                    parsed_list.append({
                        "id": vid,
                        "summary": summary,
                        "details": details,
                        "cwe_ids": cwe_ids,
                        "severity": severity,
                        "cvss_score": cvss,
                        "fixed_version": fix_ver
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
