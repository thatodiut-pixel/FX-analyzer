import MetaTrader5 as mt5
import pandas as pd
import numpy as np
import random
from datetime import datetime
import logging
import yfinance as yf

# Mapping between internal symbols and Yahoo Finance tickers
YF_MAPPING = {
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "USDJPY=X",
    "AUDUSD": "AUDUSD=X",
    "BTCUSD": "BTC-USD",
    "ETHUSD": "ETH-USD",
    "US30": "^DJI",
    "US500": "^GSPC",
    "AAPL": "AAPL",
    "TSLA": "TSLA"
}

class DataFeed:
    """
    Handles data ingestion from MetaTrader 5 or falls back to Yahoo Finance / mock data.
    """
    def __init__(self):
        self.use_mt5 = False
        self.initialize_mt5()

    def initialize_mt5(self):
        try:
            if mt5.initialize():
                logging.info("DataFeed: MT5 Initialized Successfully")
                self.use_mt5 = True
            else:
                logging.warning(f"DataFeed: MT5 Init Failed ({mt5.last_error()}), falling back to Yahoo Finance")
                self.use_mt5 = False
        except Exception as e:
            logging.error(f"DataFeed: MT5 Error {e}, falling back to Yahoo Finance")
            self.use_mt5 = False

    def fetch_data(self, symbol: str, timeframe=None, limit=500) -> pd.DataFrame:
        if timeframe is None:
            timeframe = mt5.TIMEFRAME_M1
        """
        Fetches OHLCV data. 
        """
        if self.use_mt5:
            rates = mt5.copy_rates_from_pos(symbol, timeframe, 0, limit)
            if rates is not None and len(rates) > 0:
                df = pd.DataFrame(rates)
                df['time'] = pd.to_datetime(df['time'], unit='s')
                return df[['time', 'open', 'high', 'low', 'close', 'tick_volume']]
            else:
                logging.warning(f"DataFeed: Failed to fetch {symbol} from MT5, falling back to yfinance")
                return self.fetch_yfinance_data(symbol, limit)
        
        return self.fetch_yfinance_data(symbol, limit)

    def fetch_yfinance_data(self, symbol: str, limit=500) -> pd.DataFrame:
        """
        Fetches live real-time/historical data from Yahoo Finance as a fallback.
        """
        yf_symbol = YF_MAPPING.get(symbol, symbol)
        logging.info(f"DataFeed: Fetching {symbol} ({yf_symbol}) live data from Yahoo Finance...")
        
        try:
            # Fetch 1-minute interval data (available for the last 7 days)
            ticker = yf.Ticker(yf_symbol)
            df = ticker.history(period="2d", interval="1m")
            
            if df is not None and not df.empty:
                df = df.tail(limit).reset_index()
                
                # Standardize datetime column
                time_col = 'Datetime' if 'Datetime' in df.columns else 'Date' if 'Date' in df.columns else df.columns[0]
                
                df = df.rename(columns={
                    time_col: 'time',
                    'Open': 'open',
                    'High': 'high',
                    'Low': 'low',
                    'Close': 'close',
                    'Volume': 'tick_volume'
                })
                
                # Ensure types
                df['time'] = pd.to_datetime(df['time'])
                df['open'] = df['open'].astype(float)
                df['high'] = df['high'].astype(float)
                df['low'] = df['low'].astype(float)
                df['close'] = df['close'].astype(float)
                
                # Forex volume is often 0 in yfinance. Fill with random values.
                df['tick_volume'] = df['tick_volume'].fillna(0).astype(int)
                zero_mask = df['tick_volume'] == 0
                if zero_mask.any():
                    df.loc[zero_mask, 'tick_volume'] = [random.randint(10, 100) for _ in range(zero_mask.sum())]
                
                logging.info(f"DataFeed: Successfully fetched {len(df)} live rows for {symbol} from yfinance")
                return df[['time', 'open', 'high', 'low', 'close', 'tick_volume']]
            else:
                logging.warning(f"DataFeed: Empty history from yfinance for {symbol}. Market might be closed.")
                # Fetch last daily close price to seed mock generator
                daily_history = ticker.history(period="5d")
                if not daily_history.empty:
                    last_price = float(daily_history['Close'].iloc[-1])
                    logging.info(f"DataFeed: Seeding mock data with last daily close price: {last_price}")
                    return self.generate_mock_data(symbol, start_price=last_price)
        except Exception as e:
            logging.error(f"DataFeed: yfinance error for {symbol}: {e}")
            
        logging.warning(f"DataFeed: yfinance failed for {symbol}, falling back to default mock data")
        return self.generate_mock_data(symbol)

    def generate_mock_data(self, symbol, start_price=None) -> pd.DataFrame:
        """
        Generates realistic mock data.
        """
        if start_price is not None:
            base = start_price
        else:
            # Realistic starting prices
            base = 1.0800 if 'EUR' in symbol else 1.2600 if 'GBP' in symbol else 150.00
            if 'JPY' in symbol: base = 155.00
        
        data = []
        current = base + (random.random() - 0.5) * 0.01
        
        # Determine pip size
        pip_size = 0.01 if 'JPY' in symbol or symbol in ['US30', 'US500', 'AAPL', 'TSLA'] else 0.0001
        
        start_time = int(datetime.now().timestamp()) - (500 * 60) # 500 minutes ago
        
        for i in range(500):
            open_p = current
            # Random walk
            change = (random.random() - 0.5) * (pip_size * 10)
            close_p = open_p + change
            
            high_p = max(open_p, close_p) + random.random() * (pip_size * 5)
            low_p = min(open_p, close_p) - random.random() * (pip_size * 5)
            
            # Simulated time
            t = datetime.fromtimestamp(start_time + (i * 60))
            
            data.append({
                "time": t,
                "open": open_p,
                "high": high_p,
                "low": low_p,
                "close": close_p,
                "tick_volume": random.randint(100, 1000)
            })
            current = close_p
            
        return pd.DataFrame(data)

    def shutdown(self):
        if self.use_mt5:
            mt5.shutdown()
