'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trade } from '@/lib/socket';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface TradeHistoryProps {
  trades: Trade[];
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  if (trades.length === 0) {
    return (
      <div className="card h-full flex items-center justify-center text-[var(--text-muted)]">
        <p>No trades executed yet</p>
      </div>
    );
  }

  return (
    <div className="card h-full overflow-hidden flex flex-col">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-[var(--cyan)]" />
        Trade History
      </h3>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence mode="popLayout">
          {trades.slice(0, 20).map((trade, index) => (
            <motion.div
              key={trade.id || `${trade.symbol}-${trade.executedAt}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    trade.action === 'BUY'
                      ? 'bg-emerald-500/10'
                      : 'bg-red-500/10'
                  }`}
                >
                  {trade.action === 'BUY' ? (
                    <ArrowUpRight className="w-4 h-4 text-[var(--emerald)]" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-[var(--ruby)]" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {trade.symbol}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(trade.executedAt || trade.timestamp || Date.now()).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-mono text-sm text-[var(--text-secondary)]">
                  @ {typeof trade.price === 'number' ? trade.price.toFixed(5) : trade.entry_price?.toFixed(5) || trade.price}
                </p>
                <p
                  className={`font-mono text-sm font-semibold ${
                    (trade.pl || 0) >= 0
                      ? 'text-[var(--emerald)]'
                      : 'text-[var(--ruby)]'
                  }`}
                >
                  {(trade.pl || 0) >= 0 ? '+' : ''}${(trade.pl || 0).toFixed(2)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
