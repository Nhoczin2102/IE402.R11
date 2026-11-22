const dotenv = require('dotenv');

dotenv.config();

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseNumber(process.env.PORT, 5000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: Object.freeze({
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.RATE_LIMIT_MAX, 300),
  }),
  db: Object.freeze({
    host: process.env.DB_HOST || 'localhost',
    port: parseNumber(process.env.DB_PORT, 5433),
    database: process.env.DB_NAME || 'cemetery_gis3d',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: parseNumber(process.env.DB_POOL_MAX, 20),
    idleTimeoutMillis: parseNumber(process.env.DB_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: parseNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 5000),
  }),
});

const validateEnv = () => {
  const missing = [];
  if (!env.db.user) missing.push('DB_USER');
  if (!env.db.password) missing.push('DB_PASSWORD');
  if (!env.db.database) missing.push('DB_NAME');

  if (missing.length > 0) {
    throw new Error(
      `Thiếu biến môi trường bắt buộc trong tệp .env: ${missing.join(', ')}. Vui lòng tạo .env từ .env.example.`
    );
  }
};

module.exports = { env, validateEnv };
