const pool = require('../config/db');

// 1. Lấy toàn bộ danh sách lô mộ 3D kèm thông tin người mất và SUDM
exports.getAllGraves = async (req, res) => {
  try {
    const query = `
      SELECT 
        l.ma_lo_dat, l.ma_phan_khu, l.vi_tri_hang_o, l.trang_thai,
        l.dien_tich_lo, l.cao_do_z, l.do_sau_huyet,
        l.toa_do_x, l.toa_do_z, l.surfaces_sudm, l.topology_info,
        m.ten_mau_mo, m.chieu_cao_chuan,
        n.ho_ten, n.ngay_sinh, n.ngay_mat, n.ngay_an_tang, n.thong_tin_than_nhan
      FROM lo_dat l
      LEFT JOIN mau_mo_3d m ON l.ma_mau = m.ma_mau
      LEFT JOIN nguoi_mat n ON l.ma_lo_dat = n.ma_lo_dat
      ORDER BY l.ma_lo_dat ASC;
    `;
    const { rows } = await pool.query(query);

    const formatted = rows.map((r) => ({
      ma_lo_dat: r.ma_lo_dat,
      ma_phan_khu: r.ma_phan_khu,
      vi_tri_hang_o: r.vi_tri_hang_o,
      trang_thai: r.trang_thai,
      dien_tich_lo: Number(r.dien_tich_lo),
      cao_do_z: Number(r.cao_do_z),
      do_sau_huyet: Number(r.do_sau_huyet),
      position: [Number(r.toa_do_x), Number(r.cao_do_z), Number(r.toa_do_z)],
      ten_mau_mo: r.ten_mau_mo || 'Mộ đơn tiêu chuẩn',
      chieu_cao_chuan: Number(r.chieu_cao_chuan || 1.1),
      surfaces: r.surfaces_sudm || [],
      topology: r.topology_info || { khoang_cach_ke_can: 0.6, hop_le_quy_hoach: true },
      nguoi_mat: r.ho_ten
        ? {
            ho_ten: r.ho_ten,
            ngay_sinh: r.ngay_sinh,
            ngay_mat: r.ngay_mat,
            ngay_an_tang: r.ngay_an_tang,
            thong_tin_than_nhan: r.thong_tin_than_nhan,
          }
        : undefined,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Lỗi getAllGraves:', err);
    res.status(500).json({ error: 'Không thể truy vấn dữ liệu không gian 3D' });
  }
};

// 2. Nghiệp vụ Cấp phát / Đăng ký lô mộ mới
exports.allocateGrave = async (req, res) => {
  const { ma_lo_dat, trang_thai, ho_ten, thong_tin_than_nhan } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const checkRes = await client.query('SELECT trang_thai FROM lo_dat WHERE ma_lo_dat = $1', [ma_lo_dat]);
    if (checkRes.rows.length === 0) {
      throw new Error('Mã lô đất không tồn tại');
    }
    if (checkRes.rows[0].trang_thai !== 'Trống') {
      throw new Error('Lô đất này đã được sử dụng hoặc đặt trước');
    }

    await client.query('UPDATE lo_dat SET trang_thai = $1 WHERE ma_lo_dat = $2', [trang_thai, ma_lo_dat]);

    const displayName = trang_thai === 'Đã đặt trước' ? `${ho_ten} (Đặt trước)` : ho_ten;
    const burialDate = trang_thai === 'Đã an táng' ? new Date().toLocaleDateString('vi-VN') : null;

    await client.query(
      `INSERT INTO nguoi_mat (ma_lo_dat, ho_ten, ngay_an_tang, thong_tin_than_nhan)
       VALUES ($1, $2, $3, $4)`, [ma_lo_dat, displayName, burialDate, thong_tin_than_nhan] );  await client.query('COMMIT'); res.json({ success: true, message: `Đã cập nhật trạng thái lô ${ma_lo_dat}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// 3. Cập nhật trạng thái vòng đời (Xác nhận an táng / Thu hồi trả trống lô)
exports.updateGrave = async (req, res) => {
  const { ma_lo_dat } = req.params;
  const { trang_thai, ho_ten, ngay_sinh, ngay_mat, thong_tin_than_nhan } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('UPDATE lo_dat SET trang_thai = $1 WHERE ma_lo_dat = $2', [trang_thai, ma_lo_dat]);

    if (trang_thai === 'Trống') {
      await client.query('DELETE FROM nguoi_mat WHERE ma_lo_dat = $1', [ma_lo_dat]);
    } else {
      await client.query(
        `INSERT INTO nguoi_mat (ma_lo_dat, ho_ten, ngay_sinh, ngay_mat, thong_tin_than_nhan)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (ma_lo_dat) DO UPDATE SET
           ho_ten = EXCLUDED.ho_ten,
           ngay_sinh = EXCLUDED.ngay_sinh,
           ngay_mat = EXCLUDED.ngay_mat,
           thong_tin_than_nhan = EXCLUDED.thong_tin_than_nhan`,
        [ma_lo_dat, ho_ten, ngay_sinh || null, ngay_mat || null, thong_tin_than_nhan || null]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Đã cập nhật lô ${ma_lo_dat}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};