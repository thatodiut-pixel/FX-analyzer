# Project Structure: FX Analyzer Pro

## System Topology
```
┌──────────────────────────────────┐
│        FRONTEND (Next.js 16)      │
│  TailwindCSS4 · Zustand · Socket  │
│  Three.js · Framer Motion         │
└────────────┬─────────────────────┘
             │ Socket.IO (WebSocket)
             ▼
┌──────────────────────────────────┐
│         BACKEND (Node.js)         │
│  Express · Socket.IO · SQLite     │
│  JWT Auth · Rate Limiting · CORS │
└────────────┬─────────────────────┘
             │ ZeroMQ (TCP)
             ▼
┌──────────────────────────────────┐
│        ENGINE (Python 3.11+)      │
│  MoE Orchestrator · Gemini API    │
│  TA-Lib · Sentiment · Research    │
│  Deep Agents · MT5 Bridge         │
└──────────────────────────────────┘
```

## Directory Layout

```
Fx-analyzer/
├── frontend/               # Next.js 16 web application
│   ├── src/
│   │   ├── app/            # Pages & API routes
│   │   │   ├── (main)/     # Main dashboard routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── trading/
│   │   │   │   ├── analysis/
│   │   │   │   ├── agents/
│   │   │   │   ├── portfolio/
│   │   │   │   ├── research/
│   │   │   │   └── settings/
│   │   │   ├── admin/      # Admin panel
│   │   │   ├── login/      # Authentication
│   │   │   ├── onboarding/ # User onboarding
│   │   │   └── signals/    # Signal details
│   │   ├── components/     # React components
│   │   │   ├── agent-arena/ # MoE agent debate UI
│   │   │   └── ...         # Charts, panels, cards
│   │   ├── context/        # React context providers
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utility functions
│   │   └── store/          # Zustand state management
│   └── package.json
│
├── backend/                # Node.js API server
│   ├── server.js           # Express + Socket.IO
│   └── package.json
│
├── engine/                 # Python analysis engine
│   ├── bridge.py           # ZeroMQ ↔ Node.js bridge
│   ├── orchestrator.py     # MoE agent coordinator
│   ├── agents/             # AI agent implementations
│   │   ├── technical.py
│   │   ├── fundamental.py
│   │   ├── sentiment.py
│   │   └── risk.py
│   ├── deep/               # Deep learning agents
│   │   ├── agents/
│   │   │   └── cnn_agent.py
│   │   └── lstm_agent.py
│   ├── rag/                # Retrieval-Augmented Generation
│   ├── trading_agents/     # MCP-based trading pipeline
│   └── requirements.txt
│
├── docs/                   # GitHub Pages landing site
├── config/                 # System configuration
├── data/                   # Market data & research
└── .github/               # GitHub Actions & templates
    ├── workflows/
    │   ├── ci.yml          # Lint & build
    │   └── pages.yml       # GitHub Pages deploy
    ├── ISSUE_TEMPLATE/     # Bug report & feature request
    └── PULL_REQUEST_TEMPLATE.md
```

## Key Components

### Frontend Components
| Component | Description |
|-----------|-------------|
| `CandlestickChartEnhanced` | Real-time trading chart with indicators |
| `DashboardMain` | Main dashboard layout and orchestration |
| `SignalCard` | Individual trading signal display |
| `TradePanel` | Order placement and position management |
| `AgentDebate` | MoE agent consensus visualization |
| `VibeResearchTerminal` | AI research assistant interface |
| `PaperTradingDashboard` | Paper trading simulation UI |
| `DeepLearningPanel` | CNN/LSTM model insights display |
| `AnimatedBackground` | 3D Three.js background scenes |

### Engine Components
| Module | Description |
|--------|-------------|
| `orchestrator.py` | Coordinates 4 MoE agents, consolidates signals |
| `bridge.py` | ZeroMQ pub/sub between Python and Node.js |
| `data_feed.py` | Market data ingestion and processing |
| `llm_analyzer.py` | Google Gemini API integration |
| `executor.py` | MT5 order placement and execution |
| `database.py` | SQLite persistence layer |
| `vibe_research_service.py` | AI research and pattern discovery |
