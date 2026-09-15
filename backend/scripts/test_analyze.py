"""
Direct Sanity Test for Dependency Graph Construction Algorithm.
(Direct invocation of graph_service without HTTP overhead)
"""

import asyncio
import sys
from pathlib import Path

# Ensure backend root is on Python path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from api.services.graph_service import build_dependency_graph


async def test_packages():
    test_cases = [
        {"package": "lodash", "ecosystem": "npm", "version": "4.17.21", "depth": 3},
        {"package": "express", "ecosystem": "npm", "version": "4.18.2", "depth": 3},
        {"package": "requests", "ecosystem": "pypi", "version": "2.31.0", "depth": 3},
    ]

    print("==========================================================")
    print("RippleGuard — Graph Construction Direct Sanity Test")
    print("==========================================================\n")

    for tc in test_cases:
        pkg = tc["package"]
        eco = tc["ecosystem"]
        ver = tc["version"]
        depth = tc["depth"]

        G = await build_dependency_graph(pkg, eco, ver, depth)

        node_count = G.number_of_nodes()
        edge_count = G.number_of_edges()
        max_depth = max((data.get("depth", 0) for _, data in G.nodes(data=True)), default=0)

        print(f"Package: {pkg} ({eco}@{ver}) | Requested Max Depth: {depth}")
        print(f"  • Total Nodes:     {node_count}")
        print(f"  • Total Edges:     {edge_count}")
        print(f"  • Max Depth Found: {max_depth}")
        print("  • Nodes in Graph:")
        for nid, data in G.nodes(data=True):
            print(f"      - {nid} [depth={data.get('depth')}, root={data.get('is_root')}]")
        print("  • Sample Edges:")
        for u, v in list(G.edges)[:6]:
            print(f"      - {u} -> {v}")
        if edge_count > 6:
            print(f"      ... ({edge_count - 6} more edges)")
        print("\n" + "-" * 58 + "\n")

    print("Graph construction algorithm sanity check completed successfully!")


if __name__ == "__main__":
    asyncio.run(test_packages())
