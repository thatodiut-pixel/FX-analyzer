'use client';

import { motion } from 'framer-motion';
import { Signal } from '@/lib/socket';
import { 
  Brain, 
  TrendingUp, 
  Globe, 
  MessageSquare, 
  Shield,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';

interface AgentBreakdownProps {
  signal: Signal;
}

export function AgentBreakdown({ signal }: AgentBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!signal.agent_breakdown) return null;

  const { technical, fundamental, sentiment, risk, memory } = signal.agent_breakdown;

  const agents = [
    {
      name: 'Technical',
      icon: TrendingUp,
      color: 'var(--cyan)',
      signal: technical?.signal || 'N/A',
      confidence: technical?.confidence || 0,
      reasoning: technical?.reasoning || 'No data',
    },
    {
      name: 'Fundamental',
      icon: Globe,
      color: 'var(--emerald)',
      signal: fundamental?.bias || 'N/A',
      confidence: fundamental?.confidence || 0,
      reasoning: fundamental?.reasoning || 'No data',
    },
    {
      name: 'Sentiment',
      icon: MessageSquare,
      color: 'var(--gold)',
      signal: sentiment?.sentiment || 'N/A',
      confidence: sentiment?.confidence || 0,
      reasoning: sentiment?.reasoning || 'No data',
    },
    {
      name: 'Risk',
      icon: Shield,
      color: 'var(--ruby)',
      signal: `${risk?.max_leverage || 1}x Leverage`,
      confidence: 1,
      reasoning: risk?.stop_loss_advice || 'No advice',
    },
  ];

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[var(--cyan)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Agent Analysis Breakdown
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>

      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="pt-3 space-y-3">
          {agents.map((agent, index) => {
            const Icon = agent.icon;
            const confidencePercent = Math.round(agent.confidence * 100);
            
            return (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-lg bg-[var(--bg-tertiary)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: agent.color }} />
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {agent.name}
                    </span>
                  </div>
                  <span 
                    className="text-xs font-mono font-semibold"
                    style={{ color: agent.color }}
                  >
                    {agent.signal}
                  </span>
                </div>
                
                {/* Confidence Bar */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${confidencePercent}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: agent.color }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {confidencePercent}%
                  </span>
                </div>
                
                <p className="text-[10px] text-[var(--text-muted)] line-clamp-2">
                  {agent.reasoning}
                </p>
              </motion.div>
            );
          })}

          {/* Memory Context */}
          {memory && (
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-3.5 h-3.5 text-[var(--cyan)]" />
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  Memory Context
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">
                {memory}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
