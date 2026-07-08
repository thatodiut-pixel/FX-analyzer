'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RiskSettings } from '@/lib/socket';
import { Shield, AlertTriangle, Power, Settings } from 'lucide-react';

interface RiskShieldProps {
  settings: RiskSettings;
  onUpdate: (settings: Partial<RiskSettings>) => void;
}

export function RiskShield({ settings, onUpdate }: RiskShieldProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${settings.tradingEnabled ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <Shield 
              className={`w-5 h-5 ${settings.tradingEnabled ? 'text-[var(--emerald)]' : 'text-[var(--ruby)]'}`} 
            />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Risk Shield</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {settings.tradingEnabled ? 'Trading Enabled' : 'Trading Disabled'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <Settings className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
          <button
            onClick={() => onUpdate({ tradingEnabled: !settings.tradingEnabled })}
            className={`p-2 rounded-lg transition-all ${
              settings.tradingEnabled 
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30' 
                : 'bg-red-500/20 hover:bg-red-500/30'
            }`}
          >
            <Power 
              className={`w-4 h-4 ${settings.tradingEnabled ? 'text-[var(--emerald)]' : 'text-[var(--ruby)]'}`} 
            />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
          <p className="text-xs text-[var(--text-muted)]">Max Drawdown</p>
          <p className="font-mono text-sm font-semibold text-[var(--ruby)]">
            ${settings.maxDailyDrawdown}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
          <p className="text-xs text-[var(--text-muted)]">Max Positions</p>
          <p className="font-mono text-sm font-semibold text-[var(--gold)]">
            {settings.maxOpenPositions}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
          <p className="text-xs text-[var(--text-muted)]">Risk/Trade</p>
          <p className="font-mono text-sm font-semibold text-[var(--cyan)]">
            {settings.maxRiskPerTrade}%
          </p>
        </div>
      </div>

      {/* Expanded Settings */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] space-y-4">
          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Max Daily Drawdown ($)
            </label>
            <input
              type="number"
              value={settings.maxDailyDrawdown}
              onChange={(e) => onUpdate({ maxDailyDrawdown: parseInt(e.target.value) || 0 })}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--cyan)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Max Open Positions
            </label>
            <input
              type="number"
              value={settings.maxOpenPositions}
              onChange={(e) => onUpdate({ maxOpenPositions: parseInt(e.target.value) || 0 })}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--cyan)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Max Risk Per Trade (%)
            </label>
            <input
              type="number"
              value={settings.maxRiskPerTrade}
              onChange={(e) => onUpdate({ maxRiskPerTrade: parseInt(e.target.value) || 0 })}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--cyan)]"
            />
          </div>
        </div>
      </motion.div>

      {/* Warning */}
      {!settings.tradingEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
        >
          <AlertTriangle className="w-4 h-4 text-[var(--gold)]" />
          <p className="text-xs text-[var(--gold)]">
            Trading is disabled. No orders will be executed.
          </p>
        </motion.div>
      )}
    </div>
  );
}
