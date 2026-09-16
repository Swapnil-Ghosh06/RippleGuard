# -*- coding: utf-8 -*-
"""
deps.dev Dependency Resolution Service for RippleGuard.

CRITICAL PATH MODULE:
This service is the core dependency resolution pipeline for RippleGuard.
It queries Google's Open Source Insights (deps.dev API v3) to retrieve full
resolved transitive dependency trees and direct dependencies for npm and PyPI packages.

Every node and edge in Zahid's NetworkX Graph Engine (backend/api/services/graph_service.py)
originates from what this module returns.

API Endpoint:
https://api.deps.dev/v3/systems/{sys}/packages/{encoded_pkg}/versions/{version}:dependencies

Downstream Data Contract:
- Nodes: list of {"name": str, "version": str, "ecosystem": "npm" | "pypi"}
- Edges: list of (from_idx, to_idx) integer tuples referencing nodes list indices
"""

import asyncio
import httpx


async def get_all_deps_as_flat_list(
    package: str, ecosystem: str, version: str
) -> tuple[list[dict], list[tuple[int, int]]]:
    """
    Fetch the full resolved transitive dependency tree from deps.dev API.

    Returns:
        tuple (flat_nodes, flat_edges) where:
        - flat_nodes: list of {"name": str, "version": str, "ecosystem": str}
        - flat_edges: list of (from_idx, to_idx) integer tuples
    """
    sys_map = {"npm": "npm", "pypi": "pypi"}
    sys = sys_map.get(ecosystem.lower(), ecosystem.lower())
    encoded_pkg = package.replace("/", "%2F")
    url = f"https://api.deps.dev/v3/systems/{sys}/packages/{encoded_pkg}/versions/{version}:dependencies"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url)
            if response.status_code == 404:
                return ([], [])
            response.raise_for_status()
            data = response.json()

            nodes_raw = data.get("nodes", [])
            edges_raw = data.get("edges", [])

            flat_nodes = []
            for node in nodes_raw:
                vk = node.get("versionKey", {})
                eco = vk.get("system", sys).lower()
                flat_nodes.append({
                    "name": vk.get("name", ""),
                    "version": vk.get("version", ""),
                    "ecosystem": eco
                })

            flat_edges = []
            for edge in edges_raw:
                from_idx = edge.get("fromNode")
                to_idx = edge.get("toNode")
                if from_idx is not None and to_idx is not None:
                    flat_edges.append((int(from_idx), int(to_idx)))

            return (flat_nodes, flat_edges)

    except httpx.TimeoutException:
        raise TimeoutError(f"deps.dev timed out for {package}@{version}")
    except (httpx.HTTPError, Exception):
        # On any non-timeout failure, return empty graph structure gracefully
        # to ensure graph construction falls back safely without crashing.
        return ([], [])


async def get_direct_dependencies(
    package: str, ecosystem: str, version: str
) -> list[dict]:
    """
    Fetch direct (level-1) dependencies for a given package and version from deps.dev API.

    Returns a list of flat node dicts corresponding to targets of edges originating at root (fromNode == 0).
    Used as a lightweight fallback when full graph resolution is unneeded or too large.
    """
    flat_nodes, flat_edges = await get_all_deps_as_flat_list(package, ecosystem, version)
    if not flat_nodes or not flat_edges:
        return []

    direct_indices = {to_idx for from_idx, to_idx in flat_edges if from_idx == 0}
    return [
        flat_nodes[idx]
        for idx in direct_indices
        if 0 <= idx < len(flat_nodes)
    ]


# Alias for backward compatibility across endpoints
get_dependencies = get_direct_dependencies



if __name__ == "__main__":
    async def main():
        print("--- Testing get_all_deps_as_flat_list for 'express@4.18.2' (npm) ---")
        express_nodes, express_edges = await get_all_deps_as_flat_list("express", "npm", "4.18.2")
        print(f"Total nodes: {len(express_nodes)}")
        print(f"Total edges: {len(express_edges)}")
        print("First 5 nodes:")
        for node in express_nodes[:5]:
            print(f"  - {node['name']}@{node['version']} ({node['ecosystem']})")

        print("\n--- Testing get_all_deps_as_flat_list for 'requests@2.31.0' (PyPI) ---")
        req_nodes, req_edges = await get_all_deps_as_flat_list("requests", "pypi", "2.31.0")
        print(f"Total nodes: {len(req_nodes)}")
        print(f"Total edges: {len(req_edges)}")
        print("First 3 nodes:")
        for node in req_nodes[:3]:
            print(f"  - {node['name']}@{node['version']} ({node['ecosystem']})")

        print("\n--- Testing get_direct_dependencies for 'lodash@4.17.21' (npm) ---")
        lodash_direct = await get_direct_dependencies("lodash", "npm", "4.17.21")
        print(f"Direct dependencies count: {len(lodash_direct)}")
        print(f"Direct dependencies list: {lodash_direct}")

        print("\n--- Testing Scoped Package: '@babel/core@7.22.0' (npm) ---")
        babel_nodes, babel_edges = await get_all_deps_as_flat_list("@babel/core", "npm", "7.22.0")
        print(f"@babel/core total nodes: {len(babel_nodes)}")
        print(f"@babel/core total edges: {len(babel_edges)}")
        if babel_nodes:
            print(f"Root node: {babel_nodes[0]}")

        print("\n--- Testing 404 Case: 'this-fake-package-xyz@1.0.0' ---")
        fake_nodes, fake_edges = await get_all_deps_as_flat_list("this-fake-package-xyz", "npm", "1.0.0")
        print(f"404 result nodes: {fake_nodes}")
        print(f"404 result edges: {fake_edges}")

    asyncio.run(main())
