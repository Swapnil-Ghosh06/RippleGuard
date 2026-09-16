# -*- coding: utf-8 -*-
"""
Full Integration Test Script for Hari's Data Layer in RippleGuard.

This standalone test suite verifies all data services end-to-end against live APIs:
  - Cache Service (backend.api.utils.cache)
  - npm Service (backend.api.services.npm_service)
  - PyPI Service (backend.api.services.pypi_service)
  - deps.dev Service (backend.api.services.deps_service)
  - OSV Batch Service (backend.api.services.osv_service)
  - Enrichment & Stats Service (backend.api.services.enrichment_service)
  - Famous Attacks Service (backend.api.services.famous_attacks)

Run command:
    python backend/test_services.py
"""

import asyncio
import os
import sys
import time

# Safely handle UTF-8 console output on Windows Windows-1252 terminals
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root directory is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.api.utils.cache import (
    cache_set, cache_get, cache_clear, cache_stats
)
from backend.api.services.npm_service import (
    get_latest_version, get_monthly_downloads, get_downloads_batch
)
from backend.api.services.pypi_service import (
    get_pypi_metadata, parse_pypi_deps
)
from backend.api.services.deps_service import (
    get_all_deps_as_flat_list
)
from backend.api.services.osv_service import (
    query_vulnerabilities_batch
)
from backend.api.services.enrichment_service import (
    enrich_nodes_with_vulnerabilities, calculate_graph_stats
)
from backend.api.services.famous_attacks import (
    FAMOUS_ATTACKS, get_attack_by_id
)


TEST_PACKAGES = [
    {"name": "lodash", "version": "4.17.21", "ecosystem": "npm"},
    {"name": "express", "version": "4.18.2", "ecosystem": "npm"},
    {"name": "minimatch", "version": "3.0.4", "ecosystem": "npm"},
    {"name": "requests", "version": "2.31.0", "ecosystem": "pypi"},
    {"name": "numpy", "version": "1.24.0", "ecosystem": "pypi"},
]


async def run_all_tests():
    passed_sections = 0
    failed_sections = 0

    print("\n========================================")
    print(" HARI DATA LAYER — INTEGRATION SUITE")
    print("========================================\n")

    # ----------------------------------------------------
    # Section 1 — Cache Tests
    # ----------------------------------------------------
    print("--- SECTION 1: CACHE SERVICE TESTS ---")
    try:
        cache_clear()
        cache_set("test:key", {"hello": "world"}, ttl_seconds=10)
        res1 = cache_get("test:key")

        cache_set("expired:key", {"hello": "world"}, ttl_seconds=0)
        time.sleep(0.01)
        res2 = cache_get("expired:key")

        cache_clear()
        stats = cache_stats()

        if res1 == {"hello": "world"} and res2 is None and stats.get("total_keys") == 0:
            print("[PASS] Cache Service: Set, Expire, Get, Clear verified successfully.")
            passed_sections += 1
        else:
            print(f"[FAIL] Cache Service: Unexpected result (res1={res1}, res2={res2}, stats={stats})")
            failed_sections += 1
    except Exception as e:
        print(f"[FAIL] Cache Service threw exception: {e}")
        failed_sections += 1

    # ----------------------------------------------------
    # Section 2 — npm Service Tests
    # ----------------------------------------------------
    print("\n--- SECTION 2: NPM SERVICE TESTS ---")
    try:
        npm_pkgs = [p for p in TEST_PACKAGES if p["ecosystem"] == "npm"]
        npm_individual_passed = True

        for pkg in npm_pkgs:
            ver = await get_latest_version(pkg["name"])
            dl = await get_monthly_downloads(pkg["name"])
            if ver and isinstance(dl, int) and dl > 0:
                print(f"[PASS] npm service - {pkg['name']} — version: {ver}, downloads: {dl:,}")
            else:
                print(f"[FAIL] npm service - {pkg['name']} — invalid version/downloads ({ver}, {dl})")
                npm_individual_passed = False

        batch_names = [p["name"] for p in TEST_PACKAGES]
        batch_dls = await get_downloads_batch(batch_names)

        batch_passed = len(batch_dls) == 5 and all(k in batch_dls for k in batch_names)
        if batch_passed:
            print("[PASS] npm service batch downloads returned all 5 package download counts.")

        if npm_individual_passed and batch_passed:
            passed_sections += 1
        else:
            failed_sections += 1
    except Exception as e:
        print(f"[FAIL] npm Service threw exception: {e}")
        failed_sections += 1

    # ----------------------------------------------------
    # Section 3 — PyPI Service Tests
    # ----------------------------------------------------
    print("\n--- SECTION 3: PYPI SERVICE TESTS ---")
    try:
        pypi_pkgs = [p for p in TEST_PACKAGES if p["ecosystem"] == "pypi"]
        pypi_passed = True

        for pkg in pypi_pkgs:
            meta = await get_pypi_metadata(pkg["name"])
            name = meta.get("name", "")
            version = meta.get("version", "")
            deps = parse_pypi_deps(meta.get("requires_dist", []))

            if name and version and isinstance(deps, list):
                print(f"[PASS] PyPI service - {pkg['name']} — version: {version}, parsed {len(deps)} direct deps")
            else:
                print(f"[FAIL] PyPI service - {pkg['name']} — metadata retrieval failed")
                pypi_passed = False

        if pypi_passed:
            passed_sections += 1
        else:
            failed_sections += 1
    except Exception as e:
        print(f"[FAIL] PyPI Service threw exception: {e}")
        failed_sections += 1

    # ----------------------------------------------------
    # Section 4 — deps.dev Service Tests
    # ----------------------------------------------------
    print("\n--- SECTION 4: DEPS.DEV SERVICE TESTS ---")
    try:
        deps_passed = True
        for pkg in TEST_PACKAGES:
            nodes, edges = await get_all_deps_as_flat_list(
                pkg["name"], pkg["ecosystem"], pkg["version"]
            )
            if len(nodes) > 0 and len(edges) >= 0:
                print(f"[PASS] deps.dev service - {pkg['name']}@{pkg['version']} — {len(nodes)} nodes, {len(edges)} edges")
            else:
                print(f"[FAIL] deps.dev service - {pkg['name']}@{pkg['version']} returned 0 nodes")
                deps_passed = False

        if deps_passed:
            passed_sections += 1
        else:
            failed_sections += 1
    except Exception as e:
        print(f"[FAIL] deps.dev Service threw exception: {e}")
        failed_sections += 1

    # ----------------------------------------------------
    # Section 5 — OSV Service Tests
    # ----------------------------------------------------
    print("\n--- SECTION 5: OSV SERVICE TESTS ---")
    try:
        osv_results = await query_vulnerabilities_batch(TEST_PACKAGES)
        has_5_keys = len(osv_results) == 5
        minimatch_vulns = len(osv_results.get("minimatch@3.0.4", []))
        lodash_vulns = len(osv_results.get("lodash@4.17.21", []))

        print(f"OSV batch returned keys for {len(osv_results)} packages:")
        for k, vulns in osv_results.items():
            print(f"  {k}: {len(vulns)} vulnerabilities found")

        if has_5_keys and minimatch_vulns >= 1 and lodash_vulns >= 1:
            print("[PASS] OSV Batch Vulnerability Service returned expected vuln counts.")
            passed_sections += 1
        else:
            print(f"[FAIL] OSV Batch Service failed criteria (keys={has_5_keys}, minimatch={minimatch_vulns}, lodash={lodash_vulns})")
            failed_sections += 1
    except Exception as e:
        print(f"[FAIL] OSV Service threw exception: {e}")
        failed_sections += 1

    # ----------------------------------------------------
    # Section 6 — Enrichment Service Tests
    # ----------------------------------------------------
    print("\n--- SECTION 6: ENRICHMENT SERVICE TESTS ---")
    try:
        express_nodes, express_edges = await get_all_deps_as_flat_list("express", "npm", "4.18.2")
        pkg_names = list(set(n["name"] for n in express_nodes))

        downloads_task = get_downloads_batch(pkg_names)
        vulns_task = query_vulnerabilities_batch(express_nodes)
        dls, vulns = await asyncio.gather(downloads_task, vulns_task)

        enriched = enrich_nodes_with_vulnerabilities(express_nodes, vulns, dls)
        stats = calculate_graph_stats(enriched, express_edges)

        valid_stats = (
            all(k in stats for k in ["total_nodes", "total_edges", "vulnerable_nodes", "total_monthly_downloads"])
            and stats["total_nodes"] > 0
            and stats["total_monthly_downloads"] > 0
        )

        if valid_stats:
            print(f"[PASS] Enrichment Service: {stats}")
            passed_sections += 1
        else:
            print(f"[FAIL] Enrichment Service produced invalid stats: {stats}")
            failed_sections += 1
    except Exception as e:
        print(f"[FAIL] Enrichment Service threw exception: {e}")
        failed_sections += 1

    # ----------------------------------------------------
    # Section 7 — Famous Attacks Tests
    # ----------------------------------------------------
    print("\n--- SECTION 7: FAMOUS ATTACKS SERVICE TESTS ---")
    try:
        attack_count = len(FAMOUS_ATTACKS)
        log4shell = get_attack_by_id("log4shell-2021")
        fake_attack = get_attack_by_id("fake-xyz")

        if attack_count == 4 and isinstance(log4shell, dict) and fake_attack is None:
            print(f"[PASS] Famous Attacks Service: 4 attacks configured, log4shell found, fake attack returned None.")
            passed_sections += 1
        else:
            print(f"[FAIL] Famous Attacks Service failed checks (count={attack_count}, log4shell={bool(log4shell)}, fake={fake_attack})")
            failed_sections += 1
    except Exception as e:
        print(f"[FAIL] Famous Attacks Service threw exception: {e}")
        failed_sections += 1

    # ----------------------------------------------------
    # Final Summary
    # ----------------------------------------------------
    print("\n========================================")
    print(" HARI DATA LAYER — FINAL TEST RESULTS")
    print("========================================")
    print(f"PASSED: {passed_sections} / 7 sections")
    print(f"FAILED: {failed_sections} / 7 sections")

    if failed_sections == 0 and passed_sections == 7:
        print("\nStatus: ✅ DATA LAYER COMPLETE — READY FOR ZAHID INTEGRATION")
    else:
        print("\nStatus: ❌ FAILURES DETECTED — FIX BEFORE HANDOFF")
    print("========================================\n")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
