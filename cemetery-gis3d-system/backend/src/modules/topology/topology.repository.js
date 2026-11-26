const db = require('../../config/database');
const { SRID_WEB_MERCATOR } = require('../../constants/cemeteryConstants');

/**
 * Kiểm tra Topology Chứa trong (Containment):
 * Xác minh lô đất có nằm hoàn toàn bên trong ranh giới phân khu hay không (ST_Contains / ST_Within).
 */
const checkLotContainment = async (maLoDat) => {
  const sql = `
    SELECT
      l.ma_lo_dat,
      l.ma_phan_khu,
      pk.ten_phan_khu,
      ST_Contains(ST_Force2D(pk.geom_3d), ST_Force2D(l.geom_3d)) AS is_contained_in_zone,
      ST_Within(ST_Force2D(l.geom_3d), ST_Force2D(pk.geom_3d)) AS is_within_zone
    FROM lo_dat l
    JOIN phan_khu pk ON l.ma_phan_khu = pk.ma_phan_khu
    WHERE l.ma_lo_dat = $1;
  `;
  const { rows } = await db.query(sql, [maLoDat]);
  return rows[0] || null;
};

/**
 * Kiểm tra Topology Kề nhau & Chồng lấp (Adjacency / Overlap / 3D Distance theo mét qua SRID 3857):
 */
const checkAdjacentLots = async (maLoDat, searchRadiusMeters = 10) => {
  const sql = `
    SELECT
      other.ma_lo_dat AS ma_lo_dat_ke_can,
      other.ma_phan_khu,
      other.trang_thai,
      m.khoang_cach_ke_toi_thieu,
      ROUND(
        ST_3DDistance(
          ST_Force3DZ(ST_Transform(ST_Force2D(target.geom_3d), ${SRID_WEB_MERCATOR}), target.cao_do_z),
          ST_Force3DZ(ST_Transform(ST_Force2D(other.geom_3d), ${SRID_WEB_MERCATOR}), other.cao_do_z)
        )::numeric,
        2
      ) AS khoang_cach_3d,
      ROUND(
        ST_Distance(
          ST_Transform(ST_Force2D(target.geom_3d), ${SRID_WEB_MERCATOR}),
          ST_Transform(ST_Force2D(other.geom_3d), ${SRID_WEB_MERCATOR})
        )::numeric,
        2
      ) AS khoang_cach_2d,
      ST_Touches(ST_Force2D(target.geom_3d), ST_Force2D(other.geom_3d)) AS is_touching,
      ST_Overlaps(ST_Force2D(target.geom_3d), ST_Force2D(other.geom_3d)) AS is_overlapping
    FROM lo_dat target
    JOIN mau_mo_3d m ON target.ma_mau_mo = m.ma_mau_mo
    JOIN lo_dat other
      ON other.ma_lo_dat <> target.ma_lo_dat
     AND ST_DWithin(
       ST_Transform(ST_Force2D(target.geom_3d), ${SRID_WEB_MERCATOR}),
       ST_Transform(ST_Force2D(other.geom_3d), ${SRID_WEB_MERCATOR}),
       $2
     )
    WHERE target.ma_lo_dat = $1
    ORDER BY khoang_cach_3d ASC;
  `;
  const { rows } = await db.query(sql, [maLoDat, searchRadiusMeters]);
  return rows;
};

/**
 * Kiểm tra phân tích vùng đệm (Buffer - Chương 8) theo đơn vị mét (SRID 3857):
 */
const checkInfrastructureBuffers = async (maLoDat) => {
  const sql = `
    SELECT
      ht.ma_ha_tang,
      ht.ten_ha_tang,
      ht.loai_ha_tang,
      ht.ban_kinh_cach_ly,
      ROUND(
        ST_3DDistance(
          ST_Force3DZ(ST_Transform(ST_Force2D(l.geom_3d), ${SRID_WEB_MERCATOR}), l.cao_do_z),
          ST_Force3DZ(ST_Transform(ST_Force2D(ht.geom_3d), ${SRID_WEB_MERCATOR}), ht.chieu_cao_3d)
        )::numeric,
        2
      ) AS khoang_cach_3d,
      ST_Intersects(
        ST_Transform(ST_Force2D(l.geom_3d), ${SRID_WEB_MERCATOR}),
        ST_Buffer(ST_Transform(ST_Force2D(ht.geom_3d), ${SRID_WEB_MERCATOR}), ht.ban_kinh_cach_ly)
      ) AS violates_buffer
    FROM lo_dat l
    CROSS JOIN ha_tang ht
    WHERE l.ma_lo_dat = $1
    ORDER BY khoang_cach_3d ASC;
  `;
  const { rows } = await db.query(sql, [maLoDat]);
  return rows;
};

/**
 * Kiểm toán toàn bộ nghĩa trang trên Supabase (SRID 4326 -> 3857 mét).
 */
const auditAllTopology = async () => {
  const containmentSql = `
    SELECT
      l.ma_lo_dat,
      l.ma_phan_khu,
      ST_Contains(ST_Force2D(pk.geom_3d), ST_Force2D(l.geom_3d)) AS is_contained
    FROM lo_dat l
    JOIN phan_khu pk ON l.ma_phan_khu = pk.ma_phan_khu
    WHERE NOT ST_Contains(ST_Force2D(pk.geom_3d), ST_Force2D(l.geom_3d));
  `;

  const overlapSql = `
    SELECT
      a.ma_lo_dat AS lo_1,
      b.ma_lo_dat AS lo_2,
      ROUND(
        ST_3DDistance(
          ST_Force3DZ(ST_Transform(ST_Force2D(a.geom_3d), ${SRID_WEB_MERCATOR}), a.cao_do_z),
          ST_Force3DZ(ST_Transform(ST_Force2D(b.geom_3d), ${SRID_WEB_MERCATOR}), b.cao_do_z)
        )::numeric,
        2
      ) AS khoang_cach_3d
    FROM lo_dat a
    JOIN lo_dat b ON a.ma_lo_dat < b.ma_lo_dat
    WHERE ST_Overlaps(ST_Force2D(a.geom_3d), ST_Force2D(b.geom_3d));
  `;

  const bufferViolationSql = `
    SELECT
      l.ma_lo_dat,
      ht.ma_ha_tang,
      ht.ten_ha_tang,
      ht.ban_kinh_cach_ly,
      ROUND(
        ST_3DDistance(
          ST_Force3DZ(ST_Transform(ST_Force2D(l.geom_3d), ${SRID_WEB_MERCATOR}), l.cao_do_z),
          ST_Force3DZ(ST_Transform(ST_Force2D(ht.geom_3d), ${SRID_WEB_MERCATOR}), ht.chieu_cao_3d)
        )::numeric,
        2
      ) AS khoang_cach_3d
    FROM lo_dat l
    JOIN ha_tang ht
      ON ST_Intersects(
        ST_Transform(ST_Force2D(l.geom_3d), ${SRID_WEB_MERCATOR}),
        ST_Buffer(ST_Transform(ST_Force2D(ht.geom_3d), ${SRID_WEB_MERCATOR}), ht.ban_kinh_cach_ly)
      );
  `;

  const [containmentViolations, overlapViolations, bufferViolations] = await Promise.all([
    db.query(containmentSql),
    db.query(overlapSql),
    db.query(bufferViolationSql),
  ]);

  return {
    containmentViolations: containmentViolations.rows,
    overlapViolations: overlapViolations.rows,
    bufferViolations: bufferViolations.rows,
  };
};

const findStoredTopologyRelations = async (maLoDat = null) => {
  const params = [];
  const whereClause = maLoDat ? (params.push(maLoDat), `WHERE ma_lo_dat_goc = $1`) : '';
  const sql = `
    SELECT *
    FROM quan_he_topology
    ${whereClause}
    ORDER BY ma_topology DESC;
  `;
  const { rows } = await db.query(sql, params);
  return rows;
};

module.exports = {
  checkLotContainment,
  checkAdjacentLots,
  checkInfrastructureBuffers,
  auditAllTopology,
  findStoredTopologyRelations,
};
