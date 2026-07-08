'use client';

import { useSocket } from '@/hooks/useSocket';
import { TickerBar } from '@/components/TickerBar';
import { SignalCard } from '@/components/SignalCard';
import { StatsPanel } from '@/components/StatsPanel';
import { TradeHistory } from '@/components/TradeHistory';
import { RiskShield } from '@/components/RiskShield';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { Notification } from '@/components/Notification';
import { PriceChart } from '@/components/PriceChart';
import { Activity, BarChart3, Zap } from 'lucide-react';

export default function Dashboard() {
  const {
    isConnected,
    ticker,
    signals,
    trades,
    stats,
    riskSettings,
    notification,
    executeTrade,
    updateRiskSettings,
    clearNotification,
  } = useSocket();

  // Get most recent signals for display
  const recentSignals = signals.slice(-6).reverse();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Notification Toast */}
      <Notification notification={notification} onClose={clearNotification} />

      {/* Ticker Bar */}
      <TickerBar data={ticker} />

      {/* Header */}
      <header className="px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30">
              <Activity className="w-6 h-6 text-[var(--cyan)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                FX Analyzer
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-[var(--cyan)] border border-cyan-500/30">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Institutional-Grade Trading Signals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ConnectionStatus isConnected={isConnected} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Stats Panel */}
          <StatsPanel stats={stats} />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Signals Grid - Takes 8 columns */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[var(--gold)]" />
                  Live Signals
                </h2>
                <span className="text-xs text-[var(--text-muted)]">
                  {signals.length} signals received
                </span>
              </div>

              {recentSignals.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-full bg-[var(--bg-tertiary)] mb-4">
                    <BarChart3 className="w-8 h-8 text-[var(--text-muted)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    Waiting for Signals
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] max-w-md">
                    The AI analysis engine is monitoring the markets. Signals will appear here when trading opportunities are detected.
                  </p>
                  {!isConnected && (
                    <p className="text-xs text-[var(--ruby)] mt-4">
                      ⚠️ Not connected to server. Make sure the backend is running.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {recentSignals.map((signal, index) => (
                    <SignalCard
                      key={signal.id || `${signal.symbol}-${signal.timestamp}-${index}`}
                      signal={signal}
                      onExecute={executeTrade}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Sidebar - Takes 4 columns */}
            <div className="lg:col-span-4 space-y-6">
              {/* Price Chart */}
              <PriceChart ticker={ticker} symbol="EUR/USD" />

              {/* Risk Shield */}
              <RiskShield
                settings={riskSettings}
                onUpdate={updateRiskSettings}
              />

              {/* Trade History */}
              <div className="h-[400px]">
                <TradeHistory trades={trades} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-[var(--border-subtle)]">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between text-xs text-[var(--text-muted)]">
          <p>© 2026 FX Analyzer Pro. For educational purposes only.</p>
          <p>Powered by Google Gemini AI</p>
        </div>
      </footer>
    </div>
  );
}
