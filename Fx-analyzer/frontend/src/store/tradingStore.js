'use client';
import { create } from 'zustand';

/**
 * tradingStore — Signals, trades, positions, paper engine stats, and risk settings.
 * This is the central nervous system for trading operations.
 */
const useTradingStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────
  signals: [],
  trades: [],
  positions: [],
  stats: {
    winRate: 84.5,
    activeTrades: 3,
    profit: 1240.5,
    totalSignals: 47,
    totalTrades: 0,
    winCount: 0,
    lossCount: 0,
    pnl: 0,
  },
  tradingMode: 'paper', // 'paper' | 'live' | 'backtest'
  isAutoTrading: false,
  riskSettings: {
    maxDailyDrawdown: 500,
    maxOpenPositions: 3,
    maxRiskPerTrade: 2,
    maxDailyTrades: 5,
    minConfidence: 0.7,
    tradingEnabled: true,
  },
  currentPrice: 1.0865,

  // ── Actions ────────────────────────────────────────────────────────

  /** Add a new signal to the top of the list, capping at 50 */
  addSignal: (signal) =>
    set((state) => ({
      signals: [
        {
          id: signal.id || `sig-${Date.now()}`,
          timestamp: signal.timestamp || new Date().toISOString(),
          symbol: signal.symbol,
          action: signal.action, // 'buy' | 'sell'
          entry: signal.entry || signal.entryPrice,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          confidence: signal.confidence ?? 0.5,
          lotSize: signal.lotSize || 0.01,
          reason: signal.reason || '',
          agent: signal.agent || 'system',
          ...signal,
        },
        ...state.signals,
      ].slice(0, 50),
      stats: {
        ...state.stats,
        totalSignals: state.stats.totalSignals + 1,
      },
    })),

  /** Replace the entire signal list (e.g. on history load) */
  setSignals: (signals) => set({ signals }),

  /** Execute a trade — adds to trades[] and stats */
  executeTrade: (trade) =>
    set((state) => {
      const newTrade = {
        id: trade.id || trade.ticket || `trade-${Date.now()}`,
        symbol: trade.symbol,
        action: trade.action,
        entryPrice: trade.executionPrice || trade.price || trade.entry,
        lotSize: trade.volume || trade.lotSize || 0.01,
        openTime: trade.executedAt || trade.timestamp || new Date().toISOString(),
        status: 'open',
        profit: 0,
        pips: 0,
        type: trade.type || 'manual',
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        ...trade,
      };

      return {
        trades: [newTrade, ...state.trades],
        stats: {
          ...state.stats,
          totalTrades: state.stats.totalTrades + 1,
          activeTrades: state.stats.activeTrades + 1,
        },
      };
    }),

  /** Update an existing position (e.g. from market:price events) */
  updatePosition: (update) =>
    set((state) => {
      const trades = state.trades.map((t) => {
        if (t.id === update.id || t.symbol === update.symbol) {
          return {
            ...t,
            profit: update.profit ?? t.profit,
            pips: update.pips ?? t.pips,
            currentPrice: update.price ?? t.currentPrice,
          };
        }
        return t;
      });
      return { trades };
    }),

  /** Close a trade — marks status = closed, records exit price/profit */
  closeTrade: (tradeId, exitData) =>
    set((state) => {
      const trades = state.trades.map((t) => {
        if (t.id === tradeId) {
          const isWin = (exitData.profit ?? 0) >= 0;
          return {
            ...t,
            status: 'closed',
            exitPrice: exitData.exitPrice ?? exitData.price,
            exitTime: exitData.exitTime ?? new Date().toISOString(),
            profit: exitData.profit ?? 0,
            pips: exitData.pips ?? 0,
            closeReason: exitData.reason || 'Manual Close',
          };
        }
        return t;
      });

      const closedTrade = trades.find((t) => t.id === tradeId);
      const isWin = (closedTrade?.profit ?? 0) >= 0;

      return {
        trades,
        stats: {
          ...state.stats,
          activeTrades: Math.max(0, state.stats.activeTrades - 1),
          winCount: state.stats.winCount + (isWin ? 1 : 0),
          lossCount: state.stats.lossCount + (isWin ? 0 : 1),
          profit: state.stats.profit + (closedTrade?.profit ?? 0),
        },
      };
    }),

  /** Set positions list (from backend) */
  setPositions: (positions) => set({ positions }),

  /** Toggle trading mode */
  setTradingMode: (mode) => set({ tradingMode: mode }),

  /** Toggle auto-trading */
  setAutoTrading: (enabled) => set({ isAutoTrading: enabled }),

  /** Update risk settings */
  updateRiskSettings: (settings) =>
    set((state) => ({
      riskSettings: { ...state.riskSettings, ...settings },
    })),

  /** Update overall stats */
  setStats: (stats) =>
    set((state) => ({ stats: { ...state.stats, ...stats } })),

  /** Set current live price */
  setCurrentPrice: (price) => set({ currentPrice: price }),

  /** Reset all trading state (for logout) */
  resetTrading: () =>
    set({
      signals: [],
      trades: [],
      positions: [],
      stats: {
        winRate: 0,
        activeTrades: 0,
        profit: 0,
        totalSignals: 0,
        totalTrades: 0,
        winCount: 0,
        lossCount: 0,
        pnl: 0,
      },
      isAutoTrading: false,
    }),
}));

export default useTradingStore;
