'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Sparkles } from 'lucide-react';

export default function SettingsPage() {
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
            background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Sparkles size={22} className="text-white/60" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-white/40 font-mono">Model management · Data feed · System console</p>
        </div>
      </motion.div>

      <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)' }}>
        <Settings size={40} className="text-muted" style={{ opacity: 0.3 }} />
        <p className="text-muted font-mono text-sm">Settings panel coming in Phase 6</p>
        <p className="text-xs text-white/20 font-mono">Model selector · LLM provider config · API status</p>
      </div>
    </div>
  );
}
