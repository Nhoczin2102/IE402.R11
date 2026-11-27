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
 * Truy vấn các tuyến đường 3D từ bảng tuyen_giao_thong (tự nhận diện SRID 3405 vs 4326)
 * để dựng đồ thị mạng lưới giao thông động phục vụ Dijkstra 3D.
 */
const findRoadNetworkLines = async () => {
  const sql = `
    ${ORIGIN_CTE}
    SELECT
      td.ma_tuyen_duong,
      td.ten_tuyen_duong,
      CASE WHEN td.chieu_rong_duong >= 6 THEN 'Trục chính' ELSE 'Lối đi bộ' END AS loai_duong,
      td.chieu_rong_duong,
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
  findRoadNetworkLines,
};
