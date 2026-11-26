const db = require('../../config/database');
const {
  CEMETERY_ORIGIN_WGS84,
  SRID_WGS84,
  SRID_WEB_MERCATOR,
} = require('../../constants/cemeteryConstants');

const ORIGIN_CTE = `
  WITH origin AS (
    SELECT ST_Transform(
      ST_SetSRID(ST_MakePoint(${CEMETERY_ORIGIN_WGS84.lon}, ${CEMETERY_ORIGIN_WGS84.lat}), ${SRID_WGS84}),
      ${SRID_WEB_MERCATOR}
    ) AS pt
  )
`;

/**
 * Tự nhận diện SRID của ha_tang:
 * - Nếu là 3405 (tọa độ mét cục bộ Three.js như trên Supabase hiện tại): trả thẳng geom_3d không dịch chuyển.
 * - Nếu là 4326 (WGS84): tự quy đổi về hệ mét cục bộ quanh tâm nghĩa trang.
 */
const findAllInfrastructures = async () => {
  const sql = `
    ${ORIGIN_CTE}
    SELECT
      ht.ma_ha_tang,
      ht.ma_phan_khu,
      ht.ten_ha_tang,
      ht.loai_ha_tang,
      ht.dien_tich_xay_dung,
      ht.chieu_cao_3d,
      ht.ban_kinh_cach_ly,
      ST_AsGeoJSON(
        CASE
          WHEN ST_SRID(ht.geom_3d) = ${SRID_WGS84} THEN
            ST_Translate(ST_Transform(ST_Force2D(ht.geom_3d), ${SRID_WEB_MERCATOR}), -ST_X(origin.pt), -ST_Y(origin.pt))
          ELSE
            ht.geom_3d
        END
      )::json AS geojson
    FROM ha_tang ht
    CROSS JOIN origin
    ORDER BY ht.ma_ha_tang ASC;
  `;
  const { rows } = await db.query(sql);
  return rows;
};

/**
 * Tự nhận diện SRID của tuyen_giao_thong (3405 giữ nguyên, 4326 quy đổi).
 */
const findAllRoadSegments = async () => {
  const sql = `
    ${ORIGIN_CTE}
    SELECT
      td.ma_tuyen_duong,
      td.ma_phan_khu,
      td.ten_tuyen_duong,
      CASE WHEN td.chieu_rong_duong >= 6 THEN 'Trục chính' ELSE 'Lối đi bộ' END AS loai_duong,
      td.chieu_rong_duong,
      td.dien_tich_duong,
      ROUND(
        CASE
          WHEN ST_SRID(td.geom_3d) = ${SRID_WGS84} THEN ST_Length(ST_Transform(ST_Force2D(td.geom_3d), ${SRID_WEB_MERCATOR}))
          ELSE ST_Length(ST_Force2D(td.geom_3d))
        END::numeric,
        2
      ) AS chieu_dai_3d_m,
      ST_AsGeoJSON(
        CASE
          WHEN ST_SRID(td.geom_3d) = ${SRID_WGS84} THEN
            ST_Translate(ST_Transform(ST_Force2D(td.geom_3d), ${SRID_WEB_MERCATOR}), -ST_X(origin.pt), -ST_Y(origin.pt))
          ELSE
            td.geom_3d
        END
      )::json AS geojson
    FROM tuyen_giao_thong td
    CROSS JOIN origin
    ORDER BY td.ma_tuyen_duong ASC;
  `;
  const { rows } = await db.query(sql);
  return rows;
};

module.exports = {
  findAllInfrastructures,
  findAllRoadSegments,
};
