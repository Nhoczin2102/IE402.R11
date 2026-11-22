const { env, validateEnv } = require('./config/env');
const { checkDatabaseHealth, closePool } = require('./config/database');
const app = require('./app');

let server;

const startServer = async () => {
  validateEnv();

  try {
    const dbInfo = await checkDatabaseHealth();
    console.log(`[PostgreSQL] Kết nối thành công — PostGIS: ${dbInfo.postgis_version}`);
  } catch (err) {
    console.warn(
      `[PostgreSQL] Cảnh báo: Chưa kết nối được CSDL khi khởi động (${err.message}). Máy chủ vẫn chạy để kiểm tra /health.`
    );
  }

  server = app.listen(env.port, () => {
    console.log(
      `[WebGIS 3D Backend] Đang chạy (${env.nodeEnv}) tại http://localhost:${env.port}`
    );
  });
};

const gracefulShutdown = async (signal) => {
  console.log(`\n[Shutdown] Nhận tín hiệu ${signal}. Đang đóng kết nối an toàn...`);

  const forceExitTimer = setTimeout(() => {
    console.error('[Shutdown] Quá thời gian chờ, buộc dừng tiến trình.');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await closePool();
    console.log('[Shutdown] Đã đóng HTTP server và PostgreSQL Pool sạch sẽ.');
    process.exit(0);
  } catch (err) {
    console.error('[Shutdown] Lỗi khi đóng kết nối:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer().catch((err) => {
  console.error('[Startup Error]', err.message);
  process.exit(1);
});
