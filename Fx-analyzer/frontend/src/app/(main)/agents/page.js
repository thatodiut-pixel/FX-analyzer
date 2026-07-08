'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Users,
  LayoutGrid,
  MessageSquare,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import DebateTimeline from '@/components/agent-arena/DebateTimeline';
import MoEEnhanced from '@/components/agent-arena/MoEEnhanced';

const VIEWS = [
  { id: 'langgraph', label: 'LangGraph Debate', icon: Users },
  { id: 'moe', label: 'MoE Consensus', icon: LayoutGrid },
];

// Mock LangGraph debate state matching the agent_bridge.py output format
const MOCK_DEBATE_STATE = {
  phase: 2,
  currentAgent: 'bull_researcher',
  round: 1,
  maxRounds: 3,
  company_overview_report: 'Apple Inc. (AAPL) is a leading technology company with strong fundamentals, growing services revenue, and dominant position in premium hardware.',
  market_report: 'Markets are currently bullish with strong tech momentum. S&P 500 up 12% YTD.',
  sentiment_report: 'RISK_ON — Market sentiment positive with improving macro indicators.',
  news_report: 'Recent product launch positive. AI strategy well-received by analysts.',
  fundamentals_report: 'Revenue growth 5% YoY. Strong cash position of $180B. P/E ratio ~30.',
  shareholder_report: 'Institutional ownership 62%. Buyback program active.',
  product_report: 'iPhone 16 launch strong. Services revenue growing at 15%. AI integration expanding.',
  investment_debate_state: {
    debate_history: [
      { speaker: 'Bull', round: 1, argument: 'Apple services revenue growth and AI integration create significant upside. Strong brand loyalty drives recurring revenue.' },
      { speaker: 'Bear', round: 1, argument: 'Premium valuation leaves little room for error. China competition and regulatory risks are underappreciated.' },
    ],
    rounds_completed: 1,
    max_debate_rounds: 3,
  },
  trader_investment_plan: {
    action: 'BUY',
    reasoning: 'Strong fundamentals + positive momentum + reasonable valuation after pullback',
    lotSize: 0.5,
  },
  risk_debate_state: {
    risk_debate: [
      { speaker: 'Aggressive', round: 1, riskAnalysis: 'Low VIX environment supports leveraged position. Max leverage 50:1 manageable.', maxLeverage: 50 },
      { speaker: 'Safe', round: 1, riskAnalysis: 'Use conservative 20:1 leverage. Set wide stops to avoid noise-induced exits.', maxLeverage: 20 },
      { speaker: 'Neutral', round: 1, riskAnalysis: 'Moderate 30:1 leverage appropriate given current volatility regime.', maxLeverage: 30 },
    ],
    risk_rounds_completed: 1,
    max_risk_debate_rounds: 2,
  },
  riskManagerDecision: {
    regime: 'LOW_VOL',
    maxLeverage: 30,
    stopLossAdvice: 'Standard ATR-based stop at 1.5x',
  },
  agent_execution_history: [
    'Company Overview Analyst completed',
    'Market Analyst completed',
    'Sentiment Analyst completed',
    'Bull/Bear Debate Round 1 completed',
  ],
};

// Mock MoE consensus data
const MOCK_MOE = {
  technical: { signal: 'buy', confidence: 0.78, reasoning: 'RSI oversold bounce + bullish MACD crossover. Price above 50-EMA on H1.' },
  fundamental: { signal: 'buy', confidence: 0.65, reasoning: 'NFP data positive for USD. Interest rate differential favorable.' },
  sentiment: { signal: 'neutral', confidence: 0.52, reasoning: 'Mixed sentiment across news sources. Risk-on bias for tech sector.' },
  risk: { signal: 'sell', confidence: 0.45, reasoning: 'ATR elevated. High impact FOMC minutes expected in 2 hours.' },
};

export default function AgentsPage() {
  const [activeView, setActiveView] = useState('langgraph');
  const ActiveIcon = VIEWS.find(v => v.id === activeView)?.icon || Bot;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 242, 255, 0.1)',
              border: '1px solid rgba(0, 242, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={22} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Agent Arena</h1>
            <p className="text-sm text-white/40 font-mono">
              LangGraph committee debate · MoE consensus engine
            </p>
          </div>
        </div>
      </motion.div>

      {/* View Switcher */}
      <div
        className="flex gap-1 p-1 rounded-lg"
        style={{
          background: 'var(--bg-deep)',
          border: '1px solid var(--border-subtle)',
          maxWidth: '320px',
        }}
      >
        {VIEWS.map(view => {
          const ViewIcon = view.icon;
          const isActive = activeView === view.id;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-display font-bold transition-all"
              style={{
                background: isActive ? 'var(--bg-void)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                border: isActive ? '1px solid var(--border-default)' : '1px solid transparent',
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <ViewIcon size={16} />
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence mode="wait">
          {activeView === 'langgraph' ? (
            <DebateTimeline debateState={MOCK_DEBATE_STATE} />
          ) : (
            <MoEEnhanced moeData={MOCK_MOE} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
