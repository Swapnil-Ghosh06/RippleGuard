# -*- coding: utf-8 -*-
"""
Shared Response Data Models for RippleGuard.

Defines Pydantic v2 response contracts for /api/analyze, /api/simulate, /api/compare, /api/export, and /api/attacks.
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# --- Vulnerability Models ---

class Vulnerability(BaseModel):
    """Represents a single CVE / GHSA advisory attached to a package node."""

    id: str = Field(..., description="Vulnerability ID (e.g. GHSA or CVE)")
    severity: str = Field(..., description="Severity level: CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN")
    cvss_score: float = Field(default=0.0, description="CVSS base score")
    summary: str = Field(default="", description="Summary description of vulnerability")
    affected_versions: List[str] = Field(default_factory=list, description="Affected version specifiers")
    fixed_version: Optional[str] = Field(default=None, description="Patched version if available")


VulnerabilityModel = Vulnerability


# --- Node & Edge Models ---

class PackageNode(BaseModel):
    """Represents a dependency node in the supply chain graph."""

    id: str = Field(..., description="Unique node identifier (package@version)")
    name: str = Field(..., description="Package name")
    version: str = Field(..., description="Package version")
    ecosystem: str = Field(..., description="Ecosystem (npm or pypi)")
    monthly_downloads: int = Field(default=0, description="Monthly download count")
    depth: int = Field(default=0, description="Distance from root in dependency tree")
    vulnerabilities: List[Vulnerability] = Field(default_factory=list, description="List of vulnerabilities for this package version")
    risk_score: float = Field(default=0.0, description="Calculated composite risk score")
    is_root: bool = Field(default=False, description="Whether this is the root package analyzed")


NodeModel = PackageNode
Node = PackageNode


class PackageEdge(BaseModel):
    """Represents a dependency relationship edge (source depends on target)."""

    source: str = Field(..., description="Source node id")
    target: str = Field(..., description="Target node id")
    dependency_type: str = Field(default="direct", description="Dependency relationship (direct or transitive)")


EdgeModel = PackageEdge
Edge = PackageEdge


# --- Graph Models ---

class GraphData(BaseModel):
    """Contains the serialized list of nodes and edges forming the graph."""

    nodes: List[PackageNode] = Field(default_factory=list, description="List of package nodes in dependency graph")
    edges: List[PackageEdge] = Field(default_factory=list, description="List of dependency edges")


class GraphStats(BaseModel):
    """Summary metrics of the analyzed dependency graph."""

    total_nodes: int = Field(..., description="Total packages in dependency graph")
    total_edges: int = Field(..., description="Total dependency connections")
    vulnerable_nodes: int = Field(..., description="Number of nodes having >=1 vulnerability")
    max_depth: int = Field(default=0, description="Deepest level traversed")
    total_monthly_downloads: int = Field(default=0, description="Sum of monthly downloads across graph")


class PackageRoot(BaseModel):
    """Root package metadata."""

    name: str = Field(..., description="Root package name")
    version: str = Field(..., description="Root package version")
    ecosystem: str = Field(..., description="Root ecosystem")
    monthly_downloads: int = Field(default=0, description="Root package monthly downloads")


class AnalyzeResponse(BaseModel):
    """Response payload returned by the dependency graph analysis endpoint (/api/analyze)."""

    root: PackageRoot = Field(..., description="Analyzed root package metadata")
    graph: GraphData = Field(..., description="Full dependency graph data")
    stats: GraphStats = Field(..., description="Graph statistics summary")


# --- Propagation & Blast Radius Models ---

class PropagationStep(BaseModel):
    """Represents a single node infection step during compromise propagation."""

    node: str = Field(..., description="Node reached during propagation")
    step: int = Field(..., description="Hop distance / propagation wave step")
    delay_ms: int = Field(..., description="Animation delay in milliseconds for UI rendering")


class PropagationData(BaseModel):
    """Detailed propagation simulation traversal data."""

    affected_nodes: List[str] = Field(default_factory=list, description="All downstream nodes affected by the compromise")
    propagation_paths: List[List[str]] = Field(default_factory=list, description="Detailed traversal paths from compromise to affected nodes")
    propagation_order: List[PropagationStep] = Field(default_factory=list, description="Ordered propagation steps for animation")
    critical_chain: List[str] = Field(default_factory=list, description="Butterfly trace longest critical path")


class SeverityBreakdown(BaseModel):
    """Breakdown of affected nodes by severity tier."""

    critical_path_nodes: int = Field(default=0, description="Nodes on the most critical paths")
    high_impact_nodes: int = Field(default=0, description="Nodes with high download / downstream impact")
    medium_impact_nodes: int = Field(default=0, description="Nodes with moderate impact")


class BlastRadius(BaseModel):
    """Quantifies the impact and blast radius of a compromised node."""

    affected_package_count: int = Field(..., description="Number of packages affected")
    total_monthly_downloads_affected: int = Field(..., description="Sum of monthly downloads across affected packages")
    estimated_apps_affected: int = Field(default=0, description="Heuristic estimate of downstream apps impacted")
    blast_score: float = Field(..., description="Normalized composite blast score (0-100)")
    severity_breakdown: Optional[SeverityBreakdown] = Field(default=None, description="Breakdown of affected nodes by severity tier")


class BlastRadiusModel(BaseModel):
    """Flat blast radius representation."""

    affected_package_count: int
    total_monthly_downloads_affected: int
    blast_score: float
    estimated_apps_affected: int = 0
    human_readable: str = ""


class MitigationAction(BaseModel):
    """Recommended mitigation step to eliminate compromise blast radius."""

    action: str = Field(..., description="Recommended mitigation step")
    eliminates_blast_percent: float = Field(..., description="Percentage of blast radius eliminated by this fix")
    affected_packages_resolved: int = Field(default=0, description="Number of affected packages saved")
    fixed_version: Optional[str] = Field(default=None, description="Patched version string")
    effort: str = Field(default="LOW", description="Effort level (LOW, MEDIUM, HIGH)")


class MitigationData(BaseModel):
    """Mitigation recommendations collection."""

    priority_actions: List[MitigationAction] = Field(default_factory=list, description="Ranked list of mitigation actions")
    minimum_fix_set: List[str] = Field(default_factory=list, description="Minimal set of package upgrades to neutralize blast radius")


class ShadowDependency(BaseModel):
    """Chokepoint shadow dependency representation."""

    node: str = Field(..., description="Node ID of shadow dependency")
    package: str = Field(..., description="Package name")
    depth: int = Field(..., description="Depth in graph (>1)")
    in_degree: int = Field(..., description="Number of dependents in the graph")
    monthly_downloads: int = Field(..., description="Monthly downloads")
    chokepoint_score: float = Field(..., description="Calculated chokepoint score")


class SimulateResponse(BaseModel):
    """Response payload returned by the compromise simulation endpoint (/api/simulate)."""

    compromised_node: str = Field(..., description="The injected compromise origin node")
    propagation: PropagationData = Field(..., description="Propagation simulation results")
    blast_radius: BlastRadius = Field(..., description="Blast radius assessment")
    mitigation: MitigationData = Field(..., description="Recommended mitigation steps")
    critical_chain: List[str] = Field(default_factory=list, description="Butterfly Trace critical chain")
    shadow_dependencies: List[ShadowDependency] = Field(default_factory=list, description="Shadow Dependency Revealer top chokepoints")


# --- Compare Response Models ---

class ComparisonData(BaseModel):
    """Comparison results between two candidate compromise nodes."""

    node_a: SimulateResponse = Field(..., description="Simulation result for candidate node A")
    node_b: SimulateResponse = Field(..., description="Simulation result for candidate node B")
    winner: str = Field(..., description="Identifier of candidate with higher blast radius ('node_a' or 'node_b')")
    summary: str = Field(..., description="Natural language comparison summary")


class CompareResponse(BaseModel):
    """Response payload returned by scenario comparison endpoint (/api/compare)."""

    comparison: ComparisonData = Field(..., description="Comparative blast radius analysis data")
