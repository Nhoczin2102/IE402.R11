const { env } = require('../config/env');

/**
 * Ghi log HTTP có cấu trúc (Structured Logging), kèm X-Request-Id và thời gian phản hồi.
 */
const requestLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number((Number(process.hrtime.bigint() - startTime) / 1e6).toFixed(1));
    const entry = {
      time: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      requestId: req.requestId || null,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      cache: res.getHeader('X-Cache') || undefined,
    };

    if (env.isProduction) {
      console.log(JSON.stringify(entry));
    } else {
      const cacheTag = entry.cache ? ` [${entry.cache}]` : '';
      const shortId = entry.requestId ? entry.requestId.slice(0, 8) : '--------';
      console.log(
        `[${entry.time}] [${shortId}] ${entry.method} ${entry.url} -> ${entry.statusCode} (${entry.durationMs}ms)${cacheTag}`
      );
    }
  });

  next();
};

module.exports = requestLogger;
