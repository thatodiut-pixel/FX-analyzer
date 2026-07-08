# FX Analyzer Pro

**Institutional-grade algorithmic FX trading terminal** powered by Google Gemini AI with a Mixture of Experts architecture.

[![CI Status](https://github.com/sellomakgatho121/Fx-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/sellomakgatho121/Fx-analyzer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/🌐_live-pages-00f2ff)](https://sellomakgatho121.github.io/Fx-analyzer)
[![Vercel](https://img.shields.io/badge/deployed-vercel-000?logo=vercel)](https://frontend-jjh4l1mja-sellomakgatho121-2317s-projects.vercel.app)

---

## Overview

FX Analyzer Pro is a full-stack algorithmic trading platform where **four specialized AI agents** (Technical, Fundamental, Sentiment, Risk) analyze the forex market in real-time, debate their findings, and deliver high-conviction trading signals directly to MetaTrader 5.

**Live landing page**: [sellomakgatho121.github.io/Fx-analyzer](https://sellomakgatho121.github.io/Fx-analyzer)  
**Live app** (Vercel): [Launch Terminal](https://frontend-jjh4l1mja-sellomakgatho121-2317s-projects.vercel.app)

## Features

### 🔬 Mixture of Experts AI
- **4 LLM agents** — Technical, Fundamental, Sentiment, Risk — using Google Gemini Flash
- **MM-DREX architecture**: agents debate then synthesize into a unified signal
- Regime-adaptive weighting shifts based on live market volatility

### ⚡ Real-Time Execution
- ZeroMQ pub/sub for Python ↔ Node.js bridge (sub-second latency)
- Socket.IO for live frontend updates
- Direct MetaTrader 5 integration

### 🛡️ Risk Management
- Configurable daily drawdown limits
- Max position caps per pair
- Emergency kill switch
- Paper trading engine with full simulation

### 🎨 Premium Dashboard
- Next.js 16 with TailwindCSS 4
- Framer Motion animations & Three.js 3D scenes
- Real-time candlestick charts (light-weight-charts)
- Dark neon "Deep Neo" design system

## Architecture

```
┌──────────────────────────────┐
│     FRONTEND (Next.js 16)    │
│  TailwindCSS4 · Framer Motion │
│  Three.js · Socket.IO Client │
└──────────┬───────────────────┘
           │ Socket.IO (WebSocket)
┌──────────▼───────────────────┐
│     BACKEND (Node.js)         │
│  Express · Socket.IO · SQLite │
│  Auth · CORS · Rate Limiting │
└──────────┬───────────────────┘
           │ ZeroMQ (TCP)
┌──────────▼───────────────────┐
│     ENGINE (Python 3.11+)     │
│  MoE Orchestrator · TA Lib    │
│  Gemini API · Sentiment · MT5 │
│  Vibe Research · Deep Agents │
└──────────────────────────────┘
```

## Tech Stack

| Layer     | Technology                                |
|-----------|-------------------------------------------|
| Frontend  | Next.js 16, TailwindCSS 4, Framer Motion, Three.js, Zustand |
| Backend   | Node.js, Express, Socket.IO, SQLite, JWT  |
| Engine    | Python 3.11+, Google Gemini, ZeroMQ, Pandas, MetaTrader5 |
| Database  | SQLite (signals, trades, user sessions)   |
| CI/CD     | GitHub Actions, GitHub Pages, Vercel      |

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Google Gemini API key

### 1. Clone & Install
```bash
git clone https://github.com/sellomakgatho121/Fx-analyzer.git
cd Fx-analyzer/Fx-analyzer

# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install

# Python engine
cd ..
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r engine/requirements.txt
```

### 2. Set Environment
```bash
export GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Run
```bash
# Windows (all services):
.\start.ps1

# Or individually:
cd backend && npm start            # Port 4000
cd frontend && npm run dev         # Port 3000
python engine/bridge.py            # Engine
```

## Deployment

| Service  | Platform | Config                                      |
|----------|----------|---------------------------------------------|
| Landing  | GitHub Pages | Auto-deploy from `/docs` on push to `main` |
| Frontend | Vercel   | Connect repo, set `root: frontend`          |
| Backend  | Render   | `render.yaml` config in repo root           |
| Engine   | Self-host | Python service on VPS or local machine     |

## Project Structure

```
FX Analyzer and trading bot/
└── Fx-analyzer/              # ← This repo root
    ├── frontend/             # Next.js 16 web application
    │   ├── src/
    │   │   ├── app/          # Pages & API routes
    │   │   ├── components/   # React components
    │   │   ├── store/        # Zustand state
    │   │   └── lib/          # Utilities & hooks
    │   └── package.json
    ├── backend/              # Node.js API server
    │   ├── server.js         # Express + Socket.IO
    │   └── package.json
    ├── engine/               # Python analysis engine
    │   ├── bridge.py         # ZMQ ↔ Node.js bridge
    │   ├── deep/             # Deep learning agents
    │   └── trading_agents/   # MCP-based agents
    ├── docs/                 # GitHub Pages landing
    ├── config/               # System configuration
    └── data/                 # Market data & research
```

## Documentation

- [Product Requirements](docs/PRD.md)
- [Project Structure](docs/Project_Structure.md)
- [UI/UX Design System](docs/UI_UX_System.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License — see [LICENSE](LICENSE).
