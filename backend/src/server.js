require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');

// Initialise SQLite (creates tables on first run)
require('./config/database');

const routes       = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:19006',
      /^http:\/\/192\.168\./,
      /^http:\/\/10\.0\./,
      /^exp:\/\//,
    ],
    credentials: true,
  })
);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
app.use('/api/v1/auth', authLimiter);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
app.use('/api/v1', apiLimiter);

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'FocusFlow API is running (SQLite)' });
});

app.use('/api/v1', routes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`FocusFlow API running on http://${HOST}:${PORT} [SQLite]`);
  console.log(`For mobile devices, use your PC's local IP address instead of ${HOST}`);
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
