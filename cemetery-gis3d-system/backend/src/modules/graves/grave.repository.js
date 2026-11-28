const db = require('../../config/database');
const {
  CEMETERY_ORIGIN_WGS84,
  SRID_WGS84,
  SRID_WEB_MERCATOR,
  TOPOLOGY_RELATION_TYPES,
  UI_LABEL_TO_ZONE_CODE,
  UI_TO_DB_STATUS,
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
 * Truy vấn tự động tương thích CẢ 2 hệ tọa độ & kiểu cột ngày:
 * - Nếu geom_3d ở SRID 3405 (tọa độ mét cục bộ Three.js): giữ nguyên tọa độ trực tiếp.
 * - Nếu geom_3d ở SRID 4326 (WGS84 kinh/vĩ độ): tự quy đổi qua 3857 trừ tâm nghĩa trang.
 * - Đọc cột ngày bằng ::text nên chạy an toàn cho cả VARCHAR lẫn DATE (hết lỗi to_char).
 */
const BASE_GRAVE_SELECT = `
  ${ORIGIN_CTE}
  SELECT
    ld.ma_lo_dat,
    ld.ma_phan_khu,
    pk.ten_phan_khu,
    ld.ma_mau_mo,
    ld.vi_tri_hang_o,
    ld.trang_thai,
    ld.dien_tich_lo,
    ld.cao_do_z,
    ld.goc_xoay_z,
    COALESCE((to_jsonb(ld)->>'do_sau_huyet')::numeric, 2.0) AS do_sau_huyet,
    COALESCE(
      (to_jsonb(ld)->>'toa_do_x')::numeric,
      CASE
        WHEN ST_SRID(ld.geom_3d) = ${SRID_WGS84} THEN
          ROUND((ST_X(ST_Transform(ST_Centroid(ST_Force2D(ld.geom_3d)), ${SRID_WEB_MERCATOR})) - ST_X(origin.pt))::numeric, 2)
        ELSE
          ROUND(ST_X(ST_Centroid(ST_Force2D(ld.geom_3d)))::numeric, 2)
      END
    ) AS pos_x,
    COALESCE(
      (to_jsonb(ld)->>'toa_do_z')::numeric,
      CASE
        WHEN ST_SRID(ld.geom_3d) = ${SRID_WGS84} THEN
          ROUND((ST_Y(ST_Transform(ST_Centroid(ST_Force2D(ld.geom_3d)), ${SRID_WEB_MERCATOR})) - ST_Y(origin.pt))::numeric, 2)
        ELSE
          ROUND(ST_Y(ST_Centroid(ST_Force2D(ld.geom_3d)))::numeric, 2)
      END
    ) AS pos_z,
    ST_AsGeoJSON(
      CASE
        WHEN ST_SRID(ld.geom_3d) = ${SRID_WGS84} THEN
          ST_Translate(ST_Transform(ST_Force2D(ld.geom_3d), ${SRID_WEB_MERCATOR}), -ST_X(origin.pt), -ST_Y(origin.pt))
        ELSE
          ld.geom_3d
      END
    )::json AS geojson,
    ROUND(
      CASE
        WHEN ST_SRID(ld.geom_3d) = ${SRID_WGS84} THEN ST_Area(ST_Transform(ST_Force2D(ld.geom_3d), ${SRID_WEB_MERCATOR}))
        ELSE ST_Area(ST_Force2D(ld.geom_3d))
      END::numeric,
      2
    ) AS dien_tich_postgis_m2,
    ROUND(
      (
        CASE
          WHEN ST_SRID(ld.geom_3d) = ${SRID_WGS84} THEN ST_Area(ST_Transform(ST_Force2D(ld.geom_3d), ${SRID_WEB_MERCATOR}))
          ELSE ST_Area(ST_Force2D(ld.geom_3d))
        END * COALESCE(mm.chieu_cao_chuan, 1.1)
      )::numeric,
      2
    ) AS the_tich_khoi_3d_m3,
    ROUND(
      (
        CASE
          WHEN ST_SRID(ld.geom_3d) = ${SRID_WGS84} THEN ST_Area(ST_Transform(ST_Force2D(ld.geom_3d), ${SRID_WEB_MERCATOR}))
          ELSE ST_Area(ST_Force2D(ld.geom_3d))
        END * COALESCE((to_jsonb(ld)->>'do_sau_huyet')::numeric, 2.0)
      )::numeric,
      2
    ) AS the_tich_ho_huyet_m3,
    mm.ten_mau_mo,
    mm.chieu_dai_chuan,
    mm.chieu_rong_chuan,
    mm.dien_tich_chuan,
    mm.chieu_cao_chuan,
    mm.khoang_cach_ke_toi_thieu,
    mm.model_3d_url,
    COALESCE(to_jsonb(ld)->'surfaces_sudm', to_jsonb(mm)->'surfaces') AS surfaces,
    to_jsonb(ld)->'topology_info' AS topology_info,
    nm.ma_nguoi_mat,
    nm.ho_ten,
    nm.ngay_sinh::text AS ngay_sinh,
    nm.ngay_mat::text AS ngay_mat,
    nm.ngay_an_tang::text AS ngay_an_tang,
    nm.thong_tin_than_nhan,
    COALESCE(tp.khoang_cach_3d, 0.6) AS topo_khoang_cach_ke_can,
    COALESCE(tp.hop_le_quy_hoach, TRUE) AS topo_hop_le_quy_hoach
  FROM lo_dat ld
  CROSS JOIN origin
  LEFT JOIN phan_khu pk ON ld.ma_phan_khu = pk.ma_phan_khu
  LEFT JOIN mau_mo_3d mm ON ld.ma_mau_mo = mm.ma_mau_mo
  LEFT JOIN nguoi_mat nm ON ld.ma_lo_dat = nm.ma_lo_dat
  LEFT JOIN LATERAL (
    SELECT q.khoang_cach_3d, q.hop_le_quy_hoach
    FROM quan_he_topology q
    WHERE q.ma_lo_dat_goc = ld.ma_lo_dat
      AND q.loai_quan_he IN ('${TOPOLOGY_RELATION_TYPES.ADJACENT_LOT}', 'ADJACENT')
    ORDER BY q.khoang_cach_3d ASC NULLS LAST
    LIMIT 1
  ) tp ON TRUE
`;

const findAllGraves = async ({ ma_phan_khu, trang_thai, search, bbox } = {}) => {
  const conditions = [];
  const params = [];

  if (ma_phan_khu) {
    const altZone = UI_LABEL_TO_ZONE_CODE[ma_phan_khu] || ma_phan_khu;
    params.push(ma_phan_khu, altZone);
    conditions.push(`ld.ma_phan_khu IN ($${params.length - 1}, $${params.length})`);
  }
  if (trang_thai) {
    const dbStatus = UI_TO_DB_STATUS[trang_thai] || trang_thai;
    params.push(trang_thai, dbStatus);
    conditions.push(`ld.trang_thai IN ($${params.length - 1}, $${params.length})`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(ld.ma_lo_dat ILIKE $${params.length} OR ld.vi_tri_hang_o ILIKE $${params.length} OR COALESCE(nm.ho_ten, '') ILIKE $${params.length})`
    );
  }
  if (bbox) {
    const [minX, minZ, maxX, maxZ] = bbox.split(',').map(Number);
    const p1 = params.push(minX);
    const p2 = params.push(minZ);
    const p3 = params.push(maxX);
    const p4 = params.push(maxZ);
    conditions.push(`
      ST_Intersects(
        CASE
          WHEN ST_SRID(ld.geom_3d) = ${SRID_WGS84} THEN
            ST_Translate(ST_Transform(ST_Force2D(ld.geom_3d), ${SRID_WEB_MERCATOR}), -ST_X(origin.pt), -ST_Y(origin.pt))
          ELSE ST_Force2D(ld.geom_3d)
        END,
        ST_MakeEnvelope($${p1}, $${p2}, $${p3}, $${p4},
          CASE WHEN ST_SRID(ld.geom_3d) = ${SRID_WGS84} THEN ${SRID_WEB_MERCATOR} ELSE ST_SRID(ld.geom_3d) END
        )
      )
    `);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `${BASE_GRAVE_SELECT} ${whereClause} ORDER BY ld.ma_lo_dat ASC;`;

  const { rows } = await db.query(sql, params);
  return rows;
};

const findGraveById = async (maLoDat, executor = db) => {
  const sql = `${BASE_GRAVE_SELECT} WHERE ld.ma_lo_dat = $1;`;
  const { rows } = await executor.query(sql, [maLoDat]);
  return rows[0] || null;
};

const findGraveTemplateById = async (maMauMo, executor = db) => {
  const sql = `SELECT * FROM mau_mo_3d WHERE ma_mau_mo = $1;`;
  const { rows } = await executor.query(sql, [maMauMo]);
  return rows[0] || null;
};

const findZoneSrid = async (maPhanKhu, executor = db) => {
  const sql = `SELECT ma_phan_khu, ST_SRID(geom_3d) AS srid FROM phan_khu WHERE ma_phan_khu = $1;`;
  const { rows } = await executor.query(sql, [maPhanKhu]);
  return rows[0] || null;
};

const validateCandidateLot = async (
  { maPhanKhu, centerX, centerZ, lengthM, widthM, elevationZ, minClearance },
  client
) => {
  const zoneInfo = await findZoneSrid(maPhanKhu, client);
  if (!zoneInfo) {
    return {
      zoneExists: false,
      isValidGeom: false,
      isContained: false,
      neighbors: [],
      overlappingLots: [],
      tooCloseLots: [],
      bufferViolations: [],
    };
  }

  const srid = Number(zoneInfo.srid) || 3405;
  const halfL = lengthM / 2;
  const halfW = widthM / 2;

  const candidateGeomExpr =
    srid === SRID_WGS84
      ? `ST_Force3DZ(ST_Transform(ST_MakeEnvelope(ST_X(origin.pt) + $1 - $3, ST_Y(origin.pt) + $2 - $4, ST_X(origin.pt) + $1 + $3, ST_Y(origin.pt) + $2 + $4, ${SRID_WEB_MERCATOR}), ${SRID_WGS84}), $5)`
      : `ST_Force3DZ(ST_MakeEnvelope($1 - $3, $2 - $4, $1 + $3, $2 + $4, ${srid}), $5)`;

  const toMeterExpr = (col) =>
    srid === SRID_WGS84
      ? `ST_Transform(ST_Force2D(${col}), ${SRID_WEB_MERCATOR})`
      : `ST_Force2D(${col})`;

  const candidateCte = `
    ${ORIGIN_CTE},
    candidate AS (
      SELECT ${candidateGeomExpr} AS geom
      FROM origin
    )
  `;

  const containmentSql = `
    ${candidateCte}
    SELECT
      ST_IsValid(ST_Force2D(c.geom)) AS is_valid_geom,
      ST_Contains(ST_Force2D(pk.geom_3d), ST_Force2D(c.geom)) AS is_contained
    FROM phan_khu pk
    CROSS JOIN candidate c
    WHERE pk.ma_phan_khu = $6;
  `;

  const neighborSql = `
    ${candidateCte}
    SELECT
      l.ma_lo_dat,
      ROUND(
        ST_3DDistance(
          ST_Force3DZ(${toMeterExpr('l.geom_3d')}, l.cao_do_z),
          ST_Force3DZ(${toMeterExpr('c.geom')}, $5)
        )::numeric,
        2
      ) AS khoang_cach_3d,
      ST_Intersects(ST_Force2D(l.geom_3d), ST_Force2D(c.geom)) AS is_intersecting
    FROM lo_dat l
    CROSS JOIN candidate c
    WHERE ST_DWithin(${toMeterExpr('l.geom_3d')}, ${toMeterExpr('c.geom')}, 15)
    ORDER BY khoang_cach_3d ASC;
  `;

  const bufferSql = `
    ${candidateCte}
    SELECT
      ht.ma_ha_tang,
      ht.ten_ha_tang,
      ht.ban_kinh_cach_ly,
      ROUND(
        ST_3DDistance(
          ST_Force3DZ(${toMeterExpr('ht.geom_3d')}, ht.chieu_cao_3d),
          ST_Force3DZ(${toMeterExpr('c.geom')}, $5)
        )::numeric,
        2
      ) AS khoang_cach_3d
    FROM ha_tang ht
    CROSS JOIN candidate c
    WHERE ST_Intersects(
      ${toMeterExpr('c.geom')},
      ST_Buffer(${toMeterExpr('ht.geom_3d')}, ht.ban_kinh_cach_ly)
    );
  `;

  const [containmentRes, neighborRes, bufferRes] = await Promise.all([
    client.query(containmentSql, [centerX, centerZ, halfL, halfW, elevationZ, maPhanKhu]),
    client.query(neighborSql, [centerX, centerZ, halfL, halfW, elevationZ]),
    client.query(bufferSql, [centerX, centerZ, halfL, halfW, elevationZ]),
  ]);

  const row = containmentRes.rows[0] || {};
  const neighbors = neighborRes.rows;
  return {
    zoneExists: true,
    srid,
    isValidGeom: Boolean(row.is_valid_geom),
    isContained: Boolean(row.is_contained),
    neighbors,
    overlappingLots: neighbors.filter((n) => n.is_intersecting),
    tooCloseLots: neighbors.filter(
      (n) => !n.is_intersecting && Number(n.khoang_cach_3d) < Number(minClearance)
    ),
    bufferViolations: bufferRes.rows,
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
    centerX,
    centerZ,
    lengthM,
    widthM,
    srid = 3405,
    dbEmptyStatus = 'Trống',
  },
  client
) => {
  const halfL = lengthM / 2;
  const halfW = widthM / 2;

  const geomExpr =
    srid === SRID_WGS84
      ? `ST_Force3DZ(ST_Transform(ST_MakeEnvelope(ST_X(origin.pt) + $9 - $11, ST_Y(origin.pt) + $10 - $12, ST_X(origin.pt) + $9 + $11, ST_Y(origin.pt) + $10 + $12, ${SRID_WEB_MERCATOR}), ${SRID_WGS84}), $7)`
      : `ST_Force3DZ(ST_MakeEnvelope($9 - $11, $10 - $12, $9 + $11, $10 + $12, ${srid}), $7)`;

  const sql = `
    ${ORIGIN_CTE}
    INSERT INTO lo_dat (
      ma_lo_dat, ma_phan_khu, ma_mau_mo, vi_tri_hang_o, trang_thai,
      dien_tich_lo, cao_do_z, goc_xoay_z, geom_3d
    )
    SELECT
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      ${geomExpr}
    FROM origin
    RETURNING ma_lo_dat;
  `;

  const { rows } = await client.query(sql, [
    ma_lo_dat,
    ma_phan_khu,
    ma_mau_mo,
    vi_tri_hang_o,
    dbEmptyStatus,
    dien_tich_lo,
    cao_do_z,
    goc_xoay_z,
    centerX,
    centerZ,
    halfL,
    halfW,
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
    VALUES ($1, $2, '${TOPOLOGY_RELATION_TYPES.ADJACENT_LOT}', $3, $4);
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

const updateGraveStatus = async (maLoDat, dbTrangThai, client) => {
  const sql = `
    UPDATE lo_dat
    SET trang_thai = $1
    WHERE ma_lo_dat = $2
    RETURNING ma_lo_dat, trang_thai;
  `;
  const { rows } = await client.query(sql, [dbTrangThai, maLoDat]);
  return rows[0] || null;
};

// Không dùng ON CONFLICT (ma_lo_dat) để tránh lỗi 42P10 khi DB thiếu UNIQUE constraint
const upsertOccupant = async (
  { ma_nguoi_mat, ma_lo_dat, ho_ten, ngay_sinh, ngay_mat, ngay_an_tang, thong_tin_than_nhan },
  client
) => {
  const updateSql = `
    UPDATE nguoi_mat
    SET
      ho_ten = $1,
      ngay_sinh = COALESCE($2, ngay_sinh),
      ngay_mat = COALESCE($3, ngay_mat),
      ngay_an_tang = COALESCE($4, ngay_an_tang),
      thong_tin_than_nhan = COALESCE($5, thong_tin_than_nhan)
    WHERE ma_lo_dat = $6
    RETURNING *;
  `;
  const updated = await client.query(updateSql, [
    ho_ten,
    ngay_sinh || null,
    ngay_mat || null,
    ngay_an_tang || null,
    thong_tin_than_nhan || null,
    ma_lo_dat,
  ]);

  if (updated.rows.length > 0) {
    return updated.rows[0];
  }

  const safeId = `${ma_nguoi_mat}-${Date.now().toString(36).toUpperCase()}`.slice(0, 30);
  const insertSql = `
    INSERT INTO nguoi_mat (
      ma_nguoi_mat, ma_lo_dat, ho_ten, ngay_sinh, ngay_mat, ngay_an_tang, thong_tin_than_nhan
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const inserted = await client.query(insertSql, [
    safeId,
    ma_lo_dat,
    ho_ten,
    ngay_sinh || null,
    ngay_mat || null,
    ngay_an_tang || null,
    thong_tin_than_nhan || null,
  ]);
  return inserted.rows[0];
};

const deleteOccupantByGraveId = async (maLoDat, client) => {
  const sql = `DELETE FROM nguoi_mat WHERE ma_lo_dat = $1;`;
  await client.query(sql, [maLoDat]);
};

module.exports = {
  findAllGraves,
  findGraveById,
  findGraveTemplateById,
  validateCandidateLot,
  insertGraveLot,
  insertAdjacentTopologyRelation,
  findGraveStatusForUpdate,
  updateGraveStatus,
  upsertOccupant,
  deleteOccupantByGraveId,
};