'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Building2,
    Wifi,
    WifiOff,
    RefreshCw,
    DollarSign,
    Activity,
    Plug,
    Unplug,
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

export default function MT5AccountPanel({ socket }) {
    const [mt5Status, setMt5Status] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);

    const fetchStatus = useCallback(() => {
        if (!socket || !socket.connected) return;
        setLoading(true);
        socket.emit('mt5-get-status');
        socket.once('mt5-status', (status) => {
            setMt5Status(status);
            setLoading(false);
        });
        // Fallback timeout
        setTimeout(() => setLoading(false), 5000);
    }, [socket]);

    useEffect(() => {
        if (!socket) return;
        fetchStatus();
        // Listen for push updates
        socket.on('mt5-status', setMt5Status);
        return () => socket.off('mt5-status', setMt5Status);
    }, [socket, fetchStatus]);

    const handleReconnect = () => {
        if (!socket || reconnecting) return;
        setReconnecting(true);
        socket.emit('mt5-reconnect');
        socket.once('mt5-status', (status) => {
            setMt5Status(status);
            setReconnecting(false);
        });
        setTimeout(() => setReconnecting(false), 8000);
    };

    const isConnected = mt5Status?.connected;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel-glass p-5"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${isConnected ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        <Building2 size={16} className={isConnected ? 'text-emerald-400' : 'text-red-400'} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-tight">MT5 Terminal</h3>
                        <p className="text-[10px] text-white/40 font-mono">MetaTrader 5 Bridge</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {loading ? (
                        <Loader2 size={14} className="animate-spin text-white/40" />
                    ) : (
                        <button
                            onClick={fetchStatus}
                            className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isConnected
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        {isConnected ? (
                            <><Wifi size={10} /> LIVE</>
                        ) : (
                            <><WifiOff size={10} /> OFFLINE</>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Details */}
            <div className="space-y-2.5 mb-4">
                <div className="flex justify-between items-center py-1.5 px-3 bg-black/30 rounded-lg">
                    <span className="text-[11px] text-white/50 font-mono">Account</span>
                    <span className="text-sm font-mono text-white font-bold">
                        {isConnected ? mt5Status.account || 'Connected' : '—'}
                    </span>
                </div>
                <div className="flex justify-between items-center py-1.5 px-3 bg-black/30 rounded-lg">
                    <span className="text-[11px] text-white/50 font-mono">Server</span>
                    <span className="text-sm font-mono text-white">
                        {isConnected ? mt5Status.server || '—' : '—'}
                    </span>
                </div>
                <div className="flex justify-between items-center py-1.5 px-3 bg-black/30 rounded-lg">
                    <span className="text-[11px] text-white/50 font-mono">Balance</span>
                    <span className="text-sm font-mono text-emerald-400 font-bold">
                        {isConnected ? `$${(mt5Status.balance || 0).toFixed(2)}` : '—'}
                    </span>
                </div>
                <div className="flex justify-between items-center py-1.5 px-3 bg-black/30 rounded-lg">
                    <span className="text-[11px] text-white/50 font-mono">Equity</span>
                    <span className="text-sm font-mono text-cyan-400 font-bold">
                        {isConnected ? `$${(mt5Status.equity || 0).toFixed(2)}` : '—'}
                    </span>
                </div>
            </div>

            {/* Connect/Reconnect Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReconnect}
                disabled={reconnecting}
                className={`w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    reconnecting
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : isConnected
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
            >
                {reconnecting ? (
                    <><Loader2 size={14} className="animate-spin" /> Reconnecting...</>
                ) : isConnected ? (
                    <><RefreshCw size={14} /> Reconnect</>
                ) : (
                    <><Plug size={14} /> Initialize Connection</>
                )}
            </motion.button>

            {/* Status Message */}
            <div className={`mt-2 flex items-center gap-1.5 ${
                isConnected ? 'text-emerald-400/60' : 'text-amber-400/60'
            }`}>
                {isConnected ? (
                    <CheckCircle2 size={10} />
                ) : (
                    <AlertCircle size={10} />
                )}
                <span className="text-[10px] font-mono">
                    {isConnected
                        ? 'Orders route through MT5 broker'
                        : 'Trades execute in paper/simulation mode'}
                </span>
            </div>
        </motion.div>
    );
}
