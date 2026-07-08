'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Sparkles } from 'lucide-react';

export default function ResearchPage() {
  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div
          style={{
            width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
            background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Sparkles size={22} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Research & Backtest</h1>
          <p className="text-sm text-white/40 font-mono">Vibe research · Alpha factor zoo · RAG knowledge base</p>
        </div>
      </motion.div>

      <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)' }}>
        <FlaskConical size={40} className="text-muted" style={{ opacity: 0.3 }} />
        <p className="text-muted font-mono text-sm">Research suite coming in Phase 5</p>
        <p className="text-xs text-white/20 font-mono">Backtest terminal · Alpha factor browser · Document RAG</p>
      </div>
    </div>
  );
}
