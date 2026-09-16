# -*- coding: utf-8 -*-
"""
Shared Response Data Models for RippleGuard.

This module defines the Pydantic v2 response contracts between Hari's data services,
Zahid's graph engine, and the FastAPI API endpoints.

Contract Ownership: Shared between Data & Graph layers (Hari + Zahid)
Node ID Format: "name@version" (e.g. "lodash@4.17.21")
Ecosystem Standard: Always lowercase ("npm" or "pypi")
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field


class VulnerabilityModel(BaseModel):
    """Represents a single CVE / GHSA advisory attached to a package node."""

    id: str
    summary: str
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
    cvss_score: float
    fixed_version: Optional[str] = None


class NodeModel(BaseModel):
    """Represents a dependency node in the supply chain graph."""

    id: str
    name: str
    version: str
    ecosystem: Literal["npm", "pypi"]
    depth: int
    is_root: bool
    monthly_downloads: int = 0
    vulnerabilities: list[VulnerabilityModel] = Field(default_factory=list)
    risk_score: float = 0.0


class EdgeModel(BaseModel):
    """Represents a dependency relationship edge (source depends on target)."""

    source: str
    target: str


class GraphData(BaseModel):
    """Contains the serialized list of nodes and edges forming the graph."""

    nodes: list[NodeModel]
    edges: list[EdgeModel]


class GraphStats(BaseModel):
    """Summary metrics of the analyzed dependency graph."""

    total_nodes: int
    total_edges: int
    vulnerable_nodes: int
    total_monthly_downloads: int


class AnalyzeResponse(BaseModel):
    """Response payload returned by the dependency graph analysis endpoint (/api/analyze)."""

    root: str
    graph: GraphData
    stats: GraphStats

    model_config = {
        "json_schema_extra": {
            "example": {
                "root": "express@4.18.2",
                "graph": {
                    "nodes": [
                        {
                            "id": "express@4.18.2",
                            "name": "express",
                            "version": "4.18.2",
                            "ecosystem": "npm",
                            "depth": 0,
                            "is_root": True,
                            "monthly_downloads": 35000000,
                            "vulnerabilities": [],
                            "risk_score": 0.0
                        }
                    ],
                    "edges": []
                },
                "stats": {
                    "total_nodes": 1,
                    "total_edges": 0,
                    "vulnerable_nodes": 0,
                    "total_monthly_downloads": 35000000
                }
            }
        }
    }


class PropagationStep(BaseModel):
    """Represents a single node infection step during compromise propagation."""

    node: str
    step: int
    delay_ms: int


class BlastRadiusModel(BaseModel):
    """Quantifies the impact and blast radius of a compromised node."""

    affected_package_count: int
    total_monthly_downloads_affected: int
    blast_score: float
    estimated_apps_affected: int
    human_readable: str


class MitigationAction(BaseModel):
    """Recommended mitigation step to eliminate compromise blast radius."""

    node: str
    action: str
    eliminates_blast_percent: float
    fixed_version: Optional[str] = None
    effort: Literal["LOW", "MEDIUM", "HIGH"] = "LOW"


class SimulateResponse(BaseModel):
    """Response payload returned by the compromise simulation endpoint (/api/simulate)."""

    compromised_node: str
    affected_nodes: list[str]
    propagation_order: list[PropagationStep]
    blast_radius: BlastRadiusModel
    mitigation: list[MitigationAction]

    model_config = {
        "json_schema_extra": {
            "example": {
                "compromised_node": "lodash@4.17.19",
                "affected_nodes": ["lodash@4.17.19", "express@4.18.2"],
                "propagation_order": [
                    {
                        "node": "lodash@4.17.19",
                        "step": 0,
                        "delay_ms": 0
                    },
                    {
                        "node": "express@4.18.2",
                        "step": 1,
                        "delay_ms": 180
                    }
                ],
                "blast_radius": {
                    "affected_package_count": 2,
                    "total_monthly_downloads_affected": 117000000,
                    "blast_score": 92.4,
                    "estimated_apps_affected": 117000,
                    "human_readable": "That's sending malware to the population of Japan"
                },
                "mitigation": [
                    {
                        "node": "lodash@4.17.19",
                        "action": "Upgrade lodash to 4.17.21",
                        "eliminates_blast_percent": 100.0,
                        "fixed_version": "4.17.21",
                        "effort": "LOW"
                    }
                ]
            }
        }
    }


if __name__ == "__main__":
    print("=== Step 5 Verification: Pydantic Response Models ===")

    vuln = VulnerabilityModel(
        id="GHSA-f23m-r3pf-42rh",
        summary="Prototype pollution in lodash",
        severity="HIGH",
        cvss_score=7.5,
        fixed_version="4.17.21"
    )

    node = NodeModel(
        id="lodash@4.17.19",
        name="lodash",
        version="4.17.19",
        ecosystem="npm",
        depth=1,
        is_root=False,
        monthly_downloads=82000000,
        vulnerabilities=[vuln],
        risk_score=7.5
    )

    edge = EdgeModel(
        source="express@4.18.2",
        target="lodash@4.17.19"
    )

    graph_data = GraphData(nodes=[node], edges=[edge])

    stats = GraphStats(
        total_nodes=1,
        total_edges=1,
        vulnerable_nodes=1,
        total_monthly_downloads=82000000
    )

    analyze_resp = AnalyzeResponse(
        root="express@4.18.2",
        graph=graph_data,
        stats=stats
    )

    step = PropagationStep(
        node="lodash@4.17.19",
        step=1,
        delay_ms=180
    )

    blast = BlastRadiusModel(
        affected_package_count=1,
        total_monthly_downloads_affected=82000000,
        blast_score=85.5,
        estimated_apps_affected=82000,
        human_readable="That's sending malware to the population of Germany"
    )

    mitigation = MitigationAction(
        node="lodash@4.17.19",
        action="Upgrade lodash to 4.17.21",
        eliminates_blast_percent=100.0,
        fixed_version="4.17.21",
        effort="LOW"
    )

    simulate_resp = SimulateResponse(
        compromised_node="lodash@4.17.19",
        affected_nodes=["lodash@4.17.19"],
        propagation_order=[step],
        blast_radius=blast,
        mitigation=[mitigation]
    )

    print("\n--- AnalyzeResponse Model Dump ---")
    print(analyze_resp.model_dump())

    print("\n--- SimulateResponse Model Dump ---")
    print(simulate_resp.model_dump())

    print("\nAll models constructed and validated cleanly with 0 errors!")
