# STUB — replace with Hari's real implementation from hari-backend before merging to main.
# Interface must not change:
#   async def query_vulnerabilities_batch(packages: list[dict]) -> dict[str, list]
#   async def get_vulnerabilities_batch(packages: list[dict]) -> dict[str, list]

import asyncio
from typing import List, Dict, Any

MOCK_VULNS: Dict[str, List[Dict[str, Any]]] = {
    "lodash": [
        {
            "id": "GHSA-35jh-r3h4-6jhm",
            "summary": "Prototype pollution in lodash",
            "severity": "HIGH",
            "cvss_score": 7.5,
            "affected_versions": ["<4.17.21"],
            "fixed_version": "4.17.21"
        }
    ],
    "body-parser": [
        {
            "id": "GHSA-4m63-479p-6p4x",
            "summary": "Denial of Service in body-parser",
            "severity": "MEDIUM",
            "cvss_score": 5.3,
            "affected_versions": ["<1.20.2"],
            "fixed_version": "1.20.2"
        }
    ]
}

async def query_vulnerabilities_batch(packages: List[Dict[str, str]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Mock querying OSV.dev for known vulnerabilities across package node dictionaries.
    Args:
        packages: List of {"name": str, "version": str, "ecosystem": str}
    Returns:
        Dict mapping "package@version" to list of parsed vulnerability dicts.
    """
    await asyncio.sleep(0.01)
    vuln_map: Dict[str, List[Dict[str, Any]]] = {}

    for pkg in packages:
        name = pkg.get("name", "")
        version = pkg.get("version", "")
        pkg_key = f"{name}@{version}"
        vuln_map[pkg_key] = MOCK_VULNS.get(name.lower(), [])

    return vuln_map

async def get_vulnerabilities_batch(packages: List[Dict[str, str]]) -> Dict[str, List[Dict[str, Any]]]:
    """Alias for query_vulnerabilities_batch per TDD Section 4.3 specification."""
    return await query_vulnerabilities_batch(packages)
