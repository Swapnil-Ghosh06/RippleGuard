# RippleGuard — Design System
### The canonical visual/motion reference for the whole frontend squad. This is extracted from decisions already locked in `SWAPNIL_ROLE_v2.md` — if the two ever disagree, this file should be treated as the up-to-date source (v2 was written first; update both together going forward).
**Last updated:** Typography + color palette updated to Swapnil's preferred stack (DM Sans / Montserrat / Sora + earthy palette).

---

## 1. Design Direction
Eerie Black base + warm Khaki accent — reads as *precision and seriousness*, not loud tech-bro SaaS. The earthy palette (Eerie Black → Ebony → Black Olive → Khaki) gives RippleGuard a distinct, premium feel that no other security tool uses. Khaki (`#AD9D87`) is the only warm-light color — treat it as precious. It is the accent *and* the interactive color. Warm Amber is reserved exclusively for the Butterfly Trace (Idea 2) so it carries meaning every time it appears — never use it decoratively elsewhere.

## 2. Color Tokens
Base palette sourced from Swapnil's reference (Eerie Black / Khaki / Ebony / Black Olive). Set once in `tailwind.config.js`; every component uses these tokens, **never raw hex values**.

### Base Palette (from reference)
| Name | Hex | Source |
|---|---|---|
| Eerie Black | `#191615` | 01 — deepest background |
| Khaki | `#AD9D87` | 02 — primary accent, warm light |
| Ebony | `#6C6B5A` | 03 — muted / inactive |
| Black Olive | `#484638` | 04 — borders, subtle surfaces |

### Semantic Tokens (use these in code, never raw hex)
| Token | Hex | Derived From | Use |
|---|---|---|---|
| `void` | `#191615` | Eerie Black | Deepest background (page bg) |
| `surface` | `#201e1b` | Eerie Black + lightened | Panels, cards, sidebar |
| `surface2` | `#2a2720` | Eerie Black + lightened more | Elevated cards, modals |
| `border` | `#484638` | Black Olive | Subtle dividers, borders |
| `muted` | `#6C6B5A` | Ebony | Inactive elements, placeholders |
| `text` | `#F0EBE3` | Warm off-white (derived) | Primary readable text |
| `dim` | `#AD9D87` | Khaki | Secondary text, labels |
| `accent` | `#AD9D87` | Khaki | Primary interactive — buttons, links, focus rings |
| `accentHover` | `#C4B49A` | Khaki + lightened | Hover state of accent elements |
| `danger` | `#C0392B` | Functional red | Blast / compromise / CRITICAL severity |
| `safe` | `#6B8F71` | Muted green (earthy tone) | Safe / fixed / clean nodes |
| `warn` | `#C49A3C` | Warm amber | HIGH severity / warning states |
| `gold` | `#D4A843` | Warm amber — **reserved** | **Butterfly Trace / critical path ONLY** |

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      void:       '#191615',   // Eerie Black
      surface:    '#201e1b',   // panels, cards
      surface2:   '#2a2720',   // elevated cards
      border:     '#484638',   // Black Olive
      muted:      '#6C6B5A',   // Ebony — inactive
      text:       '#F0EBE3',   // warm off-white
      dim:        '#AD9D87',   // Khaki — secondary text
      accent:     '#AD9D87',   // Khaki — primary interactive
      accentHover:'#C4B49A',   // hover state
      danger:     '#C0392B',   // blast red
      safe:       '#6B8F71',   // earthy green
      warn:       '#C49A3C',   // warm amber
      gold:       '#D4A843',   // Butterfly Trace only
    }
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
| Default interactive element | `accent` (Khaki) |
| Hover on interactive element | `accentHover` |

## 3. Typography
Three-font stack — each has a specific role. Never swap them. Load all three from Google Fonts.

```html
<!-- index.html — in <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=Montserrat:wght@500;600;700;800&family=Sora:wght@300;400;600&display=swap" rel="stylesheet">
```

| Role | Font | Weight(s) | Used For |
|---|---|---|---|
| **Primary** | `DM Sans` | 300, 400, 500, 600 | All body text, panel copy, labels, form inputs, descriptions |
| **Secondary** | `Montserrat` | 500, 600, 700, 800 | Wordmark ("RippleGuard"), section headings, stat numbers, CVE IDs |
| **Tertiary** | `Sora` | 300, 400, 600 | Tagline, supporting subheadings, "human terms" comparison line (Idea 9), decorative callouts |

```css
/* index.css — global font assignments */
:root {
  --font-primary:   'DM Sans', system-ui, sans-serif;
  --font-secondary: 'Montserrat', sans-serif;
  --font-tertiary:  'Sora', sans-serif;
}

body                  { font-family: var(--font-primary); }
h1, h2, .wordmark, .stat-number { font-family: var(--font-secondary); }
.tagline, .human-terms, .callout  { font-family: var(--font-tertiary); }
```

### Usage rules
- **Montserrat** for the "RippleGuard" wordmark — weight 800, tracked slightly (`letter-spacing: 0.02em`)
- **Sora** for the tagline: *"See the compromise before it becomes a catastrophe."* — weight 300, lighter feel
- **DM Sans** for everything else: input labels, CVE descriptions, panel text, buttons
- CLI search input: borderless, `>` prefix character in `accent` (Khaki `#AD9D87`), blinking CSS cursor — use `DM Sans` 400 for the typed text

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
- Severity badges: colored dot/ring using the `danger` / `warn` / `safe` tokens
- Shadow dependency (Idea 3): `void` fill + subtle Khaki (`accent`) spotlight glow, distinct silhouette from normal nodes
- Age view toggle (Idea 8): `safe` (<180 days) → `warn` (180–365) → `danger` (>1yr) → deeper red (>3yr), **independent color scale from severity view** — these use a separate CSS class (`age-mode`) so the two modes are visually unambiguous
- Normal nodes: `surface` background, `border` (Black Olive) ring
- Root node: `surface2` background, `accent` (Khaki) ring, slightly larger
- Blasted nodes: `danger` background, red glow shadow

## 8. Ownership
Design system decisions: Swapnil (motion + tokens + typography), with input from Nitya (panel copy/tone) and Shubham (graph-specific visual language, e.g. node icons). Changes here should be reflected in `SWAPNIL_ROLE_v2.md` and vice versa.

> **Note on palette shift:** The original design used navy/cyan. This has been replaced with the earthy Eerie Black / Khaki / Ebony / Black Olive palette per Swapnil's preference. All functional colors (danger, safe, warn, gold) have been tuned to match the warmer palette.
