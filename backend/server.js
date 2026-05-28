require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const authRoutes    = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const orderRoutes   = require('./routes/orders');
const returnRoutes  = require('./routes/returns');
const productRoutes = require('./routes/products');
const paymentRoutes = require('./routes/payments');
const notifRoutes   = require('./routes/notifications');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 1000, standardHeaders: true, legacyHeaders: false }));

app.use('/api/auth',          authRoutes);
app.use('/api/accounts',      accountRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/returns',       returnRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/notifications', notifRoutes);

app.get('/api/health', (_req, res) => res.json({ status:'ok', timestamp: new Date().toISOString() }));

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error:'Internal server error' }); });

app.listen(PORT, () => console.log(`Meesho Panel backend running on port ${PORT}`));
