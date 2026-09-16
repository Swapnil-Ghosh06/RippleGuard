# RippleGuard — API Schema (Quick Reference)
### Field tables only. Full JSON examples, validation rules, and error responses live in TDD.md Section 2.

---

## `POST /analyze`
Builds the dependency graph + vulnerability overlay for a package (F1, F2, F3).

**Request**
| Field | Type | Required | Notes |
|---|---|---|---|
| `package` | string | yes | e.g. `"lodash"` |
| `ecosystem` | enum | yes | `"npm"` \| `"pypi"` |
| `version` | string | no | defaults to `"latest"` |
| `depth` | int | no | `2`–`4`, defaults to `3` (PRD F2) |

**Response — `data` object**
| Field | Type | Notes |
|---|---|---|
| `graph.nodes[]` | array | see DATA_MODEL.md → Package entity |
| `graph.edges[]` | array | `{ from, to }` — "depends on" |
| `vulnerabilities` | array | per-node CVE list, severity-tagged |
| `stats.node_count` | int | total packages in graph |
| `stats.total_downloads` | int | sum of monthly downloads across graph |

---

## `POST /simulate`
Injects a compromise at a node and runs propagation (F4, F5, F6).

**Request**
| Field | Type | Required | Notes |
|---|---|---|---|
| `graph_id` / `graph` | string / object | yes | either a cached graph reference or the full graph payload from `/analyze` |
| `compromised_node` | string | yes | package name to inject at |

**Response — `data` object**
| Field | Type | Notes |
|---|---|---|
| `blast_score` | float | 0–100, see DATA_MODEL.md → BlastResult |
| `affected_nodes[]` | array | every package hit, with distance from source |
| `propagation_order[]` | array | `{ node, delay_ms }` — drives Shubham's animation |
| `critical_chain[]` | array | the Butterfly Trace path (Idea 2) |
| `blast_downloads` | int | total monthly downloads in the blast zone |
| `human_comparison` | string | computed frontend-side by Nitya's `getHumanComparison()` — NOT part of the backend response |
| `mitigation.priority_actions[]` | array | ranked fixes, see DATA_MODEL.md → MitigationAction |

---

## `POST /compare`
Runs two simulations and returns them side by side (F7).

**Request**
| Field | Type | Required |
|---|---|---|
| `graph` | object | yes |
| `compromised_node_a` | string | yes |
| `compromised_node_b` | string | yes |

**Response** — `{ result_a: <same shape as /simulate data>, result_b: <same shape> }`

---

## `GET /health`
No request body. Returns `{ status: "ok" }` — used by Swapnil's uptime checks and Hari's deploy verification.

---

## Field Naming Conventions (apply to every endpoint)
- `snake_case` on the wire (backend is Python/Pydantic) — the frontend's `graphTransform.js` and `graphStore.js` are responsible for any camelCase conversion needed in React, not the backend
- All monetary/count fields are plain integers, no currency formatting server-side — formatting (e.g. "142M") happens in Nitya's panel components
- All percentages are floats 0–100, not 0–1

## Full Specs
Exact JSON request/response bodies with real example values: **TDD.md**, Section 2. Pydantic model definitions: **TDD.md**, Section 7 / **IMPLEMENTATION.md** models files.
