import asyncio
import logging
import json
import os

try:
    from engine.agents.technical import TechnicalAgent
    from engine.agents.fundamental import FundamentalAgent
    from engine.agents.sentiment import SentimentAgent
    from engine.agents.risk import RiskAgent
    from engine.rag.loader import RAGLoader
    from engine.rag.rss_loader import RSSLoader
    from engine.analyzer import TechnicalAnalyzer
    from engine.memory import MemoryService
except ImportError:
    from agents.technical import TechnicalAgent
    from agents.fundamental import FundamentalAgent
    from agents.sentiment import SentimentAgent
    from agents.risk import RiskAgent
    from rag.loader import RAGLoader
    from rag.rss_loader import RSSLoader
    from analyzer import TechnicalAnalyzer
    from memory import MemoryService


class MoEOrchestrator:
    def __init__(self):
        # Load Model Config
        config_path = os.path.join(
            os.path.dirname(__file__), "..", "config", "models.json"
        )
        try:
            with open(config_path, "r") as f:
                self.models = json.load(f)
        except Exception as e:
            logging.warning(f"Could not load models.json: {e}. Using defaults.")
            self.models = {}

        default_tech = "openrouter:google/gemma-4-26b-a4b-it:free"
        default_fund = "openrouter:google/gemma-4-31b-it:free"
        default_sent = "openrouter:meta-llama/llama-3.3-70b-instruct:free"
        default_risk = "openrouter:qwen/qwen3-next-80b-a3b-instruct:free"

        self.tech_agent = TechnicalAgent(
            model_name=self.models.get("TechnicalExpert", default_tech)
        )
        self.fund_agent = FundamentalAgent(
            model_name=self.models.get("FundamentalExpert", default_fund)
        )
        self.sent_agent = SentimentAgent(
            model_name=self.models.get("SentimentExpert", default_sent)
        )
        self.risk_agent = RiskAgent(
            model_name=self.models.get("RiskManager", default_risk)
        )

        self.rag = RAGLoader()
        self.rss = RSSLoader()
        self.analyzer = TechnicalAnalyzer()
        self.memory = MemoryService()

    async def get_consensus_signal(self, symbol: str, df, news: list = None):
        """
        Main entry point. Queries all experts and synthesizes a decision.
        """
        # 0. Fetch External Data if missing
        if not news:
            # Run in thread/executor if blocking, but fetch_news is synchronous requests mostly
            # For now, running sync is okay or we can offload
            news = self.rss.fetch_news()

        # 1. Prepare Data
        df = self.analyzer.analyze(df)
        tech_data = self.analyzer.get_technical_summary(df, symbol)
        macro_context = self.rag.get_summary_context()
        memory_context = self.memory.get_recent_performance(symbol)

        # 2. Parallel Agent Calls
        results = await asyncio.gather(
            self.tech_agent.analyze(tech_data),
            self.fund_agent.analyze(macro_context),
            self.sent_agent.analyze(news),
            self.risk_agent.analyze(
                {
                    "atr": tech_data.get("atr"),
                    "price_action_desc": tech_data.get("trend"),
                }
            ),
        )

        tech_res, fund_res, sent_res, risk_res = results

        # 3. Fetch Vibe Research Context
        try:
            import database
        except ImportError:
            from engine import database

        vibe_research_list = database.get_latest_vibe_research()
        vibe_context = ""
        if vibe_research_list:
            vibe_context = "\n[Vibe AI Research Backtests]:\n"
            for r in vibe_research_list:
                output_lines = r['output'].split('\n')
                summary_lines = [line for line in output_lines if line.startswith('- ') or line.startswith('**') or 'Return' in line or 'Drawdown' in line][:6]
                vibe_context += f"- Run Type: {r['run_type']}\n  Prompt: {r['prompt']}\n  Status: {r['status']}\n  Key Insights:\n"
                for line in summary_lines:
                    vibe_context += f"    {line}\n"
        else:
            vibe_context = "\n[Vibe AI Research Backtests]: No current background backtests stored in database.\n"

        # 4. Synthesis
        final_decision = await self._synthesize(
            symbol, tech_res, fund_res, sent_res, risk_res, memory_context, vibe_context
        )

        # Attach detailed breakdown for Frontend Visualization
        final_decision["agent_breakdown"] = {
            "technical": tech_res,
            "fundamental": fund_res,
            "sentiment": sent_res,
            "risk": risk_res,
            "memory": memory_context,
            "vibe_research": vibe_research_list[:2] if vibe_research_list else []
        }

        return final_decision

    async def _synthesize(self, symbol, tech, fund, sent, risk, memory, vibe_context=""):
        # Graceful Fallbacks for unavailable/rate-limited agents
        tech = tech or {"signal": "NEUTRAL", "confidence": 0.0, "reasoning": "Offline"}
        fund = fund or {"bias": "NEUTRAL", "confidence": 0.0, "reasoning": "Offline"}
        sent = sent or {"sentiment": "NEUTRAL", "confidence": 0.0, "reasoning": "Offline"}
        risk = risk or {"regime": "NORMAL", "max_leverage": 1, "stop_loss_advice": "Tight"}

        # Regime-Adaptive Weighting (MM-DREX Pattern)
        regime = str(risk.get("regime", "NORMAL")).upper()
        
        weighting_directive = "Weight all experts equally."
        if "HIGH_VOL" in regime:
            weighting_directive = "MARKET REGIME: HIGH VOLATILITY. Heavily overweight the Technical Analyst. Disregard Fundamental long-term bias unless it perfectly aligns with short-term sentiment."
        elif "LOW_VOL" in regime:
            weighting_directive = "MARKET REGIME: RANGING. Overweight Technical mean-reversion signals. Ignore trend continuation signals."
        elif "EXTREME" in regime:
            weighting_directive = "MARKET REGIME: EXTREME VOLATILITY. Heavily overweight the Risk Guardian. Recommend HOLD unless all agents align."

        prompt = f"""
        Act as an Advanced Algorithmic MM-DREX Head Trader. Review the reports from your localized Expert Models AND past performance.

        [Past Performance / Memory]:
        {memory}

        [Vibe AI Research Backtests & Factor Benchmarks]:
        {vibe_context}

        [Technical Analyst]: {tech.get("signal")} ({tech.get("confidence")}) - {tech.get("reasoning")}
        [Macro Strategist]: {fund.get("bias")} ({fund.get("confidence")}) - {fund.get("reasoning")}
        [Sentiment Engine]: {sent.get("sentiment")} ({sent.get("confidence")}) - {sent.get("reasoning")}
        [Risk Management]: Regime is {regime}. Max Leverage {risk.get("max_leverage")}, Advice: {risk.get("stop_loss_advice")}

        [DIRECTIVE]: {weighting_directive}
        
        Task: Make a final deterministic trading decision for {symbol}. Read the Vibe AI Research Backtests & Factor Benchmarks to inform your confidence scale and leverage decisions. For example, if a backtest for the asset shows robust gains, scale up confidence when signal aligns. If drawdown was high, scale down leverage and size. If multiple agents are Offline, drop confidence.
        
        Output EXACT JSON matching this schema:
        {{
            "action": "BUY" | "SELL" | "HOLD",
            "confidence": 0.0 to 1.0,
            "reasoning": "Step-by-step reasoning explaining the regime weighting.",
            "risk_parameters": {{ "leverage": int, "stop_loss": "string pips" }}
        }}
        """

        # We reuse the technical agent's connection for the final synthesis to save resources
        response = None
        try:
            response = await self.tech_agent._call_llm_async(prompt)
        except Exception as e:
            logging.error(f"Synthesizer LLM Call Failed: {e}")

        fallback = {
            "action": "HOLD",
            "confidence": 0.0,
            "reasoning": "Synthesis Failed or Fallback Triggered",
            "risk_parameters": {"leverage": 1, "stop_loss": "N/A"},
        }

        if response:
            return self.tech_agent._clean_json(response) or fallback
        return fallback

    def set_global_model(self, model_name: str):
        """
        Updates the model for all agents.
        """
        logging.info(f"Orchestrator: Switching all agents to {model_name}")

        results = {
            "TechnicalExpert": self.tech_agent.update_model(model_name),
            "FundamentalExpert": self.fund_agent.update_model(model_name),
            "SentimentExpert": self.sent_agent.update_model(model_name),
            "RiskManager": self.risk_agent.update_model(model_name),
        }

        # Update internal config to persist (in memory only for now)
        for key in self.models:
            self.models[key] = model_name

        success_count = sum(results.values())
        return {
            "success": success_count > 0,
            "details": results,
            "message": f"Updated {success_count}/{len(results)} agents to {model_name}",
        }
