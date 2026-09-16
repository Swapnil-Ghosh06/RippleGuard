"""
Export Report Route for RippleGuard (Feature F8).

Allows one-click export of the full graph analysis and compromise simulation
as either a downloadable JSON report or a stateless shareable URL.
(Per docs/PRD.md Section 4 and TDD.md)

DEVELOPER NOTE FOR SWAPNIL & FRONTEND TEAM:
==========================================
We provide two export approaches:
1. Direct JSON Download (GET /export/{graph_id}?download=true):
   *** RECOMMENDED FOR DEMO ***
   Returns the full analysis + simulation state as a downloadable JSON file
   with `Content-Disposition: attachment; filename="rippleguard-report-{graph_id}.json"`.
   Why recommended: Zero risk of state desync during presentation, completely offline-safe,
   and judges can inspect the exact blast metrics and CVE remediation plan directly.
2. Base64 Shareable URL (?state=<base64>):
   Encodes lightweight session parameters (graph_id, package, ecosystem, version, depth,
   compromised_node) into a URL query parameter. On page load, the frontend decodes
   the state and re-fetches or renders the cached state with zero backend database storage needed.
"""

import os
import json
import base64
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, status, HTTPException, Query, Response
from fastapi.responses import JSONResponse

from api.services.graph_service import _graph_storage, simulate_compromise
from api.routes.simulate import build_simulate_response

router = APIRouter(tags=["export"])


@router.get(
    "/export/{graph_id}",
    status_code=status.HTTP_200_OK,
    summary="Export full analysis and simulation report as JSON or shareable URL"
)
async def export_report(
    graph_id: str,
    download: bool = Query(
        default=False,
        description="If True, downloads report as attachment; if False, returns JSON payload with shareable URL"
    ),
    compromised_node: Optional[str] = Query(
        default=None,
        description="Optional node to simulate if no previous simulation was run on this graph"
    ),
    frontend_url: Optional[str] = Query(
        default=None,
        description="Frontend base URL for constructing shareable link"
    )
):
    """
    Exports full analysis and simulation report for a given graph_id.

    Supports two export modes:
    - Direct JSON report download (recommended for zero-risk demo presentations)
    - Base64-encoded shareable URL for browser restoration
    """
    # 1. Check if graph exists in cached memory
    if graph_id not in _graph_storage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Graph '{graph_id}' not found. Please run /analyze first."
        )

    entry = _graph_storage[graph_id]

    # 2. Ensure simulation data exists; if none run yet, simulate root or specified node
    simulation_data = entry.get("last_simulation")
    comp_node = entry.get("last_compromised_node") or compromised_node

    if not simulation_data:
        comp_node = comp_node or f"{entry.get('package')}@{entry.get('version', 'latest')}"
        G = entry["graph"]
        sim_raw = simulate_compromise(
            G=G,
            compromised_node=comp_node,
            download_data=entry.get("downloads", {}),
            vuln_data=entry.get("vulns", {})
        )
        sim_obj = build_simulate_response(sim_raw, comp_node)
        simulation_data = sim_obj.model_dump()
        entry["last_simulation"] = simulation_data
        entry["last_compromised_node"] = comp_node

    # 3. Build Base64-encoded state payload for shareable frontend URL
    state_payload = {
        "graph_id": graph_id,
        "package": entry.get("package"),
        "ecosystem": entry.get("ecosystem"),
        "version": entry.get("version"),
        "depth": entry.get("depth", 3),
        "compromised_node": comp_node
    }
    json_state = json.dumps(state_payload)
    encoded_state = base64.urlsafe_b64encode(json_state.encode("utf-8")).decode("utf-8")

    base_fe = frontend_url or os.getenv("FRONTEND_URL", "http://localhost:5173")
    shareable_url = f"{base_fe.rstrip('/')}/?state={encoded_state}"

    # 4. Assemble structured report
    report_data = {
        "report_meta": {
            "title": f"RippleGuard Supply Chain Compromise Report — {entry.get('package')}",
            "tool": "RippleGuard",
            "version": "1.0.0",
            "graph_id": graph_id,
            "package": entry.get("package"),
            "ecosystem": entry.get("ecosystem"),
            "version_analyzed": entry.get("version"),
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "recommended_demo_mode": "json_download",
            "demo_note": (
                "Direct JSON Download is recommended for the hackathon live demo "
                "because it guarantees offline resilience and zero risk of state desync."
            )
        },
        "shareable_url": shareable_url,
        "state_payload": state_payload,
        "analysis": entry.get("analyze_response"),
        "simulation": simulation_data
    }

    # 5. Return either file download attachment or direct JSON response
    if download:
        filename = f"rippleguard-report-{graph_id}.json"
        return Response(
            content=json.dumps(report_data, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    return JSONResponse(status_code=status.HTTP_200_OK, content=report_data)
