# RippleGuard 🛡️
### *See the compromise before it becomes a catastrophe.*

[![Vite](https://img.shields.io/badge/Frontend-React_18_+_Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_+_Python_3.11-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React Flow](https://img.shields.io/badge/Graph_Engine-React_Flow_+_NetworkX-FF0072?style=flat)](https://reactflow.dev/)
[![Data Providers](https://img.shields.io/badge/Data-deps.dev_+_OSV.dev-4285F4?style=flat&logo=google&logoColor=white)](https://deps.dev/)
[![Hackathon](https://img.shields.io/badge/Manipal_Hackathon_2026-Cybersecurity_Track-red?style=flat)]()

**RippleGuard** is an open-source **Compromise Propagation & Blast Radius Simulator** for modern software supply chains. 

Rather than functioning as a static vulnerability scanner, RippleGuard models live transitive dependency DAGs across **npm** and **PyPI**, injects realistic supply chain attacks (e.g. malicious updates, maintainer sabotage, zero-day RCEs), and simulates step-by-step how contagion ripples through downstream ecosystems.

---

## 🌟 Key Highlights & Capabilities

- 🕸️ **Live Multi-Tier Dependency Resolution**: Instant recursive DAG construction for any npm or PyPI package via `deps.dev` and official package registries.
- ⚡ **Compromise Propagation Engine**: Exponential decay contagion algorithm ($P(v) = P(u) \cdot e^{-\lambda \cdot d} \cdot \text{Weight}$) that simulates how malicious payloads spread through dependencies.
- 💥 **Blast Radius Scoring (0–100)**: Quantitative impact metrics combining affected package count, transitive depth, monthly download exposure, and exploit severity.
- 🦋 **Butterfly Trace & Domino Stepper**: Interactive step-by-step scrubber tracing the critical failure chain from entrypoint to terminal endpoints with auto-centering camera focus.
- 🛡️ **Interactive Virtual Sandbox**: In-browser sandbox allowing engineers to simulate removing, upgrading, or isolating packages and immediately observe the blast radius reduction.
- 🎯 **One-Click Attack Benchmarks**: Pre-loaded simulations of infamous real-world supply chain attacks:
  - **Log4Shell RCE** (`log4js` / `CVE-2021-44228`)
  - **SSH Binary Backdoor** (`xz` / `CVE-2024-3094`)
  - **Wallet Theft Trojan** (`event-stream` / `GHSA-mh6f-8j2x-4483`)
  - **Maintainer Sabotage** (`colors` / `GHSA-5rqg-jm4f-cqx7`)
  - **Prototype Pollution** (`lodash` / `CVE-2021-23337`)
- 📋 **Prioritized Remediation Planner**: Actionable upgrade paths with copy-paste commands (`npm update`, `pip install --upgrade`) and exact percentage impact metrics.
- 📄 **Executive & Technical Export**: Downloadable audit summaries in JSON and Markdown SBOM formats.
- 🎨 **Editorial Design System**: Clean newspaper aesthetic featuring warm cream palette, Playfair Display typography, and custom water-drop branding.

---

## 🏗️ Architecture & System Design

```
                     ┌────────────────────────────────────────┐
                     │          RippleGuard Frontend          │
                     │  (React 18 + Vite + Tailwind + Flow)   │
                     └───────────────────┬────────────────────┘
                                         │ REST API
                                         ▼
                     ┌────────────────────────────────────────┐
                     │          FastAPI Backend Core          │
                     │ (Graph Engine, NetworkX, Decay Sim)    │
                     └───────┬────────────────────────┬───────┘
                             │                        │
               HTTP / Live   ▼          HTTP / Live   ▼
        ┌─────────────────────────┐      ┌─────────────────────────┐
        │  Google deps.dev API    │      │     OSV.dev API         │
        │  (Transitive Dep DAGs)  │      │  (Vulnerability Feed)   │
        └─────────────────────────┘      └─────────────────────────┘
```

### Contagion Spread Formula
Contagion probability $P(v)$ across dependency edge $(u, v)$ with distance $d$ is computed via:
$$P(v) = P(u) \cdot e^{-\lambda \cdot d} \cdot W_{\text{vuln}}(v)$$

Where:
- $\lambda$: Attenuation constant based on dependency role (Direct vs Transitive).
- $W_{\text{vuln}}(v)$: Vulnerability weight derived from CVSS v3 score and exploit maturity.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18.0+ & **npm**
- **Python** 3.10+ & **pip**
- **Zero API Keys Required** (All upstream data providers are keyless and free)

---

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# On macOS/Linux:
source venv/bin/activate
# On Windows (cmd/pwsh):
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be live at `http://127.0.0.1:8000`.  
Swagger documentation is available at `http://127.0.0.1:8000/docs`.

---

### 2. Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server
npm run dev
```

The web client will launch at `http://localhost:5173`.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status and API version. |
| `POST` | `/api/analyze` | Resolves transitive dependencies & queries OSV vulnerabilities. |
| `POST` | `/api/simulate` | Executes blast radius calculation & contagion propagation. |
| `POST` | `/api/compare` | Compares blast radius differences between versions or packages. |
| `POST` | `/api/export` | Generates downloadable JSON / Markdown executive summaries. |
| `GET` | `/api/attacks` | Returns curated historical attack scenarios. |

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite 8
- **Interactive Graphing**: React Flow (`@xyflow/react`)
- **State Management**: Zustand
- **Styling & Motion**: Tailwind CSS + Framer Motion
- **Typography**: Playfair Display, DM Sans, Sora, Montserrat

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **ASGI Server**: Uvicorn
- **Graph Processing**: NetworkX
- **HTTP Client**: HTTPX (Async HTTP connection pool)
- **Validation**: Pydantic v2

### External Data Services
- **Google Open Source Insights (`deps.dev`)**: Live transitive dependency graphs.
- **Open Source Vulnerabilities (`OSV.dev`)**: Distributed open-source CVE & advisory database.
- **Package Registries**: npm Registry API & PyPI JSON API.

---

## 👥 The RippleGuard Team

| Contributor | Squad | Focus Area |
|---|---|---|
| **Syed Zahid Saleem** ([@syedzahidsaleem](https://github.com/syedzahidsaleem)) | Backend | Project Lead — Graph Engine, Fast DAG Resolution & API Architecture |
| **Haripriya** ([@Haripriya24071](https://github.com/Haripriya24071)) | Backend | Data Services, OSV & Registry Integration, Vulnerability Scoring |
| **Swapnil Ghosh** ([@Swapnil-Ghosh06](https://github.com/Swapnil-Ghosh06)) | Frontend | Frontend Architecture, Design System, Responsive Layout & Scaffolding |
| **Shubham** ([@subham-OPS08](https://github.com/subham-OPS08)) | Frontend | Graph Visualization, Custom Node Ports, Canvas Interactions & Layout |
| **Nitya** ([@dearnitya](https://github.com/dearnitya)) | Frontend & UI | Analysis Panels, Domino Stepper HUD, Mitigation UI & Documentation |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
