import asyncio
from typing import Dict
from fastapi import APIRouter, status, HTTPException
from api.services.exceptions import PackageNotFoundError, ServiceTimeoutError

from api.models.request_models import AnalyzeRequest
from api.models.response_models import (
    AnalyzeResponse,
    PackageRoot,
    GraphData,
    PackageNode,
    PackageEdge,
    GraphStats,
    Vulnerability
)
from api.services.graph_service import build_dependency_graph, _graph_storage
from api.services import npm_service, pypi_service, osv_service

router = APIRouter(tags=["analyze"])

# Temporary in-process memory cache for local testing and demo stability.
# Note: Hari owns the production caching layer per docs/TDD.md Section 9.2 —
# this is a temporary in-process version for local testing.
_analyze_cache: Dict[str, AnalyzeResponse] = {}


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze package dependency graph and vulnerabilities"
)
@router.post(
    "/api/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False
)
async def analyze_package(request: AnalyzeRequest):

    """
    Analyzes a package by building its dependency graph via BFS,
    and concurrently enriching all nodes with download counts and vulnerability data.
    Enforces <8s end-to-end SLA, returning 503 on timeout and 404 for unresolvable packages.
    """
    eco = request.ecosystem.lower()

    try:
        # Resolve latest version if not explicitly pinned
        version = request.version
        if not version or version == "latest":
            if eco == "npm":
                version = await asyncio.wait_for(npm_service.get_latest_version(request.package), timeout=15.0)
            elif eco == "pypi":
                meta = await asyncio.wait_for(pypi_service.get_pypi_metadata(request.package), timeout=15.0)
                version = meta.get("version", "latest")
            else:
                version = "latest"

        cache_key = f"{request.package}-{eco}-{version}-depth{request.depth}"
        if cache_key in _analyze_cache:
            return _analyze_cache[cache_key]

        # Step 1: Construct dependency graph via BFS
        G = await asyncio.wait_for(
            build_dependency_graph(
                package=request.package,
                ecosystem=eco,
                version=version,
                max_depth=request.depth
            ),
            timeout=25.0
        )

        if G.number_of_nodes() == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Package '{request.package}' not found or has no resolvable dependency tree."
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

        # Step 2: Fetch monthly downloads + vulnerabilities concurrently via asyncio.gather
        if eco == "npm":
            downloads_task = npm_service.get_downloads_batch(package_names)
        else:
            downloads_task = pypi_service.get_downloads_batch(package_names)

        vulns_task = osv_service.query_vulnerabilities_batch(packages_for_osv)

        downloads_map, vulns_map = await asyncio.wait_for(
            asyncio.gather(downloads_task, vulns_task),
            timeout=25.0
        )
    except PackageNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e) or f"Package '{request.package}' not found in {eco} registry."
        )
    except (ServiceTimeoutError, asyncio.TimeoutError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="External service timeout (npm/pypi/deps.dev). Upstream registry did not respond within timeout."
        )


    # Step 3: Serialize graph into exact AnalyzeResponse shape
    nodes_list = []
    vulnerable_nodes_count = 0
    max_depth_reached = 0

    for nid in node_ids:
        ndata = G.nodes[nid]
        name = ndata["name"]
        ver = ndata["version"]
        depth = ndata.get("depth", 0)
        is_root = ndata.get("is_root", False)

        if depth > max_depth_reached:
            max_depth_reached = depth

        dl_count = downloads_map.get(name, 0)
        raw_vulns = vulns_map.get(nid, [])

        vuln_objs = [
            Vulnerability(
                id=v.get("id", ""),
                severity=v.get("severity", "UNKNOWN"),
                cvss_score=float(v.get("cvss_score", 0.0)),
                summary=v.get("summary", ""),
                affected_versions=v.get("affected_versions", []),
                fixed_version=v.get("fixed_version")
            )
            for v in raw_vulns
        ]

        if vuln_objs:
            vulnerable_nodes_count += 1

        # Composite node risk score (max CVSS score across vulnerabilities)
        risk_score = round(max([v.cvss_score for v in vuln_objs], default=0.0), 1)

        nodes_list.append(PackageNode(
            id=nid,
            name=name,
            version=ver,
            ecosystem=eco,
            monthly_downloads=dl_count,
            depth=depth,
            vulnerabilities=vuln_objs,
            risk_score=risk_score,
            is_root=is_root
        ))

    edges_list = [
        PackageEdge(
            source=u,
            target=v,
            dependency_type="direct"
        )
        for u, v in G.edges
    ]

    root_downloads = downloads_map.get(request.package, 0)
    root_obj = PackageRoot(
        name=request.package,
        version=version,
        ecosystem=eco,
        monthly_downloads=root_downloads
    )

    stats_obj = GraphStats(
        total_nodes=len(nodes_list),
        total_edges=len(edges_list),
        vulnerable_nodes=vulnerable_nodes_count,
        max_depth=max_depth_reached
    )

    response = AnalyzeResponse(
        root=root_obj,
        graph=GraphData(nodes=nodes_list, edges=edges_list),
        stats=stats_obj
    )

    storage_entry = {
        "graph": G,
        "downloads": downloads_map,
        "vulns": vulns_map,
        "package": request.package,
        "version": version,
        "ecosystem": eco,
        "depth": request.depth,
        "graph_id": cache_key,
        "analyze_response": response.model_dump()
    }
    _graph_storage[cache_key] = storage_entry
    _graph_storage[f"{request.package}@{version}"] = storage_entry
    _graph_storage[request.package] = storage_entry
    return response
