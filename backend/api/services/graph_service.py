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

# In-memory storage for analyzed graphs, enabling fast /simulate without rebuilding
_graph_storage: Dict[str, Dict[str, Any]] = {}


def _get_dl(download_data: Optional[Dict[str, Any]], key: str) -> int:
    """Safely extract integer download count, treating None or missing as 0."""
    if not download_data:
        return 0
    val = download_data.get(key)
    return int(val) if val is not None else 0



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
    has_cve: bool
) -> float:
    """
    Composite score 0–100 representing real-world danger per docs/TDD.md Section 3.2.

    Weights:
    - Package count: 30%  (min(count / 200, 1.0) * 30)
    - Download impact: 60% (min(log10(max(total_downloads, 1)) / 9, 1.0) * 60)
    - Known CVE multiplier: +10 if CVE exists on compromised node
    """
    count_score = min(affected_count / 200.0, 1.0) * 30.0
    dl_score = min(math.log10(max(total_downloads, 1)) / 9.0, 1.0) * 60.0
    cve_bonus = 10.0 if has_cve else 0.0

    return round(count_score + dl_score + cve_bonus, 1)


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
            pkg_name = G.nodes[node].get("name", node.split("@")[0])
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
    comp_pkg = compromised_node.split("@")[0]
    comp_dl = _get_dl(download_data, compromised_node) or _get_dl(download_data, comp_pkg)

    unique_affected_pkgs = {n.split("@")[0] for n in all_affected}
    total_blast_downloads = sum(
        _get_dl(download_data, pkg) or max([_get_dl(download_data, n) for n in all_affected if n.split("@")[0] == pkg], default=0)
        for pkg in unique_affected_pkgs
    ) + comp_dl

    candidates = [compromised_node] + list(all_affected)

    for node in candidates:
        if node not in G.nodes:
            continue
        pkg_name = G.nodes[node].get("name", node.split("@")[0])
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
        unique_saved_pkgs = {n.split("@")[0] for n in saved_affected}
        eliminated_downloads = sum(
            _get_dl(download_data, pkg) or max([_get_dl(download_data, n) for n in saved_affected if n.split("@")[0] == pkg], default=0)
            for pkg in unique_saved_pkgs
        )
        if node == compromised_node:
            eliminated_downloads += comp_dl

        elimination_pct = (eliminated_downloads / max(total_blast_downloads, 1)) * 100.0
        elimination_pct = round(min(elimination_pct, 100.0), 1)

        actions.append({
            "node": node,
            "action": f"Upgrade {pkg_name} to {fixed_ver}",
            "eliminates_blast_percent": elimination_pct,
            "affected_packages_resolved": len(saved_affected),
            "effort": classify_effort(node, G),
            "saved_nodes": saved_affected
        })

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
        G.add_node(compromised_node, name=compromised_node.split("@")[0], version="latest", depth=0, is_root=False)

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
    unique_affected_pkgs = {node.split("@")[0] for node in affected}
    total_downloads = sum(
        _get_dl(download_data, pkg) or max([_get_dl(download_data, n) for n in affected if n.split("@")[0] == pkg], default=0)
        for pkg in unique_affected_pkgs
    )
    comp_pkg = compromised_node.split("@")[0]
    comp_vulns = (vuln_data or {}).get(compromised_node, []) or (vuln_data or {}).get(comp_pkg, [])
    has_cve = len(comp_vulns) > 0

    blast_score = calculate_blast_score(
        affected_count=len(affected),
        total_downloads=total_downloads,
        has_cve=has_cve
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

    # Butterfly Trace (Idea 2)
    critical_chain = find_butterfly_trace(G_prop, compromised_node)

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

    estimated_apps = max(int(total_downloads / 35000), len(affected) * 150, 0)

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
            "severity_breakdown": {
                "critical_path_nodes": crit_count,
                "high_impact_nodes": high_count,
                "medium_impact_nodes": med_count
            }
        },
        "mitigation": {
            "priority_actions": priority_actions,
            "minimum_fix_set": minimum_fix_set
        },
        "critical_chain": critical_chain,
        "shadow_dependencies": shadow_dependencies
    }
