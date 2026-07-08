'use client';

import { motion } from 'framer-motion';
import { Stats } from '@/lib/socket';
import { TrendingUp, Target, DollarSign, Percent } from 'lucide-react';

interface StatsPanelProps {
  stats: Stats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const statItems = [
    {
      label: 'Total Trades',
      value: stats.totalTrades.toString(),
      icon: Target,
      color: 'var(--cyan)',
    },
    {
      label: 'Win Rate',
      value: `${stats.winRate}%`,
      icon: Percent,
      color: stats.winRate >= 50 ? 'var(--emerald)' : 'var(--ruby)',
    },
    {
      label: 'Total P/L',
      value: `$${stats.totalProfit}`,
      icon: DollarSign,
      color: parseFloat(stats.totalProfit) >= 0 ? 'var(--emerald)' : 'var(--ruby)',
    },
    {
      label: 'Winning Trades',
      value: stats.winningTrades.toString(),
      icon: TrendingUp,
      color: 'var(--gold)',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card flex items-center gap-4"
          >
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${item.color}15` }}
            >
              <Icon className="w-5 h-5" style={{ color: item.color }} />
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider">
                {item.label}
              </p>
              <p
                className="font-mono text-xl font-bold"
                style={{ color: item.color }}
              >
                {item.value}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
