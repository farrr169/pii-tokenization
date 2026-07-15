const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/users.routes');
const roleRoutes = require('./modules/roles/roles.routes');
const piiTypeRoutes = require('./modules/pii-types/pii-types.routes');
const tokenMethodRoutes = require('./modules/tokenization-methods/tokenization-methods.routes');
const tokenRuleRoutes = require('./modules/tokenization-rules/tokenization-rules.routes');
const tweakRoutes = require('./modules/tweaks/tweaks.routes');
const tokenizationRoutes = require('./modules/tokenization/tokenization.routes');
const jobRoutes = require('./modules/jobs/jobs.routes');
const auditRoutes = require('./modules/audit-logs/audit-logs.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const { errorMiddleware } = require('./middlewares/error.middleware');
const { startRetentionJob } = require('./jobs/retention.job');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { status: 'error', message: 'Terlalu banyak request, coba lagi nanti.' }
});
app.use('/api/', limiter);

// Logging & parsing
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/pii-types', piiTypeRoutes);
app.use('/api/tokenization-methods', tokenMethodRoutes);
app.use('/api/tokenization-rules', tokenRuleRoutes);
app.use('/api/tweaks', tweakRoutes);
app.use('/api/tokenization', tokenizationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route tidak ditemukan' });
});

// Global error handler
app.use(errorMiddleware);

// Start scheduled jobs
startRetentionJob();

module.exports = app;
