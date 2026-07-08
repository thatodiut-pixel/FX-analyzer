/**
 * socketEventBus — Socket.IO event manager.
 * Connects to the engine's WebSocket bridge, forwards events to Zustand stores.
 */
import { io } from 'socket.io-client';
import useSessionStore from '@/store/sessionStore';
import useAgentStore from '@/store/agentStore';
import useTradingStore from '@/store/tradingStore';
import useAnalysisStore from '@/store/analysisStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8765';

let socket = null;
let reconnectTimer = null;

/**
 * Normalise deep-analysis bundle from the MoE orchestrator.
 * The engine sends a combined payload after running all agents in parallel.
 */
function normaliseDeepAnalysis(payload) {
  const dl = payload.deep_analysis || payload.deepLearning || {};
  const llm = payload.llm_analysis || payload.moeConsensus || payload;
  return {
    lstm: {
      signal: dl.lstm?.prediction || dl.lstm?.direction || 'neutral',
      direction: dl.lstm?.direction || dl.lstm?.prediction || 'neutral',
      confidence: dl.lstm?.confidence ?? 0.5,
      price_target: dl.lstm?.price_target || dl.lstm?.targetPrice || null,
      feature_importance: dl.lstm?.feature_importance || [],
      model_version: dl.lstm?.model_version || 'LSTM-v1',
    },
    cnn: {
      pattern: dl.cnn?.pattern || null,
      confidence: dl.cnn?.confidence ?? 0,
      pattern_type: dl.cnn?.pattern_type || dl.cnn?.type || null,
      pattern_probabilities: dl.cnn?.pattern_probabilities || {},
    },
    agents: {
      technical: llm.technical || { signal: 'neutral', confidence: 0 },
      fundamental: llm.fundamental || { signal: 'neutral', confidence: 0 },
      sentiment: llm.sentiment || { signal: 'neutral', confidence: 0 },
      risk: llm.risk || { signal: 'neutral', confidence: 0 },
      aggregate: llm.aggregate || { signal: 'neutral', confidence: 0, verdict: 'HOLD' },
    },
    langraph: payload.language_graph_state || payload.langGraphState || payload.workflow_state || null,
  };
}

/**
 * Dispatch a deep-analysis payload to the appropriate stores.
 */
function dispatchDeepAnalysis(payload) {
  const norm = normaliseDeepAnalysis(payload);

  // MoE consensus → agentStore
  useAgentStore.getState().updateMoEResult({
    technical: norm.agents.technical,
    fundamental: norm.agents.fundamental,
    sentiment: norm.agents.sentiment,
    risk: norm.agents.risk,
    lstm: { signal: norm.lstm.signal, confidence: norm.lstm.confidence, score: norm.lstm.confidence },
    cnn: { signal: norm.cnn.pattern || 'neutral', confidence: norm.cnn.confidence, score: norm.cnn.confidence },
    aggregate: norm.agents.aggregate,
  });

  // LSTM → analysisStore
  if (norm.lstm.signal) {
    useAnalysisStore.getState().setLSTM({
      direction: norm.lstm.direction,
      probability: norm.lstm.confidence,
      confidence: norm.lstm.confidence,
      targetPrice: norm.lstm.price_target,
    });
  }

  // CNN → analysisStore
  if (norm.cnn.pattern) {
    useAnalysisStore.getState().addCNNPattern({
      pattern: norm.cnn.pattern,
      confidence: norm.cnn.confidence,
      type: norm.cnn.pattern_type,
      probabilities: norm.cnn.pattern_probabilities,
    });
  }

  // LangGraph state → agentStore
  if (norm.langraph) {
    useAgentStore.getState().setLangGraphState(norm.langraph);
    if (norm.langraph.phase !== undefined) {
      const phases = ['idle', 'company_overview', 'parallel_analysis', 'bull_bear_debate', 'research_manager', 'trader_decision', 'risk_debate', 'consensus'];
      const label = phases[norm.langraph.phase] || `phase_${norm.langraph.phase}`;
      useAgentStore.getState().setActivePhase(label);
    }
  }
}

/**
 * Connect to the engine WebSocket.
 */
export function connectSocket() {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    timeout: 15000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[socket] Connected', socket.id);
    useSessionStore.getState().setConnected(true);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] Disconnected:', reason);
    useSessionStore.getState().setConnected(false);
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] Connection error:', err.message);
    useSessionStore.getState().setConnectionError(err.message);
  });

  // ── Incoming Events ──

  // Stream of agent output tokens (debate live-text effect)
  socket.on('agent:token', (data) => {
    // data: { agent, text, round }
    // Could optionally stream into a live text buffer
  });

  // Full analysis result from a single MoE run
  socket.on('analysis:result', (payload) => {
    dispatchDeepAnalysis(payload);
  });

  // Deep learning only result
  socket.on('deep:result', (payload) => {
    const dl = payload.deep_analysis || payload;
    if (dl.lstm) {
      useAnalysisStore.getState().setLSTM({
        direction: dl.lstm.direction || dl.lstm.prediction,
        probability: dl.lstm.confidence ?? 0.5,
        confidence: dl.lstm.confidence ?? 0.5,
        targetPrice: dl.lstm.price_target || dl.lstm.targetPrice,
        feature_importance: dl.lstm.feature_importance || [],
      });
    }
    if (dl.cnn?.pattern) {
      useAnalysisStore.getState().addCNNPattern(dl.cnn);
    }
  });

  // Live market price tick
  socket.on('market:price', (data) => {
    if (data?.price) {
      useTradingStore.getState().setCurrentPrice(data.price);
    }
  });

  // Trade execution confirmation
  socket.on('trade:executed', (data) => {
    useTradingStore.getState().executeTrade(data);
  });

  // Trade closure notification
  socket.on('trade:closed', (data) => {
    if (data?.id) {
      useTradingStore.getState().closeTrade(data.id, data);
    }
  });

  // Signal generated
  socket.on('signal:new', (data) => {
    useTradingStore.getState().addSignal(data);
  });

  // LangGraph workflow state update
  socket.on('agent:state', (payload) => {
    useAgentStore.getState().setLangGraphState(payload);
  });

  // Error from engine
  socket.on('engine:error', (data) => {
    console.error('[socket] Engine error:', data);
    useSessionStore.getState().setConnectionError(data?.message || 'Engine error');
  });

  return socket;
}

/**
 * Disconnect from the socket.
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  useSessionStore.getState().setConnected(false);
}

/**
 * Get the current socket instance (for emitting events).
 */
export function getSocket() {
  return socket;
}

/**
 * Emit an analysis request to the engine.
 * @param {string} symbol - Currency pair (e.g. 'EUR/USD')
 * @param {object} options - { useDeepLearning, useLangGraph, agentKeys }
 */
export function requestAnalysis(symbol = 'EUR/USD', options = {}) {
  if (!socket?.connected) {
    console.warn('[socket] Cannot request analysis — not connected');
    return;
  }
  socket.emit('request:analysis', {
    symbol,
    useDeepLearning: options.useDeepLearning ?? true,
    useLangGraph: options.useLangGraph ?? false,
    agentKeys: options.agentKeys || ['technical', 'fundamental', 'sentiment', 'risk'],
    timeframe: options.timeframe || '1h',
  });
}

/**
 * Subscribe to live price updates for a symbol.
 */
export function subscribePrice(symbol) {
  socket?.emit('subscribe:price', { symbol });
}

/**
 * Place a trade through the engine.
 */
export function placeTrade(symbol, tradeParams) {
  socket?.emit('trade:place', { symbol, ...tradeParams });
}

/** Default export: the socket event bus object */
const socketEventBus = {
  connect: connectSocket,
  disconnect: disconnectSocket,
  isConnected: () => socket?.connected ?? false,
  requestAnalysis,
  subscribePrice,
  placeTrade,
  getSocket,
};

export default socketEventBus;
