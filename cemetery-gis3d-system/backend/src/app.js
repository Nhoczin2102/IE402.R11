const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { env } = require('./config/env');
const requestIdMiddleware = require('./middlewares/requestId');
const requestLogger = require('./middlewares/requestLogger');
const notFoundHandler = require('./middlewares/notFoundHandler');
const errorHandler = require('./middlewares/errorHandler');
const healthRoutes = require('./modules/health/health.routes');
const docsRoutes = require('./modules/docs/docs.routes');
const apiRoutes = require('./modules');

const app = express();

// 1. Bảo mật HTTP header & nén phản hồi GeoJSON
app.use(helmet());
app.use(compression());

// 2. Gắn X-Request-Id cho mọi request để truy vết log & lỗi
app.use(requestIdMiddleware);

// 3. Cấu hình CORS cho Frontend React/Next.js
app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['X-Request-Id', 'X-Cache'],
  })
);

// 4. Giới hạn tần suất truy cập chống spam API
const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    error: 'Quá nhiều yêu cầu từ địa chỉ IP này. Vui lòng thử lại sau ít phút.',
  },
});

// 5. Parse JSON body & ghi log request có cấu trúc
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// 6. Gắn các nhóm tuyến đường
app.use('/', docsRoutes);
app.use('/health', healthRoutes);
app.use('/api', apiLimiter, apiRoutes);

// 7. Xử lý 404 & lỗi tập trung
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
