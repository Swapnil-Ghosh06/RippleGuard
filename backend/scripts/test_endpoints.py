"""
Comprehensive End-to-End API Integration Test Suite for RippleGuard.

Tests all four endpoints:
- POST /analyze
- POST /simulate
- POST /compare (Feature F7)
- GET /export/{graph_id} (Feature F8)

Also verifies strict error handling:
- 404 for package or graph not found
- 503 for upstream service timeouts
- 422 for invalid ecosystem or depth outside [1, 5]
"""

import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    print("[TEST] Checking GET /health...")
    res = client.get("/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    print("  --> [PASS] GET /health is healthy\n")


def test_analyze():
    print("[TEST] Checking POST /analyze (Happy Path)...")
    res = client.post("/analyze", json={
        "package": "express",
        "ecosystem": "npm",
        "version": "4.18.2",
        "depth": 3
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["root"]["name"] == "express"
    assert data["root"]["version"] == "4.18.2"
    assert len(data["graph"]["nodes"]) > 0
    assert len(data["graph"]["edges"]) > 0
    assert data["stats"]["total_nodes"] > 0
    print(f"  --> [PASS] POST /analyze returned {data['stats']['total_nodes']} nodes, {data['stats']['total_edges']} edges\n")
    return "express-npm-4.18.2-depth3"


def test_simulate(graph_id: str):
    print("[TEST] Checking POST /simulate...")
    res = client.post("/simulate", json={
        "graph_id": graph_id,
        "compromised_node": "express@4.18.2",
        "propagation_model": "weighted_bfs"
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["compromised_node"] == "express@4.18.2"
    assert "blast_radius" in data
    assert "blast_score" in data["blast_radius"]
    assert "critical_chain" in data
    assert "shadow_dependencies" in data
    assert "mitigation" in data
    print(f"  --> [PASS] POST /simulate blast score: {data['blast_radius']['blast_score']}, affected packages: {data['blast_radius']['affected_package_count']}\n")


def test_compare(graph_id: str):
    print("[TEST] Checking POST /compare (Feature F7)...")
    res = client.post("/compare", json={
        "graph_id": graph_id,
        "node_a": "express@4.18.2",
        "node_b": "cookie@0.5.0"
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "comparison" in data
    comp = data["comparison"]
    assert "node_a" in comp
    assert "node_b" in comp
    assert "winner" in comp
    assert "summary" in comp
    print(f"  --> Winner:  {comp['winner']}")
    print(f"  --> Summary: {comp['summary']}")
    assert comp["winner"] == "node_a", f"Expected node_a to win, got {comp['winner']}"
    assert "more dangerous than" in comp["summary"]
    print("  --> [PASS] POST /compare returned accurate winner and comparison summary\n")


def test_export(graph_id: str):
    print("[TEST] Checking GET /export/{graph_id} (Feature F8)...")

    # 1. JSON Report Mode (download=False)
    res = client.get(f"/export/{graph_id}")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "report_meta" in data
    assert "shareable_url" in data
    assert "state_payload" in data
    assert "analysis" in data
    assert "simulation" in data
    assert "recommended_demo_mode" in data["report_meta"]
    print(f"  --> Shareable URL: {data['shareable_url']}")
    print(f"  --> Recommended Demo Mode: {data['report_meta']['recommended_demo_mode']}")

    # 2. File Download Mode (download=True)
    res_dl = client.get(f"/export/{graph_id}?download=true")
    assert res_dl.status_code == 200, f"Expected 200, got {res_dl.status_code}"
    disp = res_dl.headers.get("content-disposition", "")
    assert "attachment" in disp, f"Expected attachment header, got {disp}"
    assert f"rippleguard-report-{graph_id}.json" in disp
    print(f"  --> Download Header: {disp}")
    print("  --> [PASS] GET /export/{graph_id} verified for both JSON body and attachment download\n")


def test_error_handling():
    print("[TEST] Checking Error Handling Across All 4 Endpoints...")

    # 1. 422 - Invalid ecosystem
    res_bad_eco = client.post("/analyze", json={
        "package": "lodash",
        "ecosystem": "cargo",  # Invalid ecosystem
        "depth": 3
    })
    assert res_bad_eco.status_code == 422, f"Expected 422 for invalid ecosystem, got {res_bad_eco.status_code}"
    print("  --> [PASS] 422 returned for invalid ecosystem 'cargo'")

    # 2. 422 - Depth out of range (0 and 6)
    res_depth_low = client.post("/analyze", json={
        "package": "lodash",
        "ecosystem": "npm",
        "depth": 0
    })
    assert res_depth_low.status_code == 422, f"Expected 422 for depth=0, got {res_depth_low.status_code}"

    res_depth_high = client.post("/analyze", json={
        "package": "lodash",
        "ecosystem": "npm",
        "depth": 6
    })
    assert res_depth_high.status_code == 422, f"Expected 422 for depth=6, got {res_depth_high.status_code}"
    print("  --> [PASS] 422 returned for depths out of range (0, 6)")

    # 3. 404 - Package Not Found in /analyze
    res_pkg_404 = client.post("/analyze", json={
        "package": "nonexistent-pkg-xyz-12345",
        "ecosystem": "npm",
        "depth": 3
    })
    assert res_pkg_404.status_code == 404, f"Expected 404 for missing package, got {res_pkg_404.status_code}"
    print(f"  --> [PASS] 404 returned for unknown package: {res_pkg_404.json()['detail']}")

    # 4. 404 - Graph Not Found in /simulate, /compare, /export
    res_sim_404 = client.post("/simulate", json={
        "graph_id": "nonexistent-graph-id-404",
        "compromised_node": "pkg@1.0.0"
    })
    assert res_sim_404.status_code == 404, f"Expected 404 for invalid graph_id in /simulate, got {res_sim_404.status_code}"

    res_comp_404 = client.post("/compare", json={
        "graph_id": "nonexistent-graph-id-404",
        "node_a": "pkgA@1.0.0",
        "node_b": "pkgB@1.0.0"
    })
    assert res_comp_404.status_code == 404, f"Expected 404 for invalid graph_id in /compare, got {res_comp_404.status_code}"

    res_export_404 = client.get("/export/nonexistent-graph-id-404")
    assert res_export_404.status_code == 404, f"Expected 404 for invalid graph_id in /export, got {res_export_404.status_code}"
    print("  --> [PASS] 404 returned for nonexistent graphs in /simulate, /compare, /export")

    # 5. 503 - Upstream Service Timeout in /analyze
    from unittest.mock import patch
    from api.services.exceptions import ServiceTimeoutError
    with patch("api.services.deps_service.get_all_deps_as_flat_list", side_effect=ServiceTimeoutError("Upstream timeout")):
        res_timeout = client.post("/analyze", json={
            "package": "some-timeout-pkg",
            "ecosystem": "npm",
            "depth": 3
        })
        assert res_timeout.status_code == 503, f"Expected 503 for timeout package, got {res_timeout.status_code}"
        print(f"  --> [PASS] 503 returned for upstream timeout: {res_timeout.json()['detail']}\n")


def test_all_five_demo_packages():
    print("[TEST] Checking All 5 Video Demo Packages via /analyze and /simulate...")
    packages = [
        {"package": "lodash", "ecosystem": "npm", "version": "4.17.21"},
        {"package": "express", "ecosystem": "npm", "version": "4.18.2"},
        {"package": "requests", "ecosystem": "pypi", "version": "2.31.0"},
        {"package": "flask", "ecosystem": "pypi", "version": "3.0.0"},
        {"package": "react", "ecosystem": "npm", "version": "18.2.0"},
    ]
    for pkg_info in packages:
        pkg = pkg_info["package"]
        eco = pkg_info["ecosystem"]
        ver = pkg_info["version"]
        res_a = client.post("/analyze", json={"package": pkg, "ecosystem": eco, "version": ver, "depth": 3})
        assert res_a.status_code == 200, f"/analyze failed for {pkg}: {res_a.text}"
        data_a = res_a.json()
        assert data_a["stats"]["total_nodes"] > 0
        graph_id = f"{pkg}-{eco}-{ver}-depth3"

        res_s = client.post("/simulate", json={"graph_id": graph_id, "compromised_node": f"{pkg}@{ver}"})
        assert res_s.status_code == 200, f"/simulate failed for {pkg}: {res_s.text}"
        data_s = res_s.json()
        score = data_s["blast_radius"]["blast_score"]
        count = data_s["blast_radius"]["affected_package_count"]
        dls = data_s["blast_radius"]["total_monthly_downloads_affected"]
        assert 0.0 <= score <= 100.0, f"Blast score {score} out of range for {pkg}"
        if pkg == "lodash":
            assert count == 0, f"Affected count must be 0 for standalone {pkg}"
            assert score == 10.0, f"Lodash should have 10.0 CVE score, got {score}"
        else:
            assert count > 0, f"Affected count must be >0 for {pkg}"
            assert dls > 0, f"Affected downloads must be >0 for {pkg}"
        print(f"  --> [PASS] {pkg.upper()} ({eco}): Blast Score={score}/100, Affected={count}, Downloads={dls:,}")
    print("  --> All 5 Demo Packages Verified Successfully!\n")


def test_log4shell_replay():
    print("[TEST] Checking Historical Attack Replay for Log4Shell (log4js@6.4.0)...")
    # 1. Verify /attacks endpoint surfaces log4shell with its demo-mapped CVE
    res_att = client.get("/attacks/log4shell-2021")
    assert res_att.status_code == 200, f"/attacks/log4shell-2021 failed: {res_att.text}"
    att_data = res_att.json()
    assert att_data["package"] == "log4js"
    assert att_data["cve"] == "CVE-2021-44228"
    assert att_data["ecosystem"] == "npm"

    # 2. Verify /analyze successfully builds dependency graph for the replay package
    res = client.post("/analyze", json={
        "package": att_data["package"],
        "ecosystem": att_data["ecosystem"],
        "version": att_data["version"],
        "depth": 3
    })
    assert res.status_code == 200, f"/analyze failed for log4js: {res.text}"
    data = res.json()
    assert data["stats"]["total_nodes"] > 0, "Expected non-empty graph for log4js"
    assert data["stats"]["total_edges"] > 0, "Expected non-empty edges for log4js"
    root_node = next((n for n in data["graph"]["nodes"] if n["id"] == "log4js@6.4.0"), None)
    assert root_node is not None, "log4js@6.4.0 root node must be present in graph"
    print(f"  --> [PASS] /attacks returned valid spec for Log4Shell ({att_data['cve']})")
    print(f"  --> [PASS] log4js@6.4.0 graph built: {data['stats']['total_nodes']} nodes, {data['stats']['total_edges']} edges\n")


def run_all_tests():
    print("===================================================================")
    print("RippleGuard — End-to-End API Test Suite (F7 Compare & F8 Export)")
    print("===================================================================\n")
    test_health()
    graph_id = test_analyze()
    test_simulate(graph_id)
    test_compare(graph_id)
    test_export(graph_id)
    test_error_handling()
    test_all_five_demo_packages()
    test_log4shell_replay()
    print("===================================================================")
    print("ALL API ENDPOINTS & ERROR HANDLING PASSED SUCCESSFULLY!")
    print("===================================================================")


if __name__ == "__main__":
    run_all_tests()
