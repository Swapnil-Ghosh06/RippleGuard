# RippleGuard — Technical Design Document (TDD)
### Manipal Hackathon 2026 | Open Source Supply Chains: The Ripple Effect
**Version:** 1.1 | **Date:** September 15, 2026

**Squad ownership for this document:** Backend (Sections 1.2, 2, 3, 4, 6.1, 6.3, 7, 8, 9, 10) is owned by **Zahid + Hari (Haripriya)**. Frontend (Sections 1.3, 5, 6.2) is owned by **Swapnil, Shubham + Nitya**. Within Backend: Zahid owns the graph engine and algorithms (Sections 3, 9); Hari owns the external data services (Section 4) and data models (Section 7).

---

## 1. System Architecture

### 1.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│   React + Vite (Vercel)                                         │
│   React Flow (graph viz) | Tailwind CSS | Zustand (state)       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                │
│   FastAPI (Render.com free tier)                                │
│   Uvicorn ASGI server | CORS enabled | Auto /docs               │
└──────┬─────────────┬──────────────┬──────────────┬─────────────┘
       │             │              │              │
       ▼             ▼              ▼              ▼
  npm Registry   deps.dev API   OSV.dev API   npm DL Stats
  (metadata)     (dep graphs)   (CVE data)    (impact data)
```

### 1.2 Backend Directory Structure (Owner: Zahid + Hari)
```
rippleguard-backend/
├── main.py                    # FastAPI app entry point                — Zahid
├── requirements.txt
├── render.yaml                # Render deployment config               — Zahid
├── api/
│   ├── __init__.py
│   ├── routes/
│   │   ├── analyze.py         # POST /analyze — main endpoint          — Zahid
│   │   ├── compare.py         # POST /compare — scenario comparison    — Zahid
│   │   └── health.py          # GET /health — uptime check             — Hari
│   ├── services/
│   │   ├── npm_service.py     # npm registry + download stats         — Hari
│   │   ├── pypi_service.py    # PyPI metadata                          — Hari
│   │   ├── deps_service.py    # deps.dev dependency graph              — Hari
│   │   ├── osv_service.py     # OSV.dev vulnerability queries          — Hari
│   │   └── graph_service.py   # NetworkX graph + algorithms            — Zahid (CORE)
│   └── models/
│       ├── request_models.py  # Pydantic input models                 — Hari
│       └── response_models.py # Pydantic output models                — Hari
```
Hari's services return normalized package/dependency/vulnerability data; Zahid's `graph_service.py` consumes that data to build the graph and run the propagation + scoring algorithms — this split lets the two work in parallel with a shared data contract (Section 7) as the only sync point.

### 1.3 Frontend Directory Structure (Owner: Swapnil, Shubham + Nitya)
```
rippleguard-frontend/
├── index.html
├── vite.config.js
├── vercel.json                # — Swapnil
├── src/
│   ├── main.jsx                                                        — Swapnil
│   ├── App.jsx                                                         — Swapnil
│   ├── store/
│   │   └── graphStore.js      # Zustand store                         — Swapnil
│   ├── components/
│   │   ├── SearchPanel.jsx    # Package input UI                      — Swapnil
│   │   ├── GraphCanvas.jsx    # React Flow graph                      — Shubham
│   │   ├── NodeDetail.jsx     # Click panel — CVE info                — Shubham
│   │   ├── BlastRadiusPanel.jsx                                       — Nitya
│   │   ├── MitigationPanel.jsx                                        — Nitya
│   │   ├── CompareView.jsx    # Side-by-side comparison               — Shubham
│   │   └── LoadingOverlay.jsx                                         — Swapnil
│   ├── hooks/
│   │   ├── useAnalyze.js      # API call hook                         — Swapnil
│   │   └── usePropagate.js    # Animation hook                        — Shubham
│   └── utils/
│       ├── graphTransform.js  # Backend data → React Flow format      — Shubham
│       └── colorMapping.js    # Severity → node color                 — Shubham
```

---

## 2. API Specification

### 2.1 POST /analyze

**Purpose:** Full analysis of a package — dependency graph + vulnerabilities

**Request:**
```json
{
  "package": "lodash",
  "ecosystem": "npm",
  "version": "4.17.21",   // optional, defaults to "latest"
  "depth": 3              // optional, 1-4, defaults to 3
}
```

**Response:**
```json
{
  "root": {
    "name": "lodash",
    "version": "4.17.21",
    "ecosystem": "npm",
    "monthly_downloads": 82000000
  },
  "graph": {
    "nodes": [
      {
        "id": "lodash@4.17.21",
        "name": "lodash",
        "version": "4.17.21",
        "ecosystem": "npm",
        "monthly_downloads": 82000000,
        "depth": 0,
        "vulnerabilities": [
          {
            "id": "GHSA-xxxx-xxxx-xxxx",
            "severity": "HIGH",
            "cvss_score": 7.5,
            "summary": "Prototype pollution in lodash",
            "affected_versions": ["<4.17.21"],
            "fixed_version": "4.17.21"
          }
        ],
        "risk_score": 0.0,
        "is_root": true
      }
    ],
    "edges": [
      {
        "source": "express@4.18.2",
        "target": "lodash@4.17.21",
        "dependency_type": "direct"
      }
    ]
  },
  "stats": {
    "total_nodes": 47,
    "total_edges": 53,
    "vulnerable_nodes": 3,
    "max_depth": 3
  }
}
```

---

### 2.2 POST /simulate

**Purpose:** Inject a compromise and return propagation data

**Request:**
```json
{
  "graph_id": "lodash-npm-4.17.21-depth3",
  "compromised_node": "lodash@4.17.21",
  "propagation_model": "weighted_bfs"
}
```

**Response:**
```json
{
  "compromised_node": "lodash@4.17.21",
  "propagation": {
    "affected_nodes": ["express@4.18.2", "webpack@5.88.0", "..."],
    "propagation_paths": [
      ["lodash@4.17.21", "express@4.18.2", "next@13.4.0"],
      ["lodash@4.17.21", "webpack@5.88.0"]
    ],
    "propagation_order": [
      {"node": "express@4.18.2", "step": 1, "delay_ms": 200},
      {"node": "webpack@5.88.0", "step": 1, "delay_ms": 200}
    ]
  },
  "blast_radius": {
    "affected_package_count": 23,
    "total_monthly_downloads_affected": 145000000,
    "estimated_apps_affected": 4200,
    "blast_score": 87.4,
    "severity_breakdown": {
      "critical_path_nodes": 3,
      "high_impact_nodes": 8,
      "medium_impact_nodes": 12
    }
  },
  "mitigation": {
    "priority_actions": [
      {
        "action": "Upgrade lodash to 4.17.21",
        "eliminates_blast_percent": 94.0,
        "affected_packages_resolved": 21,
        "effort": "LOW"
      }
    ],
    "minimum_fix_set": ["lodash@4.17.21"]
  }
}
```

---

### 2.3 POST /compare

**Purpose:** Compare blast radius of two simultaneous compromises

**Request:**
```json
{
  "graph_id": "lodash-npm-4.17.21-depth3",
  "node_a": "lodash@4.17.21",
  "node_b": "express@4.18.2"
}
```

**Response:**
```json
{
  "comparison": {
    "node_a": { /* same as /simulate response for node_a */ },
    "node_b": { /* same as /simulate response for node_b */ },
    "winner": "node_a",
    "summary": "Compromising lodash is 3.2x more dangerous than compromising express"
  }
}
```

---

### 2.4 GET /health
```json
{ "status": "ok", "version": "1.0.0" }
```

---

## 3. Core Algorithms (Owner: Zahid)

### 3.1 Graph Construction Algorithm

```python
# graph_service.py
import networkx as nx
from collections import deque

async def build_dependency_graph(
    package: str,
    ecosystem: str,
    version: str,
    max_depth: int = 3
) -> nx.DiGraph:
    """
    BFS-based graph construction from deps.dev API.
    Each node: package@version
    Each directed edge: (dependent) -> (dependency)
    """
    G = nx.DiGraph()
    queue = deque()
    visited = set()
    
    root_id = f"{package}@{version}"
    queue.append((root_id, package, ecosystem, version, 0))
    G.add_node(root_id, name=package, version=version,
               ecosystem=ecosystem, depth=0, is_root=True)
    
    while queue:
        node_id, pkg, eco, ver, depth = queue.popleft()
        
        if node_id in visited or depth >= max_depth:
            continue
        visited.add(node_id)
        
        # Fetch direct dependencies from deps.dev
        deps = await deps_service.get_dependencies(pkg, eco, ver)
        
        for dep in deps:
            dep_id = f"{dep['name']}@{dep['version']}"
            
            if dep_id not in G:
                G.add_node(dep_id,
                    name=dep['name'],
                    version=dep['version'],
                    ecosystem=eco,
                    depth=depth + 1,
                    is_root=False
                )
            
            G.add_edge(node_id, dep_id)
            
            if dep_id not in visited:
                queue.append((dep_id, dep['name'], eco,
                              dep['version'], depth + 1))
    
    return G
```

---

### 3.2 Propagation Simulation Algorithm

```python
# graph_service.py — Weighted BFS Upward Propagation

def simulate_compromise(
    G: nx.DiGraph,
    compromised_node: str,
    download_data: dict
) -> dict:
    """
    Simulates upstream propagation from compromised_node.
    
    Logic: In the dependency graph, edges go FROM dependent TO dependency.
    So to find what DEPENDS ON the compromised node, we reverse the graph
    and do BFS upward.
    
    G_reversed: edge (dependency) -> (dependent)
    BFS from compromised_node in G_reversed = everything that uses it.
    """
    G_rev = G.reverse(copy=True)
    
    affected = set()
    propagation_order = []
    queue = deque([(compromised_node, 0)])
    visited = {compromised_node}
    
    while queue:
        current, step = queue.popleft()
        
        for neighbor in G_rev.successors(current):
            if neighbor not in visited:
                visited.add(neighbor)
                affected.add(neighbor)
                propagation_order.append({
                    "node": neighbor,
                    "step": step + 1,
                    "delay_ms": (step + 1) * 150  # for frontend animation
                })
                queue.append((neighbor, step + 1))
    
    # Calculate blast radius score
    total_downloads = sum(
        download_data.get(node, 0) for node in affected
    )
    
    blast_score = calculate_blast_score(
        affected_count=len(affected),
        total_downloads=total_downloads,
        has_cve=compromised_node in vuln_set
    )
    
    return {
        "affected_nodes": list(affected),
        "propagation_order": propagation_order,
        "total_downloads_affected": total_downloads,
        "blast_score": blast_score
    }


def calculate_blast_score(
    affected_count: int,
    total_downloads: int,
    has_cve: bool
) -> float:
    """
    Composite score 0–100 representing real-world danger.
    
    Weights:
    - Package count: 30%
    - Download impact: 60%
    - Known CVE multiplier: +20% if CVE exists on compromised node
    """
    import math
    
    count_score = min(affected_count / 200, 1.0) * 30
    
    # Log scale for downloads — difference between 1M and 100M is large
    dl_score = min(math.log10(max(total_downloads, 1)) / 9, 1.0) * 60
    
    cve_bonus = 10 if has_cve else 0
    
    return round(count_score + dl_score + cve_bonus, 1)
```

---

### 3.3 Mitigation Priority Algorithm

```python
def rank_mitigations(
    G: nx.DiGraph,
    affected_nodes: set,
    vuln_data: dict,
    download_data: dict
) -> list:
    """
    For each vulnerable node in the affected set,
    calculate how much blast radius it eliminates if fixed.
    
    Priority = (blast_reduction_percent × fix_availability) / effort
    """
    actions = []
    
    vulnerable_affected = [
        node for node in affected_nodes
        if node in vuln_data and vuln_data[node].get("fixed_version")
    ]
    
    for node in vulnerable_affected:
        # Simulate removal of this node from affected set
        # (i.e., if it were fixed, what % of blast zone vanishes?)
        subtree = get_upstream_subtree(G, node)
        
        eliminated_downloads = sum(
            download_data.get(n, 0) for n in subtree
            if n in affected_nodes
        )
        
        total_blast_downloads = sum(
            download_data.get(n, 0) for n in affected_nodes
        )
        
        elimination_pct = (
            eliminated_downloads / max(total_blast_downloads, 1)
        ) * 100
        
        fix_info = vuln_data[node]
        
        actions.append({
            "node": node,
            "action": f"Upgrade {node} to {fix_info['fixed_version']}",
            "eliminates_blast_percent": round(elimination_pct, 1),
            "effort": classify_effort(node, G),
            "fixed_version": fix_info["fixed_version"]
        })
    
    # Sort by elimination percentage descending
    return sorted(actions, key=lambda x: x["eliminates_blast_percent"],
                  reverse=True)
```

---

## 4. External API Integration Details (Owner: Hari)

### 4.1 npm Registry (Hari)
```python
# npm_service.py
import httpx

NPM_BASE = "https://registry.npmjs.org"
NPM_DL_BASE = "https://api.npmjs.org/downloads/point/last-month"

async def get_package_metadata(package: str, version: str = "latest"):
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{NPM_BASE}/{package}/{version}", timeout=10)
        r.raise_for_status()
        data = r.json()
        return {
            "name": data["name"],
            "version": data["version"],
            "dependencies": data.get("dependencies", {}),
            "description": data.get("description", "")
        }

async def get_monthly_downloads(package: str) -> int:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{NPM_DL_BASE}/{package}", timeout=10)
        if r.status_code == 200:
            return r.json().get("downloads", 0)
        return 0
```

### 4.2 deps.dev API (Full Transitive Dependency Graph) (Hari)
```python
# deps_service.py
DEPS_DEV_BASE = "https://api.deps.dev/v3"

async def get_dependencies(package: str, ecosystem: str, version: str):
    """
    Returns resolved transitive dependency graph from deps.dev.
    This is the key API — it resolves version ranges properly.
    """
    ecosystem_map = {"npm": "npm", "pypi": "pypi"}
    sys = ecosystem_map.get(ecosystem.lower(), "npm")
    
    url = (f"{DEPS_DEV_BASE}/systems/{sys}/packages/"
           f"{package}/versions/{version}:dependencies")
    
    async with httpx.AsyncClient() as client:
        r = await client.get(url, timeout=15)
        if r.status_code != 200:
            return []
        
        data = r.json()
        nodes = data.get("nodes", [])
        
        deps = []
        for node in nodes[1:]:  # skip root (index 0)
            vk = node.get("versionKey", {})
            deps.append({
                "name": vk.get("name", ""),
                "version": vk.get("version", ""),
                "ecosystem": sys
            })
        return deps
```

### 4.3 OSV.dev Batch API (Vulnerability Data) (Hari)
```python
# osv_service.py
OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"

async def get_vulnerabilities_batch(packages: list[dict]) -> dict:
    """
    packages = [{"name": "lodash", "version": "4.17.20", "ecosystem": "npm"}, ...]
    Returns dict: {package_id: [vuln_list]}
    """
    queries = []
    for pkg in packages:
        ecosystem_map = {"npm": "npm", "pypi": "PyPI"}
        eco = ecosystem_map.get(pkg["ecosystem"].lower(), "npm")
        queries.append({
            "version": pkg["version"],
            "package": {"name": pkg["name"], "ecosystem": eco}
        })
    
    payload = {"queries": queries}
    
    async with httpx.AsyncClient() as client:
        r = await client.post(OSV_BATCH_URL, json=payload, timeout=20)
        r.raise_for_status()
        results = r.json().get("results", [])
    
    vuln_map = {}
    for i, result in enumerate(results):
        pkg = packages[i]
        pkg_id = f"{pkg['name']}@{pkg['version']}"
        vulns = result.get("vulns", [])
        
        parsed = []
        for v in vulns:
            severity = extract_severity(v)
            parsed.append({
                "id": v.get("id", ""),
                "summary": v.get("summary", ""),
                "severity": severity,
                "cvss_score": extract_cvss(v),
                "affected_versions": extract_affected_versions(v),
                "fixed_version": extract_fix_version(v)
            })
        
        vuln_map[pkg_id] = parsed
    
    return vuln_map


def extract_severity(vuln: dict) -> str:
    severity_list = vuln.get("severity", [])
    if not severity_list:
        return "UNKNOWN"
    score = vuln.get("database_specific", {}).get("severity", "")
    mapping = {"CRITICAL": "CRITICAL", "HIGH": "HIGH",
               "MEDIUM": "MEDIUM", "LOW": "LOW"}
    return mapping.get(score.upper(), "UNKNOWN")
```

---

## 5. Frontend — React Flow Integration (Owner: Shubham)

### 5.1 Graph Data Transformation
```javascript
// utils/graphTransform.js
export function transformToReactFlow(backendGraph) {
  const nodes = backendGraph.nodes.map(node => ({
    id: node.id,
    type: 'packageNode',  // custom node type
    position: { x: 0, y: 0 },  // ELK layout handles positioning
    data: {
      label: node.name,
      version: node.version,
      depth: node.depth,
      vulns: node.vulnerabilities,
      downloads: node.monthly_downloads,
      isRoot: node.is_root,
      riskScore: node.risk_score,
    },
    style: getNodeStyle(node),
  }));

  const edges = backendGraph.edges.map((edge, i) => ({
    id: `e${i}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#334155', strokeWidth: 1.5 },
  }));

  return { nodes, edges };
}

function getNodeStyle(node) {
  const severityColors = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e',
    NONE: '#3b82f6',
  };
  
  const maxSeverity = getMaxSeverity(node.vulnerabilities);
  const color = severityColors[maxSeverity] || '#3b82f6';
  
  return {
    background: node.is_root ? '#7c3aed' : '#1e293b',
    border: `2px solid ${color}`,
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '11px',
    padding: '8px 12px',
    minWidth: '120px',
  };
}
```

### 5.2 Propagation Animation Hook
```javascript
// hooks/usePropagate.js
import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';

export function usePropagate() {
  const { setNodes } = useReactFlow();

  const animateBlast = useCallback((propagationOrder) => {
    // Animate nodes turning red one by one based on step timing
    propagationOrder.forEach(({ node, delay_ms }) => {
      setTimeout(() => {
        setNodes(prev => prev.map(n => {
          if (n.id === node) {
            return {
              ...n,
              data: { ...n.data, isBlasted: true },
              style: {
                ...n.style,
                background: '#7f1d1d',
                border: '2px solid #ef4444',
                boxShadow: '0 0 12px 4px rgba(239,68,68,0.6)',
              }
            };
          }
          return n;
        }));
      }, delay_ms);
    });
  }, [setNodes]);

  return { animateBlast };
}
```

---

## 6. Deployment Configuration (Owner: Swapnil, with Zahid on Render env vars)

### 6.1 Backend — Render (render.yaml) (Swapnil deploys; Zahid owns config)
```yaml
services:
  - type: web
    name: rippleguard-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
    healthCheckPath: /health
```

### 6.2 Frontend — Vercel (vercel.json) (Swapnil)
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "env": {
    "VITE_API_BASE_URL": "https://rippleguard-api.onrender.com"
  }
}
```

### 6.3 CORS Configuration (main.py)
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rippleguard.vercel.app",
        "http://localhost:5173"  # local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 7. Data Models (Pydantic) (Owner: Hari, reviewed by Zahid)

```python
# models/request_models.py
from pydantic import BaseModel, Field
from typing import Optional, Literal

class AnalyzeRequest(BaseModel):
    package: str = Field(..., example="lodash")
    ecosystem: Literal["npm", "pypi"] = "npm"
    version: Optional[str] = "latest"
    depth: int = Field(default=3, ge=1, le=4)

class SimulateRequest(BaseModel):
    graph_data: dict          # Pass graph back from frontend
    compromised_node: str
    propagation_model: Literal["weighted_bfs", "simple_bfs"] = "weighted_bfs"

class CompareRequest(BaseModel):
    graph_data: dict
    node_a: str
    node_b: str
```

---

## 8. Error Handling

| Error Scenario | HTTP Code | Response |
|---|---|---|
| Package not found on npm/PyPI | 404 | `{"error": "Package 'xyz' not found in npm registry"}` |
| deps.dev timeout | 504 | `{"error": "Dependency graph fetch timed out. Try a smaller depth."}` |
| Graph too large (>200 nodes) | 413 | `{"error": "Graph too large. Reduce depth to 2."}` |
| OSV batch failure | 200 (partial) | Returns graph with `vulnerabilities: []` and a `warnings` field |
| Invalid ecosystem | 422 | FastAPI default validation error |

---

## 9. Performance Strategy (Owner: Zahid — algorithm perf; Hari — caching/external calls)

### 9.1 Concurrent API Calls
```python
# All external API calls run in parallel using asyncio.gather
import asyncio

async def analyze_package(req: AnalyzeRequest):
    # Step 1: Get graph structure (sequential — needed first)
    graph = await build_dependency_graph(
        req.package, req.ecosystem,
        req.version, req.depth
    )
    
    # Step 2: Get downloads + vulnerabilities IN PARALLEL
    node_list = list(graph.nodes(data=True))
    packages = [{"name": d["name"], "version": d["version"],
                  "ecosystem": d["ecosystem"]} for _, d in node_list]
    
    downloads_task = get_all_downloads(packages)
    vulns_task = get_vulnerabilities_batch(packages)
    
    downloads, vulns = await asyncio.gather(downloads_task, vulns_task)
    
    # Step 3: Enrich graph nodes with this data
    enrich_graph(graph, downloads, vulns)
    
    return serialize_graph(graph)
```

### 9.2 Caching (Simple In-Memory)
```python
from functools import lru_cache
import time

_cache = {}
CACHE_TTL = 300  # 5 minutes

def cache_get(key: str):
    if key in _cache:
        data, timestamp = _cache[key]
        if time.time() - timestamp < CACHE_TTL:
            return data
    return None

def cache_set(key: str, data):
    _cache[key] = (data, time.time())
```
Cache key: `f"{ecosystem}:{package}:{version}:{depth}"`
This avoids re-fetching the same graph during the demo.

---

## 10. Security Considerations
- All external API calls use `httpx` with explicit timeout (10–20s)
- User input is validated via Pydantic before any API call
- Package names are URL-encoded before being passed to external APIs
- No user data is stored anywhere — stateless by design
- CORS is explicitly restricted to the deployed frontend domain
