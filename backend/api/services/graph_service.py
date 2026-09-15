"""
Graph Service for RippleGuard.

Core NetworkX graph construction, BFS compromise propagation, and blast radius scoring engine.
(Owned by Zahid per docs/TDD.md Sections 1.2, 3, and 9)
"""

from collections import deque
import networkx as nx

from api.services import deps_service


async def build_dependency_graph(
    package: str,
    ecosystem: str,
    version: str,
    max_depth: int = 3
) -> nx.DiGraph:
    """
    BFS-based graph construction from deps.dev API per docs/TDD.md Section 3.1.

    Each node ID: package@version
    Each directed edge: (dependent) -> (dependency)
    Node attributes:
        - name: str
        - version: str
        - ecosystem: str
        - depth: int (0 for root)
        - is_root: bool
    """
    G = nx.DiGraph()
    queue = deque()
    visited = set()

    root_id = f"{package}@{version}"
    queue.append((root_id, package, ecosystem, version, 0))
    G.add_node(
        root_id,
        name=package,
        version=version,
        ecosystem=ecosystem,
        depth=0,
        is_root=True
    )

    while queue:
        node_id, pkg, eco, ver, depth = queue.popleft()

        if node_id in visited or depth >= max_depth:
            continue
        visited.add(node_id)

        # Fetch direct dependencies from deps.dev
        deps = await deps_service.get_dependencies(pkg, eco, ver)

        for dep in deps:
            dep_id = f"{dep['name']}@{dep['version']}"

            if dep_id not in G:
                G.add_node(
                    dep_id,
                    name=dep['name'],
                    version=dep['version'],
                    ecosystem=eco,
                    depth=depth + 1,
                    is_root=False
                )
            else:
                # Update depth if reached at a shallower level
                if depth + 1 < G.nodes[dep_id].get("depth", depth + 1):
                    G.nodes[dep_id]["depth"] = depth + 1

            G.add_edge(node_id, dep_id)

            if dep_id not in visited:
                queue.append((
                    dep_id,
                    dep['name'],
                    eco,
                    dep['version'],
                    depth + 1
                ))

    return G
