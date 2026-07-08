"""CNN chart-pattern detection agent.

Detects technical chart patterns (head & shoulders, double top/bottom,
flags, triangles) from OHLCV data using a 1D convolutional neural network.

References from awesome-deep-trading: Pattern Detection with CNNs,
Deep Learning for Chart Pattern Recognition (Chen & Jolley).
"""

from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf

import torch
import torch.nn as nn
import torch.optim as optim

from engine.deep.base import DeepAgent

logger = logging.getLogger(__name__)

# Known chart pattern labels the CNN is trained to recognise.
PATTERN_LABELS = [
    "head_and_shoulders",
    "inverse_head_and_shoulders",
    "double_top",
    "double_bottom",
    "ascending_triangle",
    "descending_triangle",
    "bull_flag",
    "bear_flag",
    "wedge",
    "no_pattern",
]

# ---------------------------------------------------------------------------
# PyTorch 1D CNN
# ---------------------------------------------------------------------------


class _ChartCNN(nn.Module):
    """1D convolutional network for time-series pattern recognition.

    Architecture:
      Conv1D(6→32, k=5) → ReLU → MaxPool(2)
      Conv1D(32→64, k=3) → ReLU → MaxPool(2)
      Conv1D(64→64, k=3) → ReLU → GlobalAvgPool
      Dropout(0.3) → Linear(64 → len(PATTERN_LABELS))
    """

    def __init__(self, n_classes: int = len(PATTERN_LABELS)):
        super().__init__()
        self.conv1 = nn.Conv1d(in_channels=6, out_channels=32, kernel_size=5, padding=2)
        self.relu = nn.ReLU()
        self.pool = nn.MaxPool1d(2)
        self.conv2 = nn.Conv1d(32, 64, kernel_size=3, padding=1)
        self.conv3 = nn.Conv1d(64, 64, kernel_size=3, padding=1)
        self.dropout = nn.Dropout(0.3)
        self.fc = nn.Linear(64, n_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (batch, channels=6, seq_len)
        x = self.pool(self.relu(self.conv1(x)))
        x = self.pool(self.relu(self.conv2(x)))
        x = self.relu(self.conv3(x))
        # Global average pool over sequence dimension
        x = x.mean(dim=-1)  # (batch, 64)
        x = self.dropout(x)
        return self.fc(x)  # (batch, n_classes) — raw logits


# ---------------------------------------------------------------------------
# Feature builder – normalised OHLCV + volume
# ---------------------------------------------------------------------------


def _build_chart_features(df: pd.DataFrame, seq_len: int = 120) -> np.ndarray | None:
    """Extract a normalised (seq_len, 6) array from OHLCV data.

    Channels: Open, High, Low, Close, Volume (log), SMA-20 ratio.
    All channels are z-score normalised per-window for scale invariance.
    """
    if len(df) < seq_len:
        return None

    ohlcv = df[["Open", "High", "Low", "Close", "Volume"]].values[-seq_len:].copy()
    # Log-volume
    ohlcv[:, 4] = np.log1p(ohlcv[:, 4])
    # SMA ratio channel
    sma20 = pd.Series(df["Close"].values).rolling(20).mean().values[-seq_len:]
    sma_ratio = (ohlcv[:, 3] / np.where(sma20 > 1e-8, sma20, 1e-8)) - 1.0
    features = np.column_stack([ohlcv, sma_ratio])  # (seq_len, 6)

    # Per-channel z-score
    mean = features.mean(axis=0, keepdims=True)
    std = features.std(axis=0, keepdims=True) + 1e-8
    return ((features - mean) / std).astype(np.float32)


# ---------------------------------------------------------------------------
# Synthetic pattern generator for training
# ---------------------------------------------------------------------------


def _generate_synthetic_pattern(seq_len: int = 120) -> tuple[np.ndarray, int]:
    """Generate a synthetic OHLCV window with a random pattern label.

    Returns (features, label_index). Used to bootstrap the CNN when no
    labelled historical data is available.
    """
    # Base random walk with trend
    t = np.linspace(0, 4 * np.pi, seq_len)
    close = 100 + np.cumsum(np.random.randn(seq_len) * 0.5) + np.sin(t) * 2

    pattern = np.random.randint(0, len(PATTERN_LABELS) - 1)  # exclude no_pattern

    if pattern == 0:  # head_and_shoulders
        # Three peaks with middle higher
        mid = seq_len // 2
        shoulder_h = 5
        head_h = 12
        close[mid - 15 : mid - 5] += shoulder_h
        close[mid - 5 : mid + 5] += head_h
        close[mid + 5 : mid + 15] += shoulder_h
    elif pattern == 1:  # inverse_head_and_shoulders
        mid = seq_len // 2
        shoulder_h = -5
        head_h = -12
        close[mid - 15 : mid - 5] += shoulder_h
        close[mid - 5 : mid + 5] += head_h
        close[mid + 5 : mid + 15] += shoulder_h
    elif pattern == 2:  # double_top
        gap = seq_len // 3
        close[gap - 5 : gap + 5] += 10
        close[2 * gap - 5 : 2 * gap + 5] += 10
    elif pattern == 3:  # double_bottom
        gap = seq_len // 3
        close[gap - 5 : gap + 5] -= 10
        close[2 * gap - 5 : 2 * gap + 5] -= 10
    elif pattern == 4:  # ascending_triangle
        close += np.linspace(0, 8, seq_len)
        noise = np.random.randn(seq_len) * 2
        close += noise
    elif pattern == 5:  # descending_triangle
        close -= np.linspace(0, 8, seq_len)
        noise = np.random.randn(seq_len) * 2
        close += noise
    elif pattern == 6:  # bull_flag
        mid = seq_len // 2
        close[:mid] += np.linspace(0, 15, mid)
        close[mid:] += 15 + np.random.randn(seq_len - mid) * 1.5
    elif pattern == 7:  # bear_flag
        mid = seq_len // 2
        close[:mid] -= np.linspace(0, 15, mid)
        close[mid:] += -15 + np.random.randn(seq_len - mid) * 1.5
    elif pattern == 8:  # wedge
        close += np.linspace(0, 6, seq_len) * np.sin(t * 0.5)

    # Build OHLCV around the close
    vol = np.random.uniform(0.5, 2.0, seq_len) * 1e6
    ohlcv = np.column_stack([
        close - np.random.uniform(0.1, 0.5, seq_len),  # Open ≈ Close
        close + np.random.uniform(0.2, 0.8, seq_len),  # High
        close - np.random.uniform(0.2, 0.8, seq_len),  # Low
        close,
        vol,
    ])

    # Build feature array
    sma20_vals = pd.Series(close).rolling(20, min_periods=1).mean().values
    sma_ratio = (close / np.where(sma20_vals > 1e-8, sma20_vals, 1e-8)) - 1.0
    features = np.column_stack([ohlcv, sma_ratio])

    mean = features.mean(axis=0, keepdims=True)
    std = features.std(axis=0, keepdims=True) + 1e-8
    return ((features - mean) / std).astype(np.float32), pattern


# ---------------------------------------------------------------------------
# Training routine
# ---------------------------------------------------------------------------


def _train_cnn(
    seq_len: int,
    n_classes: int,
    n_synthetic: int = 5000,
    epochs: int = 30,
    batch_size: int = 64,
    lr: float = 1e-3,
) -> _ChartCNN:
    """Train a _ChartCNN on synthetic pattern data.

    Returns the trained model (on CPU).
    """
    logger.info("Generating %d synthetic training samples…", n_synthetic)
    X_list, y_list = [], []
    for _ in range(n_synthetic):
        feats, label = _generate_synthetic_pattern(seq_len)
        X_list.append(feats)  # (seq_len, 6)
        y_list.append(label)

    # Transpose for Conv1D: (batch, channels, seq_len)
    X = torch.tensor(np.stack(X_list)).permute(0, 2, 1).float()
    y = torch.tensor(np.array(y_list)).long()

    dataset = torch.utils.data.TensorDataset(X, y)
    loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)

    model = _ChartCNN(n_classes)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)

    model.train()
    for epoch in range(epochs):
        epoch_loss = 0.0
        correct = 0
        total = 0
        for batch_x, batch_y in loader:
            optimizer.zero_grad()
            logits = model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
            preds = logits.argmax(dim=1)
            correct += (preds == batch_y).sum().item()
            total += batch_y.size(0)
        acc = correct / total * 100
        if (epoch + 1) % 10 == 0:
            logger.info("  CNN epoch %d/%d loss=%.4f acc=%.1f%%", epoch + 1, epochs, epoch_loss, acc)

    return model


def _cnn_inference(
    model: _ChartCNN,
    features: np.ndarray,
) -> tuple[str, float]:
    """Run inference on a single (seq_len, 6) sample.

    Returns (predicted_pattern, confidence).
    """
    model.eval()
    # Add batch + transpose: (1, 6, seq_len)
    inp = torch.from_numpy(features).unsqueeze(0).permute(0, 2, 1).float()
    with torch.no_grad():
        logits = model(inp)  # (1, n_classes)
        probs = torch.softmax(logits, dim=1).squeeze(0)
        pred_idx = probs.argmax().item()
        confidence = probs[pred_idx].item()
    return PATTERN_LABELS[pred_idx], confidence


# ---------------------------------------------------------------------------
# Rule-based pattern confirmation (heuristic fallback)
# ---------------------------------------------------------------------------


def _rule_based_patterns(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Simple rule-based pattern detection as a lightweight check.

    Returns a list of pattern dicts with ``name`` and ``confidence``.
    These are used to augment the CNN output, not replace it.
    """
    patterns: list[dict[str, Any]] = []
    close = df["Close"].values
    high = df["High"].values
    low = df["Low"].values
    n = len(close)

    if n < 50:
        return patterns

    # --- Double top: two peaks within 5% with a valley in between ---
    half = n // 2
    left_peak = float(np.max(high[:half]))
    right_peak = float(np.max(high[half:]))
    if abs(left_peak / right_peak - 1) < 0.03 and left_peak > 0:
        valley = float(np.min(low[half // 2 : half + half // 2]))
        if valley / left_peak < 0.97:
            patterns.append({"name": "potential_double_top", "confidence": 0.4})

    # --- Double bottom ---
    left_trough = float(np.min(low[:half]))
    right_trough = float(np.min(low[half:]))
    if abs(left_trough / right_trough - 1) < 0.03 and left_trough > 0:
        peak_valley = float(np.max(high[half // 2 : half + half // 2]))
        if left_trough / peak_valley < 0.97:
            patterns.append({"name": "potential_double_bottom", "confidence": 0.4})

    # --- Bull flag: sharp rise then consolidation ---
    leg1 = close[n // 3] - close[0]
    leg2 = close[-1] - close[n // 3]
    if leg1 > 0 and abs(leg2) < abs(leg1) * 0.3:
        patterns.append({"name": "potential_bull_flag", "confidence": 0.35})

    # --- Bear flag: sharp drop then consolidation ---
    if leg1 < 0 and abs(leg2) < abs(leg1) * 0.3:
        patterns.append({"name": "potential_bear_flag", "confidence": 0.35})

    return patterns


# ---------------------------------------------------------------------------
# CNN Trading Agent
# ---------------------------------------------------------------------------


class CNNPatternAgent(DeepAgent):
    """CNN-based chart-pattern detection agent.

    Bootstraps itself with synthetic training data on first load, then
    runs inference on real price windows.  A rule-based heuristic check
    runs alongside to catch patterns the CNN might miss.

    Caches one trained model globally (not per-symbol) since patterns
    are scale-invariant.
    """

    SEQ_LEN = 120  # ~6 months of daily data
    N_SYNTHETIC = 5000
    TRAIN_EPOCHS = 30

    def __init__(self) -> None:
        super().__init__("cnn_pattern_agent")
        self._executor = ThreadPoolExecutor(max_workers=1)
        self._model: _ChartCNN | None = None
        self._model_lock = asyncio.Lock()

    # ------------------------------------------------------------------
    # DeepAgent hooks
    # ------------------------------------------------------------------

    async def _load_impl(self) -> bool:
        """Train CNN on synthetic patterns (runs in thread pool)."""
        loop = asyncio.get_event_loop()
        try:
            model = await loop.run_in_executor(
                self._executor,
                _train_cnn,
                self.SEQ_LEN,
                len(PATTERN_LABELS),
                self.N_SYNTHETIC,
                self.TRAIN_EPOCHS,
            )
            self._model = model
            logger.info("CNNPatternAgent loaded (synthetic training complete)")
            return True
        except Exception as exc:
            logger.error("CNNPatternAgent load failed: %s", exc)
            return False

    async def _analyze_impl(self, symbol: str, context: dict[str, Any]) -> dict[str, Any]:
        if self._model is None:
            return {"error": "CNN model not loaded", "confidence": 0.0, "signal": "neutral"}

        # Fetch price data
        df = await asyncio.get_event_loop().run_in_executor(
            self._executor, _fetch_cnn_data, symbol,
        )
        if df is None or len(df) < self.SEQ_LEN:
            return {
                "error": f"Insufficient data for {symbol} (need {self.SEQ_LEN} bars)",
                "confidence": 0.0,
                "signal": "neutral",
                "report": f"Need at least {self.SEQ_LEN} days of data for {symbol}.",
            }

        # Build features
        features = _build_chart_features(df, self.SEQ_LEN)
        if features is None:
            return {
                "error": "Feature extraction failed",
                "confidence": 0.0,
                "signal": "neutral",
            }

        # CNN inference
        pattern, confidence = await asyncio.get_event_loop().run_in_executor(
            self._executor, _cnn_inference, self._model, features,
        )

        # Rule-based heuristic augmentation
        rule_patterns = await asyncio.get_event_loop().run_in_executor(
            self._executor, _rule_based_patterns, df,
        )

        # Signal mapping
        bullish_patterns = {"bull_flag", "ascending_triangle", "double_bottom", "inverse_head_and_shoulders"}
        bearish_patterns = {"bear_flag", "descending_triangle", "double_top", "head_and_shoulders"}

        if pattern in bullish_patterns and confidence > 0.5:
            signal = "bullish"
        elif pattern in bearish_patterns and confidence > 0.5:
            signal = "bearish"
        else:
            signal = "neutral"

        # Build report
        report_parts = [
            f"## CNN Chart Pattern Analysis — {symbol}",
            f"**Detected Pattern**: {pattern} (confidence {confidence:.1%})",
            f"**Signal**: {signal.upper()}",
            "",
        ]
        if rule_patterns:
            report_parts.append("**Rule-based Confirmation**:")
            for rp in rule_patterns:
                report_parts.append(f"  - {rp['name']} ({rp['confidence']:.0%})")
            report_parts.append("")

        report_parts.extend([
            f"**Window**: {self.SEQ_LEN} trading days",
            f"**Features**: OHLCV, log-volume, SMA-20 ratio",
            f"**Training Data**: {self.N_SYNTHETIC} synthetic samples",
        ])

        return {
            "report": "\n".join(report_parts),
            "confidence": round(confidence, 4),
            "signal": signal,
            "pattern": pattern,
            "rule_patterns": rule_patterns,
        }

    async def close(self) -> None:
        self._model = None


# ---------------------------------------------------------------------------
# Standalone helpers
# ---------------------------------------------------------------------------


def _fetch_cnn_data(symbol: str) -> pd.DataFrame | None:
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period="1y")
        if df.empty or len(df) < 60:
            return None
        return df
    except Exception as exc:
        logger.warning("yfinance fetch failed for %s: %s", symbol, exc)
        return None
