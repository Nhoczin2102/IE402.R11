const AppError = require('./AppError');

const PG_ERROR_MAP = {
  '23505': {
    statusCode: 409,
    code: 'DB_DUPLICATE_KEY',
    message: 'Dữ liệu bị trùng khóa duy nhất trong cơ sở dữ liệu.',
  },
  '23503': {
    statusCode: 400,
    code: 'DB_FOREIGN_KEY_VIOLATION',
    message: 'Tham chiếu khóa ngoại không hợp lệ hoặc đối tượng liên quan không tồn tại.',
  },
  '23514': {
    statusCode: 400,
    code: 'DB_CHECK_VIOLATION',
    message: 'Dữ liệu vi phạm ràng buộc kiểm tra (CHECK constraint) của hệ thống.',
  },
  '22P02': {
    statusCode: 400,
    code: 'DB_INVALID_INPUT_SYNTAX',
    message: 'Định dạng dữ liệu đầu vào không hợp lệ.',
  },
  '22023': {
    statusCode: 400,
    code: 'DB_INVALID_GEOMETRY',
    message: 'Tham số hình học PostGIS 3D không hợp lệ.',
  },
};

const mapPgError = (err) => {
  if (!err || !err.code || !PG_ERROR_MAP[err.code]) {
    return null;
  }
  const mapped = PG_ERROR_MAP[err.code];
  return new AppError(mapped.message, mapped.statusCode, mapped.code, err.detail || null);
};

module.exports = { mapPgError };
