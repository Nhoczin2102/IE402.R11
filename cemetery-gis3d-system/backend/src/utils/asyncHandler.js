/**
 * Bọc controller bất đồng bộ để tự động chuyển ngoại lệ sang middleware errorHandler.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
