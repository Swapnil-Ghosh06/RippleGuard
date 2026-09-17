"""
Graph Service for RippleGuard.

Core NetworkX graph construction, BFS compromise propagation, and blast radius scoring engine.
(Owned by Zahid per docs/TDD.md Sections 1.2, 3, and 9)
"""

import math
from collections import deque
from typing import Dict, List, Tuple, Any, Optional
import networkx as nx

from api.services import deps_service
from api.services.enrichment_service import (
    generate_blast_summary,
    generate_mitigation_reasoning
)

# In-memory storage for analyzed graphs, enabling fast /simulate without rebuilding
_graph_storage: Dict[str, Dict[str, Any]] = {}


def _get_dl(download_data: Optional[Dict[str, Any]], key: str) -> int:
    """Safely extract integer download count, treating None or missing as 0."""
    if not download_data:
        return 0
    val = download_data.get(key)
    return int(val) if val is not None else 0


def _pkg_name(node_id: str) -> str:
    """Extract package name from node ID like 'pkg@1.0' or '@scope/pkg@1.0'."""
    if not node_id:
        return ""
    if "@" in node_id:
        return node_id.rsplit("@", 1)[0]
    return node_id



async def build_dependency_graph(
    package: str,
    ecosystem: str,
    version: str,
    max_depth: int = 3
) -> nx.DiGraph:
    """
    Constructs dependency graph via Google deps.dev API per docs/TDD.md Section 3.1.
    Resolves full transitive dependency tree in a single call, pruning to max_depth.

    Returns an empty DiGraph if the package or version cannot be resolved (triggering 404).

    Each node ID: package@version
    Each directed edge: (dependent) -> (dependency)
    Node attributes:
        - name: str
        - version: str
        - ecosystem: str
        - depth: int (0 for root)
        - is_root: bool
    """
    flat_nodes, flat_edges = await deps_service.get_all_deps_as_flat_list(package, ecosystem, version)
    if not flat_nodes:
        return nx.DiGraph()

    # Build adjacency list from flat_edges to compute depths from root (index 0)
    temp_adj = {i: [] for i in range(len(flat_nodes))}
    for u, v in flat_edges:
        if 0 <= u < len(flat_nodes) and 0 <= v < len(flat_nodes):
            temp_adj[u].append(v)

    # BFS from root (index 0) to assign node depth up to max_depth
    depths = {0: 0}
    queue = deque([0])
    while queue:
        curr = queue.popleft()
        curr_d = depths[curr]
        if curr_d >= max_depth:
            continue
        for nxt in temp_adj[curr]:
            if nxt not in depths:
                depths[nxt] = curr_d + 1
                queue.append(nxt)

    G = nx.DiGraph()
    id_map = {}
    for idx, d in depths.items():
        node = flat_nodes[idx]
        nid = f"{node['name']}@{node['version']}"
        id_map[idx] = nid
        if nid not in G:
            G.add_node(
                nid,
                name=node['name'],
                version=node['version'],
                ecosystem=node.get('ecosystem', ecosystem),
                depth=d,
                is_root=(idx == 0)
            )

    # In RippleGuard graph convention, edges point from dependent to dependency
    for u, v in flat_edges:
        if u in depths and v in depths:
            dep_id = id_map[v]
            node_id = id_map[u]
            G.add_edge(dep_id, node_id)

    return G


def calculate_blast_score(
    affected_count: int,
    total_downloads: int,
    has_cve: bool,
    root_downloads: int = 0,
    direct_deps_count: int = 0,
    total_nodes: int = 0,
    total_edges: int = 0,
    critical_chain_len: int = 0,
    is_type_stub: bool = False,
    package_name: str = ""
) -> float:
    """
    Composite score 0–100 representing real-world danger per docs/TDD.md Section 3.2.
    Rebalanced to avoid saturation clustering across disparate package types.

    Components:
    1. Structural Propagation (0 - 45 pts):
       - Breadth: Logarithmic scaling across affected count (30 pts max)
       - Fan-out: Direct dependency fan-out (8 pts max)
       - Chain: Critical propagation path depth (7 pts max)
       - Single-edge utility dampening when fan-out <= 1 on small graphs
    2. Ecosystem Exposure (0 - 45 pts):
       - Root direct adoption (25 pts max): Direct consumer application footprint
       - Downstream cascade exposure (20 pts max): Subtree download impact
       - Exposure bounding for single-edge leaf utilities
    3. Known CVE Multiplier (0 - 10 pts):
       - +10 pts if compromised node has active vulnerabilities
    4. Type Stub Threat Profile Modifier:
       - 0.25x scaling for @types/* compile-time declaration packages without runtime code
    """
    # Auto-detect type stub if not explicitly passed
    if not is_type_stub and package_name:
        pkg_lower = package_name.lower()
        if pkg_lower.startswith("@types/") or "/@types/" in pkg_lower:
            is_type_stub = True

    # Establish effective download metrics
    eff_root_dl = root_downloads if root_downloads > 0 else total_downloads
    eff_blast_dl = total_downloads if total_downloads > 0 else eff_root_dl

    # Single-edge micro-utility detection (e.g. is-even, left-pad wrappers)
    # Characterized by 1 direct dependency edge, small graph (<= 6 nodes), and modest root downloads (< 15M)
    fan_out = direct_deps_count if direct_deps_count > 0 else min(affected_count, max(total_edges, 1))
    is_single_edge_util = (fan_out <= 1 and total_nodes <= 6 and eff_root_dl < 15_000_000)

    # 1. Structural Propagation Component (0 - 45 pts)
    if affected_count > 0:
        # Logarithmic breadth across affected packages
        breadth_score = min(math.log10(1 + affected_count) / math.log10(151.0), 1.0) * 30.0

        # Fan-out & Chain Topology Bonus
        if is_single_edge_util:
            fan_out_score = 2.0
            chain_score = min(critical_chain_len / 4.0, 1.0) * 2.0 if critical_chain_len > 0 else 1.0
        else:
            fan_out_score = min(math.log10(1 + fan_out) / math.log10(11.0), 1.0) * 8.0
            chain_score = min(critical_chain_len / 4.0, 1.0) * 7.0 if critical_chain_len > 0 else (3.5 if affected_count > 1 else 0.0)

        struct_score = breadth_score + fan_out_score + chain_score

        # Single-edge linear chain dampening (no parallel architectural impact)
        if is_single_edge_util:
            struct_score *= 0.45
    else:
        struct_score = 0.0

    # 2. Ecosystem Exposure Component (0 - 45 pts)
    # For single-edge utils or leaf nodes, downstream blast cannot exceed the package's own direct adoption envelope
    if is_single_edge_util or affected_count == 0:
        eff_blast_dl = min(eff_blast_dl, eff_root_dl * 3) if eff_root_dl > 0 else eff_blast_dl

    root_pts = min(math.log10(max(eff_root_dl, 1)) / 9.0, 1.0) * 25.0 if eff_root_dl > 0 else 0.0
    blast_pts = min(math.log10(max(eff_blast_dl, 1)) / 9.0, 1.0) * 20.0 if eff_blast_dl > 0 else 0.0
    exposure_score = root_pts + blast_pts

    if is_single_edge_util or affected_count == 0:
        exposure_score *= 0.70

    # 3. Known CVE Bonus (0 - 10 pts)
    cve_bonus = 10.0 if has_cve else 0.0

    raw_score = struct_score + exposure_score + cve_bonus

    # 4. Type Stub Threat Profile Discount (0.25x)
    if is_type_stub:
        raw_score *= 0.25

    return round(min(max(raw_score, 0.0), 100.0), 1)


def find_butterfly_trace(G_prop: nx.DiGraph, compromised_node: str) -> List[str]:
    """
    Butterfly Trace (docs/CREATIVE_IDEAS.md Idea 2):
    Finds the longest path from the compromised node to any leaf in the propagation graph.
    This represents the 'critical chain' through the ecosystem.
    """
    if compromised_node not in G_prop:
        return [compromised_node]

    longest_path = [compromised_node]
    queue = deque([[compromised_node]])
    visited_paths = set()

    while queue:
        path = queue.popleft()
        current = path[-1]

        successors = [s for s in G_prop.successors(current) if s not in path]
        if not successors:
            if len(path) > len(longest_path):
                longest_path = path
        else:
            for nxt in successors:
                new_path = path + [nxt]
                path_key = tuple(new_path)
                if path_key not in visited_paths:
                    visited_paths.add(path_key)
                    queue.append(new_path)

    return longest_path


def find_shadow_dependencies(
    G: nx.DiGraph,
    download_data: dict,
    top_k: int = 3
) -> List[Dict[str, Any]]:
    """
    Shadow Dependency Revealer (docs/CREATIVE_IDEAS.md Idea 3):
    For every node at depth > 1, compute:
    chokepoint_score = (in-degree within the graph) * (monthly_downloads / 1_000_000).
    Returns the top K shadow dependencies.
    """
    candidates = []
    for node in G.nodes:
        depth = G.nodes[node].get("depth", 0)
        if depth > 1:
            in_deg = G.in_degree(node)
            pkg_name = G.nodes[node].get("name") or _pkg_name(node)
            dl = _get_dl(download_data, node) or _get_dl(download_data, pkg_name)
            chokepoint_score = round(float(in_deg * (dl / 1_000_000.0)), 2)
            candidates.append({
                "node": node,
                "package": pkg_name,
                "depth": depth,
                "in_degree": in_deg,
                "monthly_downloads": dl,
                "chokepoint_score": chokepoint_score
            })

    candidates.sort(key=lambda x: (x["chokepoint_score"], x["in_degree"], x["monthly_downloads"]), reverse=True)
    return candidates[:top_k]


def classify_effort(node: str, G: nx.DiGraph) -> str:
    """Classifies remediation effort based on depth and dependent density."""
    depth = G.nodes[node].get("depth", 0) if node in G.nodes else 1
    in_deg = G.in_degree(node) if node in G.nodes else 1
    if depth <= 1 and in_deg <= 2:
        return "LOW"
    elif depth <= 2 and in_deg <= 4:
        return "MEDIUM"
    return "HIGH"


def rank_mitigations(
    G: nx.DiGraph,
    G_prop: nx.DiGraph,
    affected_nodes: set,
    vuln_data: dict,
    download_data: dict,
    compromised_node: str
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Mitigation Ranking Algorithm (docs/TDD.md Section 3.3) and
    Minimum Intervention Path (docs/CREATIVE_IDEAS.md Idea 10).
    """
    actions = []
    all_affected = set(affected_nodes)
    comp_pkg = _pkg_name(compromised_node)
    comp_dl = _get_dl(download_data, compromised_node) or _get_dl(download_data, comp_pkg)

    unique_affected_pkgs = {_pkg_name(n) for n in all_affected}
    total_blast_downloads = sum(
        _get_dl(download_data, pkg) or max([_get_dl(download_data, n) for n in all_affected if _pkg_name(n) == pkg], default=0)
        for pkg in unique_affected_pkgs
    ) + comp_dl

    candidates = [compromised_node] + list(all_affected)

    for node in candidates:
        if node not in G.nodes:
            continue
        pkg_name = G.nodes[node].get("name") or _pkg_name(node)
        vulns = (vuln_data or {}).get(node, []) or (vuln_data or {}).get(pkg_name, [])

        fixed_ver = None
        for v in vulns:
            if v.get("fixed_version"):
                fixed_ver = v["fixed_version"]
                break

        if not fixed_ver:
            fixed_ver = "patched"

        # Upstream subtree in propagation graph saved if this node is neutralized
        if node in G_prop:
            saved_subtree = nx.descendants(G_prop, node) | {node}
        else:
            saved_subtree = {node}

        saved_affected = (saved_subtree & all_affected) | ({node} if node in all_affected else set())
        unique_saved_pkgs = {_pkg_name(n) for n in saved_affected}
        eliminated_downloads = sum(
            _get_dl(download_data, pkg) or max([_get_dl(download_data, n) for n in saved_affected if _pkg_name(n) == pkg], default=0)
            for pkg in unique_saved_pkgs
        )
        if node == compromised_node:
            eliminated_downloads += comp_dl

        elimination_pct = (eliminated_downloads / max(total_blast_downloads, 1)) * 100.0
        elimination_pct = round(min(elimination_pct, 100.0), 1)

        act_dict = {
            "node": node,
            "action": f"Upgrade {pkg_name} to {fixed_ver}",
            "eliminates_blast_percent": elimination_pct,
            "affected_packages_resolved": len(saved_affected),
            "fixed_version": fixed_ver,
            "effort": classify_effort(node, G),
            "saved_nodes": saved_affected
        }
        act_dict["why_this_matters"] = generate_mitigation_reasoning(
            action=act_dict,
            compromised_node=compromised_node,
            total_affected=len(all_affected),
            total_downloads=total_blast_downloads
        )
        actions.append(act_dict)

    # Sort descending by eliminates_blast_percent
    actions.sort(key=lambda x: x["eliminates_blast_percent"], reverse=True)

    # Idea 10: Minimum Intervention Path (Greedy set-cover covering >80% blast radius)
    minimum_fix_set = []
    covered = set()
    needed_coverage = 0.80 * len(all_affected) if all_affected else 0

    clean_actions = []
    for a in actions:
        saved = a.pop("saved_nodes")
        clean_actions.append(a)
        if not minimum_fix_set or len(covered) < needed_coverage:
            if not saved.issubset(covered):
                minimum_fix_set.append(a["node"])
                covered.update(saved)

    if not minimum_fix_set and candidates:
        minimum_fix_set = [candidates[0]]

    return clean_actions, minimum_fix_set


def simulate_compromise(
    G: nx.DiGraph,
    compromised_node: str,
    download_data: dict,
    vuln_data: dict = None
) -> Dict[str, Any]:
    """
    Simulates upstream propagation from compromised_node using weighted-BFS on reversed graph.
    Per docs/TDD.md Section 3.2.
    """
    if compromised_node not in G:
        G.add_node(compromised_node, name=_pkg_name(compromised_node), version="latest", depth=0, is_root=False)

    G_rev = G.reverse(copy=True)
    G_prop = G_rev

    affected = set()
    propagation_order = []
    queue = deque([(compromised_node, 0)])
    visited = {compromised_node}

    while queue:
        current, step = queue.popleft()

        for neighbor in G_prop.successors(current):
            if neighbor not in visited:
                visited.add(neighbor)
                affected.add(neighbor)
                propagation_order.append({
                    "node": neighbor,
                    "step": step + 1,
                    "delay_ms": (step + 1) * 150  # 150ms per step for Shubham's animation
                })
                queue.append((neighbor, step + 1))

    # Calculate blast metrics per docs/TDD.md Section 3.2
    # Deduplicate downloads by unique package name to prevent double-counting multiple versions/paths
    unique_affected_pkgs = {_pkg_name(node) for node in affected}
    downstream_downloads = sum(
        _get_dl(download_data, pkg) or max([_get_dl(download_data, n) for n in affected if _pkg_name(n) == pkg], default=0)
        for pkg in unique_affected_pkgs
    )
    comp_pkg = _pkg_name(compromised_node)
    comp_dl = _get_dl(download_data, compromised_node) or _get_dl(download_data, comp_pkg) or 0
    total_downloads = downstream_downloads + comp_dl

    comp_vulns = (vuln_data or {}).get(compromised_node, []) or (vuln_data or {}).get(comp_pkg, [])
    has_cve = len(comp_vulns) > 0

    # Butterfly Trace (Idea 2)
    critical_chain = find_butterfly_trace(G_prop, compromised_node)

    direct_deps_cnt = len(list(G_prop.successors(compromised_node))) if compromised_node in G_prop else 0
    is_type_stub = comp_pkg.startswith("@types/") or "/@types/" in comp_pkg

    blast_score = calculate_blast_score(
        affected_count=len(affected),
        total_downloads=total_downloads,
        has_cve=has_cve,
        root_downloads=comp_dl,
        direct_deps_count=direct_deps_cnt,
        total_nodes=len(G.nodes),
        total_edges=len(G.edges),
        critical_chain_len=len(critical_chain),
        is_type_stub=is_type_stub,
        package_name=comp_pkg
    )

    # Propagation paths from compromised_node to leaf nodes
    propagation_paths = []
    leaves = [n for n in affected if G_prop.out_degree(n) == 0]
    for leaf in leaves:
        try:
            for path in nx.all_simple_paths(G_prop, source=compromised_node, target=leaf):
                propagation_paths.append(path)
        except Exception:
            pass
    if not propagation_paths and affected:
        for n in affected:
            propagation_paths.append([compromised_node, n])

    # Shadow Dependency Revealer (Idea 3)
    shadow_dependencies = find_shadow_dependencies(G, download_data, top_k=3)

    # Mitigation Ranking & Minimum Intervention Path (Idea 10 / Section 3.3)
    priority_actions, minimum_fix_set = rank_mitigations(
        G=G,
        G_prop=G_prop,
        affected_nodes=affected,
        vuln_data=vuln_data or {},
        download_data=download_data,
        compromised_node=compromised_node
    )

    # Severity breakdown
    crit_count = len(critical_chain) - 1 if len(critical_chain) > 1 else 0
    high_count = sum(1 for n in affected if (_get_dl(download_data, n) or _get_dl(download_data, n.split('@')[0])) >= 10_000_000)
    med_count = max(len(affected) - high_count, 0)

    estimated_apps = max(int(total_downloads / 35000), (len(affected) + 1) * 150 if total_downloads > 0 else 0)

    eco = G.nodes[compromised_node].get("ecosystem", "npm") if compromised_node in G.nodes else "npm"
    blast_summary = generate_blast_summary(
        compromised_node=compromised_node,
        affected_nodes=list(affected),
        propagation_paths=propagation_paths,
        critical_chain=critical_chain,
        total_downloads=total_downloads,
        blast_score=blast_score,
        ecosystem=eco,
        shadow_dependencies=shadow_dependencies
    )

    return {
        "compromised_node": compromised_node,
        "propagation": {
            "affected_nodes": list(affected),
            "propagation_paths": propagation_paths,
            "propagation_order": propagation_order,
            "critical_chain": critical_chain
        },
        "blast_radius": {
            "affected_package_count": len(affected),
            "total_monthly_downloads_affected": total_downloads,
            "estimated_apps_affected": estimated_apps,
            "blast_score": blast_score,
            "blast_summary": blast_summary,
            "severity_breakdown": {
                "critical_path_nodes": crit_count,
                "high_impact_nodes": high_count,
                "medium_impact_nodes": med_count
            }
        },
        "blast_summary": blast_summary,
        "mitigation": {
            "priority_actions": priority_actions,
            "minimum_fix_set": minimum_fix_set
        },
        "critical_chain": critical_chain,
        "shadow_dependencies": shadow_dependencies
    }
