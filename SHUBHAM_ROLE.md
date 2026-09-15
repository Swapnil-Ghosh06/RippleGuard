# Shubham — Role Brief
### RippleGuard | Manipal Hackathon 2026
**Squad:** Frontend (with Swapnil + Nitya) | **Title:** Frontend — Graph Visualization

---

## Your Mission
You build the thing judges will actually watch during the demo: the live graph, the blast animation, the "butterfly" moment. This is the most visually memorable part of RippleGuard — the CREATIVE_IDEAS.md video script hinges entirely on what you build looking good and running smoothly.

## What You Own
| Deliverable | File | Feeds Into |
|---|---|---|
| React Flow graph canvas | `frontend/src/components/GraphCanvas.jsx` | The entire visual demo |
| Node click / detail panel | `frontend/src/components/NodeDetail.jsx` | CVE display on click |
| Vulnerability-overlay rendering | inside `GraphCanvas.jsx` | Severity badges on nodes (F3) |
| Propagation (blast) animation hook | `frontend/src/hooks/usePropagate.js` | The red-pulse spread — the hero visual |
| Side-by-side comparison view | `frontend/src/components/CompareView.jsx` | F7 (Scenario Comparison) |
| Backend→React Flow data transform | `frontend/src/utils/graphTransform.js` | Converts Zahid's graph JSON into renderable nodes/edges |
| Severity→color mapping | `frontend/src/utils/colorMapping.js` | Visual consistency across the graph |

## Creative Ideas You're Building
- **Idea 2 — Butterfly Trace:** pulsing gold/amber animation along the critical chain Zahid's algorithm returns — label it "Critical Chain: lodash → express → next.js → your-app"
- **Idea 3 — Shadow Dependency Revealer:** dark "shadow" node icon with a spotlight effect for high-chokepoint, depth>1 nodes
- **Idea 4 — Historical Attack Replay (UI half):** the "Replay a Real Attack" button with 3 options, wired to Hari's `FAMOUS_ATTACKS` data
- **Idea 5 — "What If I Remove This Package?" Simulator:** frontend-only — remove a node + its edges from the React Flow graph, recalculate blast radius client-side (no backend call needed). You can start this on Day 1 without waiting for anyone.

## Data Contract With Zahid
Your `graphTransform.js` expects the exact node/edge shape defined in TDD.md Section 2.1 (`graph.nodes`, `graph.edges`) and the `propagation_order` array (with `node` + `delay_ms`) from Section 2.2 for animation timing. Confirm field names with Zahid before building the animation hook — a mismatch here is the easiest bug to lose time to.

## Day 1
- **Morning:** React Flow sandbox — render a static graph, get node click handler working (can start immediately on mock data, doesn't need the backend yet)
- **Afternoon:** Wire up real data — frontend calls backend `/analyze`, renders the real graph
- **Evening:** Vulnerability overlay on nodes, CVE panel on click

## Day 2
- **Morning:** Propagation animation, side-by-side comparison UI
- **Afternoon:** Polish animation timing/visuals for the video recording, help Swapnil with final testing
- Full team: record video

## Who to Sync With
- **Zahid** — the graph JSON shape and propagation timing data (see Data Contract above)
- **Swapnil** — `graphStore.js` shape, so your `graphTransform.js` reads from the same place his `useAnalyze.js` writes to
- **Nitya** — she reads `blastData`/`mitigationData` out of the same store your hooks populate; make sure those fields land in the store, not just local component state

## Reference
React Flow transform + animation code: **TDD.md**, Section 5. Full `GraphCanvas.jsx` starter code: **IMPLEMENTATION.md**, "FRONTEND IMPLEMENTATION" section.
