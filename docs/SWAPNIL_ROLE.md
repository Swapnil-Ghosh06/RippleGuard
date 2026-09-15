# Swapnil — Role Brief
### RippleGuard | Manipal Hackathon 2026
**Squad:** Frontend (with Shubham + Nitya) | **Title:** Frontend — DevOps & Scaffolding

---

## Your Mission
You build the frame everyone else's work sits inside, and you're the one who makes the app actually live on the internet. Nothing anyone builds matters if it isn't deployed and reachable in an incognito window by the Day 2 deadline — that's on you.

## What You Own
| Deliverable | File | Feeds Into |
|---|---|---|
| GitHub repo setup (public, `rippleguard`) | repo root | Prototype bonus (Section 6.4 of rulebook) — MUST be public |
| Vercel deployment + config | `frontend/vercel.json` | Live demo URL for the video and Slide 6/8 |
| React + Vite project scaffold | `frontend/src/main.jsx`, `App.jsx` | Everything Shubham and Nitya build on top |
| Zustand store wiring | `frontend/src/store/graphStore.js` | Shared state every component reads from |
| Routing, dark theme (Tailwind), loading/error states | `SearchPanel.jsx`, `LoadingOverlay.jsx` | First impression of the app |
| API call hook | `frontend/src/hooks/useAnalyze.js` | Feeds `graphStore` from Zahid's `/analyze` endpoint |
| End-to-end deployed-URL testing | — | Catches CORS/env issues before submission |

## Creative Ideas You're Building
- **Idea 7 — Live CVE Feed Alert (frontend half):** the banner component + polling hook that shows "New CVE published for X 3 hours ago", sourced from Hari's backend polling

## Day 1
- **Morning:** React + Vite project init, React Flow installed, GitHub repo created (public) — do this first, it unblocks Shubham and Nitya
- **Afternoon:** Dark theme applied, loading states, error handling
- **Evening:** Deploy to Vercel + Render, test end-to-end on the deployed URL (even with a stub backend — get the pipeline working early)

## Day 2
- **Morning:** Final deployed URL confirmed accessible in incognito
- **Afternoon:** Support video recording logistics, final incognito re-check of every submission link
- Full team: record video

## Who to Sync With
- **Zahid** — you need his Render URL for `VITE_API_BASE_URL`; he needs your Vercel URL for his CORS `allow_origins` list. Swap these the moment either deploy is live.
- **Shubham** — he builds inside `GraphCanvas.jsx`; make sure your `graphStore.js` shape matches what his `graphTransform.js` expects before he starts wiring it up
- **Nitya** — she needs a stable deployed URL to screenshot for Slides 6 and 8, and the GitHub repo URL for Slide 14

## Deployment Checklist (yours to run, Day 2 morning)
1. `https://your-app.vercel.app` loads in incognito
2. Type "express" in search, click Analyze — graph renders
3. Click a node, click "Inject Compromise" — blast animation plays
4. Blast radius panel shows real numbers
5. GitHub repo confirmed public: `github.com/your-username/rippleguard`

## Reference
Deployment configs (Render `render.yaml`, Vercel `vercel.json`, CORS setup): **TDD.md**, Section 6. Step-by-step deploy instructions: **IMPLEMENTATION.md**, "DEPLOYMENT STEPS" section.
