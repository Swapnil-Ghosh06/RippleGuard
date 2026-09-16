"""
Comprehensive Adversarial Test Runner for RippleGuard.
Connects to live API server at http://127.0.0.1:8000.
Records real responses, status codes, timings, raw OSV responses, and failures.
"""

import sys
from pathlib import Path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import json
import time
import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000"


def safe_post(client, path, json_body, timeout=60.0):
    t0 = time.perf_counter()
    try:
        res = client.post(path, json=json_body, timeout=timeout)
        dur = round(time.perf_counter() - t0, 3)
        try:
            body = res.json()
        except Exception:
            body = res.text
        return res.status_code, dur, body, None
    except Exception as e:
        dur = round(time.perf_counter() - t0, 3)
        return 500, dur, None, str(e)


def safe_get(client, path, timeout=60.0):
    t0 = time.perf_counter()
    try:
        res = client.get(path, timeout=timeout)
        dur = round(time.perf_counter() - t0, 3)
        try:
            body = res.json()
        except Exception:
            body = res.text
        return res.status_code, dur, body, None
    except Exception as e:
        dur = round(time.perf_counter() - t0, 3)
        return 500, dur, None, str(e)


def run_all_tests():
    client = httpx.Client(base_url=BASE_URL, timeout=60.0)
    results = {}

    print("==================================================")
    print("1. HAPPY PATH: 5 DEMO PACKAGES")
    print("==================================================")
    demo_packages = [
        {"package": "lodash", "ecosystem": "npm", "version": "4.17.21"},
        {"package": "express", "ecosystem": "npm", "version": "4.18.2"},
        {"package": "requests", "ecosystem": "pypi", "version": "2.31.0"},
        {"package": "flask", "ecosystem": "pypi", "version": "3.0.0"},
        {"package": "react", "ecosystem": "npm", "version": "18.2.0"},
    ]

    happy_results = []
    for pkg_info in demo_packages:
        pkg = pkg_info["package"]
        eco = pkg_info["ecosystem"]
        ver = pkg_info["version"]
        print(f"\n--- Testing {pkg} ({eco}@{ver}) ---")

        # 1. /analyze
        an_status, an_dur, an_body, an_err = safe_post(client, "/analyze", {
            "package": pkg,
            "ecosystem": eco,
            "version": ver,
            "depth": 3
        })
        print(f"  [Analyze] Status: {an_status}, Duration: {an_dur}s")

        total_nodes = total_edges = vuln_nodes = root_downloads = 0
        if an_status == 200 and isinstance(an_body, dict):
            total_nodes = an_body.get("stats", {}).get("total_nodes", 0)
            total_edges = an_body.get("stats", {}).get("total_edges", 0)
            vuln_nodes = an_body.get("stats", {}).get("vulnerable_nodes", 0)
            root_downloads = an_body.get("root", {}).get("monthly_downloads", 0)
            print(f"  Nodes: {total_nodes}, Edges: {total_edges}, Vuln nodes: {vuln_nodes}, Monthly Downloads: {root_downloads:,}")
        else:
            print(f"  [Analyze Error]: {an_body or an_err}")

        root_node_id = f"{pkg}@{ver}"
        graph_id = f"{pkg}-{eco}-{ver}-depth3"

        # 2. /simulate on root node
        sim_status = None
        sim_dur = 0.0
        root_blast_score = None
        root_affected_pkgs = 0
        root_affected_dls = 0
        sim_body = None
        sim_err = None

        if an_status == 200:
            sim_status, sim_dur, sim_body, sim_err = safe_post(client, "/simulate", {
                "graph_id": graph_id,
                "compromised_node": root_node_id,
                "propagation_model": "weighted_bfs"
            })
            print(f"  [Simulate Root] Status: {sim_status}, Duration: {sim_dur}s")
            if sim_status == 200 and isinstance(sim_body, dict):
                root_blast_score = sim_body.get("blast_radius", {}).get("blast_score")
                root_affected_pkgs = sim_body.get("blast_radius", {}).get("affected_package_count", 0)
                root_affected_dls = sim_body.get("blast_radius", {}).get("total_monthly_downloads_affected", 0)
                print(f"  Root Blast Score: {root_blast_score}, Affected Pkgs: {root_affected_pkgs}, Affected Downloads: {root_affected_dls:,}")
            else:
                print(f"  [Simulate Error]: {sim_body or sim_err}")

        # 3. /export
        exp_status = None
        exp_dur = 0.0
        if an_status == 200:
            exp_status, exp_dur, exp_body, exp_err = safe_get(client, f"/export/{graph_id}")
            print(f"  [Export JSON] Status: {exp_status}")

        happy_results.append({
            "package": pkg,
            "ecosystem": eco,
            "version": ver,
            "analyze_status": an_status,
            "analyze_latency_s": an_dur,
            "analyze_error": an_body if an_status != 200 else None,
            "total_nodes": total_nodes,
            "total_edges": total_edges,
            "vulnerable_nodes": vuln_nodes,
            "root_downloads": root_downloads,
            "simulate_status": sim_status,
            "simulate_latency_s": sim_dur,
            "simulate_error": sim_body if sim_status != 200 else None,
            "root_blast_score": root_blast_score,
            "root_affected_pkgs": root_affected_pkgs,
            "root_affected_dls": root_affected_dls,
            "export_status": exp_status
        })

    # Compare pair 1: express vs cookie
    print("\n--- Testing /compare (express vs cookie) ---")
    c1_status, c1_dur, c1_body, c1_err = safe_post(client, "/compare", {
        "graph_id": "express-npm-4.18.2-depth3",
        "node_a": "express@4.18.2",
        "node_b": "cookie@0.5.0"
    })
    print(f"  Status: {c1_status}")
    comp_1_res = {}
    if c1_status == 200 and isinstance(c1_body, dict):
        comp_data = c1_body.get("comparison", {})
        print(f"  Winner: {comp_data.get('winner')}, Summary: {comp_data.get('summary')}")
        comp_1_res = comp_data
    else:
        print(f"  Error: {c1_body or c1_err}")
        comp_1_res = {"error": c1_body or c1_err, "status": c1_status}

    # Compare pair 2: lodash vs express
    print("\n--- Testing /compare (lodash vs express) ---")
    c2_status, c2_dur, c2_body, c2_err = safe_post(client, "/compare", {
        "graph_id": "express-npm-4.18.2-depth3",
        "node_a": "lodash@4.17.21",
        "node_b": "express@4.18.2"
    })
    print(f"  Status: {c2_status}")
    comp_2_res = {}
    if c2_status == 200 and isinstance(c2_body, dict):
        comp_data = c2_body.get("comparison", {})
        print(f"  Winner: {comp_data.get('winner')}, Summary: {comp_data.get('summary')}")
        comp_2_res = comp_data
    else:
        print(f"  Error: {c2_body or c2_err}")
        comp_2_res = {"error": c2_body or c2_err, "status": c2_status}

    results["happy_path"] = {
        "packages": happy_results,
        "compare_1": comp_1_res,
        "compare_2": comp_2_res
    }

    print("\n==================================================")
    print("2. ALL 4 FAMOUS ATTACKS REPLAY")
    print("==================================================")
    att_status, _, attacks, _ = safe_get(client, "/attacks")
    attacks = attacks if att_status == 200 and isinstance(attacks, list) else []
    attack_results = []

    for att in attacks:
        att_id = att["id"]
        pkg = att["package"]
        eco = att["ecosystem"]
        ver = att["version"]
        claimed_cve = att["cve"]
        print(f"\n--- Testing Attack: {att['name']} ({att_id}) ---")
        print(f"  Target: {pkg} ({eco}@{ver}), Claimed CVE: {claimed_cve}")

        an_status, an_dur, an_body, an_err = safe_post(client, "/analyze", {
            "package": pkg,
            "ecosystem": eco,
            "version": ver,
            "depth": 3
        })
        print(f"  /analyze Status: {an_status}, Duration: {an_dur}s")

        actual_cves = []
        node_count = 0
        vuln_count = 0

        if an_status == 200 and isinstance(an_body, dict):
            node_count = an_body.get("stats", {}).get("total_nodes", 0)
            vuln_count = an_body.get("stats", {}).get("vulnerable_nodes", 0)
            for n in an_body.get("graph", {}).get("nodes", []):
                if n.get("name") == pkg:
                    for v in n.get("vulnerabilities", []):
                        actual_cves.append(v.get("id"))
            print(f"  Graph Nodes: {node_count}, Vulnerable Nodes: {vuln_count}")
            print(f"  OSV Vulnerabilities returned for root ({pkg}@{ver}): {actual_cves}")
        else:
            print(f"  /analyze Failed: {an_body or an_err}")

        # Direct OSV batch query to see what OSV live API actually returns
        osv_raw_ids = []
        osv_vulns_raw = []
        try:
            osv_res = httpx.post("https://api.osv.dev/v1/querybatch", json={
                "queries": [{
                    "package": {
                        "name": pkg,
                        "ecosystem": "PyPI" if eco.lower() == "pypi" else "npm"
                    },
                    "version": ver
                }]
            }, timeout=20.0)
            if osv_res.status_code == 200:
                osv_raw = osv_res.json()
                results_list = osv_raw.get("results", [])
                if results_list:
                    osv_vulns_raw = results_list[0].get("vulns", [])
                    osv_raw_ids = [v.get("id") for v in osv_vulns_raw]
            print(f"  Direct OSV Live query returned IDs: {osv_raw_ids}")
        except Exception as e:
            print(f"  OSV Direct Query Error: {e}")

        cve_match = (claimed_cve in osv_raw_ids) or (claimed_cve in actual_cves)
        print(f"  Claimed CVE matches OSV Live? {cve_match}")

        attack_results.append({
            "id": att_id,
            "name": att["name"],
            "package": pkg,
            "ecosystem": eco,
            "version": ver,
            "claimed_cve": claimed_cve,
            "analyze_status": an_status,
            "analyze_duration_s": an_dur,
            "analyze_error": an_body if an_status != 200 else None,
            "node_count": node_count,
            "vuln_count": vuln_count,
            "osv_ids_found": osv_raw_ids,
            "claimed_cve_matches_osv": cve_match,
            "raw_osv_vulns_sample": osv_vulns_raw[:3]
        })

    results["famous_attacks"] = attack_results

    print("\n==================================================")
    print("3. ADVERSARIAL / EDGE CASES")
    print("==================================================")
    edge_cases = {}

    # Case 1: Nonexistent package name
    print("\n[Edge 1] Nonexistent package name...")
    st, dur, body, err = safe_post(client, "/analyze", {
        "package": "this-package-definitely-does-not-exist-xyz123",
        "ecosystem": "npm",
        "depth": 3
    })
    print(f"  Status: {st}, Body: {body or err}")
    edge_cases["nonexistent_pkg"] = {"status": st, "body": body or err}

    # Case 2: Valid package, nonexistent version
    print("\n[Edge 2] Valid package, nonexistent version (lodash@99.99.99)...")
    st, dur, body, err = safe_post(client, "/analyze", {
        "package": "lodash",
        "ecosystem": "npm",
        "version": "99.99.99",
        "depth": 3
    })
    print(f"  Status: {st}, Body: {body or err}")
    edge_cases["nonexistent_version"] = {"status": st, "body": body or err}

    # Case 3: Wrong ecosystem for a real package
    print("\n[Edge 3] Wrong ecosystem for a real package (lodash in PyPI)...")
    st, dur, body, err = safe_post(client, "/analyze", {
        "package": "lodash",
        "ecosystem": "pypi",
        "depth": 3
    })
    print(f"  Status: {st}, Body: {body or err}")
    edge_cases["wrong_ecosystem"] = {"status": st, "body": body or err}

    # Case 4: Depth boundary tests
    print("\n[Edge 4] Depth testing (0, 1, 5, 100)...")
    depth_results = {}
    for d in [0, 1, 5, 100]:
        st, dur, body, err = safe_post(client, "/analyze", {
            "package": "lodash",
            "ecosystem": "npm",
            "version": "4.17.21",
            "depth": d
        })
        snippet = str(body or err)[:150]
        print(f"  depth={d}: Status {st} ({dur}s), Body: {snippet}")
        depth_results[str(d)] = {"status": st, "duration_s": dur, "snippet": snippet}
    edge_cases["depth_tests"] = depth_results

    # Case 5: Large dependency tree (webpack)
    print("\n[Edge 5] Large dependency tree (webpack)...")
    st, dur, body, err = safe_post(client, "/analyze", {
        "package": "webpack",
        "ecosystem": "npm",
        "version": "5.90.0",
        "depth": 3
    }, timeout=90.0)
    print(f"  Status: {st}, Duration: {dur}s")
    if st == 200 and isinstance(body, dict):
        total_nodes = body.get("stats", {}).get("total_nodes", 0)
        total_edges = body.get("stats", {}).get("total_edges", 0)
        print(f"  Total nodes: {total_nodes}, Total edges: {total_edges}")
        edge_cases["large_tree"] = {
            "status": st,
            "duration_s": dur,
            "nodes": total_nodes,
            "edges": total_edges,
            "under_150_cap": total_nodes <= 150,
            "under_8s": dur < 8.0
        }
    else:
        edge_cases["large_tree"] = {"status": st, "duration_s": dur, "error": body or err}

    # Case 6: Leaf package with zero dependents
    print("\n[Edge 6] Leaf package with zero dependents...")
    st, dur, body, err = safe_post(client, "/analyze", {"package": "express", "ecosystem": "npm", "version": "4.18.2", "depth": 2})
    if st == 200 and isinstance(body, dict):
        graph_id_ex = "express-npm-4.18.2-depth2"
        node_scores = []
        for n in body.get("graph", {}).get("nodes", []):
            nid = n.get("id")
            s_st, s_dur, s_body, _ = safe_post(client, "/simulate", {"graph_id": graph_id_ex, "compromised_node": nid})
            if s_st == 200 and isinstance(s_body, dict):
                bs = s_body.get("blast_radius", {}).get("blast_score")
                aff_cnt = s_body.get("blast_radius", {}).get("affected_package_count")
                node_scores.append({"node": nid, "blast_score": bs, "affected_count": aff_cnt})
        node_scores.sort(key=lambda x: x["blast_score"])
        print(f"  Lowest blast score nodes: {node_scores[:3]}")
        print(f"  Highest blast score nodes: {node_scores[-3:]}")
        edge_cases["leaf_package"] = {
            "lowest_nodes": node_scores[:3],
            "highest_nodes": node_scores[-3:],
        }
    else:
        edge_cases["leaf_package"] = {"error": body or err}

    # Case 7: Malformed JSON body, missing required fields, wrong types
    print("\n[Edge 7] Malformed JSON / wrong types / missing fields...")
    st_m, _, body_m, _ = safe_post(client, "/analyze", {"depth": 3})
    print(f"  Missing required 'package': Status {st_m}")

    st_t, _, body_t, _ = safe_post(client, "/analyze", {"package": "lodash", "depth": "not-an-int"})
    print(f"  Wrong type (str instead of int for depth): Status {st_t}")

    try:
        res_raw = client.post("/analyze", content="{not_valid_json: 123", headers={"Content-Type": "application/json"})
        st_b = res_raw.status_code
        body_b = res_raw.json() if st_b < 500 else res_raw.text
    except Exception as e:
        st_b = 500
        body_b = str(e)
    print(f"  Malformed JSON syntax: Status {st_b}")

    edge_cases["validation"] = {
        "missing_required": {"status": st_m, "body": body_m},
        "wrong_type": {"status": st_t, "body": body_t},
        "bad_json": {"status": st_b, "body": body_b},
    }

    # Case 8: Two concurrent /analyze calls for the same package
    print("\n[Edge 8] Two concurrent /analyze calls for same package...")
    async def concurrent_analyze():
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as aclient:
            t0 = time.perf_counter()
            req1 = aclient.post("/analyze", json={"package": "chalk", "ecosystem": "npm", "depth": 2})
            req2 = aclient.post("/analyze", json={"package": "chalk", "ecosystem": "npm", "depth": 2})
            r1, r2 = await asyncio.gather(req1, req2)
            dur = round(time.perf_counter() - t0, 3)
            return r1, r2, dur

    r1, r2, conc_dur = asyncio.run(concurrent_analyze())
    print(f"  Req 1 Status: {r1.status_code}, Req 2 Status: {r2.status_code}, Concurrent Duration: {conc_dur}s")
    edge_cases["concurrent_calls"] = {
        "req1_status": r1.status_code,
        "req2_status": r2.status_code,
        "duration_s": conc_dur,
        "identical_nodes": len(r1.json().get("graph", {}).get("nodes", [])) == len(r2.json().get("graph", {}).get("nodes", [])) if r1.status_code == 200 and r2.status_code == 200 else False
    }

    # Case 9: /simulate called with a compromised_node that isn't actually in the graph
    print("\n[Edge 9] /simulate with compromised_node not in graph...")
    st, dur, body, err = safe_post(client, "/simulate", {
        "graph_id": "express-npm-4.18.2-depth3",
        "compromised_node": "ghost-package@0.0.1"
    })
    print(f"  Status: {st}, Body snippet: {str(body or err)[:150]}")
    edge_cases["simulate_nonexistent_node"] = {
        "status": st,
        "body_snippet": str(body or err)[:250],
        "blast_score": body.get("blast_radius", {}).get("blast_score") if st == 200 and isinstance(body, dict) else None
    }

    # Case 10: /compare with node_a == node_b
    print("\n[Edge 10] /compare with node_a == node_b...")
    st, dur, body, err = safe_post(client, "/compare", {
        "graph_id": "express-npm-4.18.2-depth3",
        "node_a": "express@4.18.2",
        "node_b": "express@4.18.2"
    })
    print(f"  Status: {st}")
    if st == 200 and isinstance(body, dict):
        cd = body.get("comparison", {})
        print(f"  Winner: {cd.get('winner')}, Summary: {cd.get('summary')}")
        edge_cases["compare_identical_nodes"] = {"status": 200, "winner": cd.get("winner"), "summary": cd.get("summary")}
    else:
        print(f"  Error: {body or err}")
        edge_cases["compare_identical_nodes"] = {"status": st, "error": body or err}

    # Case 11: /export/{graph_id} for a graph_id that was never analyzed
    print("\n[Edge 11] /export for unanalyzed graph_id...")
    st, dur, body, err = safe_get(client, "/export/this-graph-was-never-analyzed-xyz")
    print(f"  Status: {st}, Body: {body or err}")
    edge_cases["export_unanalyzed"] = {"status": st, "body": body or err}

    results["edge_cases"] = edge_cases

    # 4. EXTERNAL API FLAKINESS & 503 SIMULATION
    print("\n==================================================")
    print("4. EXTERNAL API FAILURE HANDLING & 503 VERIFICATION")
    print("==================================================")
    from unittest.mock import patch
    from api.services.exceptions import ServiceTimeoutError
    from fastapi.testclient import TestClient
    from main import app as local_app

    test_client = TestClient(local_app, raise_server_exceptions=False)
    with patch("api.services.deps_service.get_dependencies", side_effect=ServiceTimeoutError("deps.dev timed out")):
        t0 = time.perf_counter()
        res_timeout = test_client.post("/analyze", json={
            "package": "some-flaky-package",
            "ecosystem": "npm",
            "version": "1.0.0",
            "depth": 3
        })
        flakiness_res = {
            "status": res_timeout.status_code,
            "body": res_timeout.json(),
            "fires_503": res_timeout.status_code == 503
        }
        print(f"  deps.dev Timeout status: {res_timeout.status_code}, detail: {res_timeout.json()}")

    results["external_api_failure"] = flakiness_res

    # Save complete raw output
    with open("scripts/adversarial_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nSaved full results to scripts/adversarial_results.json")


if __name__ == "__main__":
    run_all_tests()
