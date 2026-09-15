# Zahid — Role Brief
### RippleGuard | Manipal Hackathon 2026
**Squad:** Backend (with Hari) | **Title:** Backend Lead — Graph Engine

---

## Your Mission
You own the algorithmic core of RippleGuard: turning a raw dependency graph into a live compromise simulation. Hari feeds you clean data (packages, downloads, CVEs); you turn it into the graph, the blast, and the score. If your engine is slow or wrong, the whole demo falls apart — this is the highest-leverage piece of the build.

## What You Own
| Deliverable | File | Feeds Into |
|---|---|---|
| FastAPI app skeleton + CORS config | `backend/main.py` | Everyone — this is the entry point |
| `/analyze` route | `backend/api/routes/analyze.py` | F1, F2, F3 |
| `/simulate` route | `backend/api/routes/simulate.py` | F4, F5, F6 |
| `/compare` route | `backend/api/routes/compare.py` | F7 |
| NetworkX graph construction (BFS) | `backend/api/services/graph_service.py` (CORE) | Shubham's `GraphCanvas.jsx` |
| Weighted-BFS propagation algorithm | same file | Shubham's blast animation |
| Blast Radius scoring engine | same file | Nitya's `BlastRadiusPanel.jsx` |
| Mitigation Priority engine (greedy set-cover) | same file | Nitya's `MitigationPanel.jsx` |
| Render deployment config | `render.yaml` | Swapnil (he executes the deploy; you own the config) |

## Creative Ideas You're Building
- **Idea 1 — Blast Radius Score:** `BlastScore = log10(downloads)×10 + (pkg_count/200×30) + CVE_bonus`
- **Idea 2 — Butterfly Trace:** longest path from compromised node to any leaf — the "critical chain"
- **Idea 3 — Shadow Dependency Revealer:** chokepoint score = `(dependents in graph) × (downloads/1M)` for nodes at depth > 1
- **Idea 10 — Minimum Intervention Path:** greedy set-cover to find the fewest upgrades that eliminate >80% of blast radius

## Data Contract With Hari
Hari's services return normalized dicts like `{"name": ..., "version": ..., "ecosystem": ..., "monthly_downloads": ..., "vulnerabilities": [...]}`. Agree on this shape with her **before** either of you writes code — it's the only sync point you need, everything else can be built in parallel. See TDD Section 7 (Pydantic models) for the current draft.

## Day 1
- **Morning:** FastAPI project init, CORS config, `/analyze` endpoint stub
- **Afternoon:** Graph construction with NetworkX, BFS propagation algorithm working
- **Evening:** Blast radius scoring, mitigation priority engine

## Day 2
- **Morning:** Scenario comparison endpoint (`/compare`), export/shareable URL feature
- **Afternoon:** Support integration testing, help Swapnil with the Render deploy if needed
- Full team: record video

## Who to Sync With
- **Hari** — data contract (package/vuln shape), daily check-in on service readiness
- **Shubham** — the exact JSON your `/simulate` response returns (propagation_order, timings) so his animation hook matches
- **Nitya** — real Blast Score / mitigation numbers for Slide 7 and the video script, once you have a live demo package (lodash) working
- **Swapnil** — Render env vars and CORS allowed-origins list once he has the Vercel URL

## Reference
Full request/response specs: **TDD.md**, Section 2. Full algorithm code: **TDD.md**, Section 3. Copy-paste starting code: **IMPLEMENTATION.md**, "BACKEND IMPLEMENTATION" section.
