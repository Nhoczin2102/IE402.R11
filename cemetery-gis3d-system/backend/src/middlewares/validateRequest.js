const AppError = require('../utils/AppError');

/**
 * Middleware kiểm tra dữ liệu đầu vào (body / query / params) bằng Zod schema.
 */
const validateRequest = (schemas = {}) => (req, res, next) => {
  const validationErrors = [];

  for (const target of ['params', 'query', 'body']) {
    const schema = schemas[target];
    if (!schema) continue;

    const result = schema.safeParse(req[target]);
    if (!result.success) {
      for (const issue of result.error.issues) {
        validationErrors.push({
          location: target,
          field: issue.path.join('.') || target,
          message: issue.message,
        });
      }
    } else {
      req[target] = result.data;
    }
  }

  if (validationErrors.length > 0) {
    return next(
      new AppError(
        'Dữ liệu đầu vào không hợp lệ.',
        400,
        'VALIDATION_ERROR',
        validationErrors
      )
    );
  }

  return next();
};

module.exports = validateRequest;
