'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, AlertTriangle, Target, Zap, Shield, BarChart3 } from 'lucide-react';
import Link from 'next/link';

// Mock data fetcher (replace with actual API/Socket integration later)
const getSignalById = (id) => {
    // Simulating finding a signal from local state or context would be better, 
    // but for now we'll return a mock object based on ID or a generic one.
    return {
        id: id,
        symbol: 'EURUSD',
        action: 'BUY', // or 'SELL'
        price: 1.0865,
        timestamp: new Date().toISOString(),
        confidence: 0.88,
        takeProfit: 1.0950,
        stopLoss: 1.0820,
        ai_reasoning: "Strong bullish divergence detected on RSI(14). Price action broke above key resistance level at 1.0850 with significant volume verification.",
        risk_factors: "Upcoming USD high-impact news in 2 hours.",
        verification: {
            score: 85,
            breakdown: {
                trend: 15,
                momentum: 20,
                volume: 10,
                sentiment: 40
            }
        }
    };
};

export default function SignalDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    const [signal, setSignal] = useState(null);

    useEffect(() => {
        if (id) {
            // In a real app, you might fetch this from a global store or API
            const data = getSignalById(id);
            setSignal(data);
        }
    }, [id]);

    if (!signal) return <div className="p-10 text-center text-gray-500">Loading Signal Analysis...</div>;

    const isBuy = signal.action === 'BUY';
    const accentColor = isBuy ? 'var(--acid-lime)' : 'var(--hyper-red)';

    return (
        <div className="min-h-screen bg-black text-gray-100 p-6 md:p-12 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8"
                >
                    {/* Main Analysis Column */}
                    <div className="space-y-6">
                        {/* Header Card */}
                        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                {isBuy ? <TrendingUp size={200} /> : <TrendingDown size={200} />}
                            </div>

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h1 className="text-5xl font-bold font-display tracking-tighter mb-2">{signal.symbol}</h1>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-mono font-bold ${isBuy ? 'bg-lime-400/10 text-lime-400' : 'bg-red-500/10 text-red-500'}`}>
                                        {isBuy ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                        {signal.action} @ {signal.price}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-400 font-mono mb-1">AI Confidence</div>
                                    <div className="text-4xl font-bold font-mono" style={{ color: accentColor }}>
                                        {Math.round(signal.confidence * 100)}%
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">AI Reasoning</h3>
                                    <p className="text-lg text-gray-200 leading-relaxed font-light border-l-2 pl-4" style={{ borderColor: accentColor }}>
                                        {signal.ai_reasoning}
                                    </p>
                                </div>

                                {signal.risk_factors && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg flex gap-3 items-start text-amber-200/90">
                                        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                                        <span>{signal.risk_factors}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chart Placeholder (Future Integration) */}
                        <div className="h-[300px] rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Interactive Analysis Chart Area</p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Stats */}
                    <div className="space-y-6">
                        {/* Trade Targets */}
                        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Target size={16} /> Trade Targets
                            </h3>
                            <div className="space-y-4 font-mono">
                                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                    <span className="text-gray-400">Entry Price</span>
                                    <span className="text-white font-bold">{signal.price}</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                    <span className="text-gray-400">Stop Loss</span>
                                    <span className="text-red-400 font-bold">{signal.stopLoss}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Take Profit</span>
                                    <span className="text-lime-400 font-bold">{signal.takeProfit}</span>
                                </div>
                            </div>
                        </div>

                        {/* Verification Breakdown */}
                        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Shield size={16} /> Verification Data
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(signal.verification.breakdown).map(([key, value]) => (
                                    <div key={key}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="capitalize text-gray-400">{key}</span>
                                            <span className="text-white">{value}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-cyan-500/50 rounded-full"
                                                style={{ width: `${(value / 50) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Button */}
                        <button className="w-full py-4 rounded-xl font-bold text-black text-lg shadow-lg hover:scale-[1.02] transition-transform active:scale-[0.98]" style={{ background: accentColor }}>
                            EXECUTE TRADE
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
