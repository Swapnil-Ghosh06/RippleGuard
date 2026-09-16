# RippleGuard — Data Model
### The conceptual entities RippleGuard reasons about, and how they relate. For wire-format field tables, see SCHEMA.md. For Pydantic implementation, see TDD.md Section 7.

---

## 1. Entity Overview

```
Package ──depends on──▶ Package        (many-to-many, forms the Graph)
   │
   ├──has many──▶ Vulnerability
   │
   └──is a node in──▶ Graph

Graph ──when compromised at a node──▶ BlastResult
BlastResult ──has many, ranked──▶ MitigationAction
Graph ──two BlastResults──▶ ComparisonResult
```

## 2. Entities

### Package
The atomic unit — one dependency at one version.
| Field | Type | Notes |
|---|---|---|
| `name` | string | e.g. `lodash` |
| `version` | string | resolved version, e.g. `4.17.21` |
| `ecosystem` | enum | `npm` \| `pypi` |
| `monthly_downloads` | int | from Hari's npm/PyPI services |
| `depth` | int | distance from the root package in the graph (0 = root) |
| `vulnerabilities` | Vulnerability[] | 0 or more |
| `maintainer_count` | int | optional — powers Idea 6 (Maintainer Risk Score) |
| `last_published` | date | optional — powers Idea 8 (Dependency Age Map) |

### Dependency Edge
A directed "depends on" relationship between two Packages. No entity of its own beyond `{ from: Package.name, to: Package.name }` — see SCHEMA.md `graph.edges[]`.

### Vulnerability
A single CVE/advisory attached to a Package.
| Field | Type | Notes |
|---|---|---|
| `cve_id` | string | e.g. `CVE-2021-44228` |
| `severity` | enum | `CRITICAL` \| `HIGH` \| `MEDIUM` \| `LOW` |
| `cvss_score` | float | 0.0–10.0 |
| `description` | string | from OSV.dev |
| `fix_version` | string | nullable — may not exist yet |
| `affected_versions` | string | version range |

### Graph
The full resolved dependency tree for one `/analyze` call.
| Field | Type | Notes |
|---|---|---|
| `root_package` | Package | what the user searched |
| `nodes` | Package[] | every package in the tree, up to `depth` |
| `edges` | DependencyEdge[] | the "depends on" relationships |
| `stats` | object | `node_count`, `total_downloads` |

### BlastResult
The output of injecting a compromise at one node (`/simulate`).
| Field | Type | Notes |
|---|---|---|
| `compromised_node` | string | which package was injected |
| `blast_score` | float | 0–100, see Idea 1 formula in CREATIVE_IDEAS.md |
| `affected_nodes` | AffectedNode[] | every downstream package hit, with `distance` |
| `propagation_order` | PropagationStep[] | `{ node, delay_ms }` — drives the animation |
| `critical_chain` | string[] | the Butterfly Trace path (Idea 2) |
| `blast_downloads` | int | sum of monthly downloads across `affected_nodes` |
| `mitigation` | MitigationAction[] | ranked fixes |

### MitigationAction
One ranked fix recommendation, part of a BlastResult.
| Field | Type | Notes |
|---|---|---|
| `action` | string | e.g. `"Upgrade lodash to 4.17.21"` |
| `blast_elimination_pct` | float | 0–100 — how much of the blast radius this fix removes |
| `priority_rank` | int | 1 = do this first |
| `affects_nodes` | string[] | which packages this fix resolves |

### ComparisonResult
Wraps two BlastResults for side-by-side display (`/compare`, F7). No new fields beyond `{ result_a: BlastResult, result_b: BlastResult }`.

## 3. Frontend-Only Derived Data
These are **not** backend entities — they're computed client-side from the above, to keep the backend response lean:
- `human_comparison` string (Idea 9) — derived from `blast_downloads` via Nitya's `getHumanComparison()`
- Node colors (severity, age, shadow-dependency spotlight) — derived from `vulnerabilities`, `last_published`, chokepoint score, per the palette in DESIGN.md
- `view` state (`idle`/`loading`/`graph`) — pure UI state in `graphStore.js`, not domain data

## 4. Notes on Normalization
Hari's services must return every Package in the exact same shape regardless of source ecosystem (npm vs PyPI) — this is the single most important contract in the backend, since Zahid's graph engine, and everything downstream of it, assumes ecosystem-agnostic Package objects. See HARI_ROLE.md, "Data Contract With Zahid."
