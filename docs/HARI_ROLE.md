# Hari (Haripriya) — Ro
### RippleGuard | Manipal Hackathon 2026
**Squad:** Backend (with Zahid) | **Title:** Backend — Data & Integrations

---

## Your Mission
You're the data layer. Every external fact RippleGuard shows a judge — download counts, CVEs, dependency lists — passes through code you write. Zahid can't build the graph engine without clean, normalized data from you, so your services are the critical-path dependency for Day 1 morning. Build these first, test them standalone, then hand off.

## What You Own
| Deliverable | File | Feeds Into |
|---|---|---|
| npm registry + download-stats service | `backend/api/services/npm_service.py` | Zahid's graph engine |
| PyPI JSON API service | `backend/api/services/pypi_service.py` | Zahid's graph engine |
| deps.dev dependency-resolution service | `backend/api/services/deps_service.py` | Zahid's graph construction (F2) |
| OSV.dev batch vulnerability service | `backend/api/services/osv_service.py` | Vulnerability Overlay (F3) |
| Request/response Pydantic models | `backend/api/models/` | The whole `/analyze` and `/simulate` contract |
| In-memory caching layer | shared util (TDD Section 9.2) | Demo reliability — avoids re-fetching on repeat queries |
| Data normalization across ecosystems | across all services above | So npm and PyPI packages look identical downstream |
| Backend testing with 5 real packages | — | Confidence before the Day 1 evening integration test |

## Creative Ideas You're Building
- **Idea 4 — Historical Attack Replay:** hard-code the `FAMOUS_ATTACKS` list (Log4Shell, Event-Stream, XZ Utils) and wire it so selecting one auto-fills `/analyze` with real package + version
- **Idea 6 — Maintainer Risk Score (optional, mention-worthy):** `maintainer_risk_score()` from npm maintainer count + last-publish date
- **Idea 7 — Live CVE Feed Alert:** poll OSV.dev for advisories with `modified.since` in the last 7 days
- **Idea 8 — Dependency Age Map:** pull `time.modified` per version from the npm registry for the age-based color view

## Data Contract With Zahid
Return every package as a flat, ecosystem-agnostic dict: `name`, `version`, `ecosystem`, `monthly_downloads`, `vulnerabilities: [...]`. Agree on the exact field names with Zahid before writing code — see TDD.md Section 7 for the current Pydantic draft. Use `httpx` with explicit 10–20s timeouts on every external call (npm, PyPI, deps.dev, OSV all have documented rate quirks).

## Day 1
- **Morning:** npm + PyPI + deps.dev + OSV API wrappers built and tested in isolation — this unblocks Zahid, so prioritize it
- **Afternoon:** Hand off wrappers into Zahid's FastAPI endpoints, add `asyncio.gather` batching for downloads + vulnerabilities in parallel
- **Evening:** Vulnerability data normalization, CVE payload shaping for the `/analyze` response

## Day 2
- **Morning:** In-memory caching layer, error handling for external API failures (404s, timeouts, OSV partial failures), full backend test pass
- **Afternoon:** Support integration testing, feed Zahid/Nitya real numbers as needed
- Full team: record video

## Who to Sync With
- **Zahid** — the data contract (do this first, Day 1 morning, before either of you writes much code)
- **Shubham/Swapnil** — nothing directly, but your response shape determines what `graphTransform.js` expects, so flag any field changes early
- **Nitya** — real CVE examples and the population-comparison thresholds (Idea 9) need real download numbers from your npm service

## Reference
Full external API specs (exact endpoints, batch payloads): **TDD.md**, Section 4. Copy-paste starting code: **IMPLEMENTATION.md**, files 2/3/5 in the "BACKEND IMPLEMENTATION" section.
