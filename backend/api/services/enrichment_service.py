# -*- coding: utf-8 -*-
"""
Enrichment and CVE Alert Service for RippleGuard.

This module provides data enrichment, graph statistics calculation, and live CVE feed monitoring.
It merges raw dependency node lists with vulnerability lookup maps and download metrics to produce
the normalized node payload required by Zahid's graph engine.

Data Flow:
    1. enrich_nodes_with_vulnerabilities: Combines flat dependency nodes, OSV vulns, and npm/pypi downloads.
    2. calculate_graph_stats: Computes aggregate graph metrics (node/edge counts, vuln count, total downloads).
    3. get_recent_cve_alerts: Polls OSV.dev for newly modified vulnerability advisories in the last 7 days.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
import httpx

OSV_QUERY_URL = "https://api.osv.dev/v1/query"


def enrich_nodes_with_vulnerabilities(
    flat_nodes: List[dict],
    vuln_map: Dict[str, list],
    download_map: Dict[str, int]
) -> List[dict]:
    """
    Enriches raw dependency node dictionaries with download metrics, vulnerabilities, and risk scores.

    Args:
        flat_nodes: Raw list of {"name": ..., "version": ..., "ecosystem": ...}
        vuln_map: Dict mapping "name@version" to parsed vulnerability lists
        download_map: Dict mapping package name to monthly download count

    Returns:
        List of enriched node dicts, each containing:
            name, version, ecosystem, monthly_downloads, vulnerabilities, risk_score
    """
    enriched_nodes = []

    for node in flat_nodes:
        pkg_name = node.get("name", "")
        pkg_version = node.get("version", "")
        pkg_ecosystem = node.get("ecosystem", "npm")
        node_key = f"{pkg_name}@{pkg_version}"

        downloads = download_map.get(pkg_name, 0)
        vulnerabilities = vuln_map.get(node_key, [])

        max_risk = 0.0
        if vulnerabilities:
            for v in vulnerabilities:
                cvss = v.get("cvss_score", 0.0)
                if cvss > max_risk:
                    max_risk = cvss

        enriched_nodes.append({
            "name": pkg_name,
            "version": pkg_version,
            "ecosystem": pkg_ecosystem,
            "monthly_downloads": downloads,
            "vulnerabilities": vulnerabilities,
            "risk_score": max_risk
        })

    return enriched_nodes


def calculate_graph_stats(enriched_nodes: List[dict], edges: List[tuple]) -> dict:
    """
    Calculates summary graph metrics for the analyzed dependency graph.

    Args:
        enriched_nodes: Fully enriched list of package node dictionaries
        edges: List of dependency edges as (source, target) tuples or edge dicts

    Returns:
        Dict with total_nodes, total_edges, vulnerable_nodes, and total_monthly_downloads
    """
    total_nodes = len(enriched_nodes)
    total_edges = len(edges)

    vulnerable_nodes = 0
    total_downloads = 0

    for node in enriched_nodes:
        total_downloads += node.get("monthly_downloads", 0)
        if node.get("vulnerabilities"):
            vulnerable_nodes += 1

    return {
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "vulnerable_nodes": vulnerable_nodes,
        "total_monthly_downloads": total_downloads
    }


def _parse_iso_datetime(iso_str: str) -> Optional[datetime]:
    """Helper to parse ISO 8601 string into a timezone-aware UTC datetime."""
    try:
        clean_str = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


async def _query_single_package_alerts(
    client: httpx.AsyncClient,
    pkg: dict,
    cutoff_time: datetime
) -> List[dict]:
    """Hits OSV /query for a single package and extracts advisories modified within 7 days."""
    eco = "PyPI" if pkg.get("ecosystem", "").lower() == "pypi" else "npm"
    payload = {
        "version": pkg.get("version", ""),
        "package": {
            "name": pkg.get("name", ""),
            "ecosystem": eco
        }
    }

    try:
        response = await client.post(OSV_QUERY_URL, json=payload)
        if response.status_code != 200:
            return []
        data = response.json()
        raw_vulns = data.get("vulns", [])

        alerts = []
        for v in raw_vulns:
            mod_str = v.get("modified")
            if not mod_str:
                continue

            mod_dt = _parse_iso_datetime(mod_str)
            if mod_dt and mod_dt >= cutoff_time:
                alerts.append({
                    "package": f"{pkg['name']}@{pkg['version']}",
                    "ecosystem": pkg.get("ecosystem", "npm"),
                    "cve_id": v.get("id", "UNKNOWN"),
                    "summary": v.get("summary", ""),
                    "modified": mod_str,
                    "severity": "UNKNOWN"
                })

        return alerts
    except Exception:
        return []


async def get_recent_cve_alerts(packages: List[dict]) -> List[dict]:
    """
    Checks if any package in the provided package list received a new or updated CVE advisory
    in the last 7 days.

    Args:
        packages: List of {"name": ..., "version": ..., "ecosystem": ...}

    Returns:
        List of alert dicts for vulnerabilities modified in the last 7 days.
    """
    if not packages:
        return []

    cutoff_time = datetime.now(timezone.utc) - timedelta(days=7)

    async with httpx.AsyncClient(timeout=15.0) as client:
        tasks = [
            _query_single_package_alerts(client, pkg, cutoff_time)
            for pkg in packages
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    all_alerts = []
    for res in results:
        if isinstance(res, list):
            all_alerts.extend(res)

    return all_alerts


if __name__ == "__main__":
    async def main():
        print("=== Step 7 Verification: Data Enrichment & Live CVE Alerts ===")

        print("\n--- Testing enrich_nodes_with_vulnerabilities ---")
        mock_flat_nodes = [
            {"name": "lodash", "version": "4.17.19", "ecosystem": "npm"},
            {"name": "express", "version": "4.18.2", "ecosystem": "npm"},
            {"name": "requests", "version": "2.31.0", "ecosystem": "pypi"}
        ]

        mock_vuln_map = {
            "lodash@4.17.19": [
                {
                    "id": "GHSA-f23m-r3pf-42rh",
                    "summary": "Prototype pollution in lodash",
                    "severity": "HIGH",
                    "cvss_score": 7.5,
                    "fixed_version": "4.17.21"
                }
            ]
        }

        mock_download_map = {
            "lodash": 82000000,
            "express": 35000000,
            "requests": 50000000
        }

        enriched = enrich_nodes_with_vulnerabilities(
            mock_flat_nodes, mock_vuln_map, mock_download_map
        )
        for node in enriched:
            print(f"Node: {node['name']}@{node['version']} | Downloads: {node['monthly_downloads']} | Risk Score: {node['risk_score']} | Vulns: {len(node['vulnerabilities'])}")

        assert enriched[0]["risk_score"] == 7.5, "Risk score calculation failed!"
        assert enriched[1]["risk_score"] == 0.0, "Risk score should be 0.0 for zero vulns!"
        print("Enrichment and risk score calculation confirmed correct!")

        print("\n--- Testing calculate_graph_stats ---")
        mock_edges = [("express@4.18.2", "lodash@4.17.19")]
        stats = calculate_graph_stats(enriched, mock_edges)
        print("Calculated Stats:", stats)

        assert stats["total_nodes"] == 3
        assert stats["total_edges"] == 1
        assert stats["vulnerable_nodes"] == 1
        assert stats["total_monthly_downloads"] == 167000000
        print("Graph stats calculation confirmed correct!")

        print("\n--- Testing get_recent_cve_alerts (Live OSV API) ---")
        test_packages = [
            {"name": "lodash", "version": "4.17.21", "ecosystem": "npm"},
            {"name": "express", "version": "4.18.2", "ecosystem": "npm"},
            {"name": "Pillow", "version": "9.0.0", "ecosystem": "pypi"}
        ]

        alerts = await get_recent_cve_alerts(test_packages)
        print(f"Alerts found in last 7 days: {len(alerts)}")
        if alerts:
            for alert in alerts:
                print(f"  Alert: {alert}")
        else:
            print("No recent CVE alerts in the last 7 days")

        print("\n--- Testing get_recent_cve_alerts (Empty List) ---")
        empty_alerts = await get_recent_cve_alerts([])
        assert empty_alerts == [], "Empty input test failed!"
        print("Empty input test returned [] correctly!")

    asyncio.run(main())
