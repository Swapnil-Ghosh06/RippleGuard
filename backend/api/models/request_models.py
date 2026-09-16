# -*- coding: utf-8 -*-
"""
Shared Request Data Models for RippleGuard.

This module defines the Pydantic v2 request contracts between Hari's data services,
Zahid's graph engine, and the FastAPI API endpoints.

Contract Ownership: Shared between Data & Graph layers (Hari + Zahid)
Node ID Format: "name@version" (e.g. "lodash@4.17.21")
Ecosystem Standard: Always lowercase ("npm" or "pypi")
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """Request payload for analyzing a package dependency graph (/api/analyze)."""

    package: str
    ecosystem: Literal["npm", "pypi"] = "npm"
    version: Optional[str] = "latest"
    depth: int = Field(default=3, ge=1, le=4)

    model_config = {
        "json_schema_extra": {
            "example": {
                "package": "express",
                "ecosystem": "npm",
                "version": "4.18.2",
                "depth": 3
            }
        }
    }


class SimulateRequest(BaseModel):
    """Request payload for running compromise propagation simulation (/api/simulate)."""

    graph_data: dict
    compromised_node: str
    propagation_model: Literal["weighted_bfs", "simple_bfs"] = "weighted_bfs"

    model_config = {
        "json_schema_extra": {
            "example": {
                "graph_data": {
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
                "compromised_node": "lodash@4.17.19",
                "propagation_model": "weighted_bfs"
            }
        }
    }


class CompareRequest(BaseModel):
    """Request payload for comparing attack blast radius between two nodes (/api/compare)."""

    graph_data: dict
    node_a: str
    node_b: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "graph_data": {},
                "node_a": "lodash@4.17.19",
                "node_b": "minimatch@3.0.4"
            }
        }
    }
