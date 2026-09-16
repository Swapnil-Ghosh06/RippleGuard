# Swapnil — Role Brief (v2)
### RippleGuard | Manipal Hackathon 2026
**Squad:** Frontend (with Shubham + Nitya) | **Title:** Frontend Lead — DevOps, Scaffolding & Motion Design
**Typography:** DM Sans (primary) · Montserrat (secondary) · Sora (tertiary) | **Palette:** Eerie Black / Khaki / Ebony / Black Olive

---

## Your Mission
Two things make judges remember a hackathon project: the idea, and how it *feels* to watch it. The idea is Zahid's graph engine. The feeling is yours. You own the frame everyone works inside, the deployment that makes it real, **and** the motion layer that makes the whole thing cinematic. The blast animation, the page load sequence, the node hover states — everything that makes a judge say "wow" before they've read a single stat — that's your fingerprint on this project.

Frontend is your primary job. DevOps is the floor; motion design is the ceiling.

---

## Tech Stack (Your Additions)
On top of the base stack (React + Vite + Tailwind + Zustand), you bring:

| Library | Purpose |
|---|---|
| **GSAP** (`gsap` + `@gsap/react`) | Timeline-based orchestrated animations — page load sequence, blast propagation particles, score counter |
| **Framer Motion** (`framer-motion`) | Component-level transitions — panel slide-ins, node detail drawer, route changes, hover states |
| **React Flow** | Graph canvas (Shubham's domain — you scaffold it, he fills it) |

```bash
# Add to the base install
npm install gsap @gsap/react framer-motion
```

Both libraries can coexist: use **GSAP** for anything time-sequenced or canvas-level (the blast spreading, the score counting up), and **Framer Motion** for anything component-level (panels entering, cards hovering, mode switching).

---

## What You Own

### 1. GitHub Repo & Project Structure
| Task | Notes |
|---|---|
| Repo: https://github.com/syedzahidsaleem/rippleguard.git | Zahid created it — clone and set up your branch |
| Folder structure: `frontend/` and `backend/` at root | Keep it clean for the public prototype bonus |
| `frontend/vercel.json` | SPA rewrite rule + env vars |
| `README.md` at root | Brief description + live URL + team — judges look at this |

Repo must stay **public** throughout evaluation. Check this in incognito before every submission.

---

### 2. React + Vite Scaffold
```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm install reactflow zustand axios tailwindcss @tailwindcss/vite
npm install gsap @gsap/react framer-motion
npx tailwindcss init
```

**Color token system** (earthy palette — Eerie Black / Khaki / Ebony / Black Olive). Set in `tailwind.config.js` and CSS variables. Every component uses these tokens, **never raw hex**:

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      void:        '#191615',   // Eerie Black — deepest background
      surface:     '#201e1b',   // panels, cards
      surface2:    '#2a2720',   // elevated cards, modals
      border:      '#484638',   // Black Olive — subtle borders
      muted:       '#6C6B5A',   // Ebony — inactive elements
      text:        '#F0EBE3',   // warm off-white — primary text
      dim:         '#AD9D87',   // Khaki — secondary text
      accent:      '#AD9D87',   // Khaki — primary interactive
      accentHover: '#C4B49A',   // hover state of accent
      danger:      '#C0392B',   // blast / compromise red
      safe:        '#6B8F71',   // earthy green — fixed / clean
      warn:        '#C49A3C',   // warm amber — HIGH severity
      gold:        '#D4A843',   // butterfly trace / critical path ONLY
    }
  }
}
```

This palette is intentional: Eerie Black base + Khaki accent reads as *precision and seriousness* — unlike any other security tool. The `gold` (`#D4A843`) is reserved *exclusively* for the Butterfly Trace so it carries weight when it appears. Full rationale in **DESIGN.md**.

---

### 3. App Shell & Routing
**Files:** `src/main.jsx`, `src/App.jsx`, `src/layouts/AppShell.jsx`

The app has two "pages" — the landing/search state and the analysis state. No router needed; use a Zustand `view` flag (`'idle' | 'loading' | 'graph'`).

```jsx
// App.jsx — simplified
function App() {
  const view = useGraphStore(s => s.view);
  return (
    <AppShell>
      <AnimatePresence mode="wait">
        {view === 'idle'  && <SearchView key="search" />}
        {view === 'loading' && <LoadingView key="loading" />}
        {view === 'graph'   && <GraphView key="graph" />}
      </AnimatePresence>
    </AppShell>
  );
}
```

`AnimatePresence` from Framer Motion handles the page-level transitions automatically.

---

### 4. Zustand Store
**File:** `src/store/graphStore.js`

```javascript
import { create } from 'zustand';

export const useGraphStore = create((set) => ({
  // View state
  view: 'idle',           // 'idle' | 'loading' | 'graph'
  setView: (v) => set({ view: v }),

  // Graph data (from /analyze)
  graphData: null,
  setGraphData: (data) => set({ graphData: data }),

  // Blast simulation data (from /simulate)
  blastData: null,
  setBlastData: (data) => set({ blastData: data }),

  // Which node is currently selected
  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node }),

  // Is a blast simulation running right now?
  isSimulating: false,
  setIsSimulating: (b) => set({ isSimulating: b }),

  // Reset everything
  reset: () => set({
    view: 'idle', graphData: null, blastData: null,
    selectedNode: null, isSimulating: false
  }),
}));
```

This is the single source of truth. Shubham reads `graphData` and `blastData`; Nitya reads `blastData`; your hooks write to it.

---

### 5. useAnalyze Hook
**File:** `src/hooks/useAnalyze.js`

```javascript
import axios from 'axios';
import { useGraphStore } from '../store/graphStore';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useAnalyze() {
  const { setView, setGraphData } = useGraphStore();

  const analyze = async ({ packageName, ecosystem, version = 'latest', depth = 3 }) => {
    setView('loading');
    try {
      const { data } = await axios.post(`${API}/api/analyze`, {
        package: packageName,
        ecosystem,
        version,
        depth,
      });
      setGraphData(data.data);
      setView('graph');
    } catch (err) {
      setView('idle');
      console.error('Analyze failed:', err);
      // surface error in UI — see LoadingOverlay
    }
  };

  return { analyze };
}
```

---

### 6. SearchPanel — The Hero Component
**File:** `src/components/SearchPanel.jsx`

This is the first thing a judge sees. It needs to hit hard. Don't make it a plain form.

**Design spec:**
- Full-viewport centered layout on `void` (`#191615`) background
- Large wordmark: **RippleGuard** — `Montserrat` weight 800, `letter-spacing: 0.02em`, color `text` (`#F0EBE3`)
- Tagline beneath: *"See the compromise before it becomes a catastrophe."* — `Sora` weight 300, `dim` color (`#AD9D87`), lighter feel
- Single input: package name — `DM Sans` 400; borderless CLI-style input with a `>` prefix character in `accent` (Khaki `#AD9D87`), cursor blinking via CSS animation
- Ecosystem toggle: `npm` / `PyPI` — pill tabs, not a dropdown; `Montserrat` 600 for pill labels
- Analyze button: full-width, `accent` (`#AD9D87`) background with `void` text; `DM Sans` 600; hover shifts to `accentHover`
- Below the input: three "Replay a Real Attack" chips — `Log4Shell`, `Event-Stream`, `XZ Utils` — `DM Sans` 500, `border` bg — clicking one fills the input and auto-submits

**GSAP page-load entrance** (do this once, on mount):
```javascript
useGSAP(() => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.rg-wordmark', { y: -30, opacity: 0, duration: 0.6 })
    .from('.rg-tagline',  { y: 10,  opacity: 0, duration: 0.4 }, '-=0.2')
    .from('.rg-input',    { y: 20,  opacity: 0, duration: 0.4 }, '-=0.2')
    .from('.rg-chips',    { y: 10,  opacity: 0, duration: 0.3, stagger: 0.08 }, '-=0.1');
}, []);
```

One orchestrated sequence. Not scattered `animate` props on everything.

---

### 7. LoadingOverlay — The Tension Builder
**File:** `src/components/LoadingOverlay.jsx`

Don't show a spinner. Show a sequence of status messages that build anticipation:

```javascript
const STEPS = [
  { ms: 0,    text: 'Resolving dependency graph…' },
  { ms: 1200, text: 'Fetching vulnerability data from OSV…' },
  { ms: 2800, text: 'Calculating blast radius…' },
  { ms: 4200, text: 'Mapping propagation paths…' },
  { ms: 5500, text: 'Rendering graph…' },
];
```

Each line fades in with Framer Motion's `AnimatePresence`. Behind the text, a slow horizontal scan-line animation (GSAP, looping) reinforces the "system working" feel. Keep it under 8 seconds total — if the API hasn't returned by then, show a timeout message.

---

### 8. Live CVE Feed Alert Banner (Idea 7)
**File:** `src/components/CveBanner.jsx`

Shown at the top of the graph view when the backend signals a recent CVE.

```jsx
// Framer Motion slide-down from top
<AnimatePresence>
  {newCve && (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      className="..."
    >
      ⚠ New CVE for <strong>{newCve.package}</strong> — published {newCve.ago}
    </motion.div>
  )}
</AnimatePresence>
```

Poll the backend every 60 seconds (or on graph load). If nothing new, banner stays hidden.

---

### 9. App Shell & Global Layout
**File:** `src/layouts/AppShell.jsx`

```
┌──────────────────────────────────────────────────────┐
│  [RippleGuard wordmark]          [nav: New Analysis] │  ← 48px header, surface bg
├──────────────────────────────────────────────────────┤
│  [CVE Banner — conditional]                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│   <children>  (SearchView | LoadingView | GraphView) │
│                                                      │
└──────────────────────────────────────────────────────┘
```

The header is always visible once the app loads. In graph view, it also shows the analyzed package name + ecosystem badge.

---

### 10. GraphView Layout — The Main Stage
**File:** `src/views/GraphView.jsx`

```
┌───────────────────────────────┬───────────────────┐
│                               │                   │
│   GraphCanvas (Shubham)       │  BlastRadiusPanel │
│   React Flow + animations     │  (Nitya)          │
│                               │                   │
│                               ├───────────────────┤
│                               │  MitigationPanel  │
│                               │  (Nitya)          │
│                               │                   │
└───────────────────────────────┴───────────────────┘
  ↑ 65% width                     ↑ 35% width
```

Right panel slides in with Framer Motion when graph data arrives:
```jsx
<motion.aside
  initial={{ x: 340, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
>
  <BlastRadiusPanel />
  <MitigationPanel />
</motion.aside>
```

---

## Deployment Checklist (Your Responsibility, Day 2 Morning)

```bash
# 1. Confirm VITE_API_BASE_URL is set in Vercel dashboard
#    Get the Render URL from Zahid

# 2. Confirm CORS in Zahid's main.py includes your Vercel URL
#    allow_origins=["https://rippleguard-xxx.vercel.app", "http://localhost:5173"]

# 3. End-to-end smoke test (incognito):
#    ✓ App loads at Vercel URL
#    ✓ Type "express" → Analyze → loading sequence plays → graph renders
#    ✓ Click node → "Inject Compromise" → blast animation plays
#    ✓ Blast panel shows score
#    ✓ GitHub repo: github.com/syedzahidsaleem/rippleguard — public

# 4. Test all three "Replay a Real Attack" chips
# 5. Test on mobile viewport (768px) — graph must be usable
```

---

## Day-by-Day Plan

### Day 1 — Morning (Unblocks Everyone Else First)
- [ ] Clone repo, scaffold React + Vite with full dependency install (GSAP, Framer Motion, React Flow, Zustand, Tailwind)
- [ ] Set up Tailwind config with the token system above
- [ ] Set up `graphStore.js` and `App.jsx` shell with `AnimatePresence` routing
- [ ] Push to GitHub → this unblocks Shubham and Nitya immediately

### Day 1 — Afternoon
- [ ] `SearchPanel.jsx` with GSAP entrance sequence + "Replay a Real Attack" chips
- [ ] `LoadingOverlay.jsx` with the step-message sequence
- [ ] `useAnalyze.js` hook wired to the store
- [ ] Dark theme applied across all shells

### Day 1 — Evening
- [ ] Deploy stub frontend to Vercel (even before backend is fully ready)
- [ ] Swap Render URL into env vars the moment Zahid has it live
- [ ] Test CORS end-to-end with a real `/analyze` call
- [ ] `CveBanner.jsx` skeleton

### Day 2 — Morning
- [ ] `GraphView.jsx` layout with sliding right panel (Framer Motion)
- [ ] Final Vercel deployment confirmed in incognito
- [ ] Coordinate with Nitya — she needs the live URL for PPT slides 6 + 8

### Day 2 — Afternoon
- [ ] Support video recording logistics
- [ ] Final incognito check of every submission link
- [ ] Confirm GitHub repo is public

---

## Who to Sync With

| Who | What | When |
|---|---|---|
| **Zahid** | Render URL (for `VITE_API_BASE_URL`) + CORS allow-list (needs your Vercel URL) | Day 1 evening — swap as soon as both deploys are live |
| **Shubham** | `graphStore.js` shape — `graphData`, `blastData`, `selectedNode` must match what `graphTransform.js` expects | Day 1 morning — agree before he starts wiring |
| **Nitya** | Stable Vercel URL for PPT screenshots; GitHub URL for Slide 14 | Day 1 evening |
| **Hari** | Nothing directly — but if CVE banner needs a backend endpoint, confirm the shape with her | Day 1 afternoon |

---

## Reference
- Deployment configs (Render + Vercel + CORS): **TDD.md**, Sections 6.1–6.3
- Store field names used by Shubham's components: **TDD.md**, Section 1.3
- Blast data shape for Nitya's panels: **TDD.md**, Section 2.2
- Live CVE polling logic: **CREATIVE_IDEAS.md**, Idea 7
