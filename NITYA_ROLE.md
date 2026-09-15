# Nitya — Role Brief
### RippleGuard | Manipal Hackathon 2026
**Squad:** Frontend (with Shubham + Swapnil) | **Title:** Frontend — Panels & UI Copy, and PPT/Video Lead

---

## Your Mission
You have two jobs that share one goal: make the judges understand, in seconds, why RippleGuard's numbers matter. In the app, that's the Blast Radius and Mitigation panels. In the deck and video, that's the slide content and the script. Both jobs are about translation — turning raw numbers into a story ("that's the population of Germany").

## What You Own — In the App
| Deliverable | File | Depends On |
|---|---|---|
| Blast Radius panel (score, stats, human-terms line) | `frontend/src/components/BlastRadiusPanel.jsx` | `blastData` from the store (Shubham's hooks populate it) |
| Mitigation panel (ranked action list) | `frontend/src/components/MitigationPanel.jsx` | `mitigationData` from the store |
| Compare view UI copy | inside `CompareView.jsx` (Shubham builds the shell) | — |

**You can build both panels against mock JSON on Day 1** — copy the sample `/simulate` response straight from TDD.md Section 2.2 — so you're not blocked waiting for Zahid's real endpoint. Swap the mock for the live store value once it's ready.

## Creative Idea You're Building
- **Idea 9 — "Blast Radius in Human Terms":** the `getHumanComparison()` function and the `POPULATION_COMPARISONS` table (from CREATIVE_IDEAS.md) — this is frontend-only, no backend call, and it's the line that "wins the room" in the video script. Build this early; it doesn't block on anyone.

## What You Own — The Deck & Video
- All 14 slides (content pulled from PRD.md — see NITYA_PPT_BRIEF.md for the full slide-by-slide brief)
- Full 2:45 video script
- Coordinating the recording (every member's face must appear — Rulebook Section 6.3, no exceptions)
- Final submission checklist: PDF filename `TeamID_TeamName_CS0202`, official template only, no college name/logo anywhere, all links tested in incognito

## Critical Compliance Rules (yours to enforce for the whole team)
1. Official PPT template only — custom layout = disqualification (Rulebook 6.2)
2. Export as **PDF only** — .pptx is not recognized
3. Video: max 2 min (3 min if a prototype demo is included), every member visible, hosted with public/unlisted access
4. **No college name, logo, or Jain University hint** anywhere in the deck, video, or GitHub repo
5. Verify every link in an incognito window before the deadline — Tier 1 violations (broken/restricted video link) mean instant disqualification

## Day 1
- **Morning:** React Flow sandbox support + start slide content pull from PRD.md
- **Afternoon:** Blast Radius panel + Mitigation panel UI shells (mock data)
- **Evening:** PPT first draft continues in background

## Day 2
- **Morning:** PPT first draft done; build the "human terms" population-comparison component (Idea 9)
- **Afternoon:** Final PPT polish, convert to PDF; coordinate the video recording
- Full team: record video

## Who to Ask, and When
| What you need | Who | When |
|---|---|---|
| App screenshots (graph, animation) | Shubham | Day 1 evening |
| App screenshots (deployed build) | Swapnil | Day 1 evening |
| Live demo URL | Swapnil | Day 2 morning |
| GitHub repo URL | Swapnil | Day 1 evening |
| Real Blast Score / download numbers for Slide 7 | Zahid or Hari | Day 1 evening |
| Team ID / Problem Statement ID | Any member | Now |

## Reference
Full slide-by-slide content, video script, and submission checklist: **NITYA_PPT_BRIEF.md**. Sample panel data to mock: **TDD.md**, Section 2.2. Your panel components' handoff details: **IMPLEMENTATION.md**, "Nitya's Components" note.
