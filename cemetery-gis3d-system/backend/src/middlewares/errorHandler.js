const { env } = require('../config/env');
const { mapPgError } = require('../utils/pgErrorMapper');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const mappedPgError = mapPgError(err);
  const normalizedError = mappedPgError || err;

  const statusCode = normalizedError.statusCode || 500;
  const code = normalizedError.code || 'INTERNAL_SERVER_ERROR';
  const message =
    statusCode >= 500 && env.isProduction
      ? 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.'
      : normalizedError.message || 'Đã xảy ra lỗi không xác định.';

  if (statusCode >= 500) {
    console.error(`[ERROR ${statusCode}] ${req.method} ${req.originalUrl}:`, err);
  }

  const responseBody = {
    success: false,
    code,
    error: message,
  };

  if (normalizedError.details) {
    responseBody.details = normalizedError.details;
  }

  if (!env.isProduction && statusCode >= 500 && err.stack) {
    responseBody.stack = err.stack;
  }

  return res.status(statusCode).json(responseBody);
};

module.exports = errorHandler;
