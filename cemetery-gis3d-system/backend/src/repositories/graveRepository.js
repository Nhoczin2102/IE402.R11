const db = require('../config/database');

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

const findAllGraves = async ({ ma_phan_khu, trang_thai, search } = {}) => {
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
  findGraveStatusForUpdate,
  updateGraveStatus,
  upsertOccupant,
  deleteOccupantByGraveId,
};
