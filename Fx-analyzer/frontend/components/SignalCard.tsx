'use client';

import { motion } from 'framer-motion';
import { Signal } from '@/lib/socket';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  MinusCircle,
  Zap,
  Clock,
  Shield
} from 'lucide-react';
import { AgentBreakdown } from './AgentBreakdown';

interface SignalCardProps {
  signal: Signal;
  onExecute: (signal: Signal) => void;
}

export function SignalCard({ signal, onExecute }: SignalCardProps) {
  const isLive = Date.now() - new Date(signal.timestamp).getTime() < 60000;
  
  const actionConfig = {
    BUY: {
      icon: ArrowUpCircle,
      color: 'var(--emerald)',
      glow: 'glow-emerald',
      bgClass: 'bg-emerald-500/10 border-emerald-500/30',
      label: 'BUY',
    },
    SELL: {
      icon: ArrowDownCircle,
      color: 'var(--ruby)',
      glow: 'glow-ruby',
      bgClass: 'bg-red-500/10 border-red-500/30',
      label: 'SELL',
    },
    HOLD: {
      icon: MinusCircle,
      color: 'var(--gold)',
      glow: 'glow-gold',
      bgClass: 'bg-amber-500/10 border-amber-500/30',
      label: 'HOLD',
    },
  };

  const config = actionConfig[signal.action];
  const Icon = config.icon;
  const confidencePercent = Math.round(signal.confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`card relative overflow-hidden ${isLive ? 'card-glow' : ''}`}
    >
      {/* Live Indicator */}
      {isLive && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--emerald)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--emerald)]"></span>
          </span>
          <span className="text-[10px] uppercase tracking-wider text-[var(--emerald)] font-semibold">
            Live
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            {signal.symbol}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[var(--text-muted)] text-xs">
            <Clock className="w-3 h-3" />
            {new Date(signal.timestamp).toLocaleTimeString()}
          </div>
        </div>
        
        <div 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgClass}`}
          style={{ color: config.color }}
        >
          <Icon className="w-4 h-4" />
          <span className="font-bold text-sm">{config.label}</span>
        </div>
      </div>

      {/* Price & Confidence */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Price</span>
          <p className="font-mono text-lg font-semibold text-[var(--text-primary)]">
            {typeof signal.price === 'number' ? signal.price.toFixed(5) : signal.price}
          </p>
        </div>
        <div>
          <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Confidence</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidencePercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ 
                  backgroundColor: config.color,
                  boxShadow: `0 0 10px ${config.color}40`
                }}
              />
            </div>
            <span className="font-mono text-sm font-semibold" style={{ color: config.color }}>
              {confidencePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-4">
        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Analysis</span>
        <p className="text-[var(--text-secondary)] text-sm mt-1 line-clamp-2">
          {signal.reasoning}
        </p>
      </div>

      {/* Risk Parameters */}
      {signal.risk_parameters && (
        <div className="flex items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <Zap className="w-3 h-3 text-[var(--gold)]" />
            <span>Leverage: <span className="text-[var(--text-secondary)]">{signal.risk_parameters.leverage}x</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <Shield className="w-3 h-3 text-[var(--cyan)]" />
            <span>SL: <span className="text-[var(--text-secondary)]">{signal.risk_parameters.stop_loss}</span></span>
          </div>
        </div>
      )}

      {/* Execute Button */}
      {signal.action !== 'HOLD' && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onExecute(signal)}
          className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${config.bgClass} border-2 hover:brightness-110`}
          style={{ color: config.color }}
        >
          Execute {config.label} Order
        </motion.button>
      )}

      {/* Agent Breakdown (expandable) */}
      <AgentBreakdown signal={signal} />
    </motion.div>
  );
}
