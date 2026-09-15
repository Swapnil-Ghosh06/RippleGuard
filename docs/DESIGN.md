# RippleGuard — Design System
### The canonical visual/motion reference for the whole frontend squad. This is extracted from decisions already locked in `SWAPNIL_ROLE_v2.md` — if the two ever disagree, this file should be treated as the up-to-date source (v2 was written first; update both together going forward).

---

## 1. Design Direction
Deep navy "void" background + cyan accent — reads as *infrastructure security*, not generic dark SaaS. Gold is reserved exclusively for the Butterfly Trace (Idea 2) so it carries meaning every time it appears — never use gold decoratively elsewhere.

## 2. Color Tokens
Set once in `tailwind.config.js`; every component uses these tokens, never raw hex values.

| Token | Hex | Use |
|---|---|---|
| `void` | `#050a14` | Deepest background |
| `surface` | `#0d1829` | Panels, cards |
| `border` | `#1a2d4a` | Subtle borders |
| `muted` | `#334155` | Inactive elements |
| `text` | `#e2e8f0` | Primary text |
| `dim` | `#94a3b8` | Secondary text |
| `accent` | `#38bdf8` | Cyan — primary interactive color |
| `danger` | `#ef4444` | Blast / compromise red |
| `safe` | `#22c55e` | Safe / fixed green |
| `warn` | `#f97316` | Warning orange |
| `gold` | `#fbbf24` | **Butterfly Trace / critical path only** |

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: { void: '#050a14', surface: '#0d1829', border: '#1a2d4a',
      muted: '#334155', text: '#e2e8f0', dim: '#94a3b8', accent: '#38bdf8',
      danger: '#ef4444', safe: '#22c55e', warn: '#f97316', gold: '#fbbf24' }
  }
}
```

### Semantic mapping to app concepts
| Concept | Token |
|---|---|
| CRITICAL severity node | `danger` |
| HIGH severity node | `warn` |
| Fixed/clean node | `safe` |
| Shadow dependency (Idea 3) | dark node, `muted` fill + spotlight glow |
| Butterfly Trace path (Idea 2) | `gold`, pulsing |
| Default interactive element | `accent` |

## 3. Typography
- **Wordmark/headers:** `JetBrains Mono` or `Space Grotesk` (Google Fonts) — tech-forward, not a default system font
- **Body text:** system sans-serif stack is fine for panel copy (Nitya's components) — keep the distinctive font for headers/wordmark only, so it doesn't become visual noise
- Command-line aesthetic for the search input: borderless, `>` prefix in `accent`, blinking CSS cursor

## 4. Layout

### App Shell
```
┌──────────────────────────────────────────────────────┐
│  [RippleGuard wordmark]          [nav: New Analysis] │  ← 48px header, surface bg
├──────────────────────────────────────────────────────┤
│  [CVE Banner — conditional, Idea 7]                  │
├──────────────────────────────────────────────────────┤
│   <SearchView | LoadingView | GraphView>              │
└──────────────────────────────────────────────────────┘
```
No router — a single Zustand `view` flag (`'idle' | 'loading' | 'graph'`) switches between the three states, animated with Framer Motion's `AnimatePresence`.

### Graph View (main stage)
```
┌───────────────────────────────┬───────────────────┐
│   GraphCanvas (Shubham)       │  BlastRadiusPanel │
│   65% width                   │  MitigationPanel  │
│                               │  (Nitya) 35% width│
└───────────────────────────────┴───────────────────┘
```
Right panel enters with a spring transition (`stiffness: 260, damping: 28`) once graph data arrives.

## 5. Motion System
Two libraries, two jobs — don't mix their responsibilities:

| Library | Responsibility | Examples |
|---|---|---|
| **GSAP** (`gsap` + `@gsap/react`) | Timeline-based, orchestrated, canvas-level | Page-load entrance sequence, blast propagation particles, score counter |
| **Framer Motion** | Component-level transitions | Panel slide-ins, node detail drawer, view switching, hover states, CVE banner slide-down |

### Key animation moments (the ones judges will actually see)
1. **Page-load entrance** (GSAP timeline) — wordmark → tagline → input → attack-replay chips, staggered
2. **Loading sequence** — staged status text ("Resolving dependency graph…" → "Fetching vulnerability data…" → …), not a spinner; scan-line background animation; capped at ~8s
3. **Blast propagation** (Idea 2's hero visual) — red pulse spreads node-by-node using `propagation_order` timing from the backend
4. **Panel slide-in** — Blast Radius + Mitigation panels spring in from the right once data lands
5. **CVE banner** — slides down from top when a live CVE alert fires (Idea 7)

## 6. Component Visual Specs
Full component-by-component build specs (exact JSX, exact copy, exact animation code) live in `SWAPNIL_ROLE_v2.md` — this file defines the *system*, that file defines the *implementation*. Don't duplicate component code here; update the tokens/principles here and let the role file reference them.

## 7. Icon & Node Visual Language
- Severity badges: colored dot/ring using the danger/warn/safe tokens
- Shadow dependency (Idea 3): dark node fill + spotlight glow effect, distinct silhouette from normal nodes
- Age view toggle (Idea 8): green (<180 days) → yellow (180–365) → red (>1yr) → dark red (>3yr), independent color scale from the severity view — don't reuse `danger`/`warn`/`safe` for both, or the two view modes become visually indistinguishable

## 8. Ownership
Design system decisions: Swapnil (motion + tokens), with input from Nitya (panel copy/tone) and Shubham (graph-specific visual language, e.g. node icons). Changes here should be reflected in `SWAPNIL_ROLE_v2.md` and vice versa.
