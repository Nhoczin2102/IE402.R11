const dotenv = require('dotenv');

dotenv.config();

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const dbHost = process.env.DB_HOST || 'localhost';
const isLocalDb = dbHost === 'localhost' || dbHost === '127.0.0.1';

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseNumber(process.env.PORT, 5001),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: Object.freeze({
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.RATE_LIMIT_MAX, 300),
  }),
  db: Object.freeze({
    host: dbHost,
    port: parseNumber(process.env.DB_PORT, isLocalDb ? 5433 : 5432),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: parseBoolean(process.env.DB_SSL, !isLocalDb),
    max: parseNumber(process.env.DB_POOL_MAX, isLocalDb ? 20 : 8),
    idleTimeoutMillis: parseNumber(process.env.DB_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: parseNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 20000),
  }),
});

const validateEnv = () => {
  const missing = [];
  if (!env.db.host) missing.push('DB_HOST');
  if (!env.db.user) missing.push('DB_USER');
  if (!env.db.password) missing.push('DB_PASSWORD');
  if (!env.db.database) missing.push('DB_NAME');

  if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường bắt buộc trong tệp .env: ${missing.join(', ')}.`);
  }
};

module.exports = { env, validateEnv };