const crypto = require('crypto');

/**
 * Gắn mã định danh duy nhất (Correlation ID) cho mỗi HTTP request
 * giúp truy vết log và lỗi giữa Frontend và Backend.
 */
const requestIdMiddleware = (req, res, next) => {
  const incomingId = req.headers['x-request-id'];
  const requestId =
    typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId.trim().slice(0, 64)
      : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

module.exports = requestIdMiddleware;
