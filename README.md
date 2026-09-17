<div align="center">

<img src="./docs/assets/banner.jpg" alt="RippleGuard — Supply Chain Compromise Simulator" width="100%"/>

<br/>
<br/>

**See the compromise before it becomes a catastrophe.**

<br/>

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![NetworkX](https://img.shields.io/badge/NetworkX-Graph_Engine-orange?style=for-the-badge)](https://networkx.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

<br/>

[![Hackathon](https://img.shields.io/badge/🏆_Manipal_Hackathon_2026-Cybersecurity_Track-red?style=flat-square&labelColor=black)](/)
[![No API Keys](https://img.shields.io/badge/🔑_Zero_API_Keys-Required-brightgreen?style=flat-square&labelColor=black)](/)
[![npm + PyPI](https://img.shields.io/badge/📦_npm_+_PyPI-Supported-blue?style=flat-square&labelColor=black)](/)

<br/>

[**🚀 Live Demo**](#) · [**📖 Docs**](./docs/) · [**🐛 Report Bug**](https://github.com/Swapnil-Ghosh06/RippleGuard/issues) · [**✨ Request Feature**](https://github.com/Swapnil-Ghosh06/RippleGuard/issues)

</div>

---

## ⚡ The Problem

<img src="./docs/assets/screenshot-problem.png" alt="The Problem — supply chain attack visibility gap" width="100%"/>

> *You rely on hundreds of packages every day — and you have zero visibility into what happens when one goes rogue.*

Standard vulnerability scanners give you a raw list of 400 CVE alerts and no idea which one could actually cripple your infrastructure. They alert on package versions, but **cannot map reachability, transitive blast paths, or downstream impact.**

**RippleGuard is different.** It's a **supply chain compromise simulator** — not an alert fatigue engine. You pick any package in the dependency tree, inject a real-world attack, and **watch the infection cascade across the dependency graph in real time.**

---

## 🎯 Meet RippleGuard

<img src="./docs/assets/screenshot-hero.png" alt="RippleGuard Hero — blast radius of a single package" width="100%"/>

> *The no-brainer way to map exactly what breaks across your dependency tree when a package gets poisoned.*

<div align="center">

```
Search any npm or PyPI package  →  RippleGuard maps the full dependency universe
Inject a real attack scenario   →  Watch the compromise cascade in real time
Read the Blast Radius Score     →  Know exactly what's at risk and how to fix it
```

</div>

---

## 💥 The Dependency Canvas

<img src="./docs/assets/screenshot-graph.png" alt="RippleGuard Dependency Canvas — live graph simulation" width="100%"/>

Every node is a real package. Every edge is a real dependency. The canvas is live — click any node, inject a compromise, and watch the contagion spread hop-by-hop with a 0–100 **Blast Radius Score**.

**Color coding at a glance:**
- 🔴 `CRITICAL CVE` — Immediate exploit risk
- 🟠 `HIGH/MEDIUM CVE` — Active vulnerability  
- 🟢 `No known CVEs` — Clean package
- ⚡ `Compromised` — Infected by simulation

---

## 📖 How It Works

<img src="./docs/assets/screenshot-howto.png" alt="RippleGuard — How it works, 4 steps" width="100%"/>

---

## ✨ Core Features

| Feature | Description |
|---|---|
| 🕸️ **Live Dependency DAGs** | Recursive transitive dependency resolution for any npm or PyPI package via `deps.dev` |
| 💥 **Blast Radius Score (0–100)** | Quantitative impact metric combining affected packages, depth, monthly downloads & exploit severity |
| ⚡ **Compromise Propagation Engine** | Exponential decay contagion algorithm — malicious payloads spread node-by-node in real time |
| 🦋 **Domino Stepper** | Step-by-step scrubber tracing the critical failure chain with auto-centering camera focus |
| 🛡️ **Virtual Patch Sandbox** | Simulate removing, upgrading, or isolating packages and see blast radius shrink live |
| 🎯 **Attack Benchmarks** | One-click replays of Log4Shell, XZ Backdoor, event-stream, colors, and lodash CVEs |
| 📋 **Remediation Planner** | Prioritized upgrade paths with exact copy-paste `npm update` / `pip install --upgrade` commands |
| 📄 **Executive Export** | Downloadable JSON & Markdown SBOM audit summaries |

---

## 🎯 Attack Benchmarks

Replay five of the most devastating real-world supply chain attacks with one click:

| Attack | Package | CVE | Impact |
|---|---|---|---|
| 🔥 **Log4Shell RCE** | `log4js` | CVE-2021-44228 | Remote code execution via log interpolation |
| 🐚 **SSH Binary Backdoor** | `xz` | CVE-2024-3094 | Malicious XZ compression library compromising SSH |
| 💸 **Wallet Theft Trojan** | `event-stream` | GHSA-mh6f-8j2x-4483 | Malicious package injected to steal Bitcoin |
| 🎨 **Maintainer Sabotage** | `colors` | GHSA-5rqg-jm4f-cqx7 | Deliberate breakage by burned-out maintainer |
| 🧬 **Prototype Pollution** | `lodash` | CVE-2021-23337 | Object prototype poisoning across Node.js apps |

---

## 🏗️ Architecture

<img src="./docs/assets/architecture.jpg" alt="RippleGuard System Architecture" width="100%"/>

### Contagion Formula

RippleGuard uses an **exponential decay propagation model**:

$$P(v) = P(u) \cdot e^{-\lambda \cdot d} \cdot W_{\text{vuln}}(v)$$

| Symbol | Meaning |
|---|---|
| `P(v)` | Contagion probability at node `v` |
| `P(u)` | Contagion probability at parent node `u` |
| `λ` | Attenuation constant (Direct vs Transitive dependency) |
| `d` | Graph distance from the initial compromise point |
| `W_vuln(v)` | Vulnerability weight from CVSS v3 score & exploit maturity |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ & npm
- **Python** 3.10+ & pip
- **Zero API keys required** — all data providers are free and keyless

### 1️⃣ Clone

```bash
git clone https://github.com/Swapnil-Ghosh06/RippleGuard.git
cd RippleGuard
```

### 2️⃣ Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # macOS / Linux
.\venv\Scripts\activate         # Windows
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

> **API:** `http://127.0.0.1:8000` · **Swagger:** `http://127.0.0.1:8000/docs`

### 3️⃣ Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

> **App:** `http://localhost:5173`

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health & API version |
| `POST` | `/api/analyze` | Resolves transitive deps & queries OSV vulnerabilities |
| `POST` | `/api/simulate` | Executes blast radius & contagion propagation |
| `POST` | `/api/compare` | Compares blast radius between versions/packages |
| `POST` | `/api/export` | Generates JSON / Markdown audit summaries |
| `GET` | `/api/attacks` | Returns curated historical attack scenarios |

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite |
| **Graph Engine** | React Flow (`@xyflow/react`) |
| **State** | Zustand |
| **Animations** | Framer Motion |
| **Styling** | Tailwind CSS |
| **Typography** | Playfair Display · DM Sans · Sora |
| **Backend** | FastAPI (Python 3.11) + Uvicorn |
| **Graph Processing** | NetworkX |
| **HTTP Client** | HTTPX (async) |
| **Validation** | Pydantic v2 |
| **Dep Data** | Google deps.dev API |
| **CVE Data** | OSV.dev Advisory Database |
| **Registries** | npm Registry API · PyPI JSON API |

</div>

---

## 📚 Documentation

| Doc | Description |
|---|---|
| [`PRD.md`](./docs/PRD.md) | Product vision, core features, judging criteria |
| [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System architecture, request lifecycle, data flow |
| [`TECHSTACK.md`](./docs/TECHSTACK.md) | Technology choices & library rationale |
| [`DATA_MODEL.md`](./docs/DATA_MODEL.md) | Entity relationships — Package, Vulnerability, BlastResult |
| [`SCHEMA.md`](./docs/SCHEMA.md) | API request & response specs |
| [`DESIGN.md`](./docs/DESIGN.md) | Color palette, typography, motion system |
| [`TDD.md`](./docs/TDD.md) | Propagation algorithms & DAG parsing |

---

## 👥 The Team

<div align="center">

| | Contributor | Role | Focus |
|---|---|---|---|
| 🧠 | **Syed Zahid Saleem** · [@syedzahidsaleem](https://github.com/syedzahidsaleem) | Backend Lead | Graph Engine, FastAPI Architecture, DAG Resolution |
| 🔬 | **Haripriya** · [@Haripriya24071](https://github.com/Haripriya24071) | Backend | OSV & Registry Integration, Vulnerability Scoring |
| 🎨 | **Swapnil Ghosh** · [@Swapnil-Ghosh06](https://github.com/Swapnil-Ghosh06) | Frontend | Design System, Frontend Architecture, Layout |
| 🖥️ | **Shubham** · [@subham-OPS08](https://github.com/subham-OPS08) | Frontend | Graph Visualization, Node Ports, Canvas Interactions |
| 🎭 | **Nitya** · [@dearnitya](https://github.com/dearnitya) | Frontend & UI | Analysis Panels, Domino Stepper HUD, Mitigation UI |

</div>

---

## 📄 License

Licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ for **Manipal Hackathon 2026** — Cybersecurity Track

<br/>

*RippleGuard — Because one rogue package can sink everything.*

<br/>

⭐ **Star this repo** if you found it useful!

</div>
