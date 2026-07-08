'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { TickerData } from '@/lib/socket';

Chart.register(...registerables);

interface PriceChartProps {
  ticker: TickerData[];
  symbol?: string;
}

export function PriceChart({ ticker, symbol = 'EUR/USD' }: PriceChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);

  // Find the selected symbol's data
  const selectedTicker = ticker.find((t) => t.symbol === symbol);

  useEffect(() => {
    if (selectedTicker) {
      const price = parseFloat(selectedTicker.price);
      const time = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });

      setPriceHistory((prev) => {
        const newHistory = [...prev, price];
        return newHistory.slice(-30); // Keep last 30 data points
      });

      setLabels((prev) => {
        const newLabels = [...prev, time];
        return newLabels.slice(-30);
      });
    }
  }, [selectedTicker?.price]);

  useEffect(() => {
    if (!chartRef.current || priceHistory.length < 2) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: symbol,
            data: priceHistory,
            borderColor: '#06b6d4',
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#06b6d4',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#1a1a25',
            titleColor: '#f8fafc',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(6, 182, 212, 0.3)',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => `Price: ${context.parsed.y?.toFixed(5) ?? '—'}`,
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.03)',
            },
            ticks: {
              color: '#64748b',
              font: { size: 10 },
              maxTicksLimit: 6,
            },
          },
          y: {
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.03)',
            },
            ticks: {
              color: '#64748b',
              font: { size: 10 },
              callback: (value) => Number(value).toFixed(4),
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        animation: {
          duration: 0,
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [priceHistory, labels, symbol]);

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {symbol}
          </h3>
          <p className="text-2xl font-mono font-bold text-[var(--cyan)]">
            {selectedTicker?.price || '—'}
          </p>
        </div>
        {selectedTicker && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedTicker.positive
                ? 'bg-emerald-500/10 text-[var(--emerald)]'
                : 'bg-red-500/10 text-[var(--ruby)]'
            }`}
          >
            {selectedTicker.change}
          </span>
        )}
      </div>
      
      <div className="h-[200px]">
        {priceHistory.length < 2 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Collecting price data...
          </div>
        ) : (
          <canvas ref={chartRef} />
        )}
      </div>
    </div>
  );
}
