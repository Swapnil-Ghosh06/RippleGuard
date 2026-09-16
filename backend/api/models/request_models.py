# -*- coding: utf-8 -*-
"""
Shared Request Data Models for RippleGuard.

Defines Pydantic v2 request payloads for /api/analyze, /api/simulate, and /api/compare endpoints.
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """Request payload for analyzing a package dependency graph (/api/analyze)."""

    package: str = Field(..., min_length=1, description="Package name to analyze", example="express")
    ecosystem: Literal["npm", "pypi"] = Field(default="npm", description="Package ecosystem (npm or pypi)")
    version: Optional[str] = Field(default="latest", description="Package version string")
    depth: int = Field(default=3, ge=1, le=5, description="Dependency graph traversal depth (1-5)")

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

    graph_id: Optional[str] = Field(default=None, description="Cached graph ID", example="express-npm-4.18.2-depth3")
    graph_data: Optional[dict] = Field(default=None, description="Optional raw graph dictionary")
    compromised_node: str = Field(..., description="Node ID to compromise (e.g. lodash@4.17.21)")
    propagation_model: Literal["weighted_bfs", "simple_bfs"] = Field(default="weighted_bfs", description="Propagation model algorithm")

    model_config = {
        "json_schema_extra": {
            "example": {
                "graph_id": "express-npm-4.18.2-depth3",
                "compromised_node": "lodash@4.17.21",
                "propagation_model": "weighted_bfs"
            }
        }
    }


class CompareRequest(BaseModel):
    """Request payload for comparing attack blast radius between two nodes (/api/compare)."""

    graph_id: Optional[str] = Field(default=None, description="Cached graph ID", example="express-npm-4.18.2-depth3")
    graph_data: Optional[dict] = Field(default=None, description="Optional raw graph dictionary")
    node_a: str = Field(..., description="First candidate node ID (e.g. lodash@4.17.21)")
    node_b: str = Field(..., description="Second candidate node ID (e.g. express@4.18.2)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "graph_id": "express-npm-4.18.2-depth3",
                "node_a": "lodash@4.17.21",
                "node_b": "express@4.18.2"
            }
        }
    }
