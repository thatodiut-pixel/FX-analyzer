'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  BrainCircuit,
  Bot,
  Sparkles,
  LayoutGrid,
  ChevronRight,
  Activity,
  BarChart3,
} from 'lucide-react';

// Wrap the old dashboard as a dynamic import with no SSR (it uses useSession)
const DashboardMain = dynamic(
  () => import('@/components/DashboardMain'),
  { ssr: false }
);

// Dynamic imports for the new Phase 1 components
const DeepLearningPanel = dynamic(
  () => import('@/components/DeepLearningPanel'),
  { ssr: false }
);

const CandlestickChartEnhanced = dynamic(
  () => import('@/components/CandlestickChartEnhanced'),
  { ssr: false }
);

const MoEEnhanced = dynamic(
  () => import('@/components/agent-arena/MoEEnhanced'),
  { ssr: false }
);

const DebateTimeline = dynamic(
  () => import('@/components/agent-arena/DebateTimeline'),
  { ssr: false }
);

const RiskDebatePanel = dynamic(
  () => import('@/components/agent-arena/RiskDebatePanel'),
  { ssr: false }
);

const TraderDecisionPanel = dynamic(
  () => import('@/components/agent-arena/TraderDecisionPanel'),
  { ssr: false }
);

const PhaseIndicator = dynamic(
  () => import('@/components/agent-arena/PhaseIndicator'),
  { ssr: false }
);

/**
 * Unified Dashboard — inherits sidebar from (main)/layout.js,
 * wraps the legacy DashboardMain, and surfaces new capabilities.
 */
export default function EnhancedDashboard() {
  const [activeTab, setActiveTab] = React.useState('overview');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-void)' }}>
      {/* ── Top Tab Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '12px 20px 0',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-deep)',
          overflowX: 'auto',
        }}
      >
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          icon={Activity}
          label="Overview"
        />
        <TabButton
          active={activeTab === 'deep-learning'}
          onClick={() => setActiveTab('deep-learning')}
          icon={BrainCircuit}
          label="Deep Learning"
        />
        <TabButton
          active={activeTab === 'agent-arena'}
          onClick={() => setActiveTab('agent-arena')}
          icon={Bot}
          label="Agent Arena"
        />
      </div>

      {/* ── Tab Content ── */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && <FullDashboard />}
        {activeTab === 'deep-learning' && <DeepLearningTab />}
        {activeTab === 'agent-arena' && <AgentArenaTab />}
      </motion.div>
    </div>
  );
}

/* ===== Overview Tab ===== */
function FullDashboard() {
  return <DashboardMain />;
}

/* ===== Deep Learning Tab ===== */
function DeepLearningTab() {
  return (
    <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <BrainCircuit size={22} style={{ color: 'var(--neon-cyan)' }} />
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Deep Learning Suite
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          LSTM price forecasting + CNN pattern recognition — powered by the MoE orchestrator
        </p>
      </motion.div>

      {/* Deep Learning Panel */}
      <div style={{ marginBottom: 20 }}>
        <DeepLearningPanel />
      </div>

      {/* Enhanced Chart with DL overlays */}
      <div
        style={{
          background: 'var(--bg-deep)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <BarChart3 size={16} style={{ color: 'var(--neon-cyan)' }} />
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
            }}
          >
            Chart with DL Overlays
          </h2>
          <span
            className="badge badge-cyan"
            style={{ marginLeft: 8, fontSize: 10, padding: '2px 8px' }}
          >
            BETA
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
          LSTM predicted price path (dashed line) + CNN pattern annotations on the live chart
        </p>
        <CandlestickChartEnhanced />
      </div>
    </div>
  );
}

/* ===== Agent Arena Tab ===== */
function AgentArenaTab() {
  return (
    <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Bot size={22} style={{ color: 'var(--neon-ruby)' }} />
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Agent Arena
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          LangGraph-powered 16-agent investment committee — real-time debate & consensus
        </p>
      </motion.div>

      {/* Phase Indicator */}
      <div style={{ marginBottom: 20 }}>
        <PhaseIndicator />
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 20,
        }}
      >
        {/* Left: Debate Visualization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MoEEnhanced />
          <DebateTimeline />
        </div>

        {/* Right: Decision Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <TraderDecisionPanel />
          <RiskDebatePanel />
        </div>
      </div>
    </div>
  );
}

/* ===== Tab Button ===== */
function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--neon-cyan)' : '2px solid transparent',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        cursor: 'pointer',
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        fontFamily: 'var(--font-display)',
        letterSpacing: '-0.01em',
        transition: 'all 0.2s',
      }}
    >
      <Icon size={16} style={{ color: active ? 'var(--neon-cyan)' : undefined }} />
      {label}
    </motion.button>
  );
}
