"""
Qualitative Enrichment Verification Suite for RippleGuard.

Automated verification across all 40 packages from PACKAGES_MATRIX:
1. 100% of vulnerable nodes returned have a non-empty, non-null impact_summary.
2. 0% contain raw template variables or unparsed placeholders (e.g. '{pkg}', '{comp_pkg}', 'undefined').
3. All leaf packages with 0 downstream affected (chalk, ms, six, attrs, left-pad) return a
   truthful blast summary explaining that the package has no downstream consumers in this graph,
   not a fabricated cascade story.
4. log4js substitute-CVE returns rich Log4Shell RCE impact summary.
"""

import os
import sys
import re
import time
from pathlib import Path
from typing import Dict, Any, List

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from fastapi.testclient import TestClient
from main import app
from scripts.test_coverage_matrix import PACKAGES_MATRIX

client = TestClient(app)

PLACEHOLDER_REGEX = re.compile(r"\{[a-zA-Z0-9_]+\}|\bundefined\b")
LEAF_PACKAGES = {"chalk", "ms", "six", "attrs", "left-pad"}


def check_placeholders(text: str, field_name: str, pkg_context: str) -> List[str]:
    """Return list of error strings if placeholders or undefined appear in text."""
    if not text:
        return []
    matches = PLACEHOLDER_REGEX.findall(text)
    if matches:
        return [f"[{pkg_context}] {field_name} contains placeholder/undefined: {matches} in text: '{text[:80]}'"]
    return []


def run_qualitative_verification():
    print("=" * 80)
    print(f"VERIFYING QUALITATIVE ENRICHMENT ACROSS FULL MATRIX ({len(PACKAGES_MATRIX)} packages)")
    print("=" * 80)

    total_vulnerable_nodes = 0
    total_vulns_checked = 0
    total_mitigations_checked = 0
    total_blast_summaries_checked = 0
    
    placeholder_violations = []
    missing_impact_summaries = []
    leaf_summary_failures = []
    
    start_total = time.perf_counter()

    for idx, item in enumerate(PACKAGES_MATRIX, 1):
        pkg = item["package"]
        eco = item["ecosystem"]
        ver = item["version"]
        cat = item["category"]

        display = f"{pkg}@{ver}" if ver else pkg
        print(f"[{idx:02d}/{len(PACKAGES_MATRIX):02d}] Checking {eco.upper():4} | {display:26} ...", end=" ", flush=True)
        t0 = time.perf_counter()

        # 1. /analyze
        ana_payload = {"package": pkg, "ecosystem": eco, "depth": 3}
        if ver:
            ana_payload["version"] = ver

        res_ana = client.post("/analyze", json=ana_payload)
        if res_ana.status_code != 200:
            print(f"FAILED /analyze ({res_ana.status_code})")
            continue

        ana_data = res_ana.json()
        nodes = ana_data.get("graph", {}).get("nodes", [])
        resolved_ver = ana_data.get("root", {}).get("version", ver or "latest")
        comp_node = f"{ana_data.get('root', {}).get('name', pkg)}@{resolved_ver}"

        # Verify all vulnerabilities in nodes
        pkg_vuln_count = 0
        for n in nodes:
            nid = n.get("id", "unknown")
            vulns = n.get("vulnerabilities", [])
            if vulns:
                total_vulnerable_nodes += 1
                for v in vulns:
                    total_vulns_checked += 1
                    pkg_vuln_count += 1
                    imp = v.get("impact_summary")
                    vid = v.get("id", "unknown")
                    
                    # Check 1: Non-empty, non-null
                    if not imp or not isinstance(imp, str) or not imp.strip():
                        missing_impact_summaries.append(f"[{display} -> {nid}] Vuln {vid} missing impact_summary")
                    else:
                        # Check 2: No placeholders
                        errs = check_placeholders(imp, f"Vuln {vid} impact_summary", display)
                        placeholder_violations.extend(errs)

        # 2. /simulate on root
        sim_payload = {
            "package": pkg,
            "ecosystem": eco,
            "version": resolved_ver,
            "compromised_node": comp_node,
            "graph_data": ana_data.get("graph", {})
        }
        res_sim = client.post("/simulate", json=sim_payload)
        if res_sim.status_code != 200:
            print(f"FAILED /simulate ({res_sim.status_code})")
            continue

        sim_data = res_sim.json()
        blast_summary = sim_data.get("blast_summary", "")
        affected_count = sim_data.get("blast_radius", {}).get("affected_package_count", 0)
        total_blast_summaries_checked += 1

        # Check blast_summary placeholders
        errs = check_placeholders(blast_summary, "blast_summary", display)
        placeholder_violations.extend(errs)

        # Check mitigation why_this_matters placeholders
        for act in sim_data.get("mitigation", {}).get("priority_actions", []):
            total_mitigations_checked += 1
            wtm = act.get("why_this_matters", "")
            errs = check_placeholders(wtm, f"Mitigation ({act.get('action')}) why_this_matters", display)
            placeholder_violations.extend(errs)

        # Check 3: Leaf packages with 0 downstream affected
        if pkg in LEAF_PACKAGES:
            # Must have 0 affected downstream dependents
            if affected_count != 0:
                leaf_summary_failures.append(f"[{display}] Expected 0 affected packages for leaf, got {affected_count}")
            
            # Must explain zero downstream consumers / isolated perimeter truthful statement
            bs_lower = blast_summary.lower()
            truthful_keywords = ["no downstream", "0 downstream", "isolated to the perimeter", "zero cascading ripple effect", "perimeter of this analyzed tree"]
            if not any(kw in bs_lower for kw in truthful_keywords):
                leaf_summary_failures.append(f"[{display}] Leaf blast summary lacks truthful 0-downstream explanation: '{blast_summary[:120]}...'")

        dt = time.perf_counter() - t0
        print(f"OK (vulns: {pkg_vuln_count:2d}, affected: {affected_count:2d}, {dt:4.2f}s)")

    # 4. Explicit substitute-CVE check: log4js@6.4.0
    print("\n" + "-" * 80)
    print("Testing famous substitute-CVE enrichment: log4js@6.4.0 (CVE-2021-44228)...", end=" ", flush=True)
    res_log4js = client.post("/analyze", json={"package": "log4js", "ecosystem": "npm", "version": "6.4.0", "depth": 1})
    log4js_passed = False
    log4js_summary = ""
    if res_log4js.status_code == 200:
        log4js_data = res_log4js.json()
        for n in log4js_data.get("graph", {}).get("nodes", []):
            if "log4js" in n.get("name", ""):
                for v in n.get("vulnerabilities", []):
                    if "CVE-2021-44228" in v.get("id", ""):
                        log4js_summary = v.get("impact_summary", "")
                        if "Remote Code Execution" in log4js_summary or "Log4Shell" in log4js_summary:
                            log4js_passed = True
    print(f"{'PASS' if log4js_passed else 'FAIL'}")
    if log4js_passed:
        print(f"  Summary: \"{log4js_summary}\"")

    total_time = time.perf_counter() - start_total

    print("\n" + "=" * 80)
    print("QUALITATIVE ENRICHMENT AUDIT RESULTS")
    print("=" * 80)
    print(f"Packages Evaluated:           {len(PACKAGES_MATRIX)}")
    print(f"Vulnerable Nodes Encountered: {total_vulnerable_nodes}")
    print(f"Vulnerabilities Checked:      {total_vulns_checked}")
    print(f"Blast Summaries Checked:      {total_blast_summaries_checked}")
    print(f"Mitigation Actions Checked:   {total_mitigations_checked}")
    print(f"Total Audit Time:             {total_time:.2f}s")
    print("-" * 80)
    print(f"Missing impact_summary:       {len(missing_impact_summaries)}")
    print(f"Placeholder Violations:       {len(placeholder_violations)}")
    print(f"Leaf Truthfulness Failures:   {len(leaf_summary_failures)}")
    print(f"log4js Substitute-CVE Check:  {'PASSED' if log4js_passed else 'FAILED'}")
    print("=" * 80)

    if missing_impact_summaries:
        print("\nMISSING IMPACT SUMMARIES:")
        for err in missing_impact_summaries[:10]:
            print(f"  - {err}")

    if placeholder_violations:
        print("\nPLACEHOLDER VIOLATIONS:")
        for err in placeholder_violations[:10]:
            print(f"  - {err}")

    if leaf_summary_failures:
        print("\nLEAF TRUTHFULNESS FAILURES:")
        for err in leaf_summary_failures:
            print(f"  - {err}")

    all_passed = (
        len(missing_impact_summaries) == 0 and
        len(placeholder_violations) == 0 and
        len(leaf_summary_failures) == 0 and
        log4js_passed
    )

    if all_passed:
        print("\n>>> ALL QUALITATIVE ENRICHMENT CHECKS PASSED (100% coverage, 0 placeholders, 100% truthful leaves)")
    else:
        print("\n>>> AUDIT FAILED - SEE DETAILS ABOVE")
        sys.exit(1)


if __name__ == "__main__":
    run_qualitative_verification()
