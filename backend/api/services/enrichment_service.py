# -*- coding: utf-8 -*-
"""
Enrichment and CVE Alert Service for RippleGuard.

This module provides data enrichment, graph statistics calculation, and live CVE feed monitoring.
It merges raw dependency node lists with vulnerability lookup maps and download metrics to produce
the normalized node payload required by Zahid's graph engine.

Data Flow:
    1. enrich_nodes_with_vulnerabilities: Combines flat dependency nodes, OSV vulns, and npm/pypi downloads.
    2. calculate_graph_stats: Computes aggregate graph metrics (node/edge counts, vuln count, total downloads).
    3. get_recent_cve_alerts: Polls OSV.dev for newly modified vulnerability advisories in the last 7 days.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
import httpx
from api.services.famous_attacks import FAMOUS_ATTACKS

OSV_QUERY_URL = "https://api.osv.dev/v1/query"


# --- Domain Knowledge Taxonomy for Qualitative Explanations ---

PACKAGE_DOMAINS = {
    # Logging Frameworks & Diagnostic Telemetry
    "log4js": ("enterprise application logging frameworks and diagnostic telemetry pipelines", "recording application logs, system diagnostics, and audit events"),

    # Web Frameworks & HTTP Servers
    "express": ("web servers, REST APIs, and backend microservices", "handling HTTP requests, route dispatch, and middleware execution"),
    "koa": ("modular web services and async HTTP APIs", "async middleware cascading and request context processing"),
    "fastify": ("high-performance JSON APIs and microservices", "high-throughput schema validation and request routing"),
    "flask": ("Python web applications, microservices, and REST backends", "WSGI request routing, context locals, and endpoint dispatch"),
    "django": ("monolithic Python web platforms and enterprise admin portals", "request-response lifecycles, ORM query execution, and session management"),
    "fastapi": ("async Python microservices, ASGI APIs, and data services", "Pydantic request parsing, dependency injection, and async endpoint execution"),
    "starlette": ("ASGI web applications and websocket services", "async event loops, HTTP connection pooling, and endpoint routing"),
    "tornado": ("long-polling asynchronous web services and socket servers", "non-blocking I/O loops and concurrent connection handlers"),
    "next": ("hybrid SSR/SSG full-stack web applications", "server-side rendering pipelines and API route execution"),
    "nuxt": ("Vue-powered full-stack web applications", "universal server-rendering and client hydration lifecycles"),
    "svelte": ("compiled reactive web applications", "client DOM reactivity and runtime UI state management"),
    "vue": ("reactive single-page web applications and frontend dashboards", "virtual DOM diffing, component reactivity, and user input rendering"),
    "react": ("frontend component trees and modern web client applications", "client-side UI state management and virtual DOM reconciliation"),
    "angular": ("enterprise single-page web platforms", "client-side dependency injection, data-binding, and component lifecycles"),
    "@angular/core": ("enterprise single-page web platforms", "client-side dependency injection, data-binding, and component lifecycles"),

    # Middleware & Request Body Parsing
    "body-parser": ("HTTP request ingestion pipelines", "parsing JSON, URL-encoded, and raw request bodies before routing"),
    "raw-body": ("low-level stream ingestion buffers", "decoding incoming request byte streams and buffer memory allocation"),
    "qs": ("query parameter parsers", "parsing nested URL query strings and URI encoding"),
    "cookie": ("session and authentication cookie parsers", "cookie serialization, verification, and HTTP header parsing"),
    "send": ("static file delivery pipelines", "streaming filesystem assets and path resolution over HTTP"),
    "serve-static": ("static asset middleware handlers", "serving public web assets and directory index files"),
    "path-to-regexp": ("URL routing engines", "matching route parameters and regular expression URL patterns"),
    "mime": ("content negotiation engines", "MIME-type detection and Content-Type header assignment"),
    "content-type": ("HTTP header parsing utilities", "Content-Type header inspection and charset extraction"),

    # Networking & HTTP Clients
    "requests": ("outbound HTTP communication and third-party API integrations", "remote API requests, authentication handshakes, and webhook delivery"),
    "urllib3": ("low-level HTTP client connection pooling and network transports", "socket management, TLS verification, and redirect handling"),
    "axios": ("universal HTTP clients for browser and Node.js runtimes", "outbound API requests, interceptor pipelines, and payload transmission"),
    "httpx": ("async Python HTTP client libraries", "HTTP/2 multiplexing, async connection pools, and external API requests"),

    # Build Tooling & Bundlers
    "webpack": ("frontend asset bundling and production build toolchains", "module compilation, chunk splitting, and production bundle generation"),
    "vite": ("modern frontend development servers and rollup bundlers", "hot-module reloading, ESM transforms, and production bundling"),
    "typescript": ("type-checking and transpilation pipelines", "static analysis, compilation, and JavaScript code emission"),
    "eslint": ("code quality linters and static analysis engines", "syntax tree parsing, rule enforcement, and pre-commit checks"),
    "babel-core": ("JavaScript transpilation pipelines", "AST parsing, polyfill injection, and ECMAScript transformation"),
    "@babel/core": ("JavaScript transpilation pipelines", "AST parsing, polyfill injection, and ECMAScript transformation"),

    # Database & ORM
    "sqlalchemy": ("database persistence layers and enterprise SQL ORMs", "SQL query construction, connection pooling, and transactional operations"),

    # Common Utilities
    "lodash": ("in-memory data processing routines and object manipulation", "deep cloning, property merging, and functional array pipelines"),
    "minimatch": ("glob pattern matching and file filtering utilities", "file path pattern compilation and filesystem matching"),
}


import re

def generate_vulnerability_impact_summary(vuln: dict, package_name: str = "") -> str:
    """
    Generates a natural, non-repetitive, one-sentence plain-language explanation
    of what a CVE actually does, derived from its OSV severity, CWE, and description data.
    """
    if hasattr(vuln, "model_dump"):
        v = vuln.model_dump()
    elif isinstance(vuln, dict):
        v = vuln
    else:
        v = {}

    summary = (v.get("summary", "") or "").strip()
    details = (v.get("details", "") or "").strip()
    cwe_ids = v.get("cwe_ids", []) or []
    if isinstance(cwe_ids, str):
        cwe_ids = [cwe_ids]
    cwe_set = {str(c).strip().upper() for c in cwe_ids}

    pkg = package_name or v.get("package", "")
    if "@" in pkg:
        pkg = pkg.split("@")[0]
    pkg = pkg or "this package"

    sum_lower = summary.lower()
    det_lower = details.lower()
    vid = str(v.get("id", "VULN"))

    # Check if this vulnerability or package matches a famous historical substitute attack
    famous_match = next(
        (a for a in FAMOUS_ATTACKS if a.get("cve") == vid or a.get("id") == vid or (a.get("package") == pkg and vid in (a.get("cve", ""), a.get("id", "")))),
        None
    )
    if famous_match:
        desc = famous_match.get("description", "").rstrip(".")
        name = famous_match.get("name", "")
        impact = famous_match.get("impact", "")
        if "log4j" in desc.lower() or "rce" in desc.lower() or "log4shell" in name.lower() or "cve-2021-44228" in vid.lower():
            return f"Critical zero-day Remote Code Execution (RCE) flaw allowing unauthenticated remote attackers to execute arbitrary system commands ({name} substitute attack on {pkg})."
        elif impact:
            return f"{desc} ({name} supply chain attack, impacting {impact})."
        return f"{desc}."

    # Select variation index deterministically based on vulnerability ID
    var_idx = sum(ord(c) for c in vid) % 3

    # 1. Malicious Package / Backdoor / Sabotage (CWE-506)
    if "CWE-506" in cwe_set or any(k in sum_lower for k in ["malicious package", "backdoor", "wallet stealer", "cryptocurrency", "sabotage", "protestware"]):
        phrasings = [
            f"Contains intentional backdoor code designed to harvest environment credentials, API secrets, or cryptocurrency wallets from the host environment.",
            f"Executes unauthorized malicious payloads upon installation, compromising host integrity and covertly exfiltrating sensitive data.",
            f"Weaponized supply chain payload that covertly compromises runtime execution to exfiltrate private keys and system credentials to attacker-controlled infrastructure."
        ]
        return phrasings[var_idx]

    # 2. Prototype Pollution (CWE-1321)
    if "CWE-1321" in cwe_set or "prototype pollution" in sum_lower or "__proto__" in sum_lower or re.search(r"\b(prototype pollution|__proto__)\b", det_lower):
        phrasings = [
            f"Allows an attacker to inject arbitrary properties into JavaScript base object prototypes via {pkg}, leading to application-wide state tampering or remote code execution.",
            f"Unsafe property merging in {pkg} enables attackers to manipulate object inheritance hierarchies, causing logic bypasses and unexpected application behavior.",
            f"Exploiting prototype pollution in {pkg} allows external payloads to overwrite critical object attributes, unlocking authentication bypasses or gadget-based exploits."
        ]
        return phrasings[var_idx]

    # 3. Remote Code Execution / Command Injection (CWE-78, CWE-94, CWE-77, CWE-88)
    if ({"CWE-78", "CWE-94", "CWE-77", "CWE-88"} & cwe_set) or any(k in sum_lower for k in ["remote code execution", "command injection", "arbitrary code execution", "code injection"]):
        phrasings = [
            f"Allows an attacker to execute arbitrary system commands on the underlying host by passing unsanitized arguments to {pkg}.",
            f"Enables remote attackers to run arbitrary code within the application context due to flawed input boundary validation in {pkg}.",
            f"Flawed execution controls in {pkg} grant attackers complete remote command execution by escaping input sanitization."
        ]
        return phrasings[var_idx]

    # 4. Open Redirect / Malformed URL Handling
    if "open redirect" in sum_lower or "malformed url" in sum_lower or re.search(r"\b(open redirect|unvalidated redirect)\b", det_lower):
        phrasings = [
            f"Allows attackers to redirect users to malicious external domains via unvalidated redirect URL parameters in {pkg}.",
            f"Flawed URL validation in {pkg} enables open redirects, facilitating deceptive phishing campaigns against application users.",
            f"Unsanitized destination URLs in {pkg} can be leveraged to hijack navigation flow and redirect clients to arbitrary external sites."
        ]
        return phrasings[var_idx]

    # 5. Out-of-Bounds Character / Cookie / Header Injection (CWE-74, CWE-113)
    if ({"CWE-74", "CWE-113"} & cwe_set) or any(k in sum_lower for k in ["out of bounds characters", "cookie accepts", "header injection", "crlf injection"]):
        phrasings = [
            f"Out-of-bounds character handling in {pkg} allows attackers to inject malformed headers and tamper with session attributes.",
            f"Flawed character sanitization in {pkg} enables attackers to bypass domain or path boundaries by injecting control characters.",
            f"Allows attackers to manipulate HTTP response headers and cookie attributes via unsanitized characters in {pkg}."
        ]
        return phrasings[var_idx]

    # 6. Regular Expression DoS (CWE-1333)
    if "CWE-1333" in cwe_set or any(k in sum_lower for k in ["regular expression", "redos", "backtracking"]):
        phrasings = [
            f"Catastrophic regex backtracking in {pkg} allows attackers to exhaust server CPU resources and hang event loops with maliciously crafted strings.",
            f"Attackers can trigger regular expression denial of service (ReDoS) against {pkg}, causing thread starvation and freezing responsive service handling.",
            f"Unoptimized pattern matching in {pkg} enables unauthenticated actors to consume 100% CPU capacity by supplying crafted inputs."
        ]
        return phrasings[var_idx]

    # 7. General Denial of Service / Resource Exhaustion (CWE-400, CWE-770, CWE-835, CWE-248, CWE-703)
    if ({"CWE-400", "CWE-770", "CWE-835", "CWE-248", "CWE-703"} & cwe_set) or any(k in sum_lower for k in ["denial of service", "dos", "exhaustion", "memory exhaustion", "limit value silently disables"]):
        phrasings = [
            f"Allows attackers to induce denial of service or process termination by triggering unhandled resource exhaustion in {pkg}.",
            f"Uncontrolled resource consumption in {pkg} enables attackers to crash the application worker or exhaust memory pools.",
            f"Attackers can trigger severe application freezes or crashes by feeding malformed payload structures to {pkg}."
        ]
        return phrasings[var_idx]

    # 8. Path Traversal / Arbitrary File Access (CWE-22, CWE-23, CWE-36)
    if ({"CWE-22", "CWE-23", "CWE-36"} & cwe_set) or any(k in sum_lower for k in ["path traversal", "directory traversal", "arbitrary file"]):
        phrasings = [
            f"Missing path sanitization in {pkg} enables attackers to traverse directory boundaries using dot-dot-slash (`../`) sequences to read sensitive host files.",
            f"Allows attackers to bypass filesystem boundaries in {pkg}, exposing protected operating system files and environment secrets to unauthorized retrieval.",
            f"Unsanitized file path resolution in {pkg} allows malicious actors to access arbitrary files outside the designated root directory."
        ]
        return phrasings[var_idx]

    # 9. Cross-Site Scripting (XSS) (CWE-79)
    if "CWE-79" in cwe_set or any(k in sum_lower for k in ["cross-site scripting", "xss", "script injection", "template injection that can lead to xss"]):
        phrasings = [
            f"Allows attackers to inject arbitrary browser scripts into victim sessions due to unescaped output rendering in {pkg}.",
            f"Improper output encoding in {pkg} enables cross-site scripting (XSS), exposing user sessions, auth tokens, and DOM data to theft.",
            f"Enables client-side code execution in victim browsers by injecting unsanitized HTML or JavaScript through {pkg}."
        ]
        return phrasings[var_idx]

    # 10. SQL Injection (CWE-89)
    if "CWE-89" in cwe_set or "sql injection" in sum_lower or "sqli" in sum_lower:
        phrasings = [
            f"Allows an attacker to manipulate backend SQL statements through unsanitized input in {pkg}, risking unauthorized database reads and data alteration.",
            f"Flawed query construction in {pkg} enables SQL injection, permitting attackers to bypass access controls or extract entire database tables.",
            f"Unsanitized parameter interpolation in {pkg} allows external actors to execute arbitrary database commands within the application's connection context."
        ]
        return phrasings[var_idx]

    # 11. Server-Side Request Forgery (SSRF) (CWE-918)
    if "CWE-918" in cwe_set or "server-side request forgery" in sum_lower or "ssrf" in sum_lower:
        phrasings = [
            f"Forces the application server into issuing forged HTTP requests via {pkg}, allowing attackers to probe internal microservices and cloud metadata endpoints.",
            f"Allows attackers to pivot through {pkg} to reach firewalled internal network resources or query private infrastructure.",
            f"Unvalidated destination URL resolution in {pkg} enables attackers to induce unauthorized outbound requests, bypassing network perimeter defenses."
        ]
        return phrasings[var_idx]

    # 12. Insecure Deserialization (CWE-502)
    if "CWE-502" in cwe_set or any(k in sum_lower for k in ["deserializ", "pickle", "yaml.load"]):
        phrasings = [
            f"Deserialization of untrusted data in {pkg} allows remote attackers to instantiate arbitrary objects and execute unauthorized system commands.",
            f"Flawed object reconstruction in {pkg} allows attackers to hijack application execution flow through weaponized serialized streams.",
            f"Allows attackers to achieve arbitrary code execution by submitting malicious serialized object structures to {pkg}."
        ]
        return phrasings[var_idx]

    # 13. Information Disclosure / Sensitive Data Leakage (CWE-200, CWE-209, CWE-319)
    if ({"CWE-200", "CWE-209", "CWE-319"} & cwe_set) or any(k in sum_lower for k in ["information disclosure", "information exposure", "credential leak", "sensitive data", "cookie disclosure", "token leak"]):
        phrasings = [
            f"Exposes sensitive session tokens, credentials, or internal configuration data to unauthorized third parties through unredacted {pkg} outputs.",
            f"Flawed isolation in {pkg} inadvertently leaks internal application state or network credentials across request boundaries.",
            f"Attackers can capture confidential data or session identifiers leaked through unhandled exceptions or improper state retention in {pkg}."
        ]
        return phrasings[var_idx]

    # 14. Authentication / Authorization Bypass (CWE-287, CWE-306, CWE-285, CWE-863)
    if ({"CWE-287", "CWE-306", "CWE-285", "CWE-863"} & cwe_set) or any(k in sum_lower for k in ["authentication bypass", "authorization bypass", "privilege escalation", "access control"]):
        phrasings = [
            f"Enables unauthorized users to bypass authentication checks or escalate operational privileges due to flawed validation in {pkg}.",
            f"Broken access control logic in {pkg} allows attackers to forge security tokens and access administrative functions without valid credentials.",
            f"Allows attackers to circumvent permission enforcement in {pkg}, executing protected operations under an unprivileged identity."
        ]
        return phrasings[var_idx]

    # 15. Fallback: Synthesize from summary / details if present
    clean_sum = summary.rstrip(".")
    if clean_sum:
        # Strip redundant package prefixes like "urllib3 allows..." or "express vulnerable to..."
        lower_prefix = f"{pkg.lower()} "
        if clean_sum.lower().startswith(lower_prefix):
            clean_sum = clean_sum[len(lower_prefix):].strip()
        clean_sum = clean_sum[0].lower() + clean_sum[1:] if len(clean_sum) > 1 else clean_sum
        return f"Exposes {pkg} to security risks due to {clean_sum}, potentially compromising application stability or data integrity."

    return f"Flaws in {pkg} expose consuming applications to unexpected behavioral failures or security degradation."



def generate_blast_summary(
    compromised_node: str,
    affected_nodes: List[str],
    propagation_paths: List[List[str]] = None,
    critical_chain: List[str] = None,
    total_downloads: int = 0,
    blast_score: float = 0.0,
    ecosystem: str = "npm",
    shadow_dependencies: List[dict] = None
) -> str:
    """
    Generates a qualitative paragraph describing WHAT actually breaks in real applications,
    which kinds of systems are affected, and the concrete operational failure modes.
    """
    comp_pkg = compromised_node.split("@")[0] if "@" in compromised_node else compromised_node
    eco_str = "Python" if ecosystem.lower() == "pypi" else "JavaScript/Node.js"

    # Identify primary compromised package domain
    domain_info = PACKAGE_DOMAINS.get(comp_pkg.lower())
    if not domain_info:
        for k, v in PACKAGE_DOMAINS.items():
            if k in comp_pkg.lower():
                domain_info = v
                break

    if not domain_info:
        if any(w in comp_pkg.lower() for w in ["server", "api", "router", "route"]):
            domain_info = ("web API services and backend server endpoints", "inbound request dispatching and response generation")
        elif any(w in comp_pkg.lower() for w in ["client", "fetch", "http"]):
            domain_info = ("outbound network services and client integrations", "remote API communications and webhook dispatch")
        elif any(w in comp_pkg.lower() for w in ["parse", "body", "json", "xml", "yaml", "cookie"]):
            domain_info = ("input decoding pipelines and content negotiation handlers", "parsing untrusted external input payloads")
        elif any(w in comp_pkg.lower() for w in ["build", "bundle", "compile", "lint"]):
            domain_info = ("developer build tools and CI/CD pipelines", "source code transpilation and production bundling")
        else:
            domain_info = (f"{eco_str} application utilities and helper modules", "in-memory data structures and internal calling routines")

    comp_role, comp_impact = domain_info

    # Case 1: Isolated / Leaf package (0 affected downstream dependencies)
    if not affected_nodes:
        if blast_score > 0.0:
            return (
                f"While no downstream packages in this specific dependency tree depend on {comp_pkg}, the package itself "
                f"harbors active security vulnerabilities. Applications directly importing {comp_pkg} ({comp_role}) "
                f"are directly exposed at runtime, specifically jeopardizing {comp_impact}. Because this component "
                f"operates at the perimeter of the graph, host applications constitute the immediate boundary of exposure."
            )
        else:
            return (
                f"A compromise of {comp_pkg} is isolated to the perimeter of this analyzed tree with 0 downstream dependent "
                f"packages directly reachable within the graph. Applications directly importing {comp_pkg} ({comp_role}) "
                f"constitute the immediate boundary of exposure, with zero cascading ripple effect into third-party libraries."
            )

    # Case 2: Multi-package cascading compromise
    # Inspect affected packages to identify secondary functional domains hit
    affected_pkgs = [n.split("@")[0] for n in affected_nodes if n != compromised_node]
    detected_domains = []
    for pkg in affected_pkgs:
        for k, v in PACKAGE_DOMAINS.items():
            if k == pkg.lower() or k in pkg.lower():
                if v[0] not in detected_domains and v[0] != comp_role:
                    detected_domains.append(v[0])
                break

    # Build qualitative description of impacted tiers
    if detected_domains:
        affected_kinds = ", ".join(detected_domains[:2])
        if len(detected_domains) > 2:
            affected_kinds += f", and {detected_domains[2]}"
        impact_scope = f"{comp_role}, as well as downstream {affected_kinds}"
    else:
        impact_scope = f"{comp_role} and its dependent runtime ecosystem"

    # Analyze critical transmission corridor
    chain_pkgs = [n.split("@")[0] for n in (critical_chain or []) if n != compromised_node]
    if chain_pkgs:
        chain_highlight = f"through critical chokepoints like {', '.join(chain_pkgs[:2])}"
    else:
        chain_highlight = "through direct library bindings"

    # Determine concrete operational failure mode
    if any(w in comp_pkg.lower() for w in ["express", "koa", "flask", "fastapi", "django", "server", "router"]) or any("parsing" in d for d in detected_domains):
        failure_mode = (
            "In production environments, unauthenticated attackers can leverage this vector to intercept in-flight HTTP payloads, "
            "trigger worker process termination during request body parsing, or manipulate session state before application-level middleware executes."
        )
    elif any(w in comp_pkg.lower() for w in ["webpack", "vite", "babel", "rollup", "build", "lint", "tool"]):
        failure_mode = (
            "During deployment and build execution, this compromise allows weaponized scripts to inject malicious payloads directly "
            "into production client bundles, tamper with compiled artifacts, or pivot into developer workstation environments."
        )
    elif any(w in comp_pkg.lower() for w in ["requests", "urllib3", "axios", "httpx", "client"]):
        failure_mode = (
            "For consuming microservices, this exposure threatens outbound data transfers, risking authorization credential leakage "
            "during redirected requests, TLS downgrade attacks, or man-in-the-middle connection tampering."
        )
    else:
        failure_mode = (
            "Any downstream application or microservice utilizing this dependency stack is exposed to silent state corruption, "
            "unexpected memory exhaustion under load, and potential escalation into remote code execution."
        )

    return (
        f"This compromise directly threatens {impact_scope}. The cascading blast path propagates {chain_highlight}, "
        f"placing {comp_impact} in the direct transmission path across {len(affected_nodes)} package(s). {failure_mode}"
    )


def generate_mitigation_reasoning(
    action: dict,
    compromised_node: str,
    total_affected: int = 0,
    total_downloads: int = 0
) -> str:
    """
    Generates a plain-language one-liner explaining why a specific mitigation action
    matters, detailing the strategic rationale rather than just quoting the elimination percentage.
    """
    node = action.get("node", "")
    act_str = action.get("action", "")
    pct = float(action.get("eliminates_blast_percent", 0.0))
    resolved = int(action.get("affected_packages_resolved", 0))
    effort = str(action.get("effort", "LOW")).upper()
    fixed_ver = action.get("fixed_version", "a patched release")

    pkg = node.split("@")[0] if "@" in node else node
    comp_pkg = compromised_node.split("@")[0] if "@" in compromised_node else compromised_node
    is_root = (node == compromised_node) or (pkg == comp_pkg)

    if is_root or pct >= 99.0:
        return f"Neutralizing {pkg} at the root extinguishes the infection at its source, immediately severing all cascading downstream propagation across the entire dependency graph."

    if pct >= 50.0:
        if effort == "LOW":
            return f"High-leverage remediation: upgrading {pkg} to {fixed_ver} resolves {resolved} dependent package(s) ({pct}% of total blast radius) with minimal migration effort."
        else:
            return f"Strategic chokepoint fix: remediating {pkg} cuts off the primary propagation corridor, shielding {resolved} dependent packages from transitive compromise."

    if pct >= 15.0:
        return f"Dismantles an active intermediate propagation bridge, insulating {resolved} downstream libraries from malicious payload traversal even if upstream packages remain unpatched."

    if resolved > 1:
        return f"Contains blast spread across {resolved} tightly coupled subsystem packages, narrowing the attack surface within this dependency branch."

    return f"Hardens the local application boundary by patching known vulnerabilities directly within {pkg}, eliminating local execution risk."


def enrich_nodes_with_vulnerabilities(
    flat_nodes: List[dict],
    vuln_map: Dict[str, list],
    download_map: Dict[str, int]
) -> List[dict]:
    """
    Enriches raw dependency node dictionaries with download metrics, vulnerabilities, and risk scores.

    Args:
        flat_nodes: Raw list of {"name": ..., "version": ..., "ecosystem": ...}
        vuln_map: Dict mapping "name@version" to parsed vulnerability lists
        download_map: Dict mapping package name to monthly download count

    Returns:
        List of enriched node dicts, each containing:
            name, version, ecosystem, monthly_downloads, vulnerabilities, risk_score
    """
    enriched_nodes = []

    for node in flat_nodes:
        pkg_name = node.get("name", "")
        pkg_version = node.get("version", "")
        pkg_ecosystem = node.get("ecosystem", "npm")
        node_key = f"{pkg_name}@{pkg_version}"

        downloads = download_map.get(pkg_name, 0)
        vulnerabilities = vuln_map.get(node_key, [])
        if not vulnerabilities:
            attack_match = next(
                (a for a in FAMOUS_ATTACKS if a.get("package") == pkg_name and (not a.get("version") or a.get("version") == pkg_version)),
                None
            )
            if attack_match:
                vulnerabilities = [{
                    "id": attack_match.get("cve", attack_match.get("id")),
                    "summary": attack_match.get("description", ""),
                    "details": attack_match.get("impact", ""),
                    "severity": "CRITICAL",
                    "cvss_score": 10.0,
                    "fixed_version": None,
                    "impact_summary": f"Critical zero-day Remote Code Execution (RCE) flaw allowing unauthenticated remote attackers to execute arbitrary system commands ({attack_match.get('name')} substitute attack on {pkg_name})."
                }]

        max_risk = 0.0
        enriched_vulns = []
        if vulnerabilities:
            for v in vulnerabilities:
                if isinstance(v, dict):
                    cvss = float(v.get("cvss_score", 0.0))
                    if cvss > max_risk:
                        max_risk = cvss
                    v_copy = dict(v)
                    if not v_copy.get("impact_summary"):
                        v_copy["impact_summary"] = generate_vulnerability_impact_summary(v_copy, pkg_name)
                    enriched_vulns.append(v_copy)

        enriched_nodes.append({
            "name": pkg_name,
            "version": pkg_version,
            "ecosystem": pkg_ecosystem,
            "monthly_downloads": downloads,
            "vulnerabilities": enriched_vulns,
            "risk_score": max_risk
        })

    return enriched_nodes



def calculate_graph_stats(enriched_nodes: List[dict], edges: List[tuple]) -> dict:
    """
    Calculates summary graph metrics for the analyzed dependency graph.

    Args:
        enriched_nodes: Fully enriched list of package node dictionaries
        edges: List of dependency edges as (source, target) tuples or edge dicts

    Returns:
        Dict with total_nodes, total_edges, vulnerable_nodes, and total_monthly_downloads
    """
    total_nodes = len(enriched_nodes)
    total_edges = len(edges)

    vulnerable_nodes = 0
    total_downloads = 0

    for node in enriched_nodes:
        total_downloads += node.get("monthly_downloads", 0)
        if node.get("vulnerabilities"):
            vulnerable_nodes += 1

    return {
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "vulnerable_nodes": vulnerable_nodes,
        "total_monthly_downloads": total_downloads
    }


def _parse_iso_datetime(iso_str: str) -> Optional[datetime]:
    """Helper to parse ISO 8601 string into a timezone-aware UTC datetime."""
    try:
        clean_str = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


async def _query_single_package_alerts(
    client: httpx.AsyncClient,
    pkg: dict,
    cutoff_time: datetime
) -> List[dict]:
    """Hits OSV /query for a single package and extracts advisories modified within 7 days."""
    eco = "PyPI" if pkg.get("ecosystem", "").lower() == "pypi" else "npm"
    payload = {
        "version": pkg.get("version", ""),
        "package": {
            "name": pkg.get("name", ""),
            "ecosystem": eco
        }
    }

    try:
        response = await client.post(OSV_QUERY_URL, json=payload)
        if response.status_code != 200:
            return []
        data = response.json()
        raw_vulns = data.get("vulns", [])

        alerts = []
        for v in raw_vulns:
            mod_str = v.get("modified")
            if not mod_str:
                continue

            mod_dt = _parse_iso_datetime(mod_str)
            if mod_dt and mod_dt >= cutoff_time:
                alerts.append({
                    "package": f"{pkg['name']}@{pkg['version']}",
                    "ecosystem": pkg.get("ecosystem", "npm"),
                    "cve_id": v.get("id", "UNKNOWN"),
                    "summary": v.get("summary", ""),
                    "modified": mod_str,
                    "severity": "UNKNOWN"
                })

        return alerts
    except Exception:
        return []


async def get_recent_cve_alerts(packages: List[dict]) -> List[dict]:
    """
    Checks if any package in the provided package list received a new or updated CVE advisory
    in the last 7 days.

    Args:
        packages: List of {"name": ..., "version": ..., "ecosystem": ...}

    Returns:
        List of alert dicts for vulnerabilities modified in the last 7 days.
    """
    if not packages:
        return []

    cutoff_time = datetime.now(timezone.utc) - timedelta(days=7)

    async with httpx.AsyncClient(timeout=15.0) as client:
        tasks = [
            _query_single_package_alerts(client, pkg, cutoff_time)
            for pkg in packages
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    all_alerts = []
    for res in results:
        if isinstance(res, list):
            all_alerts.extend(res)

    return all_alerts


if __name__ == "__main__":
    async def main():
        print("=== Step 7 Verification: Data Enrichment & Live CVE Alerts ===")

        print("\n--- Testing enrich_nodes_with_vulnerabilities ---")
        mock_flat_nodes = [
            {"name": "lodash", "version": "4.17.19", "ecosystem": "npm"},
            {"name": "express", "version": "4.18.2", "ecosystem": "npm"},
            {"name": "requests", "version": "2.31.0", "ecosystem": "pypi"}
        ]

        mock_vuln_map = {
            "lodash@4.17.19": [
                {
                    "id": "GHSA-f23m-r3pf-42rh",
                    "summary": "Prototype pollution in lodash",
                    "severity": "HIGH",
                    "cvss_score": 7.5,
                    "fixed_version": "4.17.21"
                }
            ]
        }

        mock_download_map = {
            "lodash": 82000000,
            "express": 35000000,
            "requests": 50000000
        }

        enriched = enrich_nodes_with_vulnerabilities(
            mock_flat_nodes, mock_vuln_map, mock_download_map
        )
        for node in enriched:
            print(f"Node: {node['name']}@{node['version']} | Downloads: {node['monthly_downloads']} | Risk Score: {node['risk_score']} | Vulns: {len(node['vulnerabilities'])}")

        assert enriched[0]["risk_score"] == 7.5, "Risk score calculation failed!"
        assert enriched[1]["risk_score"] == 0.0, "Risk score should be 0.0 for zero vulns!"
        print("Enrichment and risk score calculation confirmed correct!")

        print("\n--- Testing calculate_graph_stats ---")
        mock_edges = [("express@4.18.2", "lodash@4.17.19")]
        stats = calculate_graph_stats(enriched, mock_edges)
        print("Calculated Stats:", stats)

        assert stats["total_nodes"] == 3
        assert stats["total_edges"] == 1
        assert stats["vulnerable_nodes"] == 1
        assert stats["total_monthly_downloads"] == 167000000
        print("Graph stats calculation confirmed correct!")

        print("\n--- Testing get_recent_cve_alerts (Live OSV API) ---")
        test_packages = [
            {"name": "lodash", "version": "4.17.21", "ecosystem": "npm"},
            {"name": "express", "version": "4.18.2", "ecosystem": "npm"},
            {"name": "Pillow", "version": "9.0.0", "ecosystem": "pypi"}
        ]

        alerts = await get_recent_cve_alerts(test_packages)
        print(f"Alerts found in last 7 days: {len(alerts)}")
        if alerts:
            for alert in alerts:
                print(f"  Alert: {alert}")
        else:
            print("No recent CVE alerts in the last 7 days")

        print("\n--- Testing get_recent_cve_alerts (Empty List) ---")
        empty_alerts = await get_recent_cve_alerts([])
        assert empty_alerts == [], "Empty input test failed!"
        print("Empty input test returned [] correctly!")

    asyncio.run(main())
