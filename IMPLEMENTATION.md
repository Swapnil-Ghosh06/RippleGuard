# RippleGuard — Implementation Guide
### Step-by-step execution plan for the team
**Manipal Hackathon 2026 | Sept 15–17**

---

## BEFORE YOU START — One-Time Setup (30 min)

### Step 1: GitHub Repo Setup (Swapnil)
```bash
# Create a single public monorepo
# Name it: rippleguard
# Add all team members as collaborators

# Folder structure in repo:
rippleguard/
├── backend/
├── frontend/
├── README.md
└── .gitignore
```

The GitHub repo MUST be public for the prototype bonus. Do this first.

### Step 2: Backend Environment (Zahid + Hari)
```bash
cd backend
python -m venv venv

# Windows activation:
venv\Scripts\activate

pip install fastapi uvicorn httpx networkx pydantic python-dotenv
pip freeze > requirements.txt
```

### Step 3: Frontend Environment (Swapnil + Shubham + Nitya)
```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm install reactflow zustand axios tailwindcss @tailwindcss/vite
npx tailwindcss init
```

---

## BACKEND IMPLEMENTATION (Zahid — Lead, Graph Engine + Hari — Data Services)

### File 1: `backend/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.analyze import router as analyze_router
from api.routes.simulate import router as simulate_router
from api.routes.compare import router as compare_router

app = FastAPI(
    title="RippleGuard API",
    description="Open Source Supply Chain Compromise Simulator",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rippleguard.vercel.app",
        "http://localhost:5173"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api")
app.include_router(simulate_router, prefix="/api")
app.include_router(compare_router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok", "service": "RippleGuard API"}
```

---

### File 2: `backend/api/services/npm_service.py` (Hari writes this)
```python
import httpx
import asyncio

NPM_REGISTRY = "https://registry.npmjs.org"
NPM_DOWNLOADS = "https://api.npmjs.org/downloads/point/last-month"

async def get_latest_version(package: str) -> str:
    """Get latest version of an npm package."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(f"{NPM_REGISTRY}/{package}/latest")
            r.raise_for_status()
            return r.json().get("version", "latest")
        except Exception:
            return "latest"

async def get_monthly_downloads(package: str) -> int:
    """Get monthly download count for an npm package."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(f"{NPM_DOWNLOADS}/{package}")
            if r.status_code == 200:
                return r.json().get("downloads", 0)
        except Exception:
            pass
    return 0

async def get_downloads_batch(packages: list[str]) -> dict[str, int]:
    """Fetch downloads for multiple packages concurrently."""
    tasks = [get_monthly_downloads(pkg) for pkg in packages]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return {
        pkg: (result if isinstance(result, int) else 0)
        for pkg, result in zip(packages, results)
    }
```

---

### File 3: `backend/api/services/pypi_service.py` (Hari writes this)
```python
import httpx

PYPI_BASE = "https://pypi.org/pypi"

async def get_pypi_metadata(package: str, version: str = None) -> dict:
    """Get PyPI package metadata."""
    url = f"{PYPI_BASE}/{package}/json" if not version else \
          f"{PYPI_BASE}/{package}/{version}/json"
    
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            info = data.get("info", {})
            return {
                "name": info.get("name", package),
                "version": info.get("version", "unknown"),
                "description": info.get("summary", ""),
                "requires_dist": info.get("requires_dist", []) or []
            }
        except Exception as e:
            raise ValueError(f"Package '{package}' not found on PyPI: {e}")

def parse_pypi_deps(requires_dist: list[str]) -> list[dict]:
    """Parse PyPI requires_dist strings into name/version pairs."""
    deps = []
    for req in requires_dist:
        # Skip extras and env markers
        if "extra ==" in req or ";" in req:
            continue
        # Extract package name (before any version specifier)
        name = req.split(">")[0].split("<")[0].split("=")[0].split("!")[0]
        name = name.split("[")[0].strip()
        if name:
            deps.append({"name": name, "version": "latest"})
    return deps
```

---

### File 4: `backend/api/services/deps_service.py` (Zahid writes this)
```python
import httpx

DEPS_DEV_BASE = "https://api.deps.dev/v3"

ECOSYSTEM_MAP = {
    "npm": "npm",
    "pypi": "pypi",
}

async def get_resolved_dependencies(
    package: str,
    ecosystem: str,
    version: str
) -> list[dict]:
    """
    Get the FULL resolved transitive dependency graph from deps.dev.
    This is the single most important API call in the whole system.
    
    Returns flat list of all dependency nodes.
    """
    sys = ECOSYSTEM_MAP.get(ecosystem.lower(), "npm")
    
    # URL-encode the package name for scoped npm packages (@org/pkg)
    encoded_pkg = package.replace("/", "%2F")
    
    url = (f"{DEPS_DEV_BASE}/systems/{sys}/packages/"
           f"{encoded_pkg}/versions/{version}:dependencies")
    
    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.get(url)
            
            if r.status_code == 404:
                # deps.dev doesn't have this version; fall back to npm/pypi
                return []
            
            r.raise_for_status()
            data = r.json()
            
            nodes = data.get("nodes", [])
            edges = data.get("edges", [])
            
            # Build dependency list from edges
            # Edge: {"fromNode": 0, "toNode": 5} means node[0] depends on node[5]
            deps = []
            for edge in edges:
                from_idx = edge.get("fromNode", 0)
                to_idx = edge.get("toNode")
                
                if from_idx == 0 and to_idx is not None:
                    # Direct dependency of root
                    dep_node = nodes[to_idx]
                    vk = dep_node.get("versionKey", {})
                    deps.append({
                        "name": vk.get("name", ""),
                        "version": vk.get("version", ""),
                        "ecosystem": sys,
                        "from_node_idx": from_idx,
                        "to_node_idx": to_idx
                    })
            
            return deps, nodes, edges
            
        except httpx.TimeoutException:
            raise TimeoutError(f"deps.dev timed out for {package}")
        except Exception as e:
            raise RuntimeError(f"deps.dev error: {e}")


async def get_all_deps_as_flat_list(
    package: str,
    ecosystem: str,
    version: str
) -> list[dict]:
    """
    Returns ALL nodes in the full resolved dependency tree as a flat list.
    Used to build the complete graph in one call.
    """
    sys = ECOSYSTEM_MAP.get(ecosystem.lower(), "npm")
    encoded_pkg = package.replace("/", "%2F")
    url = (f"{DEPS_DEV_BASE}/systems/{sys}/packages/"
           f"{encoded_pkg}/versions/{version}:dependencies")
    
    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.get(url)
            if r.status_code != 200:
                return [], []
            
            data = r.json()
            nodes = data.get("nodes", [])
            edges = data.get("edges", [])
            
            flat_nodes = []
            for node in nodes:
                vk = node.get("versionKey", {})
                flat_nodes.append({
                    "name": vk.get("name", ""),
                    "version": vk.get("version", ""),
                    "ecosystem": sys
                })
            
            # Edges as (from_idx, to_idx) tuples
            flat_edges = [
                (e.get("fromNode", 0), e.get("toNode", 0))
                for e in edges
            ]
            
            return flat_nodes, flat_edges
            
        except Exception:
            return [], []
```

---

### File 5: `backend/api/services/osv_service.py` (Hari writes this)
```python
import httpx

OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"

async def query_vulnerabilities_batch(packages: list[dict]) -> dict:
    """
    Query OSV.dev for vulnerabilities on a list of packages.
    
    packages = [{"name": "...", "version": "...", "ecosystem": "npm"}, ...]
    Returns: {"name@version": [vuln_list]}
    """
    ECOSYSTEM_MAP = {"npm": "npm", "pypi": "PyPI"}
    
    queries = []
    for pkg in packages:
        eco = ECOSYSTEM_MAP.get(pkg["ecosystem"].lower(), "npm")
        queries.append({
            "version": pkg["version"],
            "package": {
                "name": pkg["name"],
                "ecosystem": eco
            }
        })
    
    if not queries:
        return {}
    
    # OSV batch limit is 1000 queries per call
    # For hackathon scale, we're well under this
    payload = {"queries": queries}
    
    async with httpx.AsyncClient(timeout=25) as client:
        try:
            r = await client.post(OSV_BATCH_URL, json=payload)
            r.raise_for_status()
            results = r.json().get("results", [])
        except Exception:
            # If OSV fails, return empty — don't break the whole flow
            return {}
    
    vuln_map = {}
    for i, result in enumerate(results):
        if i >= len(packages):
            break
        
        pkg = packages[i]
        pkg_id = f"{pkg['name']}@{pkg['version']}"
        raw_vulns = result.get("vulns", [])
        
        parsed = []
        for v in raw_vulns:
            parsed.append({
                "id": v.get("id", ""),
                "summary": v.get("summary", "No description"),
                "severity": _extract_severity(v),
                "cvss_score": _extract_cvss(v),
                "fixed_version": _extract_fix(v, pkg["name"])
            })
        
        vuln_map[pkg_id] = parsed
    
    return vuln_map


def _extract_severity(vuln: dict) -> str:
    # Try database_specific first (common in GitHub advisories)
    sev = vuln.get("database_specific", {}).get("severity", "")
    if sev.upper() in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
        return sev.upper()
    
    # Try severity array
    for s in vuln.get("severity", []):
        score = s.get("score", "")
        if "CRITICAL" in score:
            return "CRITICAL"
        if "HIGH" in score:
            return "HIGH"
        if "MEDIUM" in score:
            return "MEDIUM"
        if "LOW" in score:
            return "LOW"
    
    return "UNKNOWN"


def _extract_cvss(vuln: dict) -> float:
    for s in vuln.get("severity", []):
        if s.get("type") == "CVSS_V3":
            # CVSS score is in the score string like "CVSS:3.1/AV:N/.../7.5"
            score_str = s.get("score", "")
            try:
                # Last segment is numeric score
                return float(score_str.split("/")[-1])
            except Exception:
                pass
    return 0.0


def _extract_fix(vuln: dict, pkg_name: str) -> str:
    for affected in vuln.get("affected", []):
        if affected.get("package", {}).get("name") == pkg_name:
            for rng in affected.get("ranges", []):
                for event in rng.get("events", []):
                    if "fixed" in event:
                        return event["fixed"]
    return None
```

---

### File 6: `backend/api/services/graph_service.py` (Zahid writes this — CORE)
```python
import networkx as nx
import math
from .npm_service import get_downloads_batch
from .deps_service import get_all_deps_as_flat_list
from .osv_service import query_vulnerabilities_batch

async def build_and_analyze_graph(
    package: str,
    ecosystem: str,
    version: str,
    depth: int = 3
) -> dict:
    """
    Main orchestration function.
    1. Get full dependency tree from deps.dev
    2. Build NetworkX graph
    3. Fetch vulnerabilities (OSV) + downloads concurrently
    4. Enrich graph nodes
    5. Serialize for frontend
    """
    import asyncio
    
    # Step 1: Get all nodes and edges from deps.dev
    flat_nodes, flat_edges = await get_all_deps_as_flat_list(
        package, ecosystem, version
    )
    
    if not flat_nodes:
        raise ValueError(f"Could not resolve dependencies for {package}")
    
    # Limit depth — only keep nodes up to max_depth edges from root
    # (deps.dev returns full tree, we filter here)
    # Build a quick adjacency to find depth
    adj = {}
    for from_idx, to_idx in flat_edges:
        adj.setdefault(from_idx, []).append(to_idx)
    
    # BFS from root (index 0) to get depth of each node
    from collections import deque
    node_depths = {0: 0}
    q = deque([0])
    while q:
        curr = q.popleft()
        for neighbor in adj.get(curr, []):
            if neighbor not in node_depths:
                node_depths[neighbor] = node_depths[curr] + 1
                if node_depths[neighbor] <= depth:
                    q.append(neighbor)
    
    # Filter to only nodes within depth
    valid_indices = {i for i, d in node_depths.items() if d <= depth}
    
    # Step 2: Build NetworkX DiGraph
    G = nx.DiGraph()
    
    for i in valid_indices:
        if i < len(flat_nodes):
            node = flat_nodes[i]
            node_id = f"{node['name']}@{node['version']}"
            G.add_node(
                node_id,
                name=node["name"],
                version=node["version"],
                ecosystem=node["ecosystem"],
                depth=node_depths.get(i, 0),
                is_root=(i == 0)
            )
    
    for from_idx, to_idx in flat_edges:
        if from_idx in valid_indices and to_idx in valid_indices:
            if from_idx < len(flat_nodes) and to_idx < len(flat_nodes):
                from_id = f"{flat_nodes[from_idx]['name']}@{flat_nodes[from_idx]['version']}"
                to_id = f"{flat_nodes[to_idx]['name']}@{flat_nodes[to_idx]['version']}"
                if G.has_node(from_id) and G.has_node(to_id):
                    G.add_edge(from_id, to_id)
    
    # Step 3: Concurrent enrichment
    packages_list = [
        {
            "name": G.nodes[n]["name"],
            "version": G.nodes[n]["version"],
            "ecosystem": G.nodes[n]["ecosystem"]
        }
        for n in G.nodes()
    ]
    
    pkg_names = [p["name"] for p in packages_list]
    
    downloads_task = get_downloads_batch(pkg_names)
    vulns_task = query_vulnerabilities_batch(packages_list)
    
    downloads, vulns = await asyncio.gather(downloads_task, vulns_task)
    
    # Step 4: Enrich nodes
    for node_id in G.nodes():
        data = G.nodes[node_id]
        pkg_name = data["name"]
        
        dl = downloads.get(pkg_name, 0)
        nx.set_node_attributes(G, {node_id: {"monthly_downloads": dl}})
        
        vuln_list = vulns.get(node_id, [])
        nx.set_node_attributes(G, {node_id: {"vulnerabilities": vuln_list}})
        
        # Risk score: how dangerous is THIS node
        max_cvss = max((v.get("cvss_score", 0) for v in vuln_list), default=0)
        nx.set_node_attributes(G, {node_id: {"risk_score": max_cvss}})
    
    # Step 5: Serialize
    return serialize_graph(G)


def simulate_compromise(graph_data: dict, compromised_node: str) -> dict:
    """Rebuild graph from serialized data and run propagation simulation."""
    G = deserialize_graph(graph_data)
    
    if compromised_node not in G.nodes():
        raise ValueError(f"Node '{compromised_node}' not found in graph")
    
    # Reverse graph: edges now point FROM dependency TO dependent
    G_rev = G.reverse(copy=True)
    
    from collections import deque
    affected = set()
    propagation_order = []
    step_map = {}  # node -> step number
    
    queue = deque([(compromised_node, 0)])
    visited = {compromised_node}
    
    while queue:
        current, step = queue.popleft()
        for neighbor in G_rev.successors(current):
            if neighbor not in visited:
                visited.add(neighbor)
                affected.add(neighbor)
                step_map[neighbor] = step + 1
                propagation_order.append({
                    "node": neighbor,
                    "step": step + 1,
                    "delay_ms": (step + 1) * 180
                })
                queue.append((neighbor, step + 1))
    
    # Blast radius calculation
    downloads = {
        n: G.nodes[n].get("monthly_downloads", 0)
        for n in G.nodes()
    }
    
    total_dl = sum(downloads.get(n, 0) for n in affected)
    affected_count = len(affected)
    
    # Blast score
    count_score = min(affected_count / 200, 1.0) * 30
    dl_score = min(math.log10(max(total_dl, 1)) / 9, 1.0) * 60
    has_cve = bool(G.nodes[compromised_node].get("vulnerabilities"))
    cve_bonus = 10 if has_cve else 0
    blast_score = round(count_score + dl_score + cve_bonus, 1)
    
    # Mitigation — find vulnerable nodes in blast zone
    mitigation = _rank_mitigations(G, affected, downloads)
    
    return {
        "compromised_node": compromised_node,
        "affected_nodes": list(affected),
        "propagation_order": propagation_order,
        "blast_radius": {
            "affected_package_count": affected_count,
            "total_monthly_downloads_affected": total_dl,
            "blast_score": blast_score,
            "estimated_apps_affected": max(1, affected_count * 10)
        },
        "mitigation": mitigation
    }


def _rank_mitigations(G, affected, downloads):
    actions = []
    total_dl = sum(downloads.get(n, 0) for n in affected)
    
    for node in affected:
        vulns = G.nodes[node].get("vulnerabilities", [])
        fixed = next(
            (v["fixed_version"] for v in vulns if v.get("fixed_version")),
            None
        )
        if not fixed:
            continue
        
        node_dl = downloads.get(node, 0)
        elimination_pct = (node_dl / max(total_dl, 1)) * 100
        
        actions.append({
            "node": node,
            "action": f"Upgrade {node.split('@')[0]} to {fixed}",
            "eliminates_blast_percent": round(elimination_pct, 1),
            "fixed_version": fixed,
            "effort": "LOW" if elimination_pct > 20 else "MEDIUM"
        })
    
    return {
        "priority_actions": sorted(
            actions, key=lambda x: x["eliminates_blast_percent"],
            reverse=True
        )[:5]
    }


def serialize_graph(G: nx.DiGraph) -> dict:
    nodes = []
    for node_id, data in G.nodes(data=True):
        nodes.append({
            "id": node_id,
            "name": data.get("name", ""),
            "version": data.get("version", ""),
            "ecosystem": data.get("ecosystem", ""),
            "depth": data.get("depth", 0),
            "is_root": data.get("is_root", False),
            "monthly_downloads": data.get("monthly_downloads", 0),
            "vulnerabilities": data.get("vulnerabilities", []),
            "risk_score": data.get("risk_score", 0.0)
        })
    
    edges = [
        {"source": u, "target": v}
        for u, v in G.edges()
    ]
    
    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "vulnerable_nodes": sum(
                1 for n in nodes if n["vulnerabilities"]
            )
        }
    }


def deserialize_graph(graph_data: dict) -> nx.DiGraph:
    G = nx.DiGraph()
    for node in graph_data["nodes"]:
        G.add_node(node["id"], **{k: v for k, v in node.items() if k != "id"})
    for edge in graph_data["edges"]:
        G.add_edge(edge["source"], edge["target"])
    return G
```

---

### File 7: `backend/api/routes/analyze.py` (Zahid writes this)
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
from ..services.graph_service import build_and_analyze_graph, simulate_compromise

router = APIRouter()

class AnalyzeRequest(BaseModel):
    package: str
    ecosystem: Literal["npm", "pypi"] = "npm"
    version: Optional[str] = "latest"
    depth: int = 3

class SimulateRequest(BaseModel):
    graph_data: dict
    compromised_node: str

@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        # Resolve "latest" to actual version for npm
        version = req.version
        if version == "latest" and req.ecosystem == "npm":
            from ..services.npm_service import get_latest_version
            version = await get_latest_version(req.package)
        
        graph = await build_and_analyze_graph(
            req.package,
            req.ecosystem,
            version,
            req.depth
        )
        return {"success": True, "data": graph}
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@router.post("/simulate")
async def simulate(req: SimulateRequest):
    try:
        result = simulate_compromise(req.graph_data, req.compromised_node)
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## FRONTEND IMPLEMENTATION (Shubham — Lead, Graph Viz + Swapnil — Scaffolding/DevOps + Nitya — Panels & Copy)

### Key Component: `src/components/GraphCanvas.jsx`
```jsx
import ReactFlow, {
  Background, Controls, MiniMap, useNodesState, useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraphStore } from '../store/graphStore';
import { transformToReactFlow } from '../utils/graphTransform';
import { usePropagate } from '../hooks/usePropagate';
import NodeDetail from './NodeDetail';
import { useState } from 'react';

export default function GraphCanvas() {
  const { graphData, blastData } = useGraphStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const { animateBlast } = usePropagate(setNodes);

  // When graphData changes, transform and set
  useEffect(() => {
    if (!graphData) return;
    const { nodes: n, edges: e } = transformToReactFlow(graphData);
    setNodes(n);
    setEdges(e);
  }, [graphData]);

  // When blastData changes, animate
  useEffect(() => {
    if (!blastData) return;
    animateBlast(blastData.propagation_order);
  }, [blastData]);

  const onNodeClick = (_, node) => {
    setSelectedNode(node.data);
  };

  return (
    <div className="relative w-full h-full bg-slate-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        className="bg-slate-900"
      >
        <Background color="#334155" gap={20} />
        <Controls className="bg-slate-800 border-slate-700" />
        <MiniMap
          nodeColor={n => n.data?.vulns?.length > 0 ? '#f97316' : '#3b82f6'}
          className="bg-slate-800"
        />
      </ReactFlow>
      
      {selectedNode && (
        <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}
```

### Nitya's Components: `BlastRadiusPanel.jsx` & `MitigationPanel.jsx`
Nitya owns the panels that read `blastData` and `mitigationData` out of `graphStore.js` (populated by Shubham's `useAnalyze`/`usePropagate` hooks) and render:
- **Blast Radius panel** — the large Blast Score number, the "X packages / Y monthly downloads affected" stats, and the population-comparison line from `CREATIVE_IDEAS.md` Idea 9 (`getHumanComparison()`).
- **Mitigation panel** — the ranked `priority_actions` list from the `/simulate` response, rendered as a numbered action plan with an "eliminates X% of blast radius" badge per item.

These are pure presentation components — no new API calls — so Nitya can build and style them against mock JSON (copied straight from the TDD Section 2.2 sample response) while Zahid finishes the real `/simulate` endpoint, then swap the mock for the live store value once it's ready.

---

## DEPLOYMENT STEPS (Swapnil — DevOps)

### Deploy Backend to Render
1. Go to render.com → New → Web Service
2. Connect GitHub repo → select `backend/` folder
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Copy the Render URL (e.g., `https://rippleguard-api.onrender.com`)

### Deploy Frontend to Vercel
1. Go to vercel.com → New Project
2. Connect GitHub repo → set Root Directory to `frontend/`
3. Framework: Vite
4. Add Environment Variable: `VITE_API_BASE_URL = https://rippleguard-api.onrender.com`
5. Deploy

### Test End-to-End
```bash
# In incognito browser, verify:
# 1. https://your-app.vercel.app loads
# 2. Type "express" in search, click Analyze
# 3. Graph renders with real nodes
# 4. Click a node, click "Inject Compromise"
# 5. Blast animation plays
# 6. Blast radius panel shows numbers

# Also verify GitHub repo is public:
# github.com/your-username/rippleguard
```

---

## SUBMISSION CHECKLIST
- [ ] PPT in official template, exported as PDF
- [ ] PDF filename: `TeamID_TeamName_CS0202` (check your problem statement ID)
- [ ] Video: max 3 min (with prototype demo), uploaded to YouTube Unlisted OR Google Drive
- [ ] Video link accessible in incognito (critical — instant DQ if not)
- [ ] Every team member's face appears in the video
- [ ] GitHub repo is PUBLIC
- [ ] GitHub repo linked in submission
- [ ] No college name/logo anywhere in PPT or video
- [ ] Submitted via hackathon.manipal.edu portal only
