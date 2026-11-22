const db = require('../config/database');

const findAllInfrastructures = async () => {
  const sql = `
    SELECT
      ma_ha_tang,
      ma_phan_khu,
      ten_ha_tang,
      loai_ha_tang,
      dien_tich_xay_dung,
      chieu_cao_3d,
      ban_kinh_cach_ly,
      ST_AsGeoJSON(geom_3d)::json AS geojson
    FROM ha_tang
    ORDER BY ma_ha_tang ASC;
  `;
  const { rows } = await db.query(sql);
  return rows;
};

const findAllRoadSegments = async () => {
  const sql = `
    SELECT
      ma_tuyen_duong,
      ma_phan_khu,
      ten_tuyen_duong,
      loai_duong,
      chieu_rong_duong,
      dien_tich_duong,
      ROUND(ST_3DLength(geom_3d)::numeric, 2) AS chieu_dai_3d_m,
      ST_AsGeoJSON(geom_3d)::json AS geojson
    FROM tuyen_giao_thong
    ORDER BY ma_tuyen_duong ASC;
  `;
  const { rows } = await db.query(sql);
  return rows;
};

module.exports = {
  findAllInfrastructures,
  findAllRoadSegments,
};
