import asyncio
import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from api.routes.analyze import analyze_package
from api.routes.simulate import simulate_compromise_route
from api.models.request_models import AnalyzeRequest, SimulateRequest

async def main():
    packages = [
        ("angular", "npm", "1.8.3"),
        ("urllib3", "pypi", "2.0.0a1"),
        ("express", "npm", "4.18.2")
    ]

    for pkg, eco, ver in packages:
        print("\n" + "=" * 60)
        print(f" TESTING QUALITATIVE ENRICHMENT: {pkg}@{ver} ({eco})")
        print("=" * 60)

        ana_req = AnalyzeRequest(package=pkg, ecosystem=eco, version=ver, depth=3)
        ana_res = await analyze_package(ana_req)

        print(f"\n--- Vulnerabilities & impact_summary ({ana_res.stats.vulnerable_nodes} vulnerable nodes found) ---")
        for node in ana_res.graph.nodes:
            if node.vulnerabilities:
                print(f"\nPackage: {node.id}")
                for v in node.vulnerabilities:
                    print(f"  CVE ID:         {v.id} (Severity: {v.severity}, CVSS: {v.cvss_score})")
                    print(f"  Raw Summary:    {v.summary}")
                    print(f"  Impact Summary: {v.impact_summary}")

        sim_req = SimulateRequest(compromised_node=f"{pkg}@{ver}")
        sim_res = await simulate_compromise_route(sim_req)

        print(f"\n--- Simulation & blast_summary (Blast Score: {sim_res.blast_radius.blast_score}, Affected: {sim_res.blast_radius.affected_package_count}) ---")
        print(f"Blast Summary:\n{sim_res.blast_summary}")

        print(f"\n--- Mitigation & why_this_matters (Top {min(3, len(sim_res.mitigation.priority_actions))} Actions) ---")
        for act in sim_res.mitigation.priority_actions[:3]:
            print(f"  * Action:           {act.action}")
            print(f"    Eliminates:       {act.eliminates_blast_percent}% (Resolved pkgs: {act.affected_packages_resolved})")
            print(f"    Why This Matters: {act.why_this_matters}")

if __name__ == "__main__":
    asyncio.run(main())
