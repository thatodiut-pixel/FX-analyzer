# Fx-analyzer — Code Wiki

A structured, comprehensive walkthrough of the **Fx-analyzer** repository: a multi-agent, AI-driven forex / crypto market-analysis platform composed of a Python analysis engine, a Node.js real-time bridge, and a Next.js trading dashboard.

---

## 1. Project Overview

**Fx-analyzer** is an institutional-grade retail trading workstation that fuses a Mixture-of-Experts (MoE) LLM analyst panel, deep-learning price/pattern models, and live market data feeds to produce consensus trade signals. The product is a SaaS-style web application with three runtime layers communicating over ZeroMQ and Socket.IO.

### 1.1 Core Capabilities

- **Multi-agent analysis** — Technical, Fundamental, Sentiment and Risk experts, each backed by a dedicated OpenRouter LLM, debate a market symbol and emit a consensus signal.
- **Deep learning suite** — LSTM price forecasting and CNN chart-pattern recognition, with a unifying pipeline for OHLCV + alternative data (Fear & Greed, Google Trends, FRED macro series).
- **RAG (Retrieval-Augmented Generation)** — A FAISS-backed vector store fed by RSS / curated research (Fed minutes, vibe alpha zoo) lets the orchestrator ground its reasoning in real documents.
- **Live & paper trading** — Manual execution panel plus auto-trade policies; MT5 broker bridge for live orders, in-memory paper engine for simulation.
- **Real-time UI** — Next.js dashboard streaming ticks, signal breakdowns, agent debate timeline, deep-learning charts and economic calendar via Socket.IO.

### 1.2 High-Level Architecture

```text
┌───────────────────────────────────────────────────────────────────────┐
│                        FRONTEND  (Next.js 15)                          │
│   /dashboard, /agents, /autotrade, /history, /settings …              │
│   Zustand stores · Framer-Motion UI · Socket.IO client · NextAuth      │
└───────────────▲──────────────────────────────▲────────────────────────┘
                │ HTTPS (REST)                 │ WSS (Socket.IO)
                │                              │
┌───────────────┴──────────────────────────────┴────────────────────────┐
│                  BACKEND GATEWAY  (Node.js + Express 5)                │
│   auth · market data · SQLite ledger · MT5 bridge · ZMQ pub/sub        │
└───────▲──────────────────────────▲───────────────────────▲────────────┘
        │ ZeroMQ REQ/REP           │ ZMQ PUSH             │ ZMQ SUB
        │                          │                       │
┌───────┴──────────────────────────┴───────────────────────┴────────────┐
│                         ENGINE  (Python 3.11)                         │
│   agents/  deep/  rag/  trading_agents/  orchestrator                │
│   data_feed · executor · database · calendar_service · memory         │
└───────────────────────────────────────────────────────────────────────┘
                                ▲
                                │ yfinance, Alpha Vantage, RSS, FRED
                                │
                       ─── External Data ───
```

### 1.3 Tech Stack

| Layer        | Technology                                                          |
| ------------ | ------------------------------------------------------------------- |
| Engine       | Python 3.11 · asyncio · pandas · numpy · yfinance · FAISS · ZMQ     |
| Backend      | Node.js · Express 5 · Socket.IO 4 · SQLite (`sqlite3`) · ZMQ       |
| Frontend     | Next.js 15 (App Router) · React 19 · Zustand · Framer Motion        |
| Auth         | NextAuth (Google OAuth + Credentials) with JWT sessions             |
| Styling      | Tailwind CSS · CSS custom properties (acid-lime / hyper-red theme) |
| Deployment   | Render Blueprint (`render.yaml`) — two web services                 |

---

## 2. Repository Layout

```text
Fx-analyzer/
├── backend/                     # Node.js gateway
│   ├── server.js                # Express + Socket.IO + ZMQ entry point
│   └── package.json
├── engine/                      # Python analysis engine
│   ├── agents/                  # MoE analyst agents
│   ├── deep/                    # LSTM / CNN / sentiment DL pipeline
│   ├── rag/                     # FAISS-backed retrieval layer
│   ├── trading_agents/          # LangGraph-style multi-agent workflow
│   ├── orchestrator.py          # High-level coordinator
│   ├── data_feed.py             # Market data ingestion
│   ├── executor.py              # Order execution (paper + MT5)
│   ├── database.py              # SQLite session / signal store
│   ├── calendar_service.py      # Economic calendar
│   ├── memory.py                # Long-term agent memory
│   ├── llm_analyzer.py          # OpenRouter LLM client
│   ├── vibe_research_service.py # Research synthesis service
│   ├── agent_bridge.py          # Adapter engine → ZMQ gateway
│   ├── bridge.py                # ZMQ server entry-point
│   └── requirements.txt
├── frontend/                    # Next.js dashboard
│   ├── src/app/                 # App Router pages
│   ├── src/components/          # UI components & agent-arena/
│   ├── src/store/               # Zustand stores
│   ├── src/hooks/               # React hooks
│   ├── src/lib/                 # Cross-cutting libs (socket, alerts, paper trading)
│   ├── src/middleware.js        # Auth gate
│   └── package.json
├── config/
│   └── models.json              # Per-agent LLM routing
├── data/
│   └── research/                # Curated docs ingested by RAG
├── docs/                        # Markdown project documentation
│   ├── Architecture.md
│   ├── TradingAgents_Integration.md
│   ├── LLM_Strategy.md
│   ├── MoE_Workflow.md
│   ├── User_Guide.md
│   └── ... (see §10)
├── render.yaml                  # Render deployment blueprint
├── package.json                 # Root orchestration (concurrently)
├── start_dev.sh                 # Convenience launcher
└── .env.example                 # Sample environment variables
```

---

## 3. Backend (Node.js Gateway)

### 3.1 `backend/server.js`

The gateway is a single-file Express + Socket.IO service that brokers every external integration the dashboard touches.

#### Responsibilities

- **REST API** under `/api/*` for auth, market data, history, sentiment, deep-learning and paper-trading endpoints.
- **Socket.IO hub** broadcasting ticks (`tick`), agent debates (`agent-update`), deep-learning predictions (`lstm-update`, `cnn-update`), and execution feedback (`trade-executed`, `trade-rejected`).
- **ZeroMQ bridge** to the Python engine:
  - `REQ/REP` socket for synchronous analysis requests.
  - `PUSH/PULL` for streaming work.
  - `PUB/SUB` for market-data fan-out.
- **SQLite ledger** for paper trades, signal history and user state.
- **MT5 integration** via `mt5bridge.js` for live order placement.
- **Static fallback** to Yahoo Finance / mock data when upstream feeds are unavailable.

#### Key Endpoints (selection)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/auth/verify` | Validate credentials (returns role + subscription) |
| `GET`  | `/api/auth/check-user` | Google-SSO DB lookup for paid status |
| `GET`  | `/api/market/price/:symbol` | Latest price for a symbol |
| `GET`  | `/api/market/history/:symbol` | OHLCV history |
| `POST` | `/api/agent/analyze` | Trigger MoE analysis for a symbol |
| `GET`  | `/api/sentiment/:symbol` | Latest sentiment reading |
| `GET`  | `/api/deep/lstm/:symbol` | LSTM prediction payload |
| `GET`  | `/api/deep/cnn/:symbol`  | CNN pattern recognition payload |
| `POST` | `/api/paper-trade` | Place a simulated trade |
| `GET`  | `/api/paper-trades` | List paper trades from SQLite |
| `GET`  | `/api/calendar` | Economic calendar (next 24 h) |
| `GET`  | `/api/news` | News headlines |

#### Dependencies

`express ^5.2.1`, `socket.io ^4.8.3`, `socket.io-client ^4.8.3`, `sqlite3 ^5.1.7`, `yahoo-finance2 ^3.15.3`, `zeromq ^6.5.0`, `cors ^2.8.5`.

---

## 4. Python Engine

The engine is the analytical brain of Fx-analyzer. It is a collection of asynchronous Python modules that take a symbol and return a structured trade idea.

### 4.1 Top-Level Orchestration

| Module | File | Responsibility |
| ------ | ---- | -------------- |
| `Engine` (`run.py`) | n/a (per `docs/Project_Structure.md`) | Boots agents, RAG, DL pipeline and starts the ZMQ bridge. |
| `EngineOrchestrator` | `engine/orchestrator.py` | High-level façade that the engine exposes to the gateway: receives an `analysis` request, fans it out to the relevant sub-systems, and stitches the result together. |
| `AgentAnalysisBridge` | `engine/agent_bridge.py` | Standardises communication between the gateway and the LLM agents, including LLM-routing, prompt assembly and response parsing. |
| `AnalysisRequest` / `AnalysisResponse` | (dataclasses) | Pydantic-style envelopes shared with the Node.js gateway. |

### 4.2 Agent Layer — `engine/agents/`

Each agent is an LLM-powered expert with a single domain. They share a base contract in `engine/agents/base.py`:

```python
class BaseAgent(abc.ABC):
    name: str
    role: str

    @abc.abstractmethod
    async def analyze(self, context: dict) -> dict: ...
```

#### Concrete Agents

| Agent | File | Backbone (per `config/models.json`) | Output |
| ----- | ---- | ------------------------------------ | ------ |
| `TechnicalExpert` | `engine/agents/technical.py` | `openrouter:google/gemma-4-26b-a4b-it:free` | RSI/MACD/MA signal + confidence |
| `FundamentalExpert` (`MacroStrategist`) | `engine/agents/fundamental.py` | `openrouter:google/gemma-4-31b-it:free` | Macro bias from FRED + news |
| `SentimentExpert` | `engine/agents/sentiment.py` | `openrouter:meta-llama/llama-3.3-70b-instruct:free` | Bullish / bearish / neutral |
| `RiskManager` (`RiskGuardian`) | `engine/agents/risk.py` | `openrouter:qwen/qwen3-next-80b-a3b-instruct:free` | Position-size cap, R/R veto |
| `Orchestrator` | (routing in `agent_bridge.py`) | `openrouter:google/gemma-4-26b-a4b-it:free` | Final consensus + trade plan |

Each `*.py` file implements `analyze()` by:
1. Gathering domain inputs (price history, news, calendar, RAG context).
2. Rendering a templated prompt with the LLM model name from `config/models.json`.
3. Calling the OpenRouter API via `llm_analyzer.py`.
4. Returning a structured dict (`{signal, confidence, reasoning, evidence}`).

### 4.3 LLM Client — `engine/llm_analyzer.py`

- Thin async wrapper over the OpenRouter `/chat/completions` API.
- Reads `OPENROUTER_API_KEY` from env, supports per-agent model override from `config/models.json`.
- Implements retry with exponential backoff and a token-usage estimator.

### 4.4 Data Feed — `engine/data_feed.py`

- Normalises yfinance / Alpha Vantage / Yahoo responses into a single `MarketSnapshot` dataclass.
- Provides candle aggregation (`1m`, `5m`, `15m`, `1h`, `1d`).
- Pushed over a ZMQ `PUB` socket; cached for 30 s to avoid rate-limits.

### 4.5 Executor — `engine/executor.py`

- Routes orders to either the **paper engine** (in-memory ledger persisted via `database.py`) or the **MT5 bridge** (live execution).
- Enforces risk limits from `config/risk_limits.json`: max position size, max daily loss, leverage cap.
- Emits execution events that the Node.js gateway forwards to the UI.

### 4.6 Database — `engine/database.py`

- Wraps SQLite for sessions, signals, executed trades and audit logs.
- Used by both the engine (long-term memory) and the Node.js gateway (paper-trade ledger).
- Schema highlights: `signals`, `trades`, `agent_runs`, `users`, `subscriptions`.

### 4.7 Economic Calendar — `engine/calendar_service.py`

- Pulls upcoming high-impact economic events (NFP, CPI, FOMC).
- Used by the Fundamental agent and surfaced on the dashboard’s calendar widget.

### 4.8 Agent Memory — `engine/memory.py`

- Persistent memory store keyed by `(agent_name, symbol)` for cross-session context (recent signals, lessons learned).
- Backed by SQLite (durable) with an in-process LRU hot cache.

### 4.9 Vibe Research — `engine/vibe_research_service.py`

- Higher-level "research synthesis" service used by the homepage research terminal.
- Combines RAG retrieval + LLM summarisation to produce plain-language briefings on a symbol.

### 4.10 RAG Pipeline — `engine/rag/`

- `loader.py` — Splits local files (e.g. `data/research/fed_minutes.txt`) and the docs in `docs/` into chunks and stores them in a FAISS index.
- `rss_loader.py` — Periodically ingests RSS feeds (Reuters, FXStreet, etc.) and refreshes the index.
- Exposes `retriever.query(query, k=5)` used by the orchestrator to ground agent prompts.

### 4.11 Deep Learning Pipeline — `engine/deep/`

A plug-in DL layer that follows the same async contract for every agent.

| Sub-package | Purpose |
| ----------- | ------- |
| `engine/deep/base.py` | `DeepAgent` ABC with `load()` and `analyze()` hooks — see `docs/Deep_Learning_Pipeline.md`. |
| `engine/deep/data/pipeline.py` | `MultiModalDataPipeline` and `FeatureStore` (TTL cache). Fetches yfinance OHLCV, Alpha Vantage technicals (SMA, EMA, RSI, MACD, BBands), and alternative data (Fear & Greed, Google Trends, FRED macro). |
| `engine/deep/models/lstm_agent.py` | PyTorch LSTM forecaster: predicts the next-day close and emits `{report, confidence, signal, price_target, features}`. |
| `engine/deep/models/cnn_agent.py` | 1-D CNN that classifies 120-bar chart patterns and emits `{pattern, confidence, signal, rule_patterns}`. |
| `engine/deep/sentiment/analyzer.py` + `scraper.py` | Scraper pulls social/news text; analyzer runs a transformer sentiment model. |

All deep agents share the `DeepAgent` lifecycle (`load → analyze`) and are wired into the MoE consensus via `AgentAnalysisBridge`.

### 4.12 Trading-Agents Workflow — `engine/trading_agents/`

A LangGraph-style multi-agent orchestration inspired by Tauric's `trading_agents` framework.

- `workflow_orchestrator.py` — Defines the bull/bear/researcher debate graph and risk-approval gate.
- `agent_states.py` — Typed `AgentState` schema (market report, bull/bear arguments, risk decision).
- `mcp_config.json` — Model Context Protocol configuration (which tools each agent may call).
- Output: a `TradeDecision` consumed by `executor.py`.

### 4.13 Engine ↔ Gateway Bridge — `engine/bridge.py`

- Long-running ZMQ server using the `REQ/REP` pattern.
- Receives `AnalysisRequest` envelopes, dispatches to `EngineOrchestrator`, returns JSON responses.
- Independent of the Socket.IO layer — the Node.js gateway translates between the two.

---

## 5. Frontend (Next.js Dashboard)

### 5.1 Application Shell

| File | Purpose |
| ---- | ------- |
| `frontend/src/app/layout.js` | Root layout, fonts, `Providers` wrapper, global CSS imports. |
| `frontend/src/app/(main)/layout.js` | Authenticated layout: top nav, side nav, ticker bar. |
| `frontend/src/middleware.js` | Next.js middleware that protects authenticated routes via NextAuth JWT. |
| `frontend/src/components/Providers.jsx` | Composes `SessionProvider`, Zustand hydration, socket provider, theme provider. |
| `frontend/src/app/page.js` | Public landing page with hero, pricing and feature marketing. |
| `frontend/src/app/(main)/dashboard/page.js` | Main trading dashboard (chart, ticker, signal cards, trade panel). |
| `frontend/src/app/(main)/agents/page.js` | Agent arena — MoE consensus debate timeline. |
| `frontend/src/app/(main)/autotrade/page.js` | Auto-trade policy configuration. |
| `frontend/src/app/(main)/history/page.js` | Trade history & track-record ledger. |
| `frontend/src/app/(main)/settings/page.js` | User preferences, model selection, broker settings. |
| `frontend/src/app/login/page.js` | Login page (Google + credentials + demo mode). |
| `frontend/src/app/api/auth/[...nextauth]/route.js` | NextAuth handler with Google + Credentials providers and DB-backed role mapping. |

### 5.2 UI Components — `frontend/src/components/`

The component library follows a "glass + neon" design system driven by CSS custom properties (`--acid-lime`, `--hyper-red`, `--neon-emerald`, `--neon-ruby`).

#### Core Components

| Component | Purpose |
| --------- | ------- |
| `DashboardMain.jsx` | Top-level dashboard orchestrator; composes chart, ticker, signal cards, panels. |
| `CandlestickChart.jsx` / `CandlestickChartEnhanced.jsx` | Lightweight-Charts powered OHLCV chart with overlays. |
| `TickerBar.jsx` | Scrolling symbol ticker with live price. |
| `TradePanel.jsx` | Manual BUY/SELL execution: lot, SL, TP, risk gauge, paper/live toggle. |
| `SignalCard.jsx` | Card showing latest MoE signal with confidence and reasoning snippet. |
| `AIAnalystCard` | Per-agent signal card (Technical, Macro, Sentiment, Risk). |
| `StatsCard.jsx` | KPI tiles (PnL, win-rate, drawdown). |
| `PairSelector.jsx` | Symbol switcher (forex, crypto, indices). |
| `ModelSelector.jsx` | Lets the user pick a per-agent LLM override. |
| `EconomicCalendar.jsx` | Upcoming high-impact events. |
| `TradeListPanel.jsx` | Open + closed trades table. |
| `PaperTradingDashboard.jsx` | Account equity, P/L curve, position manager. |
| `AutoTradeSettings.jsx` | Configure auto-trade rules (entry, exit, risk caps). |
| `VibeResearchTerminal.jsx` | Research terminal that calls the vibe research service. |
| `DeepLearningPanel.jsx` | Tabbed LSTM / CNN visualisation. |
| `FeatureImportanceChart.jsx` | LSTM feature-importance bar chart. |
| `PatternDisplayCard.jsx` | CNN detected chart pattern card. |
| `PatternProbabilityChart.jsx` | CNN pattern probability distribution. |
| `MT5AccountPanel.jsx` | MT5 connection state & account info. |
| `MetricDetailsModal.jsx` | Modal expanding any KPI card. |
| `VerificationBadge.jsx` | Verifies that the LLM call returned a structured result. |
| `HistoryTable.jsx` / `TrackRecordLedger.jsx` | Trade history with filtering. |
| `AnimatedBackground.jsx` / `HeroScene.jsx` | Decorative landing-page visuals. |
| `HydrationSanitizer.js` | Prevents React-hydration mismatches. |
| `ErrorBoundary.jsx` | Global error boundary. |
| `TradingModeToggle.jsx` | Switches between paper and live trading globally. |
| `AIRecommender.jsx` | Quick-trade recommender card. |

#### Agent Arena — `frontend/src/components/agent-arena/`

Specialised components for the multi-agent debate view:

| Component | Purpose |
| --------- | ------- |
| `AgentCardNew.jsx` | Updated per-agent card with MoE colouring. |
| `ParallelAnalystsGrid.jsx` | Side-by-side expert cards. |
| `BullBearDebate.jsx` | Bull vs. bear argument comparison. |
| `DebateTimeline.jsx` | Chronological list of debate turns. |
| `MoEEnhanced.jsx` | Mixture-of-Experts consensus view with weighted vote bars. |
| `PhaseIndicator.jsx` | Visualises the current debate phase (analyst → research → debate → risk). |
| `RiskDebatePanel.jsx` | Interactive panel for the risk manager. |
| `TraderDecisionPanel.jsx` | Final trade plan (entry, SL, TP, size). |

### 5.3 State Management — `frontend/src/store/`

Zustand stores keep the UI reactive to streaming data.

| Store | Responsibility |
| ----- | -------------- |
| `index.js` | Re-exports all stores. |
| `sessionStore.js` | Mirrors NextAuth session (user, role, subscription). |
| `agentStore.js` | Tracks the four MoE agents’ last analyses, running consensus, and debate history. |
| `analysisStore.js` | Holds the latest analysis breakdown (per-agent + consensus). |
| `tradingStore.js` | Symbol, current price, order form state, paper/live mode. |
| `uiStore.js` | Theme, panel visibility, toast queue, modal state. |

### 5.4 Hooks & Libs — `frontend/src/hooks/`, `frontend/src/lib/`

| Asset | Purpose |
| ----- | ------- |
| `hooks/useSocket.js` | Connects to Socket.IO and returns `{ socket, connected, lastEvent }`. |
| `lib/socketEventBus.js` | Lightweight event bus decoupling components from raw socket events. |
| `lib/paperTrading.js` | Front-end paper trading helper (mirrors backend paper semantics, used for instant UI feedback). |
| `lib/AlertService.js` | Browser-side notifications (sound + push) for fills and alerts. |
| `lib/theme.js` | Centralised theme tokens. |

### 5.5 Authentication Flow

`api/auth/[...nextauth]/route.js` configures:

1. **GoogleProvider** — only emails pre-registered in the DB (or owner allowlist) are accepted; others are redirected to `/#pricing`.
2. **CredentialsProvider** — posts to `BACKEND_URL/api/auth/verify`; falls back to in-file demo users when `DEMO_MODE=true` or running against `localhost`.
3. **JWT session** — `jwt` callback injects `role` and `subscription`; `session` callback exposes them on `session.user`.
4. **Middleware** — `frontend/src/middleware.js` gates `(main)` routes and redirects unauthenticated users to `/login`.

---

## 6. Key Classes & Functions Reference

### 6.1 Engine

| Class / Function | File | Description |
| ---------------- | ---- | ----------- |
| `EngineOrchestrator.analyze(symbol, mode)` | `engine/orchestrator.py` | Top-level entry: gathers market data, runs agents + DL, returns consensus. |
| `BaseAgent.analyze(context)` | `engine/agents/base.py` | Abstract — implemented by each expert. |
| `AgentAnalysisBridge.dispatch(req)` | `engine/agent_bridge.py` | Routes a request to the right agent(s), handles LLM calls, normalises responses. |
| `LLMAnalyzer.call(messages, model)` | `engine/llm_analyzer.py` | Async OpenRouter client with retry/backoff. |
| `MultiModalDataPipeline.fetch_market_data(symbol, days)` | `engine/deep/data/pipeline.py` | OHLCV + Alpha Vantage technicals → DataFrame. |
| `MultiModalDataPipeline.fetch_alternative_data(symbol)` | `engine/deep/data/pipeline.py` | Fear & Greed, Google Trends, FRED. |
| `FeatureStore.get / set / cached` | `engine/deep/data/pipeline.py` | In-process TTL cache for derived features. |
| `DeepAgent.load()` / `analyze()` | `engine/deep/base.py` | Standard DL-agent lifecycle. |
| `LSTMAgent.analyze()` | `engine/deep/models/lstm_agent.py` | Returns `{signal, confidence, price_target, features, report}`. |
| `CNNAgent.analyze()` | `engine/deep/models/cnn_agent.py` | Returns `{pattern, confidence, signal, rule_patterns, report}`. |
| `Executor.execute(order, account)` | `engine/executor.py` | Routes to paper or MT5 with risk checks. |
| `Database.insert_signal / insert_trade` | `engine/database.py` | SQLite persistence. |
| `CalendarService.upcoming(hours=24)` | `engine/calendar_service.py` | Returns economic events. |
| `Memory.remember(key, value)` | `engine/memory.py` | Long-term agent memory writes. |
| `RAGRetriever.query(text, k=5)` | `engine/rag/loader.py` | FAISS similarity search. |

### 6.2 Backend

| Function | Description |
| -------- | ----------- |
| `bootstrap()` (IIFE) | Initialises Express, Socket.IO, SQLite, ZMQ sockets, and starts the symbol poller. |
| `analyzeSymbol(symbol, mode)` | POST `/api/agent/analyze` — sends ZMQ request to engine, returns result. |
| `broadcast(channel, payload)` | Socket.IO fan-out helper. |
| `persistTrade(trade)` | SQLite paper-trade writer. |
| `mt5Send(order)` | Live order dispatch (best-effort, with fallback). |
| `requireAuth(req, res, next)` | API-key + JWT check middleware. |

### 6.3 Frontend

| Function | Description |
| -------- | ----------- |
| `useSocket(url, opts)` | Returns live socket, connection state, and last event. |
| `socketEventBus.emit(event, payload)` | Decouples components from direct socket calls. |
| `useAgentStore()` | Accessor for MoE agent state (Zustand). |
| `useTradingStore()` | Accessor for trading state. |
| `TradePanel.handleExecuteClick()` | Builds a trade payload, hands it to the parent, falls back to `socket.emit('execute-trade')`. |
| `DeepLearningPanel` | Renders LSTM/CNN tabs with signal pills, confidence bars, and feature importance. |
| `AgentDebate` | Grid of per-agent cards with consensus view. |
| `ParallelAnalystsGrid` | 4-column grid of expert cards. |
| `DebateTimeline` | Chronological list of debate turns. |
| `RiskDebatePanel` | Interactive risk-approval panel. |
| `nextAuthConfig.callbacks.jwt / session` | Inject `role`, `subscription` into the session. |

---

## 7. Dependency Graph

```text
backend/server.js
 ├── express               ── HTTP API
 ├── socket.io              ── real-time UI
 ├── socket.io-client       ── inter-service loopback
 ├── sqlite3                ── paper-trade ledger
 ├── yahoo-finance2         ── fallback market data
 └── zeromq                 ── ⇄ engine/bridge.py

engine/bridge.py
 └── EngineOrchestrator
      ├── AgentAnalysisBridge
      │    ├── BaseAgent × 4 (technical, fundamental, sentiment, risk)
      │    │    └── LLMAnalyzer (OpenRouter)
      │    ├── DeepAgent × 2 (LSTM, CNN)
      │    │    └── MultiModalDataPipeline
      │    │         ├── yfinance
      │    │         ├── Alpha Vantage (aiohttp)
      │    │         ├── FRED (aiohttp)
      │    │         ├── pytrends
      │    │         └── alternative.me
      │    ├── RAGRetriever (FAISS)
      │    │    ├── loader.py        (local docs)
      │    │    └── rss_loader.py    (RSS feeds)
      │    ├── Database (sqlite3)
      │    ├── CalendarService
      │    └── Memory
      └── Executor
           ├── paper (in-process ledger)
           └── MT5 bridge (mt5bridge.js)

frontend
 ├── Next.js 15 (App Router)
 ├── Zustand stores
 │    ├── sessionStore    ← next-auth/react
 │    ├── agentStore      ← socket events
 │    ├── analysisStore   ← socket events
 │    ├── tradingStore    ← user input
 │    └── uiStore         ← local UI
 ├── socket.io-client     ← backend server.js
 └── NextAuth
      ├── GoogleProvider  ← backend /api/auth/check-user
      └── CredentialsProvider ← backend /api/auth/verify
```

---

## 8. Data Models

### 8.1 Engine Responses

```jsonc
// AnalysisResponse
{
  "symbol": "EUR/USD",
  "consensus": { "action": "BUY", "confidence": 0.74 },
  "breakdown": {
    "technical":   { "signal": "bullish", "confidence": 0.81, "reasoning": "..." },
    "fundamental": { "signal": "neutral", "confidence": 0.55, "reasoning": "..." },
    "sentiment":   { "signal": "bullish", "confidence": 0.62, "reasoning": "..." },
    "risk":        { "verdict": "approve", "max_size": 0.5, "reasoning": "..." }
  },
  "deep": {
    "lstm": { "signal": "bullish", "confidence": 0.68, "price_target": 1.0925, "features": {...}, "report": "..." },
    "cnn":  { "pattern": "ascending_triangle", "confidence": 0.71, "signal": "bullish", "rule_patterns": [...], "report": "..." }
  },
  "timestamp": "2026-07-01T12:00:00Z"
}
```

### 8.2 Trade Order

```jsonc
{
  "symbol": "EUR/USD",
  "action": "BUY",
  "volume": 0.10,
  "price": 1.08650,
  "sl": 1.08450,
  "tp": 1.09050,
  "timestamp": "2026-07-01T12:00:00Z",
  "mode": "paper" | "live"
}
```

### 8.3 SQLite Tables (subset)

- `users(id, email, role, subscription, created_at)`
- `signals(id, symbol, payload, created_at)`
- `trades(id, user_id, symbol, action, volume, price, sl, tp, mode, status, created_at)`
- `agent_runs(id, agent, symbol, payload, latency_ms, created_at)`
- `memory_entries(agent, symbol, key, value, created_at)`

### 8.4 `config/models.json`

```jsonc
{
  "TechnicalExpert":  "openrouter:google/gemma-4-26b-a4b-it:free",
  "FundamentalExpert":"openrouter:google/gemma-4-31b-it:free",
  "SentimentExpert":  "openrouter:meta-llama/llama-3.3-70b-instruct:free",
  "RiskManager":      "openrouter:qwen/qwen3-next-80b-a3b-instruct:free",
  "Orchestrator":     "openrouter:google/gemma-4-26b-a4b-it:free"
}
```

---

## 9. Running the Project

### 9.1 Prerequisites

- **Node.js 18+** (for backend and frontend).
- **Python 3.11** (for the engine).
- `pip` and `npm` package managers.
- A valid **OpenRouter API key**.
- Optional API keys: `ALPHA_VANTAGE_KEY`, `FRED_API_KEY`, `QUANDL_KEY`.
- **ZeroMQ** libs installed on the system (`brew install zeromq` / `apt install libzmq3-dev`).

### 9.2 Environment Variables

Copy `.env.example` to `.env` in the project root and in `frontend/`:

| Variable | Used by | Description |
| -------- | ------- | ----------- |
| `OPENROUTER_API_KEY` | engine | OpenRouter key for LLM calls |
| `ALPHA_VANTAGE_KEY` | engine/deep | Optional technical indicators |
| `FRED_API_KEY` | engine/deep | Optional macro data |
| `QUANDL_KEY` | engine/deep | Optional alternative data |
| `API_KEY` | backend | Shared secret for engine ↔ gateway |
| `BACKEND_URL` | frontend | URL of the Node.js gateway (`http://localhost:4000`) |
| `NEXTAUTH_SECRET` | frontend | JWT signing key |
| `NEXTAUTH_URL` | frontend | Public URL of the dashboard |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | frontend | Google OAuth credentials |
| `MT5_LOGIN`, `MT5_PASSWORD`, `MT5_SERVER` | backend | Live broker account |
| `DEMO_MODE` | frontend | `true` enables in-file demo users |

### 9.3 Local Development

```bash
# 1. Install dependencies
npm install                       # root (orchestrates both)
cd backend && npm install         # backend
cd ../engine && pip install -r requirements.txt
cd ../frontend && npm install     # frontend

# 2. Start the engine
cd engine
python bridge.py                  # starts ZMQ REP server

# 3. Start the gateway
cd backend
npm start                         # Express + Socket.IO on :4000

# 4. Start the dashboard
cd frontend
npm run dev                       # Next.js on :3000

# Alternative: use the convenience launcher
./start_dev.sh
```

`start_dev.sh` boots all three processes concurrently using `concurrently` and pipes logs to `./logs/`.

### 9.4 Production (Render)

`render.yaml` declares two web services:

1. **`fx-backend`** — Node.js gateway, root `backend/`, build `npm install`, start `npm start`.
2. **`fx-frontend`** — Next.js dashboard, root `frontend/`, build `npm install && npm run build`, start `npm start`.

Set the env vars listed in §9.2 in the Render dashboard. The engine can be deployed as a Render **background worker** (`python bridge.py`) or run on any VM reachable over ZMQ from the backend.

### 9.5 Testing the Stack

- Visit `http://localhost:3000` and log in (use `trader@fx.com` / `demo1234` in demo mode).
- Open the dashboard, pick a symbol, click **Analyze**. The agent cards animate as the engine streams `agent-update` events.
- The **Trade Panel** is wired to a paper-trade endpoint by default; flip the global `TradingModeToggle` to test live execution (requires MT5 credentials).
- Health check: `GET http://localhost:4000/api/health` should return `{ "status": "ok" }`.

---

## 10. Documentation Index

The repository ships with detailed Markdown documentation in `docs/`:

| File | Topic |
| ---- | ----- |
| `docs/PRD.md` | Product Requirements Document |
| `docs/Project_Structure.md` | Authoritative tree of every module |
| `docs/Architecture.md` | System architecture deep-dive |
| `docs/TradingAgents_Integration.md` | How Tauric's `trading_agents` is integrated |
| `docs/LLM_Strategy.md` | LLM routing, prompts, fallbacks |
| `docs/MoE_Workflow.md` | Mixture-of-Experts debate protocol |
| `docs/Deep_Learning_Pipeline.md` | DL pipeline lifecycle |
| `docs/User_Guide.md` | End-user manual |

---

## 11. Glossary

- **MoE** — Mixture of Experts: a panel of specialised agents that vote / debate before producing a final decision.
- **RAG** — Retrieval-Augmented Generation: grounding LLM responses in retrieved documents.
- **ZMQ** — ZeroMQ messaging library used for in-process / cross-process pub/sub.
- **MT5** — MetaTrader 5, retail FX/CFD platform used for live execution.
- **LSTM / CNN** — Long Short-Term Memory (sequence) and Convolutional Neural Network (pattern) deep-learning architectures.
- **NextAuth** — Authentication library for Next.js, supporting OAuth + credentials.
- **Socket.IO** — Bidirectional event-based real-time transport for the dashboard.
