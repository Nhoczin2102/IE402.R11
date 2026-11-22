const db = require('../../config/database');

/**
 * Truy vấn các tuyến đường 3D từ bảng tuyen_giao_thong để phục vụ phân tích mạng lưới.
 */
const findRoadNetworkLines = async () => {
  const sql = `
    SELECT
      ma_tuyen_duong,
      ten_tuyen_duong,
      loai_duong,
      chieu_rong_duong,
      ST_AsGeoJSON(geom_3d)::json AS geojson
    FROM tuyen_giao_thong
    ORDER BY ma_tuyen_duong ASC;
  `;
  const { rows } = await db.query(sql);
  return rows;
};

module.exports = {
  findRoadNetworkLines,
};
