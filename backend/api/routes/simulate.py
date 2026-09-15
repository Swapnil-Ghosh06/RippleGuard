import asyncio
from fastapi import APIRouter, status, HTTPException
import networkx as nx

from api.services.exceptions import PackageNotFoundError, ServiceTimeoutError
from api.models.request_models import SimulateRequest
from api.models.response_models import (
    SimulateResponse,
    PropagationData,
    PropagationStep,
    BlastRadius,
    SeverityBreakdown,
    MitigationData,
    MitigationAction,
    ShadowDependency
)
from api.services.graph_service import (
    simulate_compromise,
    build_dependency_graph,
    _graph_storage
)
from api.services import npm_service, osv_service

router = APIRouter(tags=["simulate"])


def build_simulate_response(sim_result: dict, comp_node: str) -> SimulateResponse:
    """Format raw simulation result dictionary into Pydantic SimulateResponse model."""
    prop_raw = sim_result["propagation"]
    blast_raw = sim_result["blast_radius"]
    mit_raw = sim_result["mitigation"]

    propagation_steps = [
        PropagationStep(
            node=p["node"],
            step=p["step"],
            delay_ms=p["delay_ms"]
        )
        for p in prop_raw.get("propagation_order", [])
    ]

    propagation_obj = PropagationData(
        affected_nodes=prop_raw.get("affected_nodes", []),
        propagation_paths=prop_raw.get("propagation_paths", []),
        propagation_order=propagation_steps,
        critical_chain=sim_result.get("critical_chain", [])
    )

    sev_breakdown = SeverityBreakdown(
        critical_path_nodes=blast_raw["severity_breakdown"]["critical_path_nodes"],
        high_impact_nodes=blast_raw["severity_breakdown"]["high_impact_nodes"],
        medium_impact_nodes=blast_raw["severity_breakdown"]["medium_impact_nodes"]
    )

    blast_radius_obj = BlastRadius(
        affected_package_count=blast_raw["affected_package_count"],
        total_monthly_downloads_affected=blast_raw["total_monthly_downloads_affected"],
        estimated_apps_affected=blast_raw["estimated_apps_affected"],
        blast_score=blast_raw["blast_score"],
        severity_breakdown=sev_breakdown
    )

    priority_actions = [
        MitigationAction(
            action=act["action"],
            eliminates_blast_percent=act["eliminates_blast_percent"],
            affected_packages_resolved=act["affected_packages_resolved"],
            effort=act["effort"]
        )
        for act in mit_raw.get("priority_actions", [])
    ]

    mitigation_obj = MitigationData(
        priority_actions=priority_actions,
        minimum_fix_set=mit_raw.get("minimum_fix_set", [])
    )

    shadow_deps = [
        ShadowDependency(
            node=sd["node"],
            package=sd["package"],
            depth=sd["depth"],
            in_degree=sd["in_degree"],
            monthly_downloads=sd["monthly_downloads"],
            chokepoint_score=sd["chokepoint_score"]
        )
        for sd in sim_result.get("shadow_dependencies", [])
    ]

    return SimulateResponse(
        compromised_node=comp_node,
        propagation=propagation_obj,
        blast_radius=blast_radius_obj,
        mitigation=mitigation_obj,
        critical_chain=sim_result.get("critical_chain", []),
        shadow_dependencies=shadow_deps
    )


@router.post(
    "/simulate",
    response_model=SimulateResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate compromise propagation across dependency graph"
)
async def simulate_compromise_route(request: SimulateRequest):
    """
    Simulates injection of a compromise into a dependency node,
    computing upward propagation, blast radius score, Butterfly Trace,
    Shadow Dependencies, and prioritized mitigations.
    """
    comp_node = request.compromised_node
    graph_entry = None

    # 1. Look up cached graph from /analyze
    if request.graph_id:
        if request.graph_id in _graph_storage:
            graph_entry = _graph_storage[request.graph_id]
        elif not request.graph_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Graph '{request.graph_id}' not found. Please run /analyze first."
            )
    elif comp_node in _graph_storage:
        graph_entry = _graph_storage[comp_node]
    else:
        pkg_name = comp_node.split("@")[0]
        if pkg_name in _graph_storage:
            graph_entry = _graph_storage[pkg_name]

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
        if "@" in comp_node:
            pkg_name, version = comp_node.split("@", 1)
        else:
            pkg_name = comp_node
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

    # Ensure compromised node exists in graph
    if comp_node not in G.nodes:
        matching = [n for n in G.nodes if n.startswith(comp_node.split("@")[0])]
        if matching:
            comp_node = matching[0]
        else:
            G.add_node(
                comp_node,
                name=comp_node.split("@")[0],
                version=comp_node.split("@")[1] if "@" in comp_node else "latest",
                ecosystem="npm",
                depth=0,
                is_root=True
            )

    # 4. Run simulate_compromise
    sim_result = simulate_compromise(
        G=G,
        compromised_node=comp_node,
        download_data=downloads_map,
        vuln_data=vulns_map
    )

    response = build_simulate_response(sim_result, comp_node)

    # Cache last simulation result onto graph entry for export report
    if graph_entry is not None:
        graph_entry["last_simulation"] = response.model_dump()
        graph_entry["last_compromised_node"] = comp_node

    return response
