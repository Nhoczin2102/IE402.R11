const db = require('../../config/database');
const { SRID_VN2000_METERS } = require('../../constants/cemeteryConstants');

const BASE_GRAVE_SELECT = `
  SELECT
    l.ma_lo_dat,
    l.ma_phan_khu,
    l.ma_mau_mo,
    l.vi_tri_hang_o,
    l.trang_thai,
    l.dien_tich_lo,
    l.cao_do_z,
    l.goc_xoay_z,
    l.do_sau_huyet,
    l.toa_do_x,
    l.toa_do_z,
    l.surfaces_sudm,
    l.topology_info,
    ST_AsGeoJSON(l.geom_3d)::json AS geojson,
    ROUND(ST_Area(l.geom_3d)::numeric, 2) AS dien_tich_postgis_m2,
    ROUND((ST_Area(l.geom_3d) * COALESCE(m.chieu_cao_chuan, 1.1))::numeric, 2) AS the_tich_khoi_3d_m3,
    ROUND((ST_Area(l.geom_3d) * COALESCE(l.do_sau_huyet, 2.0))::numeric, 2) AS the_tich_ho_huyet_m3,
    m.ten_mau_mo,
    m.chieu_dai_chuan,
    m.chieu_rong_chuan,
    m.dien_tich_chuan,
    m.chieu_cao_chuan,
    m.khoang_cach_ke_toi_thieu,
    m.model_3d_url,
    n.ma_nguoi_mat,
    n.ho_ten,
    n.ngay_sinh,
    n.ngay_mat,
    n.ngay_an_tang,
    n.thong_tin_than_nhan
  FROM lo_dat l
  LEFT JOIN mau_mo_3d m ON l.ma_mau_mo = m.ma_mau_mo
  LEFT JOIN nguoi_mat n ON l.ma_lo_dat = n.ma_lo_dat
`;

const findAllGraves = async ({ ma_phan_khu, trang_thai, search, bbox } = {}) => {
  const conditions = [];
  const params = [];

  if (ma_phan_khu) {
    params.push(ma_phan_khu);
    conditions.push(`l.ma_phan_khu = $${params.length}`);
  }
  if (trang_thai) {
    params.push(trang_thai);
    conditions.push(`l.trang_thai = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(l.ma_lo_dat ILIKE $${params.length} OR l.vi_tri_hang_o ILIKE $${params.length} OR COALESCE(n.ho_ten, '') ILIKE $${params.length})`
    );
  }
  if (bbox) {
    const [minX, minZ, maxX, maxZ] = bbox.split(',').map(Number);
    const p1 = params.push(minX);
    const p2 = params.push(minZ);
    const p3 = params.push(maxX);
    const p4 = params.push(maxZ);
    conditions.push(
      `ST_Intersects(ST_Force2D(l.geom_3d), ST_MakeEnvelope($${p1}, $${p2}, $${p3}, $${p4}, ${SRID_VN2000_METERS}))`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `${BASE_GRAVE_SELECT} ${whereClause} ORDER BY l.ma_lo_dat ASC;`;

  const { rows } = await db.query(sql, params);
  return rows;
};

const findGraveById = async (maLoDat, executor = db) => {
  const sql = `${BASE_GRAVE_SELECT} WHERE l.ma_lo_dat = $1;`;
  const { rows } = await executor.query(sql, [maLoDat]);
  return rows[0] || null;
};

const findGraveTemplateById = async (maMauMo, executor = db) => {
  const sql = `SELECT * FROM mau_mo_3d WHERE ma_mau_mo = $1;`;
  const { rows } = await executor.query(sql, [maMauMo]);
  return rows[0] || null;
};

/**
 * Kiểm tra cổng Topology 3D trước khi quy hoạch (INSERT) lô mộ mới:
 * - Containment: nằm trọn trong ranh giới phân khu (ST_Contains)
 * - Overlap: không chồng lấp bất kỳ lô mộ nào (ST_Overlaps / ST_Intersects)
 * - Adjacency clearance: đảm bảo khoảng cách kề tối thiểu (ST_3DDistance)
 * - Infrastructure Buffer: không xâm phạm bán kính cách ly hạ tầng (ST_Buffer)
 */
const validateCandidateGeometry = async ({ maPhanKhu, wktPolygonZ, minClearance }, client) => {
  const containmentSql = `
    SELECT
      pk.ma_phan_khu,
      ST_IsValid(ST_Force2D(ST_GeomFromText($2, ${SRID_VN2000_METERS}))) AS is_valid_geom,
      ST_Contains(ST_Force2D(pk.geom_3d), ST_Force2D(ST_GeomFromText($2, ${SRID_VN2000_METERS}))) AS is_contained
    FROM phan_khu pk
    WHERE pk.ma_phan_khu = $1;
  `;

  const neighborSql = `
    SELECT
      l.ma_lo_dat,
      ROUND(ST_3DDistance(l.geom_3d, ST_GeomFromText($1, ${SRID_VN2000_METERS}))::numeric, 2) AS khoang_cach_3d,
      ST_Intersects(ST_Force2D(l.geom_3d), ST_Force2D(ST_GeomFromText($1, ${SRID_VN2000_METERS}))) AS is_intersecting
    FROM lo_dat l
    WHERE ST_DWithin(ST_Force2D(l.geom_3d), ST_Force2D(ST_GeomFromText($1, ${SRID_VN2000_METERS})), 10)
    ORDER BY khoang_cach_3d ASC;
  `;

  const bufferSql = `
    SELECT
      ht.ma_ha_tang,
      ht.ten_ha_tang,
      ht.ban_kinh_cach_ly,
      ROUND(ST_3DDistance(ht.geom_3d, ST_GeomFromText($1, ${SRID_VN2000_METERS}))::numeric, 2) AS khoang_cach_3d
    FROM ha_tang ht
    WHERE ST_Intersects(
      ST_Force2D(ST_GeomFromText($1, ${SRID_VN2000_METERS})),
      ST_Buffer(ST_Force2D(ht.geom_3d), ht.ban_kinh_cach_ly)
    );
  `;

  const [containmentRes, neighborRes, bufferRes] = await Promise.all([
    client.query(containmentSql, [maPhanKhu, wktPolygonZ]),
    client.query(neighborSql, [wktPolygonZ]),
    client.query(bufferSql, [wktPolygonZ]),
  ]);

  const zoneRow = containmentRes.rows[0] || null;
  const neighbors = neighborRes.rows;
  const bufferViolations = bufferRes.rows;

  const overlappingLots = neighbors.filter((n) => n.is_intersecting);
  const tooCloseLots = neighbors.filter(
    (n) => !n.is_intersecting && Number(n.khoang_cach_3d) < Number(minClearance)
  );

  return {
    zoneExists: Boolean(zoneRow),
    isValidGeom: Boolean(zoneRow && zoneRow.is_valid_geom),
    isContained: Boolean(zoneRow && zoneRow.is_contained),
    neighbors,
    overlappingLots,
    tooCloseLots,
    bufferViolations,
  };
};

const insertGraveLot = async (
  {
    ma_lo_dat,
    ma_phan_khu,
    ma_mau_mo,
    vi_tri_hang_o,
    dien_tich_lo,
    cao_do_z,
    goc_xoay_z,
    do_sau_huyet,
    toa_do_x,
    toa_do_z,
    wktPolygonZ,
    surfaces_sudm,
    topology_info,
  },
  client
) => {
  const sql = `
    INSERT INTO lo_dat (
      ma_lo_dat, ma_phan_khu, ma_mau_mo, vi_tri_hang_o, trang_thai,
      dien_tich_lo, cao_do_z, goc_xoay_z, do_sau_huyet, toa_do_x, toa_do_z,
      geom_3d, surfaces_sudm, topology_info
    )
    VALUES (
      $1, $2, $3, $4, 'Trống',
      $5, $6, $7, $8, $9, $10,
      ST_GeomFromText($11, ${SRID_VN2000_METERS}), $12::jsonb, $13::jsonb
    )
    RETURNING ma_lo_dat;
  `;
  const { rows } = await client.query(sql, [
    ma_lo_dat,
    ma_phan_khu,
    ma_mau_mo,
    vi_tri_hang_o,
    dien_tich_lo,
    cao_do_z,
    goc_xoay_z,
    do_sau_huyet,
    toa_do_x,
    toa_do_z,
    wktPolygonZ,
    JSON.stringify(surfaces_sudm),
    JSON.stringify(topology_info),
  ]);
  return rows[0];
};

const insertAdjacentTopologyRelation = async (
  { maLoDatGoc, maLoDatKeCan, khoangCach3d, hopLe },
  client
) => {
  const sql = `
    INSERT INTO quan_he_topology (
      ma_lo_dat_goc, ma_lo_dat_ke_can, loai_quan_he, khoang_cach_3d, hop_le_quy_hoach
    )
    VALUES ($1, $2, 'ADJACENT', $3, $4);
  `;
  await client.query(sql, [maLoDatGoc, maLoDatKeCan, khoangCach3d, hopLe]);
};

const findGraveStatusForUpdate = async (maLoDat, client) => {
  const sql = `
    SELECT ma_lo_dat, trang_thai, ma_phan_khu
    FROM lo_dat
    WHERE ma_lo_dat = $1
    FOR UPDATE;
  `;
  const { rows } = await client.query(sql, [maLoDat]);
  return rows[0] || null;
};

const updateGraveStatus = async (maLoDat, trangThai, client) => {
  const sql = `
    UPDATE lo_dat
    SET trang_thai = $1, updated_at = NOW()
    WHERE ma_lo_dat = $2
    RETURNING ma_lo_dat, trang_thai, updated_at;
  `;
  const { rows } = await client.query(sql, [trangThai, maLoDat]);
  return rows[0] || null;
};

const upsertOccupant = async (
  { ma_nguoi_mat, ma_lo_dat, ho_ten, ngay_sinh, ngay_mat, ngay_an_tang, thong_tin_than_nhan },
  client
) => {
  const sql = `
    INSERT INTO nguoi_mat (
      ma_nguoi_mat, ma_lo_dat, ho_ten, ngay_sinh, ngay_mat, ngay_an_tang, thong_tin_than_nhan
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (ma_lo_dat) DO UPDATE SET
      ho_ten = EXCLUDED.ho_ten,
      ngay_sinh = COALESCE(EXCLUDED.ngay_sinh, nguoi_mat.ngay_sinh),
      ngay_mat = COALESCE(EXCLUDED.ngay_mat, nguoi_mat.ngay_mat),
      ngay_an_tang = COALESCE(EXCLUDED.ngay_an_tang, nguoi_mat.ngay_an_tang),
      thong_tin_than_nhan = COALESCE(EXCLUDED.thong_tin_than_nhan, nguoi_mat.thong_tin_than_nhan),
      updated_at = NOW()
    RETURNING *;
  `;
  const { rows } = await client.query(sql, [
    ma_nguoi_mat,
    ma_lo_dat,
    ho_ten,
    ngay_sinh || null,
    ngay_mat || null,
    ngay_an_tang || null,
    thong_tin_than_nhan || null,
  ]);
  return rows[0];
};

const deleteOccupantByGraveId = async (maLoDat, client) => {
  const sql = `DELETE FROM nguoi_mat WHERE ma_lo_dat = $1;`;
  await client.query(sql, [maLoDat]);
};

module.exports = {
  findAllGraves,
  findGraveById,
  findGraveTemplateById,
  validateCandidateGeometry,
  insertGraveLot,
  insertAdjacentTopologyRelation,
  findGraveStatusForUpdate,
  updateGraveStatus,
  upsertOccupant,
  deleteOccupantByGraveId,
};
