"""
Direct Sanity Test for Compromise Propagation, Blast Scoring, Butterfly Trace,
Shadow Dependency Revealer, and Mitigation Engine.
Tests all 5 demo packages: lodash, express, requests, flask, react.
"""

import asyncio
import sys
from pathlib import Path

# Ensure backend root is on Python path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from api.services.graph_service import build_dependency_graph, simulate_compromise
from api.services import npm_service, pypi_service, osv_service


async def test_simulation():
    test_cases = [
        {"package": "lodash", "ecosystem": "npm", "version": "4.17.21"},
        {"package": "express", "ecosystem": "npm", "version": "4.18.2"},
        {"package": "requests", "ecosystem": "pypi", "version": "2.31.0"},
        {"package": "flask", "ecosystem": "pypi", "version": "3.0.0"},
        {"package": "react", "ecosystem": "npm", "version": "18.2.0"},
    ]

    print("===================================================================")
    print("RippleGuard — Propagation Simulation & Blast Radius Sanity Test")
    print("===================================================================\n")

    for tc in test_cases:
        pkg = tc["package"]
        eco = tc["ecosystem"]
        ver = tc["version"]
        root_node = f"{pkg}@{ver}"

        # 1. Build graph
        G = await build_dependency_graph(pkg, eco, ver, max_depth=3)

        # 2. Enrich downloads and vulns
        pkg_names = [G.nodes[n]["name"] for n in G.nodes]
        packages_for_osv = [
            {"name": G.nodes[n]["name"], "version": G.nodes[n]["version"], "ecosystem": eco}
            for n in G.nodes
        ]

        if eco == "npm":
            dl_map = await npm_service.get_downloads_batch(pkg_names)
        else:
            dl_map = await pypi_service.get_downloads_batch(pkg_names)

        vuln_map = await osv_service.query_vulnerabilities_batch(packages_for_osv)

        # 3. Simulate compromise on ROOT node
        res = simulate_compromise(
            G=G,
            compromised_node=root_node,
            download_data=dl_map,
            vuln_data=vuln_map
        )

        blast = res["blast_radius"]
        prop = res["propagation"]
        mit = res["mitigation"]

        print(f"Target: {pkg.upper()} (Root Compromise: {root_node})")
        print(f"  • Blast Radius Score: {blast['blast_score']} / 100")
        print(f"  • Affected Packages:  {blast['affected_package_count']}")
        print(f"  • Affected Downloads: {blast['total_monthly_downloads_affected']:,}")
        print(f"  • Butterfly Trace (Critical Chain):")
        print(f"      {' -> '.join(res['critical_chain'])}")
        print(f"  • Shadow Dependencies (Top Chokepoints):")
        for sd in res["shadow_dependencies"]:
            print(f"      - {sd['node']} (depth={sd['depth']}, in_degree={sd['in_degree']}, score={sd['chokepoint_score']})")
        print(f"  • Priority Actions (Top 2):")
        for act in mit["priority_actions"][:2]:
            print(f"      - {act['action']} (Eliminates: {act['eliminates_blast_percent']}%, Effort: {act['effort']})")
        print(f"  • Minimum Fix Set (Idea 10 >80% coverage):")
        print(f"      {mit['minimum_fix_set']}")
        print("\n" + "-" * 67 + "\n")

        # Sanity assertions on demo packages: none should have 0 or >100 score
        assert 30.0 <= blast['blast_score'] <= 100.0, f"Blast score {blast['blast_score']} out of expected range for {pkg}"
        assert blast['affected_package_count'] > 0, f"Affected package count must be >0 for {pkg}"
        assert blast['total_monthly_downloads_affected'] > 0, f"Downloads must be >0 for {pkg}"

    # 4. Sanity Check on Leaf Node (Should score near 0)
    G_lodash = await build_dependency_graph("lodash", "npm", "4.17.21", 3)
    lodash_names = [G_lodash.nodes[n]["name"] for n in G_lodash.nodes]
    lodash_dl = await npm_service.get_downloads_batch(lodash_names)
    lodash_vulns = await osv_service.query_vulnerabilities_batch([
        {"name": G_lodash.nodes[n]["name"], "version": G_lodash.nodes[n]["version"], "ecosystem": "npm"}
        for n in G_lodash.nodes
    ])

    leaf_node = "bytes@3.1.2"
    print(f"Sanity Check: Compromising Leaf Node '{leaf_node}' (Nothing depends on it):")
    leaf_res = simulate_compromise(
        G=G_lodash,
        compromised_node=leaf_node,
        download_data=lodash_dl,
        vuln_data=lodash_vulns
    )
    leaf_blast = leaf_res["blast_radius"]
    print(f"  • Affected Count: {leaf_blast['affected_package_count']} (expected: 0)")
    print(f"  • Blast Score:    {leaf_blast['blast_score']} (expected: 0.0)")
    print(f"  • Critical Chain: {leaf_res['critical_chain']}")
    assert leaf_blast['affected_package_count'] == 0
    assert leaf_blast['blast_score'] == 0.0
    print("  [PASS] Leaf node sanity check PASSED!\n")

    print("All simulation algorithms for all 5 demo packages verified successfully!")


if __name__ == "__main__":
    asyncio.run(test_simulation())
