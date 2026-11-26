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
 * Truy vấn chuẩn đồng bộ Supabase (SRID 4326) -> tọa độ mét Three.js [x, y, z]
 * Dùng to_jsonb(ld)->>'do_sau_huyet' và to_jsonb(mm)->'surfaces' để chạy an toàn
 * cả khi đã hoặc chưa chạy ALTER TABLE bổ sung cột trên Supabase.
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
    ROUND((ST_X(ST_Transform(ST_Centroid(ST_Force2D(ld.geom_3d)), ${SRID_WEB_MERCATOR})) - ST_X(origin.pt))::numeric, 2) AS pos_x,
    ROUND((ST_Y(ST_Transform(ST_Centroid(ST_Force2D(ld.geom_3d)), ${SRID_WEB_MERCATOR})) - ST_Y(origin.pt))::numeric, 2) AS pos_z,
    ST_AsGeoJSON(ld.geom_3d)::json AS geojson,
    ROUND(ST_Area(ST_Transform(ST_Force2D(ld.geom_3d), ${SRID_WEB_MERCATOR}))::numeric, 2) AS dien_tich_postgis_m2,
    ROUND((ST_Area(ST_Transform(ST_Force2D(ld.geom_3d), ${SRID_WEB_MERCATOR})) * COALESCE(mm.chieu_cao_chuan, 1.1))::numeric, 2) AS the_tich_khoi_3d_m3,
    ROUND((ST_Area(ST_Transform(ST_Force2D(ld.geom_3d), ${SRID_WEB_MERCATOR})) * COALESCE((to_jsonb(ld)->>'do_sau_huyet')::numeric, 2.0))::numeric, 2) AS the_tich_ho_huyet_m3,
    mm.ten_mau_mo,
    mm.chieu_dai_chuan,
    mm.chieu_rong_chuan,
    mm.dien_tich_chuan,
    mm.chieu_cao_chuan,
    mm.khoang_cach_ke_toi_thieu,
    mm.model_3d_url,
    to_jsonb(mm)->'surfaces' AS surfaces,
    nm.ma_nguoi_mat,
    nm.ho_ten,
    TO_CHAR(nm.ngay_sinh, 'DD/MM/YYYY') AS ngay_sinh,
    TO_CHAR(nm.ngay_mat, 'DD/MM/YYYY') AS ngay_mat,
    TO_CHAR(nm.ngay_an_tang, 'DD/MM/YYYY') AS ngay_an_tang,
    nm.thong_tin_than_nhan,
    COALESCE(tp.khoang_cach_3d, 0.6) AS topo_khoang_cach_ke_can,
    COALESCE(tp.hop_le_quy_hoach, TRUE) AS topo_hop_le_quy_hoach
  FROM lo_dat ld
  CROSS JOIN origin
  JOIN phan_khu pk ON ld.ma_phan_khu = pk.ma_phan_khu
  JOIN mau_mo_3d mm ON ld.ma_mau_mo = mm.ma_mau_mo
  LEFT JOIN nguoi_mat nm ON ld.ma_lo_dat = nm.ma_lo_dat
  LEFT JOIN LATERAL (
    SELECT q.khoang_cach_3d, q.hop_le_quy_hoach
    FROM quan_he_topology q
    WHERE q.ma_lo_dat_goc = ld.ma_lo_dat
      AND q.loai_quan_he = '${TOPOLOGY_RELATION_TYPES.ADJACENT_LOT}'
    ORDER BY q.khoang_cach_3d ASC NULLS LAST
    LIMIT 1
  ) tp ON TRUE
`;

const findAllGraves = async ({ ma_phan_khu, trang_thai, search, bbox } = {}) => {
  const conditions = [];
  const params = [];

  if (ma_phan_khu) {
    const resolvedZone = UI_LABEL_TO_ZONE_CODE[ma_phan_khu] || ma_phan_khu;
    params.push(resolvedZone);
    conditions.push(`ld.ma_phan_khu = $${params.length}`);
  }
  if (trang_thai) {
    const dbStatus = UI_TO_DB_STATUS[trang_thai] || trang_thai;
    params.push(dbStatus);
    conditions.push(`ld.trang_thai = $${params.length}`);
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
        ST_Transform(ST_Force2D(ld.geom_3d), ${SRID_WEB_MERCATOR}),
        ST_MakeEnvelope(
          ST_X(origin.pt) + $${p1},
          ST_Y(origin.pt) + $${p2},
          ST_X(origin.pt) + $${p3},
          ST_Y(origin.pt) + $${p4},
          ${SRID_WEB_MERCATOR}
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

/**
 * Kiểm tra cổng Topology 3D trước khi quy hoạch (INSERT) lô mộ mới trên hệ tọa độ WGS84 (4326)
 * quy đổi sang Web Mercator (3857) để tính khoảng cách & vùng đệm chính xác theo mét.
 */
const validateCandidateLot = async (
  { maPhanKhu, centerX, centerZ, lengthM, widthM, elevationZ, minClearance },
  client
) => {
  const halfL = lengthM / 2;
  const halfW = widthM / 2;

  const candidateCte = `
    WITH origin AS (
      SELECT ST_Transform(
        ST_SetSRID(ST_MakePoint(${CEMETERY_ORIGIN_WGS84.lon}, ${CEMETERY_ORIGIN_WGS84.lat}), ${SRID_WGS84}),
        ${SRID_WEB_MERCATOR}
      ) AS pt
    ),
    candidate AS (
      SELECT
        ST_Force3DZ(
          ST_MakeEnvelope(
            ST_X(origin.pt) + $1 - $3,
            ST_Y(origin.pt) + $2 - $4,
            ST_X(origin.pt) + $1 + $3,
            ST_Y(origin.pt) + $2 + $4,
            ${SRID_WEB_MERCATOR}
          ),
          $5
        ) AS geom_3857,
        ST_Force3DZ(
          ST_Transform(
            ST_MakeEnvelope(
              ST_X(origin.pt) + $1 - $3,
              ST_Y(origin.pt) + $2 - $4,
              ST_X(origin.pt) + $1 + $3,
              ST_Y(origin.pt) + $2 + $4,
              ${SRID_WEB_MERCATOR}
            ),
            ${SRID_WGS84}
          ),
          $5
        ) AS geom_4326
      FROM origin
    )
  `;

  const containmentSql = `
    ${candidateCte}
    SELECT
      pk.ma_phan_khu,
      ST_IsValid(ST_Force2D(c.geom_4326)) AS is_valid_geom,
      ST_Contains(ST_Force2D(pk.geom_3d), ST_Force2D(c.geom_4326)) AS is_contained
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
          ST_Force3DZ(ST_Transform(ST_Force2D(l.geom_3d), ${SRID_WEB_MERCATOR}), l.cao_do_z),
          c.geom_3857
        )::numeric,
        2
      ) AS khoang_cach_3d,
      ST_Intersects(ST_Force2D(l.geom_3d), ST_Force2D(c.geom_4326)) AS is_intersecting
    FROM lo_dat l
    CROSS JOIN candidate c
    WHERE ST_DWithin(
      ST_Transform(ST_Force2D(l.geom_3d), ${SRID_WEB_MERCATOR}),
      ST_Force2D(c.geom_3857),
      15
    )
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
          ST_Force3DZ(ST_Transform(ST_Force2D(ht.geom_3d), ${SRID_WEB_MERCATOR}), ht.chieu_cao_3d),
          c.geom_3857
        )::numeric,
        2
      ) AS khoang_cach_3d
    FROM ha_tang ht
    CROSS JOIN candidate c
    WHERE ST_Intersects(
      ST_Force2D(c.geom_3857),
      ST_Buffer(ST_Transform(ST_Force2D(ht.geom_3d), ${SRID_WEB_MERCATOR}), ht.ban_kinh_cach_ly)
    );
  `;

  const [containmentRes, neighborRes, bufferRes] = await Promise.all([
    client.query(containmentSql, [centerX, centerZ, halfL, halfW, elevationZ, maPhanKhu]),
    client.query(neighborSql, [centerX, centerZ, halfL, halfW, elevationZ]),
    client.query(bufferSql, [centerX, centerZ, halfL, halfW, elevationZ]),
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
    centerX,
    centerZ,
    lengthM,
    widthM,
  },
  client
) => {
  const halfL = lengthM / 2;
  const halfW = widthM / 2;

  const sql = `
    WITH origin AS (
      SELECT ST_Transform(
        ST_SetSRID(ST_MakePoint(${CEMETERY_ORIGIN_WGS84.lon}, ${CEMETERY_ORIGIN_WGS84.lat}), ${SRID_WGS84}),
        ${SRID_WEB_MERCATOR}
      ) AS pt
    )
    INSERT INTO lo_dat (
      ma_lo_dat, ma_phan_khu, ma_mau_mo, vi_tri_hang_o, trang_thai,
      dien_tich_lo, cao_do_z, goc_xoay_z, geom_3d
    )
    SELECT
      $1, $2, $3, $4, 'TRONG',
      $5, $6, $7,
      ST_Force3DZ(
        ST_Transform(
          ST_MakeEnvelope(
            ST_X(origin.pt) + $8 - $10,
            ST_Y(origin.pt) + $9 - $11,
            ST_X(origin.pt) + $8 + $10,
            ST_Y(origin.pt) + $9 + $11,
            ${SRID_WEB_MERCATOR}
          ),
          ${SRID_WGS84}
        ),
        $6
      )
    FROM origin
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

const upsertOccupant = async (
  { ma_nguoi_mat, ma_lo_dat, ho_ten, ngay_sinh, ngay_mat, ngay_an_tang, thong_tin_than_nhan },
  client
) => {
  const sql = `
    INSERT INTO nguoi_mat (
      ma_nguoi_mat, ma_lo_dat, ho_ten, ngay_sinh, ngay_mat, ngay_an_tang, thong_tin_than_nhan
    )
    VALUES ($1, $2, $3, $4::date, $5::date, $6::date, $7)
    ON CONFLICT (ma_lo_dat) DO UPDATE SET
      ho_ten = EXCLUDED.ho_ten,
      ngay_sinh = COALESCE(EXCLUDED.ngay_sinh, nguoi_mat.ngay_sinh),
      ngay_mat = COALESCE(EXCLUDED.ngay_mat, nguoi_mat.ngay_mat),
      ngay_an_tang = COALESCE(EXCLUDED.ngay_an_tang, nguoi_mat.ngay_an_tang),
      thong_tin_than_nhan = COALESCE(EXCLUDED.thong_tin_than_nhan, nguoi_mat.thong_tin_than_nhan)
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
  validateCandidateLot,
  insertGraveLot,
  insertAdjacentTopologyRelation,
  findGraveStatusForUpdate,
  updateGraveStatus,
  upsertOccupant,
  deleteOccupantByGraveId,
};
