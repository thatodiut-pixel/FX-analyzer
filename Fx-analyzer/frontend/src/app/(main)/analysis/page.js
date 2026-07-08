'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  BrainCircuit,
  Sparkles,
  Activity,
  TrendingUp,
  Sigma,
} from 'lucide-react';
import DeepLearningPanel from '@/components/DeepLearningPanel';
import FeatureImportanceChart from '@/components/FeatureImportanceChart';
import PatternDisplayCard from '@/components/PatternDisplayCard';

const TABS = [
  { id: 'deep', label: 'Deep Learning', icon: BrainCircuit },
  { id: 'technical', label: 'Technical', icon: Activity },
  { id: 'patterns', label: 'Patterns', icon: Sigma },
  { id: 'fundamental', label: 'Fundamental', icon: TrendingUp },
];

// Mock data matching the LSTM agent output format
const MOCK_LSTM = {
  report: '## LSTM Trend Analysis\n**Prediction**: BULLISH (confidence 72.3%)',
  confidence: 0.723,
  signal: 'bullish',
  price_target: 1.08984,
  features: { ret_1: 0.314, ret_5: 0.178, vol_ratio: 0.089, rsi: 0.243, bb_pct: 0.112, atr: 0.064 },
};

// Mock data matching the CNN agent output format
const MOCK_CNN = {
  report: '## CNN Chart Pattern Analysis\n**Detected Pattern**: double_bottom',
  confidence: 0.784,
  signal: 'bullish',
  pattern: 'double_bottom',
  rule_patterns: [{ name: 'potential_double_bottom', confidence: 0.4 }],
};

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState('deep');
  const ActiveIcon = TABS.find(t => t.id === activeTab)?.icon || BarChart3;

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
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={22} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Analysis Lab</h1>
            <p className="text-sm text-white/40 font-mono">
              LSTM predictions · CNN patterns · Technical indicators
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div
        className="flex gap-1 p-1 rounded-lg"
        style={{
          background: 'var(--bg-deep)',
          border: '1px solid var(--border-subtle)',
          maxWidth: '480px',
        }}
      >
        {TABS.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-display font-bold transition-all"
              style={{
                background: isActive ? 'var(--bg-void)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                border: isActive ? '1px solid var(--border-default)' : '1px solid transparent',
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <TabIcon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'deep' && (
          <div className="space-y-6">
            <DeepLearningPanel lstmData={MOCK_LSTM} cnnData={MOCK_CNN} />
            <div
              className="card"
              style={{
                padding: 'var(--space-lg)',
                borderLeft: '4px solid var(--agent-lstm)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BrainCircuit size={18} className="text-pink-400" />
                <h3 className="text-sm font-display font-bold">Feature Importance Analysis</h3>
              </div>
              <FeatureImportanceChart features={MOCK_LSTM.features} />
            </div>
          </div>
        )}

        {activeTab === 'technical' && (
          <div
            className="card"
            style={{
              padding: 'var(--space-xl)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-md)',
              minHeight: '200px',
              borderLeft: '4px solid var(--neon-cyan)',
            }}
          >
            <Activity size={40} className="text-muted" style={{ opacity: 0.3 }} />
            <p className="text-muted font-mono text-sm">
              Technical analysis panel coming soon
            </p>
            <p className="text-xs text-white/20 font-mono">
              RSI, MACD, Bollinger Bands, Ichimoku Cloud, Fibonacci levels
            </p>
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="space-y-6">
            <PatternDisplayCard cnnData={MOCK_CNN} />
          </div>
        )}

        {activeTab === 'fundamental' && (
          <div
            className="card"
            style={{
              padding: 'var(--space-xl)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-md)',
              minHeight: '200px',
            }}
          >
            <BarChart3 size={40} className="text-muted" style={{ opacity: 0.3 }} />
            <p className="text-muted font-mono text-sm">
              Fundamental analysis panel coming soon
            </p>
            <p className="text-xs text-white/20 font-mono">
              Will display macro-economic data, RAG context, and news sentiment
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
