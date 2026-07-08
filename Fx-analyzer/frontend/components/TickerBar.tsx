'use client';

import { motion } from 'framer-motion';
import { TickerData } from '@/lib/socket';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TickerBarProps {
  data: TickerData[];
}

export function TickerBar({ data }: TickerBarProps) {
  // Duplicate data for seamless scrolling
  const tickerItems = [...data, ...data];

  return (
    <div className="w-full bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] overflow-hidden">
      <div className="flex animate-ticker">
        {tickerItems.map((item, index) => (
          <div
            key={`${item.symbol}-${index}`}
            className="flex items-center gap-3 px-6 py-2 border-r border-[var(--border-subtle)] min-w-fit"
          >
            <span className="text-[var(--text-secondary)] font-medium text-sm">
              {item.symbol}
            </span>
            <span className="font-mono text-[var(--text-primary)] font-semibold">
              {item.price}
            </span>
            <span
              className={`flex items-center gap-1 text-xs font-medium ${
                item.positive ? 'text-[var(--emerald)]' : 'text-[var(--ruby)]'
              }`}
            >
              {item.positive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {item.change}
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
