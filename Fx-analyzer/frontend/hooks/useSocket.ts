'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSocket, disconnectSocket, TickerData, Signal, Trade, RiskSettings, Stats } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ticker, setTicker] = useState<TickerData[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    maxDailyDrawdown: 500,
    maxOpenPositions: 3,
    maxRiskPerTrade: 2,
    tradingEnabled: true,
  });
  const [stats, setStats] = useState<Stats>({
    totalTrades: 0,
    winningTrades: 0,
    totalProfit: '0.00',
    winRate: 0,
  });
  const [notification, setNotification] = useState<{ type: string; title: string; message: string } | null>(null);

  useEffect(() => {
    const socketInstance = getSocket();
    setSocket(socketInstance);

    socketInstance.on('connect', () => setIsConnected(true));
    socketInstance.on('disconnect', () => setIsConnected(false));

    // Ticker updates
    socketInstance.on('ticker-update', (data: TickerData[]) => {
      setTicker(data);
    });

    // Signal history on connect
    socketInstance.on('signal-history', (history: Signal[]) => {
      setSignals(history);
    });

    // New live signal
    socketInstance.on('fx-signal', (signal: Signal) => {
      setSignals(prev => [...prev.slice(-19), signal]); // Keep last 20
    });

    // Trade executed
    socketInstance.on('trade-executed', (trade: Trade) => {
      setTrades(prev => [trade, ...prev.slice(0, 49)]); // Keep last 50
    });

    // Trade rejected
    socketInstance.on('trade-rejected', (data: { reason: string }) => {
      setNotification({ type: 'error', title: 'Trade Rejected', message: data.reason });
    });

    // Risk settings updated
    socketInstance.on('risk-settings-updated', (settings: RiskSettings) => {
      setRiskSettings(settings);
    });

    // Risk stats update
    socketInstance.on('risk-stats-update', (data: { profitLoss: number; openPositions: number }) => {
      setStats(prev => ({
        ...prev,
        totalProfit: data.profitLoss.toFixed(2),
      }));
    });

    // Notifications
    socketInstance.on('notification', (data: { type: string; title: string; message: string }) => {
      setNotification(data);
    });

    // Fetch initial stats
    fetch('http://localhost:4000/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {});

    // Fetch initial trades
    fetch('http://localhost:4000/api/trades')
      .then(res => res.json())
      .then(data => setTrades(data))
      .catch(() => {});

    return () => {
      disconnectSocket();
    };
  }, []);

  const executeTrade = useCallback((signal: Signal) => {
    if (socket) {
      socket.emit('execute-trade', {
        symbol: signal.symbol,
        action: signal.action,
        price: signal.price,
        confidence: signal.confidence,
      });
    }
  }, [socket]);

  const updateRiskSettings = useCallback((settings: Partial<RiskSettings>) => {
    if (socket) {
      socket.emit('update-risk-settings', settings);
    }
  }, [socket]);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
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
  };
}
