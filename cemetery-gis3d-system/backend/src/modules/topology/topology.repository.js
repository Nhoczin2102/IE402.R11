const db = require('../../config/database');
const { SRID_WGS84, SRID_WEB_MERCATOR } = require('../../constants/cemeteryConstants');

const toMeter2D = (col) =>
  `CASE WHEN ST_SRID(${col}) = ${SRID_WGS84} THEN ST_Transform(ST_Force2D(${col}), ${SRID_WEB_MERCATOR}) ELSE ST_Force2D(${col}) END`;

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

const checkAdjacentLots = async (maLoDat, searchRadiusMeters = 10) => {
  const sql = `
    SELECT
      other.ma_lo_dat AS ma_lo_dat_ke_can,
      other.ma_phan_khu,
      other.trang_thai,
      m.khoang_cach_ke_toi_thieu,
      ROUND(
        ST_3DDistance(
          ST_Force3DZ(${toMeter2D('target.geom_3d')}, target.cao_do_z),
          ST_Force3DZ(${toMeter2D('other.geom_3d')}, other.cao_do_z)
        )::numeric,
        2
      ) AS khoang_cach_3d,
      ROUND(
        ST_Distance(${toMeter2D('target.geom_3d')}, ${toMeter2D('other.geom_3d')})::numeric,
        2
      ) AS khoang_cach_2d,
      ST_Touches(ST_Force2D(target.geom_3d), ST_Force2D(other.geom_3d)) AS is_touching,
      ST_Overlaps(ST_Force2D(target.geom_3d), ST_Force2D(other.geom_3d)) AS is_overlapping
    FROM lo_dat target
    JOIN mau_mo_3d m ON target.ma_mau_mo = m.ma_mau_mo
    JOIN lo_dat other
      ON other.ma_lo_dat <> target.ma_lo_dat
     AND ST_DWithin(${toMeter2D('target.geom_3d')}, ${toMeter2D('other.geom_3d')}, $2)
    WHERE target.ma_lo_dat = $1
    ORDER BY khoang_cach_3d ASC;
  `;
  const { rows } = await db.query(sql, [maLoDat, searchRadiusMeters]);
  return rows;
};

const checkInfrastructureBuffers = async (maLoDat) => {
  const sql = `
    SELECT
      ht.ma_ha_tang,
      ht.ten_ha_tang,
      ht.loai_ha_tang,
      ht.ban_kinh_cach_ly,
      ROUND(
        ST_3DDistance(
          ST_Force3DZ(${toMeter2D('l.geom_3d')}, l.cao_do_z),
          ST_Force3DZ(${toMeter2D('ht.geom_3d')}, ht.chieu_cao_3d)
        )::numeric,
        2
      ) AS khoang_cach_3d,
      ST_Intersects(
        ${toMeter2D('l.geom_3d')},
        ST_Buffer(${toMeter2D('ht.geom_3d')}, ht.ban_kinh_cach_ly)
      ) AS violates_buffer
    FROM lo_dat l
    CROSS JOIN ha_tang ht
    WHERE l.ma_lo_dat = $1
    ORDER BY khoang_cach_3d ASC;
  `;
  const { rows } = await db.query(sql, [maLoDat]);
  return rows;
};

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
          ST_Force3DZ(${toMeter2D('a.geom_3d')}, a.cao_do_z),
          ST_Force3DZ(${toMeter2D('b.geom_3d')}, b.cao_do_z)
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
          ST_Force3DZ(${toMeter2D('l.geom_3d')}, l.cao_do_z),
          ST_Force3DZ(${toMeter2D('ht.geom_3d')}, ht.chieu_cao_3d)
        )::numeric,
        2
      ) AS khoang_cach_3d
    FROM lo_dat l
    JOIN ha_tang ht
      ON ST_Intersects(
        ${toMeter2D('l.geom_3d')},
        ST_Buffer(${toMeter2D('ht.geom_3d')}, ht.ban_kinh_cach_ly)
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
