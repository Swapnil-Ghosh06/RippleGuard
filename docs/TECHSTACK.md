# RippleGuard — Tech Stack
### Every library and service in the project, in one place. Reflects the current state of `main`, including Swapnil's motion-design additions (`SWAPNIL_ROLE_v2.md`).

---

## Backend

| Layer | Choice | Why |
|---|---|---|
| Language | Python 3.11+ | Team familiarity, async support |
| Framework | FastAPI | Fast to build, auto-docs at `/docs`, async-native |
| Graph engine | NetworkX | Industry-standard, BFS/DFS built in |
| HTTP client | `httpx` (async) | Concurrent calls to 4 external APIs via `asyncio.gather` |
| Validation | Pydantic | Request/response models (see DATA_MODEL.md) |
| Deployment | Render (free tier) | Native FastAPI support, auto-deploy from GitHub |

## Frontend

| Layer | Choice | Why |
|---|---|---|
| Framework | React + Vite | Fast HMR, team familiarity |
| Graph visualization | React Flow | Interactive node manipulation — drag, click, animate natively |
| Styling | Tailwind CSS | Rapid styling; dark theme via the token system in DESIGN.md |
| State management | Zustand | Lighter than Redux for this scope — single `graphStore.js` |
| HTTP client | `axios` | Used in `useAnalyze.js` and related hooks |
| **Canvas/timeline animation** | **GSAP** (`gsap` + `@gsap/react`) | *(added in `SWAPNIL_ROLE_v2.md`)* Page-load sequence, blast propagation particles, score counter — anything time-sequenced |
| **Component transitions** | **Framer Motion** (`framer-motion`) | *(added in `SWAPNIL_ROLE_v2.md`)* Panel slide-ins, node detail drawer, view switching, hover states |
| Fonts | JetBrains Mono / Space Grotesk (Google Fonts) | *(from `SWAPNIL_ROLE_v2.md`)* Tech-forward, not generic dark-SaaS default |
| Deployment | Vercel (free tier) | Zero-config React deploy, instant CDN, auto-deploy from GitHub |

```bash
# Frontend install (full, including motion libraries)
npm create vite@latest . -- --template react
npm install reactflow zustand axios tailwindcss @tailwindcss/vite
npm install gsap @gsap/react framer-motion
npx tailwindcss init
```

## External Data Sources (all free, zero auth)

| Source | Used For | Endpoint |
|---|---|---|
| npm Registry | Package metadata, direct deps | `https://registry.npmjs.org/<package>` |
| npm download stats | Popularity/impact score | `https://api.npmjs.org/downloads/point/last-month/<pkg>` |
| PyPI JSON API | PyPI metadata + deps | `https://pypi.org/pypi/<pkg>/json` |
| deps.dev (Google) | Resolved transitive dependency graphs | `https://api.deps.dev/v3/systems/{sys}/packages/{pkg}/versions/{ver}:dependencies` |
| OSV.dev (Google) | CVE/vulnerability data | `https://api.osv.dev/v1/query` (batch: `/v1/querybatch`) |

## Infrastructure & Tooling

| Tool | Purpose |
|---|---|
| GitHub | Version control — `github.com/syedzahidsaleem/rippleguard`, public |
| Render | Backend hosting |
| Vercel | Frontend hosting |
| No database | Graph computed on-demand from live APIs — see ARCHITECTURE.md Section 4 |

## Why This Stack (condensed)
Given: Windows dev environment for Zahid/Swapnil, 5-person team, 2-day sprint, zero cost, deployment required. Full original rationale: **PRD.md**, Section 5.1. The GSAP/Framer Motion addition came later, from Swapnil expanding his DevOps role into motion design — see `SWAPNIL_ROLE_v2.md` for the full reasoning ("the idea is the graph engine; the feeling is the motion layer").
