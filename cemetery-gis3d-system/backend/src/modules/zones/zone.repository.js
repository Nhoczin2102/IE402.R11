const db = require('../../config/database');
const {
  GRAVE_STATUS,
  DB_GRAVE_STATUS,
  SRID_WGS84,
  UI_LABEL_TO_ZONE_CODE,
} = require('../../constants/cemeteryConstants');

const toTrueAreaExpr = (geomCol) => `
  CASE
    WHEN ST_SRID(${geomCol}) = ${SRID_WGS84} THEN ST_Area(ST_Force2D(${geomCol})::geography)
    ELSE ST_Area(ST_Force2D(${geomCol}))
  END
`;

const toPlanarMeterExpr = (geomCol) => `
  CASE
    WHEN ST_SRID(${geomCol}) = ${SRID_WGS84} THEN ST_Transform(ST_Force2D(${geomCol}), 3405)
    ELSE ST_Force2D(${geomCol})
  END
`;

const findAllZones = async () => {
  const sql = `
    SELECT
      pk.ma_phan_khu,
      pk.ten_phan_khu,
      pk.loai_phan_khu,
      pk.dien_tich_khu,
      ROUND((${toTrueAreaExpr('pk.geom_3d')})::numeric, 2) AS dien_tich_postgis_m2,
      pk.mat_do_mo_toi_da,
      pk.cao_do_nen_tb,
      ST_AsGeoJSON(pk.geom_3d)::json AS geojson
    FROM phan_khu pk
    ORDER BY pk.ma_phan_khu ASC;
  `;
  const { rows } = await db.query(sql);
  return rows;
};

const getZoneCapacityAnalytics = async (maPhanKhu = null) => {
  const params = [];
  let whereZone = '';
  if (maPhanKhu) {
    const altZone = UI_LABEL_TO_ZONE_CODE[maPhanKhu] || maPhanKhu;
    params.push(maPhanKhu, altZone);
    whereZone = `WHERE pk.ma_phan_khu IN ($1, $2)`;
  }

  const sql = `
    WITH lot_stats AS (
      SELECT
        l.ma_phan_khu,
        COUNT(*)::int AS tong_so_lo,
        COUNT(*) FILTER (WHERE l.trang_thai IN ('${DB_GRAVE_STATUS.EMPTY}', '${GRAVE_STATUS.EMPTY}'))::int AS so_lo_trong,
        COUNT(*) FILTER (WHERE l.trang_thai IN ('${DB_GRAVE_STATUS.OCCUPIED}', '${GRAVE_STATUS.OCCUPIED}'))::int AS so_lo_da_an_tang,
        COUNT(*) FILTER (WHERE l.trang_thai IN ('${DB_GRAVE_STATUS.RESERVED}', '${GRAVE_STATUS.RESERVED}'))::int AS so_lo_dat_truoc,
        COALESCE(ROUND(SUM(${toTrueAreaExpr('l.geom_3d')})::numeric, 2), 0) AS tong_dien_tich_lo_m2,
        COALESCE(
          ROUND(
            SUM(${toTrueAreaExpr('l.geom_3d')})
            FILTER (WHERE l.trang_thai NOT IN ('${DB_GRAVE_STATUS.EMPTY}', '${GRAVE_STATUS.EMPTY}'))::numeric,
            2
          ),
          0
        ) AS dien_tich_da_su_dung_m2,
        COALESCE(ROUND(AVG(m.dien_tich_chuan)::numeric, 2), 3.30) AS dien_tich_mo_chuan_tb_m2
      FROM lo_dat l
      LEFT JOIN mau_mo_3d m ON l.ma_mau_mo = m.ma_mau_mo
      GROUP BY l.ma_phan_khu
    ),
    combined_exclusions AS (
      -- Hợp nhất (ST_Union) toàn bộ hạ tầng + vùng đệm cách ly + hành lang giao thông để tránh trừ trùng tại nút giao
      SELECT
        pk.ma_phan_khu,
        COALESCE(
          ROUND(
            ST_Area(
              ST_Intersection(
                ${toPlanarMeterExpr('pk.geom_3d')},
                ST_Union(occ.geom)
              )
            )::numeric,
            2
          ),
          0
        ) AS dien_tich_loai_tru_tong_m2
      FROM phan_khu pk
      LEFT JOIN (
        SELECT ST_Buffer(${toPlanarMeterExpr('ht.geom_3d')}, COALESCE(ht.ban_kinh_cach_ly, 0)) AS geom
        FROM ha_tang ht
        UNION ALL
        SELECT ST_Buffer(${toPlanarMeterExpr('td.geom_3d')}, COALESCE(td.chieu_rong_duong, 3.0) / 2.0) AS geom
        FROM tuyen_giao_thong td
      ) occ
        ON ST_Intersects(${toPlanarMeterExpr('pk.geom_3d')}, occ.geom)
      GROUP BY pk.ma_phan_khu, pk.geom_3d
    )
    SELECT
      pk.ma_phan_khu,
      pk.ten_phan_khu,
      pk.loai_phan_khu,
      pk.dien_tich_khu AS dien_tich_quy_hoach_m2,
      ROUND((${toTrueAreaExpr('pk.geom_3d')})::numeric, 2) AS dien_tich_hinh_hoc_m2,
      pk.mat_do_mo_toi_da,
      COALESCE(ls.tong_so_lo, 0) AS tong_so_lo,
      COALESCE(ls.so_lo_trong, 0) AS so_lo_trong,
      COALESCE(ls.so_lo_da_an_tang, 0) AS so_lo_da_an_tang,
      COALESCE(ls.so_lo_dat_truoc, 0) AS so_lo_dat_truoc,
      COALESCE(ls.tong_dien_tich_lo_m2, 0) AS tong_dien_tich_lo_m2,
      COALESCE(ls.dien_tich_da_su_dung_m2, 0) AS dien_tich_da_su_dung_m2,
      COALESCE(ls.dien_tich_mo_chuan_tb_m2, 3.30) AS dien_tich_mo_chuan_tb_m2,
      COALESCE(ce.dien_tich_loai_tru_tong_m2, 0) AS dien_tich_loai_tru_tong_m2
    FROM phan_khu pk
    LEFT JOIN lot_stats ls ON pk.ma_phan_khu = ls.ma_phan_khu
    LEFT JOIN combined_exclusions ce ON pk.ma_phan_khu = ce.ma_phan_khu
    ${whereZone}
    ORDER BY pk.ma_phan_khu ASC;
  `;

  const { rows } = await db.query(sql, params);
  return rows;
};

module.exports = {
  findAllZones,
  getZoneCapacityAnalytics,
};