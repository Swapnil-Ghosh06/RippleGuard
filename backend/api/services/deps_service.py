# STUB — replace with Hari's real implementation from hari-backend before merging to main.
# Interface must not change:
#   async def get_dependencies(package: str, ecosystem: str, version: str) -> list[dict]
#   async def get_all_deps_as_flat_list(package: str, ecosystem: str, version: str) -> tuple[list[dict], list[tuple[int, int]]]
#   async def get_direct_dependencies(package: str, ecosystem: str, version: str) -> list[dict]

import asyncio
from typing import List, Tuple, Dict, Any

MOCK_DEPENDENCY_TREES: Dict[Tuple[str, str], List[Dict[str, str]]] = {
    # npm ecosystem
    ("lodash", "npm"): [
        {"name": "express", "version": "4.18.2"},
        {"name": "webpack", "version": "5.88.0"},
    ],
    ("express", "npm"): [
        {"name": "body-parser", "version": "1.20.1"},
        {"name": "cookie-parser", "version": "1.4.6"},
    ],
    ("webpack", "npm"): [
        {"name": "acorn", "version": "8.10.0"},
        {"name": "enhanced-resolve", "version": "5.15.0"},
    ],
    ("body-parser", "npm"): [
        {"name": "bytes", "version": "3.1.2"},
        {"name": "depd", "version": "2.0.0"},
    ],
    ("cookie-parser", "npm"): [
        {"name": "cookie", "version": "0.5.0"},
        {"name": "cookie-signature", "version": "1.0.6"},
    ],
    ("acorn", "npm"): [],
    ("enhanced-resolve", "npm"): [
        {"name": "graceful-fs", "version": "4.2.11"},
        {"name": "tapable", "version": "2.2.1"},
    ],
    ("bytes", "npm"): [],
    ("depd", "npm"): [],
    ("cookie", "npm"): [],
    ("cookie-signature", "npm"): [],
    ("graceful-fs", "npm"): [],
    ("tapable", "npm"): [],

    # PyPI ecosystem
    ("requests", "pypi"): [
        {"name": "urllib3", "version": "2.0.7"},
        {"name": "certifi", "version": "2023.7.22"},
        {"name": "charset-normalizer", "version": "3.3.2"},
        {"name": "idna", "version": "3.4"},
    ],
    ("urllib3", "pypi"): [
        {"name": "six", "version": "1.16.0"},
    ],
    ("certifi", "pypi"): [],
    ("charset-normalizer", "pypi"): [],
    ("idna", "pypi"): [],
    ("six", "pypi"): [],
}


async def get_dependencies(
    package: str, ecosystem: str, version: str
) -> List[Dict[str, str]]:
    """
    Fetch direct dependencies for a given package and version from deps.dev API.
    Returns:
        List of {"name": str, "version": str, "ecosystem": str}
    """
    await asyncio.sleep(0.01)
    eco = ecosystem.lower()
    pkg_key = (package.lower(), eco)

    deps = MOCK_DEPENDENCY_TREES.get(pkg_key)
    if deps is not None:
        return [{"name": d["name"], "version": d["version"], "ecosystem": eco} for d in deps]

    return [
        {"name": f"{package}-core", "version": "1.0.0", "ecosystem": eco},
        {"name": f"{package}-utils", "version": "1.0.0", "ecosystem": eco},
    ]


async def get_all_deps_as_flat_list(
    package: str, ecosystem: str, version: str
) -> Tuple[List[Dict[str, str]], List[Tuple[int, int]]]:
    """
    Mock fetching full resolved transitive dependency tree from deps.dev API.
    """
    await asyncio.sleep(0.01)
    eco = ecosystem.lower()
    root_ver = version if version and version != "latest" else "1.0.0"

    flat_nodes = [
        {"name": package, "version": root_ver, "ecosystem": eco},
        {"name": "express", "version": "4.18.2", "ecosystem": "npm"},
        {"name": "webpack", "version": "5.88.0", "ecosystem": "npm"},
        {"name": "body-parser", "version": "1.20.1", "ecosystem": "npm"},
    ]

    flat_edges = [
        (0, 1),
        (0, 2),
        (1, 3),
    ]

    return (flat_nodes, flat_edges)


async def get_direct_dependencies(
    package: str, ecosystem: str, version: str
) -> List[Dict[str, str]]:
    """Mock fetching direct (level-1) dependencies for a given package."""
    return await get_dependencies(package, ecosystem, version)
