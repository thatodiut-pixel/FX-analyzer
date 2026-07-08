import asyncio
import zmq
import zmq.asyncio
import json
import logging
from datetime import datetime
import pandas as pd

# Assuming running from root as python -m engine.bridge or setting PYTHONPATH
try:
    from engine.analyzer import TechnicalAnalyzer
    from engine.executor import MT5Executor
    from engine.orchestrator import MoEOrchestrator
    from engine.data_feed import DataFeed
    from engine.calendar_service import CalendarService
    from engine import database
    from engine.vibe_research_service import VibeResearchService
    from engine.agent_bridge import AgentAnalysisBridge
except ImportError:
    # Fallback for running inside engine/ dir
    from analyzer import TechnicalAnalyzer
    from executor import MT5Executor
    from orchestrator import MoEOrchestrator
    from data_feed import DataFeed
    from calendar_service import CalendarService
    import database
    from vibe_research_service import VibeResearchService
    from agent_bridge import AgentAnalysisBridge

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

# Constants
ZMQ_PORT = 5555
SYMBOLS = [
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "AUDUSD",
    "BTCUSD",
    "ETHUSD",
    "US30",
    "US500",
    "AAPL",
    "TSLA",
]


class AsyncEngineBridge:
    def __init__(self):
        self.context = zmq.asyncio.Context()
        self.socket = self.context.socket(zmq.PUB)
        self.socket.bind(f"tcp://*:{ZMQ_PORT}")
        logging.info(f"ZeroMQ Publisher bound to port {ZMQ_PORT}")

        self.analyzer = TechnicalAnalyzer()
        self.executor = MT5Executor()
        self.moe = MoEOrchestrator()  # Replaces LLMAnalyzer
        self.data_feed = DataFeed()
        self.calendar = CalendarService()
        self.vibe_research = VibeResearchService()
        self.agent_bridge = AgentAnalysisBridge()

        # Initialize Database
        database.init_db()

        # Command Socket (REP)
        self.cmd_socket = self.context.socket(zmq.REP)
        self.cmd_socket.bind("tcp://*:5556")

    async def listen_commands(self):
        """
        Listens for commands from Node.js interface async.
        """
        logging.info("Command Socket (REP) listening on 5556")
        while True:
            try:
                msg = await self.cmd_socket.recv_json()
                cmd = msg.get("cmd")

                response = {"status": "error", "message": "Unknown command"}

                if cmd == "SET_LLM_MODEL":
                    model = msg.get("model")
                    if model:
                        result = self.moe.set_global_model(model)
                        if result["success"]:
                            response = {"status": "ok", "message": result["message"]}
                        else:
                            response = {
                                "status": "error",
                                "message": "Failed to update some agents",
                            }
                    else:
                        response = {"status": "error", "message": "No model specified"}

                elif cmd == "GET_MODELS":
                    # Return all models whose API keys are configured
                    try:
                        from engine.agents.base import BaseAgent
                    except ImportError:
                        from agents.base import BaseAgent
                    configured = BaseAgent.get_configured_models()
                    response = {
                        "status": "ok",
                        "models": configured,
                        "models_list": list(configured.values()),
                    }

                elif cmd == "EXECUTE_TRADE":
                    sys_symbol = msg.get("symbol")
                    sys_action = msg.get("action")
                    sys_volume = msg.get("volume", 0.01)
                    
                    if sys_symbol and sys_action:
                        logging.info(f"Executing MT5 trade: {sys_symbol} {sys_action}")
                        exec_res = self.executor.execute_order(sys_symbol, sys_action, volume=sys_volume)
                        if exec_res["status"] in ["filled", "mock_filled"]:
                            response = {"status": "filled", "ticket": exec_res.get("ticket", 0)}
                        else:
                            response = {"status": "error", "message": exec_res.get("reason", "Execution Failed")}
                    else:
                        response = {"status": "error", "message": "Missing symbol or action"}

                elif cmd == "MT5_STATUS":
                    status = {
                        "connected": getattr(self.executor, 'connected', False),
                        "account": None,
                        "server": None,
                        "balance": 0.0,
                        "equity": 0.0,
                    }
                    # Try to fetch account info if connected
                    if self.executor.connected:
                        try:
                            import MetaTrader5 as mt5
                            account_info = mt5.account_info()
                            if account_info:
                                status["account"] = account_info.login
                                status["server"] = account_info.server
                                status["balance"] = account_info.balance
                                status["equity"] = account_info.equity
                        except Exception:
                            pass
                    response = {"status": "ok", "info": status}

                elif cmd == "ENGINE_AGENT_ANALYZE":
                    query = msg.get("query", "")
                    active_agents = msg.get("active_agents")
                    debate_rounds = msg.get("debate_rounds")
                    risk_rounds = msg.get("risk_rounds")

                    if not query:
                        response = {"status": "error", "message": "No query provided"}
                    else:
                        logging.info(f"Agent analysis requested: {query[:80]}")
                        result = await self.agent_bridge.analyze(
                            query,
                            active_agents=active_agents,
                            debate_rounds=debate_rounds,
                            risk_rounds=risk_rounds,
                        )
                        response = result

                elif cmd == "AGENT_BRIDGE_STATUS":
                    response = {
                        "status": "ok",
                        "initialized": self.agent_bridge.initialized,
                    }

                await self.cmd_socket.send_json(response)

            except Exception as e:
                logging.error(f"Command Error: {e}")

    async def generate_daily_briefing(self):
        """
        Generates a pre-day analysis briefing.
        """
        logging.info("Generating Daily Briefing...")
        briefing_data = self.calendar.get_todays_events()

        scan_results = []
        for symbol in SYMBOLS[:5]:
            df = self.data_feed.fetch_data(symbol)
            analysis = self.analyzer.analyze_daily(df)
            if analysis:
                scan_results.append(
                    {
                        "symbol": symbol,
                        "trend": analysis["trend"],
                        "price": analysis["price"],
                    }
                )

        briefing = {
            "type": "DAILY_BRIEFING",
            "date": briefing_data["date"],
            "events": briefing_data["events"],
            "market_scan": scan_results,
        }

        await self.socket.send_string(f"notification {json.dumps(briefing)}")
        logging.info("Daily Briefing Sent")

    async def run_loop(self):
        logging.info("Engine Bridge Running...")

        # Initial Briefing
        await asyncio.sleep(2)
        await self.generate_daily_briefing()

        try:
            while True:
                for symbol in SYMBOLS:
                    # 1. Fetch
                    df = self.data_feed.fetch_data(symbol)

                    # 2. Analyze Technicals (Fast check first)
                    analyzed_df = self.analyzer.analyze(df)
                    signal = self.analyzer.check_signals(analyzed_df, symbol)

                    # 3. If Signal -> Engage MoE
                    if signal:
                        logging.info(f"Signal Triggered: {symbol} {signal['action']}")

                        # Call MoE Consensus (Async)
                        # We pass 'df' which the TechnicalAgent will re-analyze,
                        # but we could optimize by passing pre-calced data.
                        # For now, following the test_moe pattern:
                        moe_result = await self.moe.get_consensus_signal(
                            symbol, analyzed_df
                        )

                        # Merge Results
                        signal["ai_reasoning"] = moe_result.get("reasoning")
                        signal["agent_breakdown"] = moe_result.get(
                            "agent_breakdown", {}
                        )
                        signal["risk_factors"] = (
                            f"Lev: {moe_result.get('risk_parameters', {}).get('leverage')}x"
                        )
                        signal["confidence"] = moe_result.get("confidence", 0.5)

                        # Re-evaluate Action based on Consensus
                        # If MoE says HOLD/NEUTRAL but Tech said BUY, we might kill the trade
                        # or just downgrade confidence.
                        if moe_result.get("action") == "HOLD":
                            logging.info(f"MoE vetoed {symbol} trade.")
                            continue  # Skip publishing

                        # Store & Publish
                        signal["id"] = int(time.time() * 1000)
                        signal["source"] = "MOE_ENGINE"

                        database.store_signal(signal)
                        logging.info(f"MoE Signal Published: {signal['id']}")

                        await self.socket.send_string(f"signal {json.dumps(signal)}")

                    # 4. Ticker Update
                    current_price = float(df.iloc[-1]["close"])
                    ticker = {
                        "symbol": symbol,
                        "price": current_price,
                        "timestamp": datetime.now().isoformat(),
                    }
                    await self.socket.send_string(f"ticker {json.dumps(ticker)}")

                await asyncio.sleep(2)

        except asyncio.CancelledError:
            logging.info("Loop cancelled")
        finally:
            self.data_feed.shutdown()
            self.executor.shutdown()

    async def main(self):
        # Start agent bridge initialisation in background (non-blocking)
        init_task = asyncio.create_task(self.agent_bridge.initialize())

        # Run Command Listener, Main Loop and Vibe Research background tasks concurrently
        await asyncio.gather(
            self.listen_commands(),
            self.run_loop(),
            self.vibe_research.run_research_tasks(),
            init_task,
        )


if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    bridge = AsyncEngineBridge()
    try:
        asyncio.run(bridge.main())
    except KeyboardInterrupt:
        logging.info("Shutting down...")
