const db = require('../../config/database');
const { SRID_WEB_MERCATOR } = require('../../constants/cemeteryConstants');

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
      CASE WHEN chieu_rong_duong >= 6 THEN 'Trục chính' ELSE 'Lối đi bộ' END AS loai_duong,
      chieu_rong_duong,
      dien_tich_duong,
      ROUND(ST_Length(ST_Transform(ST_Force2D(geom_3d), ${SRID_WEB_MERCATOR}))::numeric, 2) AS chieu_dai_3d_m,
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
