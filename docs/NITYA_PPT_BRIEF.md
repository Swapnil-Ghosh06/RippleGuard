# RippleGuard — PPT Brief for Nitya
### Everything you need to build the presentation. Use the official template.
**Read this fully before opening PowerPoint.**

**Team update:** Squads are now Backend — Hari (Haripriya) & Zahid; Frontend — Shubham, Nitya & Swapnil; PPT/Video — Nitya. You're now also building two of the in-app panels (Blast Radius + Mitigation) alongside the deck — see the "Things to Coordinate" table below for who to pull screenshots and numbers from.

---

## CRITICAL RULES (Don't Break These)
1. **Use ONLY the official template** downloaded from hackathon.manipal.edu — custom layouts = disqualification
2. **Export as PDF only** — .pptx will not be recognized
3. **File name:** `TeamID_TeamName_CS0202` (replace TeamID and TeamName with actual values)
4. **NO college name, logo, or any hint of Jain University anywhere**
5. **Language:** English only
6. **Every team member's face must appear in the video** (you coordinate this)

---

## Problem Statement We Chose
**"Open Source Supply Chains: The Ripple Effect"**
Domain: Cybersecurity | SDG: SDG 9 (Industry, Innovation, Infrastructure)

---

## Product Name
**RippleGuard**
Tagline: *"See the compromise before it becomes a catastrophe."*

---

## Slide-by-Slide Content

### Slide 1 — Title / Cover
- Product Name: **RippleGuard**
- Tagline: *See the compromise before it becomes a catastrophe*
- Problem Statement: Open Source Supply Chains: The Ripple Effect
- Team member names (all 5)

---

### Slide 2 — The Problem (make this hit emotionally)
**Headline:** One Package. One Compromise. Billions at Risk.

**Content:**
- Modern software depends on hundreds of open-source packages
- When one low-level package gets compromised, the damage spreads silently
- **Real examples:**
  - Log4Shell (2021): One logging library → 3 billion devices at risk → $10 billion in damages
  - XZ Utils Backdoor (2024): 2 years of social engineering → SSH backdoor on millions of Linux systems
  - Event-Stream (2018): 8 million weekly downloads → Bitcoin wallets targeted
- **The gap:** Security tools tell you WHERE the vulnerability is. No tool tells you WHAT HAPPENS NEXT.

**Visual suggestion:** Timeline of famous supply chain attacks with their blast radius numbers

---

### Slide 3 — Our Solution
**Headline:** RippleGuard: The World's First Compromise Propagation Simulator

**Content:**
- Not a vulnerability scanner — a **blast radius engine**
- You tell us a package. We show you the explosion.
- Three things no other tool does:
  1. **Simulates** how a compromise spreads through the ecosystem in real time
  2. **Quantifies** the blast radius with a single, actionable score (0–100)
  3. **Ranks** exactly which fixes eliminate the most risk with the least effort

**Visual suggestion:** Screenshot of the RippleGuard graph with the blast animation

---

### Slide 4 — How It Works (Technical, but Keep It Simple)
**Headline:** Real Data. Real Propagation. Real Answers.

**Content (3 steps):**
1. **Map** — Enter any npm or PyPI package. RippleGuard builds the full transitive dependency graph using Google's deps.dev API
2. **Inject** — Click any node to simulate a compromise. Watch the blast spread through the ecosystem in real time
3. **Mitigate** — RippleGuard ranks fixes by blast elimination percentage. Fix the most dangerous things first.

**Data Sources (shows feasibility):**
- npm Registry (package data, download counts)
- Google deps.dev API (full dependency resolution)
- Google OSV.dev API (real CVE/vulnerability data)
- All free, all public, all live

**Visual suggestion:** The 3-step flow diagram

---

### Slide 5 — Key Features (The "Innovation Beyond Requirements" Slide)
**Headline:** Features That Go Beyond the Problem Statement

List these 5 features with one-line descriptions:
1. 🎯 **Blast Radius Score (0–100)** — Single number representing real-world danger. No other tool has this.
2. 🦋 **Butterfly Trace** — The most dangerous propagation path, visualized as a glowing chain
3. 👻 **Shadow Dependency Revealer** — Exposes packages you've never heard of that are critical chokepoints
4. 🔄 **Historical Attack Replay** — Replay Log4Shell, Event-Stream, XZ-utils on real data
5. ⚡ **Live Mitigation Simulator** — Remove a dependency interactively; see blast radius recalculate instantly

---

### Slide 6 — Live Demo Screenshot(s)
**Headline:** See It in Action — Real Data, Real Packages

**What to put here:** Screenshots of the actual running app showing:
- The graph visualization (multiple colored nodes)
- The blast animation (red spreading outward)
- The Blast Score panel showing a large number
- The Mitigation Priority list

**Note to Nitya:** Get these screenshots from Shubham/Swapnil once the prototype is running (Day 1 evening) — Shubham owns the graph canvas + animation, Swapnil owns the deployed build you'll be screenshotting from

---

### Slide 7 — The Numbers (Impact Slide)
**Headline:** The Scale of the Problem We're Solving

**Content:**
- Average cost of a supply chain attack: **$4.88M** (IBM Cost of Data Breach 2024)
- Log4Shell remediation: **$10 billion** globally
- npm has **3.5 million packages** — most are never individually security-reviewed
- **96% of commercial codebases** contain open-source components (Synopsys 2024)
- One compromised dependency in a web framework (e.g. send or debug in express) = Blast Score 73–78/100 = billions of monthly downloads in the blast zone

---

### Slide 8 — Feasibility / Technical Architecture
**Headline:** Built to Be Real, Not Just Presented

**Content:**
- **Backend:** Python + FastAPI (deployed on Render, free tier)
- **Frontend:** React + Vite + React Flow (deployed on Vercel, free tier)
- **Graph Engine:** NetworkX — industry-standard graph library
- **Data:** 100% free public APIs — no cost to run
- **Status:** Fully deployed and live at [URL — fill in before submission]

**Architecture diagram (simple):**
```
User → React Frontend (Vercel) → FastAPI Backend (Render) → npm/deps.dev/OSV APIs
```

---

### Slide 9 — Monetisation Strategy
**Headline:** A Real Business, Not Just a Hackathon Project

**Content:**

| Tier | Price | Who |
|---|---|---|
| Hacker (Free) | $0 | Individual developers |
| Pro | $29/month | Small teams, startups |
| Enterprise | $499/month | Companies, CISOs |

**Revenue Model:**
- Free users → 5% Pro conversion → $14,500/month at 10,000 users
- Enterprise: 5 clients = $2,495/month
- **Year 1 Target: $200,000 ARR**

**Why it works:** One prevented security incident (average $4.88M) pays for 14 years of RippleGuard Enterprise.

---

### Slide 10 — Marketing & Go-To-Market
**Headline:** How RippleGuard Goes Viral

**Content:**

**Phase 1 — Developer Community (Month 1–3)**
- GitHub-first launch: free tool, open source
- Post "The Blast Leaderboard" — top 10 most dangerous npm packages weekly
- Hacker News, Reddit r/netsec, Twitter/X security community

**Phase 2 — GitHub Action Integration (Month 3–6)**
- "RippleGuard Blast Check" — runs on every PR
- Every maintainer who installs it → their contributors see RippleGuard
- Viral growth through open source project adoption

**Phase 3 — Enterprise Sales (Month 6–12)**
- SOC teams, CISO offices
- Integration with Jira/Slack for CVE alerting
- Annual contracts

**Target Audience:**
- Primary: DevSecOps engineers, 1.2M globally
- Secondary: CISOs at companies with >50 engineers
- Tertiary: Open source maintainers (8M on GitHub)

---

### Slide 11 — SDG Alignment
**Headline:** Building Safer Digital Infrastructure for Everyone

**Content:**
**SDG 9 — Industry, Innovation and Infrastructure**
- Open source software is the backbone of global digital infrastructure
- Supply chain attacks disproportionately affect organizations that lack dedicated security teams
- RippleGuard democratizes enterprise-grade supply chain security — making it free and accessible to all
- A more secure open source ecosystem benefits: startups, nonprofits, governments, healthcare systems

**Real-world inclusivity:**
- Free tier ensures small organizations and individuals can use it
- Covers both npm (JavaScript/web) and PyPI (Python/scientific/ML) — broadest developer reach

---

### Slide 12 — Roadmap
**Headline:** Version 1.0 Today. Platform Tomorrow.

**Short-term (next 3 months):**
- GitHub Actions CI/CD integration
- SBOM (Software Bill of Materials) file upload
- Private registry scanning for enterprises

**Medium-term (6–12 months):**
- Slack/Jira alerting on new CVEs
- Historical compromise timeline
- Maven (Java) and RubyGems ecosystem support

**Long-term (1–2 years):**
- ML-based compromise prediction (predict which packages are *likely* to be compromised before it happens, based on maintainer activity patterns)
- Industry-wide Blast Leaderboard updated in real time

---

### Slide 13 — Team
**Headline:** Meet the Team

List all 5 members with their roles (updated squads: Backend — Hari & Zahid | Frontend — Shubham, Nitya & Swapnil | PPT — Nitya):
- **Zahid** — Backend Lead, Graph Engine & Propagation Algorithm
- **Hari (Haripriya)** — Backend, Data Pipeline & External API Integrations
- **Swapnil** — Frontend, DevOps & Deployment Architecture
- **Shubham** — Frontend, Graph Visualization & Animation
- **Nitya** — Frontend Panels & UI Copy, plus Product Strategy, Design & Presentation

---

### Slide 14 — Thank You / Call to Action
- RippleGuard — *See the compromise before it becomes a catastrophe*
- Live Demo: [your vercel URL]
- GitHub: github.com/[your-repo]
- "In open source, no package is an island."

---

## Video Script (2–3 min max)

**[0:00–0:15] Hook**
"Every 2.5 seconds, a new open source vulnerability is published. You know they exist. But do you know where they lead?"

**[0:15–0:45] Problem**
"Modern software is built on hundreds of open-source packages. When one gets compromised — like Log4Shell in 2021 — the damage doesn't stop there. It cascades silently through thousands of applications, affecting millions of users before anyone knows what happened. Security tools today tell you WHERE the vulnerability is. Nobody tells you WHAT HAPPENS NEXT."

**[0:45–1:15] Solution intro**
"Introducing RippleGuard — the world's first compromise propagation simulator. Not a scanner. A simulator. Enter any package, and we show you the explosion."

**[1:15–2:15] Live demo (screen recording)**
"Watch. I type 'express' — one of npm's most downloaded packages. RippleGuard maps the full dependency graph using live data — 47 packages, 3 layers deep, pulling real vulnerability data from Google's OSV database. Now I click this node — lodash — and I inject a compromise. Watch what happens."
[Show blast animation]
"In seconds, the blast propagates. 23 packages affected. 142 million monthly downloads in the blast zone. Blast Score: 87 out of 100. That is the equivalent of sending malware to the population of Germany. And RippleGuard tells you exactly what to fix first — one upgrade eliminates 94% of the blast radius."

**[2:15–2:45] Differentiation + Close**
"Other tools find the hole. RippleGuard shows you the flood. And because this uses only free, public APIs — no cost, fully deployed, live right now — any developer in the world can use it today."
"RippleGuard. Because in open source, no package is an island."

---

## Things to Coordinate with the Team

| What | Who to ask | When needed |
|---|---|---|
| App screenshots | Shubham (graph/animation) + Swapnil (deployed build) | Day 1 evening |
| Live demo URL | Swapnil | Day 2 morning |
| GitHub repo URL | Swapnil | Day 1 evening |
| Blast Radius Score / Mitigation panel copy | Nitya (she builds these panels herself) | Day 1 evening |
| Backend numbers for Slide 7 (blast score, download counts) | Zahid or Hari | Day 1 evening |
| Team ID from portal | Any member | Now |
| Problem Statement ID | Any member | Now (check hackathon.manipal.edu) |
| Video recording (all faces) | All team | Day 2 afternoon |
