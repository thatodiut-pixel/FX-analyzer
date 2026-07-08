const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const zmq = require('zeromq');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// Secure CORS - Only allow the Vercel frontend and local development
const allowedOrigins = [
    'http://localhost:3000',
    'https://frontend-jjh4l1mja-sellomakgatho121-2317s-projects.vercel.app'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl) or allowed origins
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST']
}));
app.use(express.json());

// --- API Key Protection Middleware ---
// Protects all backend routes from public access
const API_KEY = process.env.API_KEY || 'fx-analyzer-secure-key-2026';

app.use((req, res, next) => {
    // Health check and vibe-research are public
    if (req.path === '/api/health' || req.path === '/api/vibe-research') return next();

    const clientKey = req.headers['x-api-key'];
    if (!clientKey || clientKey !== API_KEY) {
        return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
    }
    next();
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

// --- Database Connection ---
const dbPath = path.resolve(__dirname, '../fx_analyzer.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error opening database:', err.message);
    else console.log('📁 Connected to SQLite database:', dbPath);
});

// DB Helpers (Promisified)
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});

// --- Helper Functions ---
const basePrices = {
    // Major FX
    'EURUSD': 1.0865, 'GBPUSD': 1.2678, 'USDJPY': 155.42,
    'AUDUSD': 0.6534, 'USDCHF': 0.8876, 'USDCAD': 1.3521, 'NZDUSD': 0.5942,
    // Cross FX (subset for ticker)
    'EURGBP': 0.8570, 'EURJPY': 168.85, 'GBPJPY': 197.00,
    // Commodities
    'XAUUSD': 3045.50, 'XAGUSD': 33.85, 'XTIUSD': 68.72, 'XBRUSD': 72.15,
    'XNGUSD': 3.92, 'XCUUSD': 4.28,
    // Indices
    'US30': 42850, 'US500': 5780, 'NAS100': 20150,
};

// Formatting helper for different asset types
function getDecimals(symbol) {
    if (['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY'].includes(symbol)) return 2;
    if (['XAUUSD', 'XPTUSD', 'XPDUSD', 'XTIUSD', 'XBRUSD'].includes(symbol)) return 2;
    if (['XAGUSD', 'XNGUSD', 'XCUUSD'].includes(symbol)) return 3;
    if (['US30', 'US500', 'NAS100', 'UK100', 'GER40', 'JPN225'].includes(symbol)) return 0;
    return 5;
}

function formatSymbolDisplay(symbol) {
    // Indices don't need splitting
    if (['US30', 'US500', 'NAS100', 'UK100', 'GER40', 'JPN225'].includes(symbol)) return symbol;
    if (symbol.length === 6) return symbol.slice(0, 3) + '/' + symbol.slice(3);
    return symbol;
}

function generateTickerData() {
    return Object.entries(basePrices).map(([symbol, basePrice]) => {
        const volatility = basePrice > 1000 ? 0.001 : 0.002;
        const change = (Math.random() - 0.5) * volatility * basePrice;
        const newPrice = basePrice + change;
        const changePercent = ((change / basePrice) * 100).toFixed(2);
        const decimals = getDecimals(symbol);

        return {
            symbol: formatSymbolDisplay(symbol),
            price: newPrice.toFixed(decimals),
            change: `${parseFloat(changePercent) >= 0 ? '+' : ''}${changePercent}%`,
            positive: parseFloat(changePercent) >= 0,
        };
    });
}


// --- ZeroMQ Subscriber (Python Bridge) ---
async function startZMQ() {
    const sock = new zmq.Subscriber();

    try {
        sock.connect("tcp://127.0.0.1:5555");
        sock.subscribe("signal");
        sock.subscribe("ticker");
        sock.subscribe("vibe-research");
        console.log("🔌 Connected to Python Engine via ZeroMQ");

        for await (const parts of sock) {
            let topicStr = "";
            let msgStr = "";

            if (parts.length >= 2) {
                topicStr = parts[0].toString();
                msgStr = parts[1].toString();
            } else if (parts.length === 1) {
                const fullStr = parts[0].toString();
                const spaceIndex = fullStr.indexOf(' ');
                if (spaceIndex !== -1) {
                    topicStr = fullStr.substring(0, spaceIndex);
                    msgStr = fullStr.substring(spaceIndex + 1);
                } else {
                    topicStr = fullStr;
                }
            } else {
                continue;
            }

            try {
                const data = JSON.parse(msgStr);

                if (topicStr === 'signal') {
                    // Signal is already stored in DB by Python
                    // Only emit to premium subscribers
                    io.to('premium').emit('fx-signal', data);
                    console.log(`📊 [PY-SIGNAL] ${data.symbol} ${data.action} @ ${data.price} -> PREMIUM`);
                } else if (topicStr === 'ticker') {
                    if (basePrices[data.symbol.replace('/', '')]) {
                        basePrices[data.symbol.replace('/', '')] = data.price;
                    }
                } else if (topicStr === 'vibe-research') {
                    io.emit('vibe-research-update', data);
                    console.log(`🔬 [PY-RESEARCH] New Vibe research update: ${data.run_type} -> ${data.status}`);
                }
            } catch (e) {
                console.error("Error parsing ZMQ message:", e);
            }
        }
    } catch (err) {
        console.error("ZMQ Connection Error:", err);
    }
}

startZMQ();

// --- Admin: List Users ---
app.get('/api/admin/users', async (req, res) => {
    try {
        const rows = await dbAll("SELECT id, email, name, role, subscription_status, created_at FROM users");
        return res.json(rows || []);
    } catch (err) {
        console.error("Admin Users DB Error:", err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// --- Admin: Upgrade User Subscription ---
app.post('/api/admin/upgrade', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    try {
        await dbRun("UPDATE users SET subscription_status = 'active' WHERE email = ?", [email]);
        return res.json({ success: true, message: `Upgraded ${email}` });
    } catch (err) {
        console.error("Admin Upgrade DB Error:", err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// --- ZMQ Engine Communication ---
const zmqReq = new zmq.Request();
let zmqReqConnected = false;

async function sendCommand(payload) {
    if (!zmqReqConnected) {
        console.log("Connecting to Engine Command Socket...");
        zmqReq.connect("tcp://127.0.0.1:5556");
        zmqReqConnected = true;
    }
    try {
        await zmqReq.send(JSON.stringify(payload));
        const [result] = await zmqReq.receive();
        return JSON.parse(result.toString());
    } catch (e) {
        console.error("ZMQ Command Failed:", e);
        return { status: "error", message: "Engine Unreachable" };
    }
}

// --- WebSocket Connection Handling ---
io.on('connection', async (socket) => {
    console.log('✅ Client connected:', socket.id, 'User:', socket.user?.token || 'anonymous');

    socket.join('premium');

    // Send initial data
    socket.emit('ticker-update', generateTickerData());

    // Fetch recent history from DB
    try {
        const rows = await dbAll('SELECT * FROM signals ORDER BY timestamp DESC LIMIT 10');
        // Transform DB rows back to API format (merging raw_data if available)
        const history = rows.map(r => {
            try {
                return { ...JSON.parse(r.raw_data), id: r.id };
            } catch (e) {
                return r; // Fallback
            }
        });
        socket.emit('signal-history', history.reverse()); // Frontend expects oldest -> newest usually
    } catch (e) {
        console.error("Error fetching history:", e);
    }

    const tickerInterval = setInterval(() => {
        socket.emit('ticker-update', generateTickerData());
    }, 2000);

    // --- Risk Management Settings ---
    let riskSettings = {
        maxDailyDrawdown: 500, // USD
        maxOpenPositions: 3,
        maxRiskPerTrade: 2, // Percent
        tradingEnabled: true
    };

    // Calculate current stats from DB
    async function getDailyStats() {
        const today = new Date().toISOString().split('T')[0];
        try {
            // Need to store PL in trades table properly. 
            // The table schema has: pl REAL check database.py
            const trades = await dbAll("SELECT pl, status FROM trades WHERE timestamp LIKE ? || '%'", [today]);

            const profitLoss = trades.reduce((acc, t) => acc + (t.pl || 0), 0);
            const openPositions = trades.filter(t => t.status === 'open').length; // Check 'open' casing in DB logic

            return { profitLoss, openPositions };
        } catch (e) {
            console.error("Stats DB Error:", e);
            return { profitLoss: 0, openPositions: 0 };
        }
    }

    // Handle trade execution request
    socket.on('execute-trade', async (tradeData) => {
        console.log('📈 Trade execution requested:', tradeData);

        // 1. RISK SHIELD CHECK
        if (!riskSettings.tradingEnabled) {
            socket.emit('trade-rejected', { reason: 'Trading is globally disabled via Risk Shield.' });
            return;
        }

        const stats = await getDailyStats();

        // Check Max Open Positions (Simulated)
        // With DB, we could count real open positions. For now, trust stats.
        if (stats.openPositions >= riskSettings.maxOpenPositions) {
            socket.emit('trade-rejected', { reason: `Max open positions (${riskSettings.maxOpenPositions}) reached.` });
            return;
        }

        // Check Daily Drawdown
        if (stats.profitLoss <= -riskSettings.maxDailyDrawdown) {
            socket.emit('trade-rejected', { reason: `Daily drawdown limit ($${riskSettings.maxDailyDrawdown}) reached.` });
            return;
        }

        // Execute via Python Engine
        try {
            const cleanSymbol = tradeData.symbol.replace('/', '');
            console.log(`Sending execution to engine: ${cleanSymbol} ${tradeData.action}`);
            
            const result = await sendCommand({
                cmd: 'EXECUTE_TRADE',
                symbol: cleanSymbol,
                action: tradeData.action,
                volume: tradeData.volume || 0.01
            });

            if (result.status === 'filled') {
                const timestamp = new Date().toISOString();
                const executedTrade = {
                    ...tradeData,
                    executedAt: timestamp,
                    status: 'open', // Real positions are open
                    executionPrice: tradeData.price, // Using requested price for logging since MT5 doesn't return exact fill price synchronously in basic executor
                    pl: 0,
                    plType: 'neutral',
                    ticket: result.ticket
                };

                // Store in DB
                await dbRun(`
                   INSERT INTO trades (timestamp, symbol, action, entry_price, pl, status)
                   VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    timestamp,
                    executedTrade.symbol,
                    executedTrade.action,
                    executedTrade.price,
                    0,
                    'open'
                ]);

                socket.emit('trade-executed', executedTrade);
                console.log('✅ Real Trade executed & stored:', executedTrade);

                // Emit updated stats
                io.emit('risk-stats-update', await getDailyStats());

            } else {
                console.error("Execution Rejected by Engine:", result.message);
                socket.emit('trade-rejected', { reason: result.message || 'Engine rejected trade.' });
            }
        } catch (e) {
            console.error("Execution Communication Error:", e);
            socket.emit('trade-rejected', { reason: 'Error communicating with Python execution engine.' });
        }
    });

    // Handle Risk Settings Updates from Frontend
    socket.on('update-risk-settings', (newSettings) => {
        riskSettings = { ...riskSettings, ...newSettings };
        console.log('🛡️ Risk Settings Updated:', riskSettings);
        io.emit('risk-settings-updated', riskSettings);
    });

    socket.on('get-llm-models', async () => {
        const result = await sendCommand({ cmd: 'GET_MODELS' });
        if (result.status === 'ok') {
            socket.emit('llm-models-list', result.models_list || []);
        }
    });

    // MT5 Account Status & Management
    socket.on('mt5-get-status', async () => {
        const result = await sendCommand({ cmd: 'MT5_STATUS' });
        if (result.status === 'ok') {
            socket.emit('mt5-status', result.info);
        } else {
            socket.emit('mt5-status', { connected: false, account: null, server: null, balance: 0, equity: 0 });
        }
    });

    socket.on('mt5-reconnect', async () => {
        console.log('🔄 MT5 Reconnect requested');
        const result = await sendCommand({ cmd: 'MT5_RECONNECT' });
        if (result.status === 'ok') {
            socket.emit('mt5-status', {
                connected: result.connected,
                account: null,
                server: null,
                balance: 0,
                equity: 0,
            });
            socket.emit('notification', {
                type: result.connected ? 'success' : 'error',
                title: 'MT5 Connection',
                message: result.message,
            });
        }
    });

    socket.on('switch-llm-model', async (modelName) => {
        console.log('Switching LLM to:', modelName);
        const result = await sendCommand({ cmd: 'SET_LLM_MODEL', model: modelName });

        // Notify all clients of the change
        if (result.status === 'ok') {
            io.emit('notification', { type: 'success', title: 'Model Switched', message: result.message });
            io.emit('model-changed', modelName);
        } else {
            socket.emit('notification', { type: 'error', title: 'Switch Failed', message: result.message });
        }
    });

    socket.on('disconnect', () => {
        clearInterval(tickerInterval);
        console.log('❌ Client disconnected:', socket.id);
    });
});

// --- REST API Endpoints ---
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        connections: io.engine.clientsCount,
        db: db ? 'connected' : 'disconnected'
    });
});

app.get('/api/vibe-research', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM vibe_research ORDER BY id DESC LIMIT 10');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/signals', async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    try {
        const rows = await dbAll('SELECT * FROM signals ORDER BY timestamp DESC LIMIT ?', [limit]);
        const signals = rows.map(r => {
            try {
                return { ...JSON.parse(r.raw_data), id: r.id };
            } catch (e) { return r; }
        });
        res.json(signals);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/trades', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM trades ORDER BY timestamp DESC LIMIT 50');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/ticker', (req, res) => {
    res.json(generateTickerData());
});

app.get('/api/stats', async (req, res) => {
    try {
        const totalTradesObj = await dbAll('SELECT COUNT(*) as count FROM trades');
        const totalTrades = totalTradesObj[0].count;

        const winningTradesObj = await dbAll('SELECT COUNT(*) as count FROM trades WHERE pl > 0');
        const winningTrades = winningTradesObj[0].count;

        const totalProfitObj = await dbAll('SELECT SUM(pl) as total FROM trades');
        const totalProfit = totalProfitObj[0].total || 0;

        const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : 0;

        res.json({
            totalTrades,
            winningTrades,
            totalProfit: totalProfit.toFixed(2),
            winRate: parseFloat(winRate)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Server Start ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`\n🚀 FX Analyzer Bridge Server running on port ${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   REST API:  http://localhost:${PORT}/api/health\n`);
});
