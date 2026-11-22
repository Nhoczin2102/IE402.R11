const db = require('../config/database');

const findAllZones = async () => {
  const sql = `
    SELECT
      pk.ma_phan_khu,
      pk.ten_phan_khu,
      pk.loai_phan_khu,
      pk.dien_tich_khu,
      ROUND(ST_Area(pk.geom_3d)::numeric, 2) AS dien_tich_postgis_m2,
      pk.mat_do_mo_toi_da,
      pk.cao_do_nen_tb,
      ST_AsGeoJSON(pk.geom_3d)::json AS geojson
    FROM phan_khu pk
    ORDER BY pk.ma_phan_khu ASC;
  `;
  const { rows } = await db.query(sql);
  return rows;
};

/**
 * Phân tích diện tích & sức chứa còn lại theo từng phân khu bằng PostGIS
 * (ST_Area + ST_Union + ST_Difference + ST_Buffer theo Chương 8).
 */
const getZoneCapacityAnalytics = async (maPhanKhu = null) => {
  const params = [];
  const whereZone = maPhanKhu ? (params.push(maPhanKhu), `WHERE pk.ma_phan_khu = $1`) : '';

  const sql = `
    WITH lot_stats AS (
      SELECT
        l.ma_phan_khu,
        COUNT(*)::int AS tong_so_lo,
        COUNT(*) FILTER (WHERE l.trang_thai = 'Trống')::int AS so_lo_trong,
        COUNT(*) FILTER (WHERE l.trang_thai = 'Đã an táng')::int AS so_lo_da_an_tang,
        COUNT(*) FILTER (WHERE l.trang_thai = 'Đã đặt trước')::int AS so_lo_dat_truoc,
        COALESCE(ROUND(SUM(ST_Area(l.geom_3d))::numeric, 2), 0) AS tong_dien_tich_lo_m2,
        COALESCE(ROUND(SUM(ST_Area(l.geom_3d)) FILTER (WHERE l.trang_thai <> 'Trống')::numeric, 2), 0) AS dien_tich_da_su_dung_m2,
        COALESCE(ROUND(AVG(m.dien_tich_chuan)::numeric, 2), 3.52) AS dien_tich_mo_chuan_tb_m2
      FROM lo_dat l
      LEFT JOIN mau_mo_3d m ON l.ma_mau_mo = m.ma_mau_mo
      GROUP BY l.ma_phan_khu
    ),
    infra_exclusion AS (
      SELECT
        pk.ma_phan_khu,
        COALESCE(
          ROUND(
            ST_Area(
              ST_Intersection(
                ST_Force2D(pk.geom_3d),
                ST_Union(ST_Buffer(ST_Force2D(ht.geom_3d), ht.ban_kinh_cach_ly))
              )
            )::numeric,
            2
          ),
          0
        ) AS dien_tich_ha_tang_va_cach_ly_m2
      FROM phan_khu pk
      LEFT JOIN ha_tang ht
        ON ST_Intersects(ST_Force2D(pk.geom_3d), ST_Buffer(ST_Force2D(ht.geom_3d), ht.ban_kinh_cach_ly))
      GROUP BY pk.ma_phan_khu, pk.geom_3d
    ),
    road_exclusion AS (
      SELECT
        pk.ma_phan_khu,
        COALESCE(
          ROUND(
            ST_Area(
              ST_Intersection(
                ST_Force2D(pk.geom_3d),
                ST_Union(ST_Buffer(ST_Force2D(td.geom_3d), td.chieu_rong_duong / 2.0))
              )
            )::numeric,
            2
          ),
          0
        ) AS dien_tich_giao_thong_m2
      FROM phan_khu pk
      LEFT JOIN tuyen_giao_thong td
        ON ST_Intersects(ST_Force2D(pk.geom_3d), ST_Buffer(ST_Force2D(td.geom_3d), td.chieu_rong_duong / 2.0))
      GROUP BY pk.ma_phan_khu, pk.geom_3d
    )
    SELECT
      pk.ma_phan_khu,
      pk.ten_phan_khu,
      pk.loai_phan_khu,
      pk.dien_tich_khu AS dien_tich_quy_hoach_m2,
      ROUND(ST_Area(pk.geom_3d)::numeric, 2) AS dien_tich_hinh_hoc_m2,
      pk.mat_do_mo_toi_da,
      COALESCE(ls.tong_so_lo, 0) AS tong_so_lo,
      COALESCE(ls.so_lo_trong, 0) AS so_lo_trong,
      COALESCE(ls.so_lo_da_an_tang, 0) AS so_lo_da_an_tang,
      COALESCE(ls.so_lo_dat_truoc, 0) AS so_lo_dat_truoc,
      COALESCE(ls.tong_dien_tich_lo_m2, 0) AS tong_dien_tich_lo_m2,
      COALESCE(ls.dien_tich_da_su_dung_m2, 0) AS dien_tich_da_su_dung_m2,
      COALESCE(ls.dien_tich_mo_chuan_tb_m2, 3.52) AS dien_tich_mo_chuan_tb_m2,
      COALESCE(ie.dien_tich_ha_tang_va_cach_ly_m2, 0) AS dien_tich_ha_tang_va_cach_ly_m2,
      COALESCE(re.dien_tich_giao_thong_m2, 0) AS dien_tich_giao_thong_m2
    FROM phan_khu pk
    LEFT JOIN lot_stats ls ON pk.ma_phan_khu = ls.ma_phan_khu
    LEFT JOIN infra_exclusion ie ON pk.ma_phan_khu = ie.ma_phan_khu
    LEFT JOIN road_exclusion re ON pk.ma_phan_khu = re.ma_phan_khu
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
