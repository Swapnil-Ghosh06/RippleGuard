# STUB — replace with Hari's real implementation from hari-backend before merging to main.
# Interface must not change:
#   async def get_all_deps_as_flat_list(package: str, ecosystem: str, version: str) -> tuple[list[dict], list[tuple[int, int]]]
#   async def get_direct_dependencies(package: str, ecosystem: str, version: str) -> list[dict]

import asyncio
from typing import List, Tuple, Dict, Any

async def get_all_deps_as_flat_list(
    package: str, ecosystem: str, version: str
) -> Tuple[List[Dict[str, str]], List[Tuple[int, int]]]:
    """
    Mock fetching full resolved transitive dependency tree from deps.dev API.
    Returns:
        tuple (flat_nodes, flat_edges) where:
        - flat_nodes: list of {"name": str, "version": str, "ecosystem": str}
        - flat_edges: list of (from_idx, to_idx) integer tuples referencing flat_nodes indices
    """
    await asyncio.sleep(0.01)
    eco = ecosystem.lower()
    root_version = version if version and version != "latest" else ("4.17.21" if package.lower() == "lodash" else "1.0.0")

    flat_nodes = [
        {"name": package, "version": root_version, "ecosystem": eco},
        {"name": "express", "version": "4.18.2", "ecosystem": "npm"},
        {"name": "webpack", "version": "5.88.0", "ecosystem": "npm"},
        {"name": "next", "version": "13.4.0", "ecosystem": "npm"},
        {"name": "body-parser", "version": "1.20.1", "ecosystem": "npm"},
        {"name": "cookie-parser", "version": "1.4.6", "ecosystem": "npm"},
    ]

    # In deps.dev, fromNode -> toNode represents dependencies (0 depends on 1 & 2; 1 depends on 4 & 5; 2 depends on 3)
    flat_edges = [
        (0, 1),
        (0, 2),
        (1, 4),
        (1, 5),
        (2, 3),
    ]

    return (flat_nodes, flat_edges)

async def get_direct_dependencies(
    package: str, ecosystem: str, version: str
) -> List[Dict[str, str]]:
    """Mock fetching direct (level-1) dependencies for a given package."""
    flat_nodes, flat_edges = await get_all_deps_as_flat_list(package, ecosystem, version)
    direct_indices = {to_idx for from_idx, to_idx in flat_edges if from_idx == 0}
    return [flat_nodes[idx] for idx in direct_indices if 0 <= idx < len(flat_nodes)]
