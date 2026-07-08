'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';

const tickerData = [
  { symbol: 'EUR/USD', price: '1.0865', change: '+0.12%', positive: true },
  { symbol: 'GBP/USD', price: '1.2678', change: '-0.08%', positive: false },
  { symbol: 'USD/JPY', price: '155.42', change: '+0.23%', positive: true },
  { symbol: 'AUD/USD', price: '0.6534', change: '-0.15%', positive: false },
  { symbol: 'USD/CHF', price: '0.8876', change: '+0.05%', positive: true },
  { symbol: 'USD/CAD', price: '1.3521', change: '-0.11%', positive: false },
];

export default function TickerBar({ liveData = [] }) {
  const data = liveData.length > 0 ? liveData : tickerData;
  // Duplicate more times to ensure smooth infinite scroll on wide screens
  const doubledData = [...data, ...data, ...data, ...data];

  return (
    <div className="w-full h-12 bg-black/60 backdrop-blur-md border-b border-white/5 flex items-center overflow-hidden relative z-50">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black via-black/80 to-transparent z-10" />

      <div className="flex items-center gap-2 px-4 border-r border-white/10 shrink-0 z-20 bg-black/40">
        <div className="relative">
          <div className="w-2 h-2 bg-lime-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 bg-lime-500 rounded-full animate-ping opacity-75" />
        </div>
        <span className="text-xs font-mono font-bold text-white/80 tracking-widest">LIVE_MARKET</span>
      </div>

      <div className="flex overflow-hidden w-full mask-linear-fade">
        <motion.div
          className="flex items-center gap-8 px-4"
          animate={{ x: [0, -1000] }} // Simplified calculation for demo
          transition={{ ease: "linear", duration: 30, repeat: Infinity }}
          style={{ width: 'max-content' }}
        >
          {doubledData.map((item, index) => (
            <div
              key={`${item.symbol}-${index}`}
              className="flex items-center gap-3 group cursor-pointer"
            >
              <span className="font-display font-bold text-sm text-white/90 group-hover:text-white transition-colors">
                {item.symbol}
              </span>
              <span className="font-mono text-sm text-white/60">{item.price}</span>
              <span className={`text-xs font-bold flex items-center gap-1 ${item.positive ? 'text-lime-400' : 'text-red-500'}`}>
                {item.positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {item.change}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
