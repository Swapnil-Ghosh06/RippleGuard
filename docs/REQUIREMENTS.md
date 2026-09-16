# RippleGuard — Requirements
### A checklist, not a pitch. For the "why" behind each requirement, see PRD.md.

---

## 1. Functional Requirements

| ID | Requirement | Acceptance Criteria | Owner |
|---|---|---|---|
| F1 | Package input & ecosystem selection | User can type any npm/PyPI package name, select ecosystem, optionally specify version | Swapnil (UI), Zahid (validation) |
| F2 | Live dependency graph construction | `/analyze` returns a resolved transitive graph, depth 2–4, within 5s | Zahid + Hari |
| F3 | Vulnerability overlay | Every node with a known CVE is severity-tagged (CRITICAL/HIGH/MEDIUM/LOW); click shows CVE ID, CVSS, fix version | Hari (data), Shubham (UI) |
| F4 | Compromise injection & propagation | Clicking a node + "Inject Compromise" triggers weighted BFS from that node through all dependents | Zahid |
| F5 | Blast Radius Score | A single 0–100 score is computed and displayed per injected node, with a downloads/app-count breakdown | Zahid (calc), Nitya (display) |
| F6 | Mitigation Priority Engine | Ranked list of fixes by blast-elimination percentage, showing which single upgrade resolves the most | Zahid (calc), Nitya (display) |
| F7 | Scenario Comparison | Two compromises can be injected simultaneously with a side-by-side blast comparison | Zahid (backend), Shubham (UI) |
| F8 | Export Report | One-click export of the analysis as JSON or a shareable URL | Zahid |

Each row must be demoable end-to-end (not mocked) before Day 2 evening per PRD Section 11.

## 2. Non-Functional Requirements

| Requirement | Target | Verified By |
|---|---|---|
| Graph render time | < 5 seconds for a depth-3 graph | Zahid, during integration test |
| API response time (end-to-end) | < 8 seconds | Zahid + Hari, via `asyncio` concurrent calls |
| Max nodes displayed | 150 (depth/pagination limit) | Zahid |
| Mobile responsiveness | Functional at 768px+ (tablet); graph view mobile-aware | Swapnil |
| Uptime during demo | Deployed on Render + Vercel, not localhost | Swapnil |
| Zero cost | No paid APIs, no paid hosting, no API keys required anywhere | Whole team |
| Video-demo compatibility | App must be reachable at a public URL, verified in incognito | Swapnil, Nitya |

## 3. Environment / Setup Requirements

| Component | Requirement |
|---|---|
| Python | 3.11+ (FastAPI, NetworkX, httpx) |
| Node | 18+ (Vite requires it) |
| Package managers | `pip`, `npm` — no `poetry`/`pnpm` mandated, but keep it consistent across the team |
| OS | Any — Zahid/Swapnil on Windows, rest of team can use whatever; nothing in the stack is OS-specific |
| API keys | **None required.** npm registry, PyPI, deps.dev, and OSV.dev are all free and keyless (PRD Section 3) |
| Accounts needed | GitHub (syedzahidsaleem org), Vercel (free tier), Render (free tier) |

## 4. Hackathon Compliance Requirements
These are pass/fail, not scored — miss one and the Tier 1 disqualification rules apply (Rulebook 9.1). Full checklist: **RULES.md**.
- [ ] PPT built on the **official template only**, exported as **PDF**
- [ ] Video ≤ 2 min (≤ 3 min with prototype demo), every member visible, hosted publicly/unlisted
- [ ] No college name, logo, or Jain University reference anywhere
- [ ] GitHub repo **public** for the full evaluation window
- [ ] Solution aligns with the selected Problem Statement ID

## 5. Out of Scope for MVP
Explicitly not required for Round 1 (see PRD Section 9 for the roadmap items these become later): GitHub Actions CI/CD integration, SBOM upload, private registry scanning, Slack/Jira alerting, persistent historical timeline.
