# RippleGuard
### See the compromise before it becomes a catastrophe.

**Manipal Hackathon 2026** | Problem Statement: *Open Source Supply Chains: The Ripple Effect* (Cybersecurity, SDG 9)

RippleGuard is not a vulnerability scanner. It's a **compromise propagation simulator**: enter any npm or PyPI package, and it maps the live transitive dependency graph, lets you inject a real or hypothetical compromise, and shows — in real time — exactly how the blast spreads, who gets hit, and what to fix first.

**Live demo:** `[fill in Vercel URL before submission]`
**Video:** `[fill in YouTube/Drive link before submission]`

---

## Docs Index

All project documentation lives in [`docs/`](./docs). Start here, in this order:

| Doc | What it's for |
|---|---|
| [`docs/PRD.md`](./docs/PRD.md) | Product vision, features (F1–F8), judging-criteria mapping |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System diagram, request lifecycle, how the pieces fit together |
| [`docs/TECHSTACK.md`](./docs/TECHSTACK.md) | Every library/service used, and why |
| [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) | Core entities (Package, Vulnerability, BlastResult, etc.) and how they relate |
| [`docs/SCHEMA.md`](./docs/SCHEMA.md) | Quick-reference API request/response field tables |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | Color tokens, typography, motion system, layout |
| [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) | Functional + non-functional requirements checklist |
| [`docs/RULES.md`](./docs/RULES.md) | Condensed hackathon rulebook — submission, judging, violations |
| [`docs/TDD.md`](./docs/TDD.md) | Full technical design — exact API specs, algorithms, deployment config |
| [`docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) | Copy-paste-ready starter code for every file |
| [`docs/CREATIVE_IDEAS.md`](./docs/CREATIVE_IDEAS.md) | The 10 differentiator features and who owns each |
| [`docs/NITYA_PPT_BRIEF.md`](./docs/NITYA_PPT_BRIEF.md) | Slide-by-slide deck content + video script |
| `docs/*_ROLE.md` | Individual role brief per teammate |

## Team

| Person | Squad | Role |
|---|---|---|
| **Zahid** ([@syedzahidsaleem](https://github.com/syedzahidsaleem)) | Backend | Lead — Graph Engine |
| **Hari** ([@Haripriya24071](https://github.com/Haripriya24071)) | Backend | Data & Integrations |
| **Swapnil** ([@Swapnil-Ghosh06](https://github.com/Swapnil-Ghosh06)) | Frontend | Lead — DevOps, Scaffolding & Motion Design |
| **Shubham** | Frontend | Graph Visualization |
| **Nitya** ([@dearnitya](https://github.com/dearnitya)) | Frontend + PPT | Panels & UI Copy, PPT/Video Lead |

Zahid is team lead; `main` is lead-owned. Everyone else works off their own branch (`zahid-backend`, `hari-backend`, `swapnil-frontend`, `shubham-frontend`, `nitya-frontend-ppt`) and opens PRs into `main`.

## Local Setup

```bash
git clone https://github.com/syedzahidsaleem/rippleguard.git
cd rippleguard

# Backend
cd backend
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Zero paid dependencies — every external API (npm registry, PyPI, deps.dev, OSV.dev) is free and keyless. See `docs/TECHSTACK.md` for the full stack and `docs/REQUIREMENTS.md` for exact environment requirements.

## Status

Backend and frontend folders will be added as the team builds; this repo currently holds the planning/design documentation the team is building from. See `docs/PRD.md` Section 11 for the 48-hour build roadmap.

## Repo Rules
- `main` must stay **public** through judging — required for the hackathon's prototype bonus (see `docs/RULES.md`).
- No college name, logo, or Jain University reference anywhere in this repo, the deck, or the video (hackathon rule — instant Tier 1 disqualification if broken).
