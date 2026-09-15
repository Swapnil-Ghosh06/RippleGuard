"""
Scenario Comparison Route for RippleGuard (Feature F7).

Allows side-by-side comparison of two compromise injection scenarios
on the same dependency graph to identify which compromise is more dangerous.
(Owned by Zahid per docs/TDD.md Section 2.3 and docs/PRD.md Section 4)
"""

import asyncio
from fastapi import APIRouter, status, HTTPException
import networkx as nx

from api.services.exceptions import PackageNotFoundError, ServiceTimeoutError
from api.models.request_models import CompareRequest
from api.models.response_models import CompareResponse, ComparisonData
from api.routes.simulate import build_simulate_response
from api.services.graph_service import (
    simulate_compromise,
    build_dependency_graph,
    _graph_storage
)
from api.services import npm_service, osv_service

router = APIRouter(tags=["compare"])


@router.post(
    "/compare",
    response_model=CompareResponse,
    status_code=status.HTTP_200_OK,
    summary="Compare blast radius of two compromise scenarios"
)
async def compare_compromises(request: CompareRequest):
    """
    Compares the blast radius of compromising node_a vs node_b on the same dependency graph.
    Returns both full simulation results, determines the higher-risk 'winner', and provides
    a clear natural language summary with the danger multiplier.
    """
    node_a = request.node_a.strip()
    node_b = request.node_b.strip()

    graph_entry = None

    # 1. Look up cached graph from /analyze or /simulate
    if request.graph_id:
        if request.graph_id in _graph_storage:
            graph_entry = _graph_storage[request.graph_id]
        elif not request.graph_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Graph '{request.graph_id}' not found. Please run /analyze first."
            )
    elif node_a in _graph_storage:
        graph_entry = _graph_storage[node_a]
    elif node_b in _graph_storage:
        graph_entry = _graph_storage[node_b]
    else:
        pkg_a = node_a.split("@")[0]
        pkg_b = node_b.split("@")[0]
        if pkg_a in _graph_storage:
            graph_entry = _graph_storage[pkg_a]
        elif pkg_b in _graph_storage:
            graph_entry = _graph_storage[pkg_b]

    # 2. If graph was passed in request.graph_data, construct DiGraph from it
    if not graph_entry and request.graph_data:
        nodes_raw = request.graph_data.get("nodes", [])
        edges_raw = request.graph_data.get("edges", [])

        G = nx.DiGraph()
        downloads_map = {}
        vulns_map = {}
        for n in nodes_raw:
            nid = n.get("id") or f"{n.get('name')}@{n.get('version')}"
            G.add_node(
                nid,
                name=n.get("name", ""),
                version=n.get("version", ""),
                ecosystem=n.get("ecosystem", "npm"),
                depth=n.get("depth", 0),
                is_root=n.get("is_root", False)
            )
            downloads_map[nid] = n.get("monthly_downloads", 0)
            downloads_map[n.get("name", "")] = n.get("monthly_downloads", 0)
            vulns_map[nid] = n.get("vulnerabilities", [])

        for e in edges_raw:
            G.add_edge(e["source"], e["target"])

        graph_entry = {
            "graph": G,
            "downloads": downloads_map,
            "vulns": vulns_map
        }

    # 3. Fallback: Rebuild graph on the fly if not cached
    if not graph_entry:
        target_node = node_a
        if "@" in target_node:
            pkg_name, version = target_node.split("@", 1)
        else:
            pkg_name = target_node
            version = "latest"

        eco = "npm"
        try:
            if version == "latest":
                version = await asyncio.wait_for(npm_service.get_latest_version(pkg_name), timeout=7.5)

            G = await asyncio.wait_for(build_dependency_graph(pkg_name, eco, version, max_depth=3), timeout=7.5)
            if G.number_of_nodes() == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Package '{pkg_name}' not found."
                )

            node_ids = list(G.nodes)
            packages_for_osv = [
                {
                    "name": G.nodes[nid]["name"],
                    "version": G.nodes[nid]["version"],
                    "ecosystem": G.nodes[nid]["ecosystem"]
                }
                for nid in node_ids
            ]
            package_names = [G.nodes[nid]["name"] for nid in node_ids]

            downloads_task = npm_service.get_downloads_batch(package_names)
            vulns_task = osv_service.query_vulnerabilities_batch(packages_for_osv)
            downloads_map, vulns_map = await asyncio.wait_for(asyncio.gather(downloads_task, vulns_task), timeout=7.5)

            graph_entry = {
                "graph": G,
                "downloads": downloads_map,
                "vulns": vulns_map,
                "package": pkg_name,
                "version": version,
                "ecosystem": eco
            }
        except PackageNotFoundError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e) or f"Package '{pkg_name}' not found."
            )
        except (ServiceTimeoutError, asyncio.TimeoutError):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="External service timeout while fetching package dependencies."
            )

    G = graph_entry["graph"]
    downloads_map = graph_entry.get("downloads", {})
    vulns_map = graph_entry.get("vulns", {})

    # Ensure node_a exists or resolve prefix
    actual_node_a = node_a
    if actual_node_a not in G.nodes:
        matching_a = [n for n in G.nodes if n.startswith(actual_node_a.split("@")[0])]
        if matching_a:
            actual_node_a = matching_a[0]
        else:
            G.add_node(
                actual_node_a,
                name=actual_node_a.split("@")[0],
                version=actual_node_a.split("@")[1] if "@" in actual_node_a else "latest",
                ecosystem="npm",
                depth=0,
                is_root=False
            )

    # Ensure node_b exists or resolve prefix
    actual_node_b = node_b
    if actual_node_b not in G.nodes:
        matching_b = [n for n in G.nodes if n.startswith(actual_node_b.split("@")[0])]
        if matching_b:
            actual_node_b = matching_b[0]
        else:
            G.add_node(
                actual_node_b,
                name=actual_node_b.split("@")[0],
                version=actual_node_b.split("@")[1] if "@" in actual_node_b else "latest",
                ecosystem="npm",
                depth=0,
                is_root=False
            )

    # 4. Simulate compromise for both nodes
    sim_raw_a = simulate_compromise(
        G=G,
        compromised_node=actual_node_a,
        download_data=downloads_map,
        vuln_data=vulns_map
    )
    sim_res_a = build_simulate_response(sim_raw_a, actual_node_a)

    sim_raw_b = simulate_compromise(
        G=G,
        compromised_node=actual_node_b,
        download_data=downloads_map,
        vuln_data=vulns_map
    )
    sim_res_b = build_simulate_response(sim_raw_b, actual_node_b)

    # 5. Compute winner and summary per docs/TDD.md Section 2.3
    score_a = sim_res_a.blast_radius.blast_score
    score_b = sim_res_b.blast_radius.blast_score

    pkg_name_a = actual_node_a.split("@")[0]
    pkg_name_b = actual_node_b.split("@")[0]

    if score_a > score_b:
        winner = "node_a"
        ratio = round(score_a / max(score_b, 0.1), 1)
        summary = f"Compromising {pkg_name_a} is {ratio}x more dangerous than compromising {pkg_name_b}"
    elif score_b > score_a:
        winner = "node_b"
        ratio = round(score_b / max(score_a, 0.1), 1)
        summary = f"Compromising {pkg_name_b} is {ratio}x more dangerous than compromising {pkg_name_a}"
    else:
        winner = "tie"
        summary = f"Compromising {pkg_name_a} and {pkg_name_b} have equivalent blast radius scores ({score_a})"

    return CompareResponse(
        comparison=ComparisonData(
            node_a=sim_res_a,
            node_b=sim_res_b,
            winner=winner,
            summary=summary
        )
    )
