'use client';
import { useEffect, useRef, useCallback } from 'react';
import socketEventBus from '@/lib/socketEventBus';
import {
  useSessionStore,
  useTradingStore,
  useAgentStore,
  useAnalysisStore,
} from '@/store';

/**
 * useSocket — React hook that bridges socket.io events to Zustand stores.
 *
 * Call once at the app root inside (main)/layout.js after authentication.
 *
 * Handles:
 *  - Connection lifecycle → sessionStore
 *  - Signal events → tradingStore
 *  - Trade execution/close → tradingStore
 *  - Agent/MoE events → agentStore
 *  - ML predictions → analysisStore
 *  - Market price updates → tradingStore
 *  - Risk settings → tradingStore
 *  - System status → sessionStore
 */
export default function useSocket() {
  const initialized = useRef(false);

  // ── Session store actions ──────────────────────────────────────────
  const setConnected = useSessionStore((s) => s.setConnected);
  const setConnectionError = useSessionStore((s) => s.setConnectionError);
  const setModelName = useSessionStore((s) => s.setModelName);
  const setLastSignalTime = useSessionStore((s) => s.setLastSignalTime);
  const logout = useSessionStore((s) => s.logout);

  // ── Trading store actions ──────────────────────────────────────────
  const addSignal = useTradingStore((s) => s.addSignal);
  const setSignals = useTradingStore((s) => s.setSignals);
  const executeTrade = useTradingStore((s) => s.executeTrade);
  const closeTrade = useTradingStore((s) => s.closeTrade);
  const updatePosition = useTradingStore((s) => s.updatePosition);
  const setCurrentPrice = useTradingStore((s) => s.setCurrentPrice);
  const updateRiskSettings = useTradingStore((s) => s.updateRiskSettings);
  const setStats = useTradingStore((s) => s.setStats);

  // ── Agent store actions ────────────────────────────────────────────
  const updateDebateRound = useAgentStore((s) => s.updateDebateRound);
  const updateMoEResult = useAgentStore((s) => s.updateMoEResult);
  const setActivePhase = useAgentStore((s) => s.setActivePhase);
  const setActiveAgent = useAgentStore((s) => s.setActiveAgent);

  // ── Analysis store actions ─────────────────────────────────────────
  const setLSTM = useAnalysisStore((s) => s.setLSTM);
  const setCNN = useAnalysisStore((s) => s.setCNN);
  const setRAGContext = useAnalysisStore((s) => s.setRAGContext);

  // ── Connect callback ───────────────────────────────────────────────
  const connect = useCallback(() => {
    if (initialized.current) return;

    socketEventBus.connect('http://localhost:4000', {
      token: 'default-user',
      role: 'admin',
      subscription: 'active',
    });

    initialized.current = true;

    // ── Connection lifecycle ─────────────────────────────────────────
    socketEventBus.on('connect', () => {
      setConnected(true);
      socketEventBus.emitGetModels();
    });

    socketEventBus.on('disconnect', () => {
      setConnected(false);
    });

    socketEventBus.on('connect_error', (err) => {
      setConnectionError(err.message);
    });

    // ── Signal events ────────────────────────────────────────────────
    socketEventBus.on('signal:new', (signal) => {
      addSignal(signal);
      setLastSignalTime(signal.timestamp || new Date().toISOString());
    });

    socketEventBus.on('signal:update', (signal) => {
      useTradingStore.setState((state) => ({
        signals: state.signals.map((s) =>
          s.id === signal.id ? { ...s, ...signal } : s
        ),
      }));
    });

    socketEventBus.on('signal-history', (history) => {
      const sorted = [...history].reverse();
      setSignals(sorted);
    });

    // ── Trade events ─────────────────────────────────────────────────
    socketEventBus.on('trade:executed', (trade) => {
      executeTrade(trade);
    });

    socketEventBus.on('trade:closed', (data) => {
      closeTrade(data.ticket || data.id, data);
    });

    socketEventBus.on('trade-rejected', (data) => {
      console.warn('[useSocket] Trade rejected:', data.reason);
    });

    // ── Agent events ─────────────────────────────────────────────────
    socketEventBus.on('agent:response', (data) => {
      if (data.agent) setActiveAgent(data.agent);
      if (data.phase) setActivePhase(data.phase);
    });

    socketEventBus.on('agent:debate_round', (round) => {
      updateDebateRound(round);
    });

    socketEventBus.on('agent:debate_end', (finalResult) => {
      updateMoEResult(finalResult);
      setActivePhase('consensus');
    });

    // ── ML prediction events ─────────────────────────────────────────
    socketEventBus.on('lstm:prediction', (prediction) => {
      setLSTM(prediction);
    });

    socketEventBus.on('cnn:pattern', (patterns) => {
      setCNN(patterns);
    });

    // ── Research events ──────────────────────────────────────────────
    socketEventBus.on('research:backtest', (data) => {
      console.log('[useSocket] Backtest result:', data);
    });

    socketEventBus.on('research:alpha_bench', (data) => {
      console.log('[useSocket] Alpha benchmark:', data);
    });

    // ── Context / market events ──────────────────────────────────────
    socketEventBus.on('rag:context_update', (context) => {
      setRAGContext(context);
    });

    socketEventBus.on('market:price', (priceData) => {
      if (priceData.price != null) setCurrentPrice(priceData.price);
      if (priceData.position) updatePosition(priceData.position);
    });

    // ── Risk events ──────────────────────────────────────────────────
    socketEventBus.on('risk:update', (settings) => {
      updateRiskSettings(settings);
    });

    socketEventBus.on('risk-stats-update', (stats) => {
      setStats(stats);
    });

    // ── System events ────────────────────────────────────────────────
    socketEventBus.on('system:status', (status) => {
      if (status.model) setModelName(status.model);
    });

    socketEventBus.on('system:error', (error) => {
      console.error('[useSocket] System error:', error);
    });

    socketEventBus.on('model-changed', (model) => {
      setModelName(model);
    });

    // ── Legacy message event ─────────────────────────────────────────
    socketEventBus.on('message', (msg) => {
      try {
        const parts = msg.toString().split(' ');
        const topic = parts[0];
        const data = parts.slice(1).join(' ');
        if (topic === 'notification') {
          const notif = JSON.parse(data);
          console.log('[useSocket] Notification:', notif);
        }
      } catch {
        // Silently ignore parse errors
      }
    });
  }, [
    setConnected,
    setConnectionError,
    setModelName,
    setLastSignalTime,
    addSignal,
    setSignals,
    executeTrade,
    closeTrade,
    updatePosition,
    setCurrentPrice,
    updateRiskSettings,
    setStats,
    updateDebateRound,
    updateMoEResult,
    setActivePhase,
    setActiveAgent,
    setLSTM,
    setCNN,
    setRAGContext,
  ]);

  // ── Auto-connect on mount ──────────────────────────────────────────
  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount (but don't disconnect if we're just re-rendering)
    };
  }, [connect]);

  // Return event bus for direct emit access
  return socketEventBus;
}
