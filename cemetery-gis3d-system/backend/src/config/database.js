const { Pool } = require('pg');
const { env } = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  max: env.db.max,
  idleTimeoutMillis: env.db.idleTimeoutMillis,
  connectionTimeoutMillis: env.db.connectionTimeoutMillis,
  // Đọc trực tiếp từ env.db.ssl (tự bật SSL cho Supabase, tắt cho localhost)
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
  // Đảm bảo tìm thấy hàm PostGIS ngay cả khi Supabase cài extension ở schema extensions
  options: '-c search_path=public,extensions',
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error] Lỗi kết nối nền không mong đợi:', err.message);
});

/**
 * Thực thi truy vấn SQL có tham số hóa (chống SQL Injection).
 */
const query = (text, params = []) => pool.query(text, params);

/**
 * Bọc giao dịch nguyên tử (BEGIN / COMMIT / ROLLBACK) và luôn giải phóng client.
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Kiểm tra trạng thái sẵn sàng của PostgreSQL + tiện ích PostGIS.
 */
const checkDatabaseHealth = async () => {
  const { rows } = await pool.query(
    `SELECT NOW() AS server_time, PostGIS_Version() AS postgis_version;`
  );
  return rows[0];
};

const closePool = async () => {
  await pool.end();
};

module.exports = {
  pool,
  query,
  withTransaction,
  checkDatabaseHealth,
  closePool,
};