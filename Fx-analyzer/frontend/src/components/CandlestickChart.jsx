'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, ColorType, CrosshairMode } from 'lightweight-charts';

// Convert trade entry to lightweight-charts marker
function tradesToMarkers(trades) {
    if (!trades || trades.length === 0) return [];
    return trades
        .filter(t => t.entryPrice && t.openTime)
        .map(t => {
            const time = Math.floor(new Date(t.openTime).getTime() / 1000);
            const isBuy = t.action === 'BUY';
            return {
                time,
                position: isBuy ? 'belowBar' : 'aboveBar',
                color: isBuy ? '#ccff00' : '#ff0f42',
                shape: isBuy ? 'arrowUp' : 'arrowDown',
                text: `${isBuy ? 'B' : 'S'} ${t.lotSize?.toFixed(2) || ''}`,
            };
        });
}

function updateTradeMarkers(series, trades) {
    if (!series) return;
    try {
        const markers = tradesToMarkers(trades);
        series.setMarkers(markers);
    } catch (e) {
        console.warn('Failed to update trade markers:', e);
    }
}

const timeframes = [
    { label: '1M', minutes: 1 },
    { label: '5M', minutes: 5 },
    { label: '15M', minutes: 15 },
    { label: '1H', minutes: 60 },
    { label: '4H', minutes: 240 },
    { label: '1D', minutes: 1440 },
];

// Generate mock historical candle data
function generateMockCandles(count = 100, basePrice = 1.0850) {
    const candles = [];
    let currentPrice = basePrice;
    const now = Date.now();

    for (let i = count; i >= 0; i--) {
        const volatility = 0.0008;
        const open = currentPrice;
        const change = (Math.random() - 0.5) * volatility;
        const high = open + Math.abs(change) + Math.random() * volatility * 0.5;
        const low = open - Math.abs(change) - Math.random() * volatility * 0.5;
        const close = open + change;

        candles.push({
            time: Math.floor((now - i * 60000) / 1000),
            open: parseFloat(open.toFixed(5)),
            high: parseFloat(high.toFixed(5)),
            low: parseFloat(low.toFixed(5)),
            close: parseFloat(close.toFixed(5)),
        });

        currentPrice = close;
    }

    return candles;
}

export default function CandlestickChart({ symbol = 'EUR/USD', onPriceUpdate, trades = [] }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const candleSeriesRef = useRef(null);
    const candleDataRef = useRef([]);
    const [activeTimeframe, setActiveTimeframe] = useState('15M');
    const [currentPrice, setCurrentPrice] = useState(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Create chart with new v5 API
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#8b8b9a',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: 'rgba(0, 242, 255, 0.3)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#0d0d12',
                },
                horzLine: {
                    color: 'rgba(0, 242, 255, 0.3)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#0d0d12',
                },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.05)',
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.05)',
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: { vertTouchDrag: false },
        });

        chartRef.current = chart;

        // Add candlestick series using new v5 unified API
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#ccff00',      // var(--acid-lime)
            downColor: '#ff0f42',    // var(--hyper-red)
            borderUpColor: '#ccff00',
            borderDownColor: '#ff0f42',
            wickUpColor: '#ccff00',
            wickDownColor: '#ff0f42',
        });

        candleSeriesRef.current = candleSeries;

        // Set initial data
        const initialData = generateMockCandles(100);
        candleDataRef.current = initialData;
        candleSeries.setData(initialData);

        if (initialData.length > 0) {
            const lastCandle = initialData[initialData.length - 1];
            setCurrentPrice(lastCandle.close);
            onPriceUpdate?.(lastCandle.close);
        }

        // Fit content
        chart.timeScale().fitContent();

        // Initial markers update
        updateTradeMarkers(candleSeries, trades);

        // Simulate real-time updates
        const updateInterval = setInterval(() => {
            if (candleDataRef.current.length === 0) return;

            const lastCandle = candleDataRef.current[candleDataRef.current.length - 1];
            const volatility = 0.0003;
            const newClose = lastCandle.close + (Math.random() - 0.5) * volatility;

            const updatedCandle = {
                ...lastCandle,
                close: parseFloat(newClose.toFixed(5)),
                high: Math.max(lastCandle.high, newClose),
                low: Math.min(lastCandle.low, newClose),
            };

            candleSeries.update(updatedCandle);
            candleDataRef.current[candleDataRef.current.length - 1] = updatedCandle;
            setCurrentPrice(updatedCandle.close);
            onPriceUpdate?.(updatedCandle.close);
        }, 1000);

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            clearInterval(updateInterval);
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [activeTimeframe, onPriceUpdate]);

    // Separate effect to update trade markers without recreating chart
    useEffect(() => {
        if (candleSeriesRef.current) {
            updateTradeMarkers(candleSeriesRef.current, trades);
        }
    }, [trades]);

    return (
        <div className="chart-container">
            <div className="chart-header">
                <div className="flex items-center gap-md">
                    <h3 className="text-title">{symbol}</h3>
                    {currentPrice && (
                        <span className="text-mono text-cyan" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                            {currentPrice.toFixed(5)}
                        </span>
                    )}
                </div>
                <div className="chart-timeframes">
                    {timeframes.map((tf) => (
                        <button
                            key={tf.label}
                            className={`timeframe-btn ${activeTimeframe === tf.label ? 'active' : ''}`}
                            onClick={() => setActiveTimeframe(tf.label)}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="chart-body" ref={chartContainerRef} />
        </div>
    );
}
