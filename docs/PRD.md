# PRD: FX Analyzer Pro

## Goal Description
A high-performance Forex analysis application designed to provide accurate signals and precise order placement for MetaTrader 5 (MT5). The app bridges the gap between complex analysis and seamless execution using **Mixture of Experts AI** architecture.

## System Requirements
- **Real-time Data Processing:** Low-latency streaming of FX pair data via WebSocket and ZeroMQ
- **Signal Accuracy:** Multi-indicator technical analysis combined with **LLM-powered sentiment and pattern reasoning**
- **Free Institutional Grade Analysis:** Leveraging Google Gemini Flash (free tier) for high-context market reasoning
- **Order Precision:** Direct integration with MT5 for millisecond-accurate execution via ZeroMQ bridge
- **User Interface:** Premium, futuristic dashboard with dynamic charts, real-time alerts, and 3D visualizations

## Tech Stack
- **Frontend:** Next.js 16, TailwindCSS 4, Framer Motion, Three.js, Zustand, Socket.IO Client
- **Backend:** Node.js, Express, Socket.IO Server, SQLite, JWT Auth
- **Engine:** Python 3.11+, Google Gemini API, ZeroMQ, Pandas, TA-Lib
- **Broker Integration:** MetaTrader 5 Python API via ZeroMQ bridge
- **CI/CD:** GitHub Actions, GitHub Pages, Vercel, Render

## Architecture
```
Frontend (Next.js 16) ↔ Socket.IO ↔ Backend (Node.js/Express)
                                       ↕ ZeroMQ
                                  Engine (Python)
                                  ↕ MT5 API
                              MetaTrader 5 Terminal
```

## Core Features
1. **Mixture of Experts AI** — 4 specialized LLM agents debate and synthesize trading signals
2. **Real-Time Dashboard** — Interactive candlestick charts, order book, trade panel
3. **Paper Trading** — Risk-free simulation with equity curves and performance metrics
4. **MT5 Integration** — Direct bridge for automated execution
5. **Risk Management** — Drawdown limits, position caps, emergency kill switch
6. **Vibe Research** — AI-powered market research assistant
7. **Deep Learning Agents** — CNN/LSTM model-based pattern recognition

## Roadmap
1. **Foundation** — Next.js 16 setup, Python engine, ZeroMQ bridge
2. **Analysis** — Technical/ML indicators, LLM sentiment, agent debate system
3. **Connectivity** — MT5 integration, Paper trading engine
4. **UI** — Premium "Deep Neo" dashboard with 3D scenes
5. **Production** — CI/CD pipelines, GitHub Pages, Vercel deployment, Render backend
6. **Advanced** — Deep learning agents, multi-timeframe analysis, portfolio optimization

## Success Metrics
- Signal accuracy > 65% verified against historical data
- WebSocket latency < 100ms
- MT5 execution latency < 500ms
- System uptime > 99.9%
