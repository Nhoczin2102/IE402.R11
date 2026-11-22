const AppError = require('../utils/AppError');

const notFoundHandler = (req, res, next) => {
  next(
    new AppError(
      `Không tìm thấy đường dẫn API: ${req.method} ${req.originalUrl}`,
      404,
      'ROUTE_NOT_FOUND'
    )
  );
};

module.exports = notFoundHandler;
