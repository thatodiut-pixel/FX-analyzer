import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🔌 Connected to FX Analyzer server');
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Type definitions for socket events
export interface TickerData {
  symbol: string;
  price: string;
  change: string;
  positive: boolean;
}

export interface Signal {
  id?: number;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  price: number;
  confidence: number;
  reasoning: string;
  timestamp: string;
  risk_parameters?: {
    leverage: number;
    stop_loss: string;
  };
  agent_breakdown?: {
    technical: AgentResult;
    fundamental: AgentResult;
    sentiment: AgentResult;
    risk: RiskResult;
    memory?: string;
  };
}

export interface AgentResult {
  signal?: string;
  bias?: string;
  sentiment?: string;
  confidence: number;
  reasoning: string;
}

export interface RiskResult {
  max_leverage: number;
  stop_loss_advice: string;
}

export interface Trade {
  id?: number;
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  entry_price?: number;
  executedAt?: string;
  timestamp?: string;
  status: string;
  pl: number;
  plType?: 'profit' | 'loss';
}

export interface RiskSettings {
  maxDailyDrawdown: number;
  maxOpenPositions: number;
  maxRiskPerTrade: number;
  tradingEnabled: boolean;
}

export interface Stats {
  totalTrades: number;
  winningTrades: number;
  totalProfit: string;
  winRate: number;
}
