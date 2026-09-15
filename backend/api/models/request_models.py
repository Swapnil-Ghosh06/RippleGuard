# Draft models — Hari owns the canonical version per docs/TDD.md Section 7, sync before merge
from typing import Optional, Literal
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    package: str = Field(..., min_length=1, description="Package name to analyze", example="lodash")
    ecosystem: Literal["npm", "pypi"] = Field(default="npm", description="Package ecosystem")
    version: Optional[str] = Field(default="latest", description="Package version")
    depth: int = Field(default=3, ge=1, le=5, description="Dependency graph traversal depth (1-5)")


class SimulateRequest(BaseModel):
    graph_id: Optional[str] = Field(default=None, description="Identifier of pre-analyzed graph", example="lodash-npm-4.17.21-depth3")
    graph_data: Optional[dict] = Field(default=None, description="Optional raw graph data dictionary from frontend")
    compromised_node: str = Field(..., description="Node ID to compromise", example="lodash@4.17.21")
    propagation_model: Literal["weighted_bfs", "simple_bfs"] = Field(default="weighted_bfs", description="Propagation model algorithm")


class CompareRequest(BaseModel):
    graph_id: Optional[str] = Field(default=None, description="Identifier of pre-analyzed graph", example="lodash-npm-4.17.21-depth3")
    graph_data: Optional[dict] = Field(default=None, description="Optional raw graph data dictionary from frontend")
    node_a: str = Field(..., description="First node to simulate", example="lodash@4.17.21")
    node_b: str = Field(..., description="Second node to simulate", example="express@4.18.2")
