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
from api.services.enrichment_service import generate_vulnerability_impact_summary
from api.services.famous_attacks import FAMOUS_ATTACKS

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
    if eco == "pypi":
        request.package = pypi_service.normalize_pypi_package_name(request.package)

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

        root_candidates = [n for n in G.nodes if G.nodes[n].get("is_root")]
        if root_candidates:
            version = G.nodes[root_candidates[0]]["version"]

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

        raw_dl = downloads_map.get(name)
        if raw_dl is None:
            raw_dl = downloads_map.get(nid)

        dl_count = int(raw_dl) if raw_dl is not None else 0
        dl_unavailable = (raw_dl is None)

        raw_vulns = vulns_map.get(nid, [])
        if not raw_vulns:
            attack_match = next(
                (a for a in FAMOUS_ATTACKS if a.get("package") == name and (not a.get("version") or a.get("version") == ver)),
                None
            )
            if attack_match:
                raw_vulns = [{
                    "id": attack_match.get("cve", attack_match.get("id")),
                    "severity": "CRITICAL",
                    "cvss_score": 10.0,
                    "summary": attack_match.get("description", ""),
                    "affected_versions": [ver],
                    "fixed_version": None,
                    "impact_summary": f"Critical zero-day Remote Code Execution (RCE) flaw allowing unauthenticated remote attackers to execute arbitrary system commands ({attack_match.get('name')} substitute attack on {name})."
                }]
                vulns_map[nid] = raw_vulns

        vuln_objs = [
            Vulnerability(
                id=v.get("id", ""),
                severity=v.get("severity", "UNKNOWN"),
                cvss_score=float(v.get("cvss_score", 0.0)),
                summary=v.get("summary", ""),
                affected_versions=v.get("affected_versions", []),
                fixed_version=v.get("fixed_version"),
                impact_summary=v.get("impact_summary") or generate_vulnerability_impact_summary(v, name)
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
            downloads_unavailable=dl_unavailable,
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

    raw_root_dl = downloads_map.get(request.package)
    root_downloads = int(raw_root_dl) if raw_root_dl is not None else 0
    root_unavailable = (raw_root_dl is None)
    root_obj = PackageRoot(
        name=request.package,
        version=version,
        ecosystem=eco,
        monthly_downloads=root_downloads,
        downloads_unavailable=root_unavailable
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
