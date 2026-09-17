"""
40-Package Real-World Coverage Matrix Test Suite for RippleGuard.

Tests 40 diverse packages across npm and PyPI through the live /analyze and /simulate pipeline:
1. Large frameworks
2. Build tooling
3. Small single-purpose utils
4. Scoped npm packages
5. Packages with pre-release/unusual version strings
6. Obscure / low-download packages
7. High-traffic general-purpose libraries

Outputs detailed results to backend/COVERAGE_REPORT.md.
"""

import os
import sys
import time
import json
from pathlib import Path
from statistics import median, mean

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

PACKAGES_MATRIX = [
    # 1. Large Frameworks
    {"package": "react", "ecosystem": "npm", "version": None, "category": "Large Framework"},
    {"package": "vue", "ecosystem": "npm", "version": None, "category": "Large Framework"},
    {"package": "angular", "ecosystem": "npm", "version": None, "category": "Large Framework"},
    {"package": "express", "ecosystem": "npm", "version": None, "category": "Large Framework"},
    {"package": "django", "ecosystem": "pypi", "version": None, "category": "Large Framework"},
    {"package": "flask", "ecosystem": "pypi", "version": None, "category": "Large Framework"},
    {"package": "fastapi", "ecosystem": "pypi", "version": None, "category": "Large Framework"},

    # 2. Build Tooling & Compilers
    {"package": "webpack", "ecosystem": "npm", "version": None, "category": "Build Tooling"},
    {"package": "vite", "ecosystem": "npm", "version": None, "category": "Build Tooling"},
    {"package": "typescript", "ecosystem": "npm", "version": None, "category": "Build Tooling"},
    {"package": "eslint", "ecosystem": "npm", "version": None, "category": "Build Tooling"},
    {"package": "babel-core", "ecosystem": "npm", "version": None, "category": "Build Tooling"},
    {"package": "setuptools", "ecosystem": "pypi", "version": None, "category": "Build Tooling"},

    # 3. Small Single-Purpose Utils
    {"package": "chalk", "ecosystem": "npm", "version": None, "category": "Single-Purpose Util"},
    {"package": "ms", "ecosystem": "npm", "version": None, "category": "Single-Purpose Util"},
    {"package": "is-even", "ecosystem": "npm", "version": None, "category": "Single-Purpose Util"},
    {"package": "six", "ecosystem": "pypi", "version": None, "category": "Single-Purpose Util"},
    {"package": "attrs", "ecosystem": "pypi", "version": None, "category": "Single-Purpose Util"},
    {"package": "left-pad", "ecosystem": "npm", "version": None, "category": "Single-Purpose Util"},

    # 4. Scoped npm Packages
    {"package": "@types/node", "ecosystem": "npm", "version": None, "category": "Scoped npm Package"},
    {"package": "@babel/core", "ecosystem": "npm", "version": None, "category": "Scoped npm Package"},
    {"package": "@vue/cli", "ecosystem": "npm", "version": None, "category": "Scoped npm Package"},
    {"package": "@angular/core", "ecosystem": "npm", "version": None, "category": "Scoped npm Package"},
    {"package": "@types/react", "ecosystem": "npm", "version": None, "category": "Scoped npm Package"},

    # 5. Pre-Release & Unusual Versions
    {"package": "vue", "ecosystem": "npm", "version": "3.5.0-alpha.1", "category": "Pre-Release / Special Tag"},
    {"package": "next", "ecosystem": "npm", "version": "15.0.0-canary.1", "category": "Pre-Release / Special Tag"},
    {"package": "svelte", "ecosystem": "npm", "version": "5.0.0-next.1", "category": "Pre-Release / Special Tag"},
    {"package": "pydantic", "ecosystem": "pypi", "version": "2.0b3", "category": "Pre-Release / Special Tag"},
    {"package": "urllib3", "ecosystem": "pypi", "version": "2.0.0a1", "category": "Pre-Release / Special Tag"},
    {"package": "django", "ecosystem": "pypi", "version": "5.0a1", "category": "Pre-Release / Special Tag"},

    # 6. Obscure / Low-Download / Near-Zero Blast Score
    {"package": "micro-uuid", "ecosystem": "npm", "version": None, "category": "Obscure / Low-Download"},
    {"package": "str-reverse", "ecosystem": "npm", "version": None, "category": "Obscure / Low-Download"},
    {"package": "tiny-emitter", "ecosystem": "npm", "version": None, "category": "Obscure / Low-Download"},
    {"package": "leftpad", "ecosystem": "pypi", "version": None, "category": "Obscure / Low-Download"},
    {"package": "simple-math", "ecosystem": "pypi", "version": None, "category": "Obscure / Low-Download"},
    {"package": "pyprimes", "ecosystem": "pypi", "version": None, "category": "Obscure / Low-Download"},

    # 7. High-Traffic General Libraries
    {"package": "lodash", "ecosystem": "npm", "version": None, "category": "High-Traffic Library"},
    {"package": "axios", "ecosystem": "npm", "version": None, "category": "High-Traffic Library"},
    {"package": "requests", "ecosystem": "pypi", "version": None, "category": "High-Traffic Library"},
    {"package": "sqlalchemy", "ecosystem": "pypi", "version": None, "category": "High-Traffic Library"},
]


def run_matrix():
    print("=" * 80)
    print(f"RippleGuard - 40-Package Real-World Coverage Matrix ({len(PACKAGES_MATRIX)} packages)")
    print("=" * 80)

    results = []
    failures = []

    for idx, item in enumerate(PACKAGES_MATRIX, 1):
        pkg = item["package"]
        eco = item["ecosystem"]
        ver = item["version"]
        cat = item["category"]

        display_name = f"{pkg}@{ver}" if ver else pkg
        print(f"[{idx:02d}/{len(PACKAGES_MATRIX):02d}] Testing {eco.upper():4} | {cat:28} | {display_name} ...", end=" ", flush=True)

        start_time = time.perf_counter()
        analyze_status = None
        simulate_status = None
        node_count = 0
        edge_count = 0
        blast_score = None
        resolved_ver = ver
        error_msg = None
        exception_trace = None

        try:
            # 1. Call /analyze
            analyze_payload = {
                "package": pkg,
                "ecosystem": eco,
                "depth": 3
            }
            if ver:
                analyze_payload["version"] = ver

            res_analyze = client.post("/analyze", json=analyze_payload)
            analyze_status = res_analyze.status_code

            if res_analyze.status_code != 200:
                raise RuntimeError(f"POST /analyze returned HTTP {res_analyze.status_code}: {res_analyze.text}")

            analyze_data = res_analyze.json()
            resolved_ver = analyze_data.get("root", {}).get("version", ver or "latest")
            graph_data = analyze_data.get("graph", {})
            nodes = graph_data.get("nodes", [])
            edges = graph_data.get("edges", [])
            node_count = len(nodes)
            edge_count = len(edges)

            # 2. Call /simulate compromising the root package
            compromised_node = f"{analyze_data['root']['name']}@{resolved_ver}"
            simulate_payload = {
                "package": pkg,
                "ecosystem": eco,
                "version": resolved_ver,
                "compromised_node": compromised_node,
                "graph_data": graph_data
            }

            res_simulate = client.post("/simulate", json=simulate_payload)
            simulate_status = res_simulate.status_code

            if res_simulate.status_code != 200:
                raise RuntimeError(f"POST /simulate returned HTTP {res_simulate.status_code}: {res_simulate.text}")

            simulate_data = res_simulate.json()
            blast_score = simulate_data.get("blast_radius", {}).get("blast_score", 0.0)

            elapsed = round(time.perf_counter() - start_time, 2)
            print(f"PASS (nodes: {node_count:3d}, edges: {edge_count:3d}, blast: {blast_score:4.1f}, latency: {elapsed:4.2f}s)")

            results.append({
                "package": pkg,
                "ecosystem": eco,
                "version": resolved_ver,
                "category": cat,
                "status": "PASS",
                "http_status": f"{analyze_status}/{simulate_status}",
                "node_count": node_count,
                "edge_count": edge_count,
                "blast_score": blast_score,
                "latency_sec": elapsed,
                "notes": f"Clean run ({node_count} nodes, {edge_count} edges)"
            })

        except Exception as exc:
            elapsed = round(time.perf_counter() - start_time, 2)
            import traceback
            tb = traceback.format_exc()
            error_msg = str(exc)
            print(f"FAIL ({elapsed:4.2f}s) — {error_msg[:60]}")

            status_str = f"{analyze_status or 'ERR'}/{simulate_status or '-'}"
            results.append({
                "package": pkg,
                "ecosystem": eco,
                "version": resolved_ver or ver or "unknown",
                "category": cat,
                "status": "FAIL",
                "http_status": status_str,
                "node_count": node_count,
                "edge_count": edge_count,
                "blast_score": "-",
                "latency_sec": elapsed,
                "notes": error_msg
            })

            failures.append({
                "package": pkg,
                "ecosystem": eco,
                "version": resolved_ver or ver,
                "category": cat,
                "error": error_msg,
                "traceback": tb
            })

    # Statistical Aggregation
    passes = [r for r in results if r["status"] == "PASS"]
    fail_count = len(failures)
    pass_count = len(passes)
    pass_rate = round((pass_count / len(PACKAGES_MATRIX)) * 100, 1)

    blast_scores = [r["blast_score"] for r in passes if isinstance(r["blast_score"], (int, float))]
    latencies = [r["latency_sec"] for r in results]

    min_blast = min(blast_scores) if blast_scores else 0.0
    max_blast = max(blast_scores) if blast_scores else 0.0
    med_blast = round(median(blast_scores), 1) if blast_scores else 0.0
    avg_latency = round(mean(latencies), 2) if latencies else 0.0

    print("\n" + "=" * 80)
    print(f"Coverage Summary: {pass_count}/{len(PACKAGES_MATRIX)} Passed ({pass_rate}%) | {fail_count} Failed")
    if blast_scores:
        print(f"Blast Score Stats : Min={min_blast} | Max={max_blast} | Median={med_blast}")
    print(f"Average Latency   : {avg_latency}s")
    print("=" * 80)

    # Generate Markdown Report
    report_path = backend_root / "COVERAGE_REPORT.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# RippleGuard — 40-Package Real-World Coverage Report\n\n")
        f.write(f"**Test Execution Time:** {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}\n")
        f.write(f"**Total Packages Tested:** {len(PACKAGES_MATRIX)}\n")
        f.write(f"**Passed:** {pass_count} / {len(PACKAGES_MATRIX)} ({pass_rate}%)\n")
        f.write(f"**Failed:** {fail_count}\n")
        if blast_scores:
            f.write(f"**Blast Score Range:** Min: `{min_blast}`, Median: `{med_blast}`, Max: `{max_blast}`\n")
        f.write(f"**Average Latency:** `{avg_latency}s`\n\n")

        f.write("## 1. Full Package Coverage Matrix\n\n")
        f.write("| # | Package | Eco | Version | Category | Status | Nodes | Edges | Blast Score | Latency | Notes |\n")
        f.write("|---|:---|:---:|:---|:---|:---:|---:|---:|---:|---:|:---|\n")

        for idx, r in enumerate(results, 1):
            bs = f"{r['blast_score']:.1f}" if isinstance(r["blast_score"], (int, float)) else "-"
            f.write(f"| {idx} | `{r['package']}` | {r['ecosystem']} | `{r['version']}` | {r['category']} | **{r['status']}** | {r['node_count']} | {r['edge_count']} | {bs} | {r['latency_sec']}s | {r['notes']} |\n")

        f.write("\n## 2. Failures and Diagnostics\n\n")
        if not failures:
            f.write("✅ **Zero Failures Encountered.** All 40 packages resolved, analyzed, and simulated successfully.\n")
        else:
            f.write(f"⚠️ **{len(failures)} Failure(s) Encountered:**\n\n")
            for idx, fail in enumerate(failures, 1):
                f.write(f"### Failure {idx}: `{fail['package']}` ({fail['ecosystem']} @ `{fail['version']}`)\n")
                f.write(f"- **Category:** {fail['category']}\n")
                f.write(f"- **Error:** `{fail['error']}`\n")
                f.write("```\n")
                f.write(fail["traceback"])
                f.write("```\n\n")

        # 3. PEP 503 Normalization Verification
        pep503_passed, pep503_details = verify_pep503_normalization()
        f.write("\n## 3. PyPI PEP 503 Name Normalization Verification\n\n")
        f.write("Tested case and separator variants for `flask-sqlalchemy`:\n")
        f.write("- `flask-sqlalchemy`\n")
        f.write("- `Flask_SQLAlchemy`\n")
        f.write("- `flask.sqlalchemy`\n\n")
        if pep503_passed:
            base_dl = pep503_details["flask-sqlalchemy"]["root"]["monthly_downloads"]
            f.write(f"**Status:** ✅ **PASS** — All 3 variants resolved to the identical cached graph payload and identical download count (`{base_dl:,}` monthly downloads).\n")
        else:
            f.write("**Status:** ❌ **FAIL** — Variants did not resolve to identical cached payloads.\n")

    print(f"\nWrote full coverage report to: {report_path}")
    return pass_count, fail_count, failures


def verify_pep503_normalization():
    print("\n" + "=" * 80)
    print("Testing PyPI PEP 503 Name Normalization...")
    print("=" * 80)

    variants = ["flask-sqlalchemy", "Flask_SQLAlchemy", "flask.sqlalchemy"]
    responses = {}

    for var in variants:
        res = client.post("/analyze", json={"package": var, "ecosystem": "pypi", "depth": 2})
        if res.status_code != 200:
            raise RuntimeError(f"POST /analyze failed for '{var}' with HTTP {res.status_code}: {res.text}")
        data = res.json()
        responses[var] = data
        print(f"  * '{var}' -> Name: '{data['root']['name']}', Downloads: {data['root']['monthly_downloads']:,}, Nodes: {data['stats']['total_nodes']}")

    base = responses["flask-sqlalchemy"]
    all_identical = all(responses[v] == base for v in variants)
    all_dls_identical = all(responses[v]["root"]["monthly_downloads"] == base["root"]["monthly_downloads"] for v in variants)

    if all_identical and all_dls_identical:
        print("[PASS] PEP 503 Verification PASSED: All 3 variants resolved to identical cached results and download counts.")
        return True, responses
    else:
        print("[FAIL] PEP 503 Verification FAILED: Results differed between variants.")
        return False, responses


if __name__ == "__main__":
    run_matrix()

