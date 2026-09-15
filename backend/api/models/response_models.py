# Draft models — Hari owns the canonical version per docs/TDD.md Section 7, sync before merge
from typing import List, Optional
from pydantic import BaseModel, Field


# --- Analyze Response Models (TDD Section 2.1) ---

class Vulnerability(BaseModel):
    id: str = Field(..., description="Vulnerability ID (e.g. GHSA or CVE)", example="GHSA-xxxx-xxxx-xxxx")
    severity: str = Field(..., description="Severity level: CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN", example="HIGH")
    cvss_score: float = Field(default=0.0, description="CVSS base score", example=7.5)
    summary: str = Field(default="", description="Summary description of vulnerability", example="Prototype pollution in lodash")
    affected_versions: List[str] = Field(default_factory=list, description="Affected version specifiers", example=["<4.17.21"])
    fixed_version: Optional[str] = Field(default=None, description="Patched version if available", example="4.17.21")


class PackageNode(BaseModel):
    id: str = Field(..., description="Unique node identifier (package@version)", example="lodash@4.17.21")
    name: str = Field(..., description="Package name", example="lodash")
    version: str = Field(..., description="Package version", example="4.17.21")
    ecosystem: str = Field(..., description="Ecosystem (npm or pypi)", example="npm")
    monthly_downloads: int = Field(default=0, description="Monthly download count", example=82000000)
    depth: int = Field(default=0, description="Distance from root in dependency tree", example=0)
    vulnerabilities: List[Vulnerability] = Field(default_factory=list, description="List of vulnerabilities for this package version")
    risk_score: float = Field(default=0.0, description="Calculated composite risk score", example=0.0)
    is_root: bool = Field(default=False, description="Whether this is the root package analyzed", example=True)


class PackageEdge(BaseModel):
    source: str = Field(..., description="Source node id", example="express@4.18.2")
    target: str = Field(..., description="Target node id", example="lodash@4.17.21")
    dependency_type: str = Field(default="direct", description="Dependency relationship (direct or transitive)", example="direct")


class GraphData(BaseModel):
    nodes: List[PackageNode] = Field(default_factory=list, description="List of package nodes in dependency graph")
    edges: List[PackageEdge] = Field(default_factory=list, description="List of dependency edges")


class GraphStats(BaseModel):
    total_nodes: int = Field(..., description="Total packages in dependency graph", example=47)
    total_edges: int = Field(..., description="Total dependency connections", example=53)
    vulnerable_nodes: int = Field(..., description="Number of nodes having >=1 vulnerability", example=3)
    max_depth: int = Field(..., description="Deepest level traversed", example=3)


class PackageRoot(BaseModel):
    name: str = Field(..., description="Root package name", example="lodash")
    version: str = Field(..., description="Root package version", example="4.17.21")
    ecosystem: str = Field(..., description="Root ecosystem", example="npm")
    monthly_downloads: int = Field(default=0, description="Root package monthly downloads", example=82000000)


class AnalyzeResponse(BaseModel):
    root: PackageRoot = Field(..., description="Analyzed root package metadata")
    graph: GraphData = Field(..., description="Full dependency graph data")
    stats: GraphStats = Field(..., description="Graph statistics summary")


# --- Simulate Response Models (TDD Section 2.2) ---

class PropagationStep(BaseModel):
    node: str = Field(..., description="Node reached during propagation", example="express@4.18.2")
    step: int = Field(..., description="Hop distance / propagation wave step", example=1)
    delay_ms: int = Field(..., description="Animation delay in milliseconds for UI rendering", example=200)


class PropagationData(BaseModel):
    affected_nodes: List[str] = Field(default_factory=list, description="All downstream nodes affected by the compromise")
    propagation_paths: List[List[str]] = Field(default_factory=list, description="Detailed traversal paths from compromise to affected nodes")
    propagation_order: List[PropagationStep] = Field(default_factory=list, description="Ordered propagation steps for animation")


class SeverityBreakdown(BaseModel):
    critical_path_nodes: int = Field(default=0, description="Nodes on the most critical paths", example=3)
    high_impact_nodes: int = Field(default=0, description="Nodes with high download / downstream impact", example=8)
    medium_impact_nodes: int = Field(default=0, description="Nodes with moderate impact", example=12)


class BlastRadius(BaseModel):
    affected_package_count: int = Field(..., description="Number of packages affected", example=23)
    total_monthly_downloads_affected: int = Field(..., description="Sum of monthly downloads across affected packages", example=145000000)
    estimated_apps_affected: int = Field(..., description="Heuristic estimate of downstream apps impacted", example=4200)
    blast_score: float = Field(..., description="Normalized composite blast score (0-100)", example=87.4)
    severity_breakdown: SeverityBreakdown = Field(..., description="Breakdown of affected nodes by severity tier")


class MitigationAction(BaseModel):
    action: str = Field(..., description="Recommended mitigation step", example="Upgrade lodash to 4.17.21")
    eliminates_blast_percent: float = Field(..., description="Percentage of blast radius eliminated by this fix", example=94.0)
    affected_packages_resolved: int = Field(..., description="Number of affected packages saved", example=21)
    effort: str = Field(..., description="Effort level (LOW, MEDIUM, HIGH)", example="LOW")


class MitigationData(BaseModel):
    priority_actions: List[MitigationAction] = Field(default_factory=list, description="Ranked list of mitigation actions")
    minimum_fix_set: List[str] = Field(default_factory=list, description="Minimal set of package upgrades to neutralize blast radius")


class SimulateResponse(BaseModel):
    compromised_node: str = Field(..., description="The injected compromise origin node", example="lodash@4.17.21")
    propagation: PropagationData = Field(..., description="Propagation simulation results")
    blast_radius: BlastRadius = Field(..., description="Blast radius assessment")
    mitigation: MitigationData = Field(..., description="Recommended mitigation steps")


# --- Compare Response Models (TDD Section 2.3) ---

class ComparisonData(BaseModel):
    node_a: SimulateResponse = Field(..., description="Simulation result for candidate node A")
    node_b: SimulateResponse = Field(..., description="Simulation result for candidate node B")
    winner: str = Field(..., description="Identifier of candidate with higher blast radius", example="node_a")
    summary: str = Field(..., description="Natural language comparison summary", example="Compromising lodash is 3.2x more dangerous than compromising express")


class CompareResponse(BaseModel):
    comparison: ComparisonData = Field(..., description="Comparative blast radius analysis data")
