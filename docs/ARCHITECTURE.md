# RippleGuard — Architecture
### High-level system view. For exact API contracts and algorithms, see TDD.md.

---

## 1. System Diagram

```
┌─────────────────────────┐
│   User Browser           │
└────────────┬──────────────┘
             │ HTTPS
             ▼
┌─────────────────────────────────────────┐
│  Vercel — React Frontend                  │
│  (Swapnil: shell/motion, Shubham: graph,  │
│   Nitya: panels)                          │
└────────────┬──────────────────────────────┘
             │ REST (JSON) — see SCHEMA.md
             ▼
┌─────────────────────────────────────────┐
│  Render — FastAPI Backend                 │
│  (Zahid: routes + graph engine,           │
│   Hari: external data services)           │
│                                             │
│  /analyze  /simulate  /compare  /health   │
└──┬──────────┬──────────┬──────────┬────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
npm        PyPI      deps.dev    OSV.dev
registry   JSON API   API        API
(Hari)     (Hari)     (Hari)     (Hari)
```

No database. The graph is computed fresh on every `/analyze` call from live public APIs (Section 3, PRD). Hari's backend caching layer (TDD Section 9.2) is an in-memory cache, not persistent storage.

## 2. Request Lifecycle (the full user journey, end to end)

1. **Search** — user types a package name in `SearchPanel.jsx` (Swapnil), picks npm/PyPI, hits Analyze — or clicks a "Replay a Real Attack" chip (Idea 4)
2. **Fetch** — `useAnalyze.js` (Swapnil) POSTs to `/analyze`; `LoadingOverlay.jsx` shows the staged status messages while it waits
3. **Resolve** — backend calls Hari's `npm_service`/`pypi_service` for metadata + downloads, `deps_service` for the transitive dependency tree, `osv_service` (batched) for CVEs — all concurrently via `asyncio.gather`
4. **Build** — Zahid's `graph_service.py` assembles a NetworkX directed graph from that data and returns nodes/edges to the frontend
5. **Render** — `graphTransform.js` (Shubham) converts the response into React Flow nodes/edges; `GraphCanvas.jsx` renders them, color-coded by severity
6. **Inject** — user clicks a node → "Inject Compromise"; frontend POSTs to `/simulate`
7. **Propagate** — Zahid's weighted-BFS propagation algorithm walks the graph from that node, computes the Blast Radius Score (Idea 1) and the Butterfly Trace critical path (Idea 2)
8. **Animate** — `usePropagate.js` (Shubham) drives the blast animation frame-by-frame using the `propagation_order` array in the response
9. **Explain** — `BlastRadiusPanel.jsx` and `MitigationPanel.jsx` (Nitya) render the score, the human-terms comparison (Idea 9), and the ranked fix list from Zahid's mitigation engine
10. **Compare (optional)** — user injects a second compromise; `/compare` returns both blast results side by side for `CompareView.jsx` (Shubham)

## 3. Component Responsibility Map

| Layer | Owner(s) | Responsibility |
|---|---|---|
| Graph algorithms (construction, propagation, scoring, mitigation) | Zahid | The "brain" — everything in `graph_service.py` |
| External data services (npm, PyPI, deps.dev, OSV) | Hari | The "senses" — normalized facts about packages and vulnerabilities |
| App shell, routing, deployment, motion orchestration | Swapnil | The "frame" — what makes the app feel cinematic and actually load in a browser |
| Graph canvas + animation | Shubham | The "stage" — the visual centerpiece of the demo |
| Score/mitigation panels + copy | Nitya | The "narrator" — turns numbers into a story a judge remembers |

## 4. Why No Database
Every data source (npm, PyPI, deps.dev, OSV) is free, public, and fast enough to query live within the hackathon's demo scale (PRD Section 7: <8s end-to-end). Persistence would add deployment complexity with no judging-criteria benefit — Hari's in-memory cache is sufficient to avoid redundant calls within a session. See PRD Section 5.1 for the original stack decision.

## 5. Deployment Topology
Two independently-deployed services, connected by CORS + an env var:
- **Backend → Render** (free tier), config in `render.yaml`, owned by Zahid, deployed by Swapnil
- **Frontend → Vercel** (free tier), config in `frontend/vercel.json`, owned + deployed by Swapnil
- Connected via `VITE_API_BASE_URL` (frontend env var) and `allow_origins` (backend CORS list) — these two must be swapped between Zahid and Swapnil the moment either service goes live (see both their ROLE.md files)

Full deployment steps: **IMPLEMENTATION.md**, "DEPLOYMENT STEPS". Full Render/Vercel config: **TDD.md**, Section 6.
