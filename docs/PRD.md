# RippleGuard — Product Requirements Document (PRD)
### Manipal Hackathon 2026 | Open Source Supply Chains: The Ripple Effect
**Version:** 1.1 | **Date:** September 15, 2026 | **Team:** Zahid, Hari (Haripriya), Swapnil, Shubham, Nitya
**Squads:** Backend — Hari & Zahid | Frontend — Shubham, Nitya & Swapnil | PPT/Video — Nitya

---

## 1. Product Overview

### 1.1 Product Name
**RippleGuard** — *See the compromise before it becomes a catastrophe.*

### 1.2 One-Line Pitch
RippleGuard is a live supply chain compromise simulator that maps your software's dependency ecosystem, injects a real or hypothetical compromise, and shows — in real time — exactly how the blast spreads, who gets hit, and what to fix first.

### 1.3 The Problem (in plain words)
Modern software is built on top of hundreds of open-source packages. When one low-level package gets compromised (think: Log4Shell, xz-utils, event-stream), that compromise ripples silently through every app that depends on it — directly or through 4 layers of transitive dependencies. Current security tools tell you *which packages have vulnerabilities*. They do not tell you *what happens after one gets compromised*. RippleGuard does.

### 1.4 The Insight That Makes Us Different
> "Every existing tool is a **vulnerability scanner**. RippleGuard is a **compromise propagation simulator**."

Scanners say: *"This package has a known CVE."*
RippleGuard says: *"If this package gets compromised, here is the exact propagation path, here are the 47 downstream applications that break, here is the blast radius score, and here is the minimum-intervention fix path."*

That reframe — from detection to simulation — is what makes this top 1%.

### 1.5 Hackathon Alignment
| Criteria | How RippleGuard Wins |
|---|---|
| **Innovation Beyond Requirements** | Propagation simulation + blast radius scoring is beyond what the PS asks. No one else frames it this way. |
| **Feasibility** | Built entirely on free public APIs (npm registry, OSV.dev, deps.dev). Zero cost, fully deployable. |
| **Marketing / Media** | Live interactive demo is the video. Judges see real packages, real vulnerabilities, real propagation. |
| **Monetisation** | B2B SaaS model for DevSecOps teams. Enterprise tier with private registry scanning. |
| **Prototype Bonus** | Fully deployed web app + public GitHub repo. Prototype IS the demo. |
| **Butterfly Effect Theme** | One compromised package → thousands of applications. The theme is the product. |

---

## 2. Target Users

### 2.1 Primary Users
- **DevSecOps Engineers** at companies using npm/PyPI packages
- **Open Source Maintainers** who want to understand their package's downstream blast radius
- **Security Researchers** studying supply chain attack propagation

### 2.2 Secondary Users (for monetisation slide)
- **CISOs** who need boardroom-level supply chain risk summaries
- **Development teams** doing pre-deployment dependency audits

---

## 3. Data Sources (All Free, Zero Auth)

| Source | What We Use It For | Endpoint |
|---|---|---|
| **npm Registry** | Package metadata, direct dependencies, download counts | `https://registry.npmjs.org/<package>` |
| **deps.dev API (Google)** | Resolved transitive dependency graphs for npm + PyPI | `https://api.deps.dev/v3/systems/{sys}/packages/{pkg}/versions/{ver}:dependencies` |
| **OSV.dev API (Google)** | Known CVEs and vulnerability data per package | `https://api.osv.dev/v1/query` (batch: `/v1/querybatch`) |
| **npm download stats** | Popularity / impact score per package | `https://api.npmjs.org/downloads/point/last-month/<pkg>` |
| **PyPI JSON API** | PyPI package metadata and dependencies | `https://pypi.org/pypi/<pkg>/json` |

All of these are **completely free, no API key, no rate-limit concern for demo scale.**

---

## 4. Core Features (MVP — must be done by Sept 17)

### F1 — Package Input & Ecosystem Selection
- User types any npm or PyPI package name (e.g., `lodash`, `requests`, `react`)
- Selects ecosystem (npm / PyPI)
- Optionally types a specific version (defaults to latest)

### F2 — Live Dependency Graph Construction
- Backend calls deps.dev API to get the full resolved transitive dependency tree
- Builds a directed graph: nodes = packages, edges = "depends on"
- Returns graph data to frontend in real time (with loading state)
- Depth configurable: 2, 3, or 4 levels deep (default: 3)

### F3 — Vulnerability Overlay (OSV Integration)
- For every node in the graph, backend queries OSV.dev batch API
- Nodes with known CVEs are marked with severity badges (CRITICAL / HIGH / MEDIUM / LOW)
- Clicking a node shows: CVE ID, description, CVSS score, affected versions, fix version

### F4 — Compromise Injection & Propagation Simulation
*This is the feature that makes us unique.*
- User clicks any node in the graph and clicks "Inject Compromise"
- Backend runs BFS/DFS propagation from that node upward through dependents
- Every package that depends on the compromised node (directly or transitively) gets a "blast" status
- Propagation is **weighted** — packages with higher download counts show higher real-world impact
- Animation shows the blast spreading node by node in real time on the frontend

### F5 — Blast Radius Score
- Calculated per injected node: `BlastScore = Σ(monthly_downloads of affected packages) * severity_weight` (Formalized in TDD Section 3.2: `min(count/200, 1.0)*30 + min(log10(downloads)/9, 1.0)*60 + CVE_bonus`)
- Displayed as a large number with a label: "**47M users potentially affected**"
- Broken down: direct dependencies affected, transitive dependencies affected, estimated app count
> **Note on Prototype Calibrations:** Earlier prototype documentation and draft mocks quoted uniform blast scores in the 65–75 range. Those were stub-only illustrative figures used during mock calibration before live network integration. Against live registries (npm, PyPI, deps.dev, OSV), blast scores dynamically reflect real graph topologies and real registry metrics (e.g. 0.0 for leaf packages with 0 dependents, 10.0 for zero-dependency packages with known CVEs like lodash, 60.3 for react, and 78.2 for high-connectivity frameworks like express).

### F6 — Mitigation Priority Engine
- After compromise injection, backend ranks all vulnerable paths by fix priority
- Priority = (blast score × exploit likelihood × fix availability)
- Output: ordered list of "fix X first → eliminates Y% of blast radius"
- Shows which version upgrade resolves the most issues with fewest changes

### F7 — Scenario Comparison (Differentiator Feature)
- User can inject compromises at two different nodes simultaneously
- Side-by-side blast radius comparison
- "Which compromise is more dangerous?" answered visually

### F8 — Export Report
- One-click export of the full analysis as a structured JSON or shareable URL
- URL contains encoded graph state — shareable with team members

---

## 5. Tech Stack Decision

### 5.1 Why This Stack
Given: Windows dev environment, Python + Node available, 5-person team, 2-day sprint, zero cost, need deployment.

| Layer | Technology | Why |
|---|---|---|
| **Backend** | Python + FastAPI | Zahid + Hari's domain, fast to build, async support for concurrent API calls, auto-docs at /docs |
| **Graph Engine** | NetworkX (Python) | Industry standard, BFS/DFS built in, no setup needed |
| **Frontend** | React + Vite | Swapnil, Shubham + Nitya comfortable here, fast HMR, Vite builds quickly |
| **Graph Visualization** | React Flow | Better for interactive node manipulation than Cytoscape.js; drag, click, animate natively |
| **Styling** | Tailwind CSS | Rapid styling, dark theme trivial, responsive by default |
| **State Management** | Zustand (lightweight) | Simpler than Redux for this scope |
| **Backend Deployment** | Render (free tier) | Set-and-forget, FastAPI native support, auto-deploys from GitHub |
| **Frontend Deployment** | Vercel (free tier) | Zero config React deploy, instant CDN, auto-deploys from GitHub |
| **Database** | None needed | Graph is computed on demand from live APIs; no persistence required for MVP |

### 5.2 Architecture Diagram (Text)
```
[User Browser]
     │
     ▼
[Vercel — React Frontend]
     │  REST API calls
     ▼
[Render — FastAPI Backend]
     ├──► registry.npmjs.org (package metadata)
     ├──► api.deps.dev (dependency graph)
     ├──► api.osv.dev (vulnerability data)
     └──► api.npmjs.org (download stats)
```

---

## 6. User Flow (End to End)

```
1. User lands on RippleGuard homepage
2. Types "express" (representing their application / web server) in the search box, selects "npm", clicks Analyze
3. Loading state: "Mapping dependency graph... Fetching vulnerabilities..."
4. Graph renders: express at center, 56 nodes across 3 layers, color-coded by vulnerability severity
5. User sees panel: "7 vulnerable packages detected across transitive dependencies"
6. User clicks a critical dependency node (e.g. send or cookie) → clicks "Inject Compromise"
7. Animation: red pulse spreads from the compromised dependency outward through every dependent package
8. Blast Radius panel updates: shows Blast Radius Score (e.g. 71/100), affected package count, and total monthly downloads in the blast zone
9. Mitigation panel shows prioritized remediation: "Upgrade <package> to <version> — eliminates X% of blast radius"
10. User clicks "Compare" → injects a second compromise on a different dependency node (e.g. cookie vs mime)
11. Side-by-side blast comparison renders with a clear summary: "Compromising X is Nx more dangerous than Y"
12. User clicks "Export Report" → downloads complete JSON or copies shareable URL
```

---

## 7. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Graph render time | < 5 seconds for depth-3 graph |
| API response time | < 8 seconds end-to-end (concurrent API calls with asyncio) |
| Max nodes displayed | 150 (pagination/depth limit for performance) |
| Mobile responsiveness | Functional on 768px+ (tablet); graph view mobile-aware |
| Uptime during demo | Deployed on Render + Vercel — persistent, not localhost |
| Video compatibility | App must be live at a public URL for video demo |

---

## 8. Judging Criteria Mapping

### 8.1 Innovation (Section 8.1 of Rulebook)
- **Feature Novelty:** Propagation simulation is not in the problem statement. Blast Radius Score is invented by us. Scenario Comparison is our idea. These are "beyond given requirements."
- **Implementation Quality:** Real live APIs, real vulnerability data, real propagation — not mocked.

### 8.2 Feasibility (Section 8.2)
- **Practicality:** Fully deployed. Judges can open the URL during evaluation.
- **Roadmap:** See Section 11 below.
- **Inclusivity:** Works for both npm (JS ecosystem) and PyPI (Python ecosystem) — covers the two largest open source communities.

### 8.3 Marketing Strategy (Section 8.3)
- **Target Audience:** DevSecOps teams, open source maintainers, CISO offices
- **Go-to-Market:** GitHub-first launch, Product Hunt, integration with CI/CD tools
- **Media Strategy:** One viral demo: "What happens if lodash gets compromised?" — real-time visualization

### 8.4 Monetisation (Section 8.4)
- **Free tier:** Public packages only, depth-3, 10 analyses/day
- **Pro tier ($29/month):** Private registry scanning, unlimited depth, team sharing, PDF reports
- **Enterprise tier ($499/month):** CI/CD integration, SBOM ingestion, Slack/Jira alerting, custom ecosystems
- **Sustainability:** Usage-based API cost (OSV/deps.dev are free), margin is near 100%

---

## 9. Out of Scope for MVP (but mentioned in PPT as roadmap)
- GitHub Actions CI/CD integration
- SBOM (Software Bill of Materials) file upload
- Private npm/PyPI registry scanning
- Slack/Jira alerting on new CVEs
- Historical compromise timeline (when did this package become vulnerable?)

---

## 10. Team Responsibilities

**Team split (updated):** Backend — **Hari (Haripriya) & Zahid**. Frontend — **Shubham, Nitya & Swapnil**. PPT/Video — **Nitya**.

| Person | Squad | Role | Deliverables |
|---|---|---|---|
| **Zahid** | Backend | Backend Lead — Graph Engine | FastAPI app skeleton, NetworkX graph construction (F2), BFS/weighted-BFS propagation algorithm (F4), Blast Radius scoring engine (F5), Mitigation Priority engine (F6), Scenario Comparison endpoint (F7), Render deployment, `/analyze` and `/simulate` routes |
| **Hari (Haripriya)** | Backend | Backend — Data & Integrations | npm registry + npm download-stats service, PyPI JSON API service, deps.dev dependency-resolution service, OSV.dev batch vulnerability service, data normalization across ecosystems, request/response Pydantic models, backend testing with the 5 demo packages, in-memory caching layer |
| **Swapnil** | Frontend | Frontend — DevOps & Scaffolding | GitHub repo setup (public, `rippleguard`), Vercel deployment + `vercel.json`, React + Vite project scaffold, Zustand store wiring, routing, dark theme (Tailwind), loading/error states, end-to-end deployed-URL testing |
| **Shubham** | Frontend | Frontend — Graph Visualization | React Flow `GraphCanvas` component, node click / detail-panel interaction, vulnerability-overlay rendering on nodes, propagation (blast) animation hook, Historical Attack Replay UI (Idea 4) |
| **Nitya** | Frontend + PPT | Frontend — Panels & UI Copy, PPT Lead | Blast Radius panel + "human terms" population-comparison component (Idea 9), Mitigation panel UI, Compare view UI copy, **plus** all slide content, video script, demo recording coordination, submission checklist |

Because Data Pipeline work (npm/PyPI/deps.dev/OSV wrappers) now sits fully inside the Backend squad with Hari, Zahid should hand off the algorithmic layer (graph construction, propagation, scoring) so the two can work in parallel without blocking each other — Hari's services feed raw data, Zahid's engine consumes it.

---

## 11. Implementation Roadmap (48 hours)

### Day 1 — Sept 15–16 (Build)
**Morning (0–6h)**
- [ ] Zahid: FastAPI project init, CORS config, `/analyze` endpoint stub
- [ ] Hari: npm registry + PyPI + deps.dev + OSV API wrappers built and tested in isolation
- [ ] Swapnil: React + Vite project init, React Flow installed, GitHub repo created (public)
- [ ] Shubham: React Flow sandbox — can render a static graph, node click handler working
- [ ] Nitya: React Flow sandbox support + start slide content from this PRD

**Afternoon (6–14h)**
- [ ] Zahid: Graph construction with NetworkX, BFS propagation algorithm working
- [ ] Hari: API wrappers integrated into Zahid's FastAPI endpoints, async batching with `asyncio.gather`
- [ ] Shubham: Frontend calls backend `/analyze`, renders real graph
- [ ] Swapnil: Dark theme applied, loading states, error handling
- [ ] Nitya: Blast Radius panel + Mitigation panel UI shells

**Evening (14–20h)**
- [ ] Zahid: Blast radius scoring, mitigation priority engine
- [ ] Hari: Vulnerability data normalization, CVE payload shaping for `/analyze` response
- [ ] Shubham: Vulnerability overlay on nodes, CVE panel on click
- [ ] Swapnil: Deploy to Vercel + Render, test end-to-end on deployed URL
- [ ] Full team: Integration test with 5 real packages

### Day 2 — Sept 16–17 (Polish + Submit)
**Morning (0–8h)**
- [ ] Zahid: Scenario comparison endpoint, export/shareable URL feature
- [ ] Hari: Backend caching layer, error handling for external API failures, backend test pass
- [ ] Shubham: Propagation animation, side-by-side comparison UI
- [ ] Nitya: PPT first draft done, slide content from this PRD; "human terms" population-comparison component
- [ ] Swapnil: Final deployed URL confirmed accessible in incognito

**Afternoon (8–14h)**
- [ ] Full team: Record video (max 3 min with prototype)
- [ ] Nitya: Final PPT polish, convert to PDF
- [ ] All: Review submission checklist

**Evening (14+ h)**
- [ ] Submit before deadline: PDF PPT, video URL (YouTube unlisted/GDrive), GitHub URL
- [ ] Verify all links in incognito browser
