const db = require('../../config/database');
const graveRepository = require('./grave.repository');
const { GRAVE_STATUS } = require('../../constants/cemeteryConstants');
const AppError = require('../../utils/AppError');
const { toGeoJsonFeatureCollection } = require('../../utils/apiResponse');

const formatGraveRow = (row) => ({
  ma_lo_dat: row.ma_lo_dat,
  ma_phan_khu: row.ma_phan_khu,
  ma_mau_mo: row.ma_mau_mo,
  vi_tri_hang_o: row.vi_tri_hang_o,
  trang_thai: row.trang_thai,
  dien_tich_lo: Number(row.dien_tich_lo),
  dien_tich_postgis_m2: row.dien_tich_postgis_m2 !== null ? Number(row.dien_tich_postgis_m2) : Number(row.dien_tich_lo),
  cao_do_z: Number(row.cao_do_z),
  goc_xoay_z: Number(row.goc_xoay_z || 0),
  do_sau_huyet: Number(row.do_sau_huyet),
  position: [Number(row.toa_do_x), Number(row.cao_do_z), Number(row.toa_do_z)],
  ten_mau_mo: row.ten_mau_mo || 'Mộ đơn tiêu chuẩn',
  chieu_cao_chuan: Number(row.chieu_cao_chuan || 1.1),
  khoang_cach_ke_toi_thieu: Number(row.khoang_cach_ke_toi_thieu || 0.5),
  model_3d_url: row.model_3d_url || null,
  surfaces: Array.isArray(row.surfaces_sudm) ? row.surfaces_sudm : [],
  topology: row.topology_info || { khoang_cach_ke_can: 0.6, hop_le_quy_hoach: true },
  geojson: row.geojson || null,
  nguoi_mat: row.ho_ten
    ? {
        ma_nguoi_mat: row.ma_nguoi_mat,
        ho_ten: row.ho_ten,
        ngay_sinh: row.ngay_sinh || undefined,
        ngay_mat: row.ngay_mat || undefined,
        ngay_an_tang: row.ngay_an_tang || undefined,
        thong_tin_than_nhan: row.thong_tin_than_nhan || undefined,
      }
    : undefined,
});

const listGraves = async (filters = {}) => {
  const rows = await graveRepository.findAllGraves(filters);
  if (filters.format === 'geojson') {
    const formatted = rows.map(formatGraveRow);
    return toGeoJsonFeatureCollection(formatted, 'geojson', 'ma_lo_dat');
  }
  return rows.map(formatGraveRow);
};

const getGraveDetail = async (maLoDat) => {
  const row = await graveRepository.findGraveById(maLoDat);
  if (!row) {
    throw new AppError(`Không tìm thấy lô mộ có mã "${maLoDat}".`, 404, 'GRAVE_NOT_FOUND');
  }
  return formatGraveRow(row);
};

const allocateGrave = async ({
  ma_lo_dat,
  trang_thai,
  ho_ten,
  ngay_sinh,
  ngay_mat,
  ngay_an_tang,
  thong_tin_than_nhan,
}) =>
  db.withTransaction(async (client) => {
    const existing = await graveRepository.findGraveStatusForUpdate(ma_lo_dat, client);
    if (!existing) {
      throw new AppError(`Mã lô đất "${ma_lo_dat}" không tồn tại.`, 404, 'GRAVE_NOT_FOUND');
    }
    if (existing.trang_thai !== GRAVE_STATUS.EMPTY) {
      throw new AppError(
        `Lô đất "${ma_lo_dat}" hiện đang ở trạng thái "${existing.trang_thai}", không thể cấp phát mới.`,
        409,
        'GRAVE_ALREADY_ALLOCATED'
      );
    }

    await graveRepository.updateGraveStatus(ma_lo_dat, trang_thai, client);

    const displayName =
      trang_thai === GRAVE_STATUS.RESERVED && !ho_ten.includes('(Đặt trước)')
        ? `${ho_ten} (Đặt trước)`
        : ho_ten;

    const resolvedBurialDate =
      ngay_an_tang ||
      (trang_thai === GRAVE_STATUS.OCCUPIED ? new Date().toLocaleDateString('vi-VN') : null);

    const maNguoiMat = `NM-${ma_lo_dat.replace(/[^a-zA-Z0-9]/g, '')}`;

    await graveRepository.upsertOccupant(
      {
        ma_nguoi_mat: maNguoiMat,
        ma_lo_dat,
        ho_ten: displayName,
        ngay_sinh,
        ngay_mat,
        ngay_an_tang: resolvedBurialDate,
        thong_tin_than_nhan,
      },
      client
    );

    const updated = await graveRepository.findGraveById(ma_lo_dat, client);
    return formatGraveRow(updated);
  });

const updateGraveLifecycle = async (
  maLoDat,
  { trang_thai, ho_ten, ngay_sinh, ngay_mat, ngay_an_tang, thong_tin_than_nhan }
) =>
  db.withTransaction(async (client) => {
    const existing = await graveRepository.findGraveStatusForUpdate(maLoDat, client);
    if (!existing) {
      throw new AppError(`Mã lô đất "${maLoDat}" không tồn tại.`, 404, 'GRAVE_NOT_FOUND');
    }

    await graveRepository.updateGraveStatus(maLoDat, trang_thai, client);

    if (trang_thai === GRAVE_STATUS.EMPTY) {
      await graveRepository.deleteOccupantByGraveId(maLoDat, client);
    } else {
      const cleanedName =
        trang_thai === GRAVE_STATUS.OCCUPIED
          ? ho_ten.replace(/\s*\(Đặt trước\)\s*/g, '').trim()
          : ho_ten;

      const resolvedBurialDate =
        ngay_an_tang ||
        (trang_thai === GRAVE_STATUS.OCCUPIED ? new Date().toLocaleDateString('vi-VN') : null);

      const maNguoiMat = `NM-${maLoDat.replace(/[^a-zA-Z0-9]/g, '')}`;

      await graveRepository.upsertOccupant(
        {
          ma_nguoi_mat: maNguoiMat,
          ma_lo_dat: maLoDat,
          ho_ten: cleanedName,
          ngay_sinh,
          ngay_mat,
          ngay_an_tang: resolvedBurialDate,
          thong_tin_than_nhan,
        },
        client
      );
    }

    const updated = await graveRepository.findGraveById(maLoDat, client);
    return formatGraveRow(updated);
  });

const exportGravesCsv = async (filters = {}) => {
  const graves = await listGraves({ ...filters, format: 'json' });
  const headers = [
    'MaLoDat',
    'PhanKhu',
    'ViTriHangO',
    'TrangThai',
    'CaoDoZ(m)',
    'DienTich(m2)',
    'MauMo3D',
    'HoTenNguoiMat',
    'NgayAnTang',
    'ThanNhan',
  ];

  const escapeCsvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const lines = graves.map((g) =>
    [
      g.ma_lo_dat,
      g.ma_phan_khu,
      g.vi_tri_hang_o,
      g.trang_thai,
      g.cao_do_z,
      g.dien_tich_lo,
      g.ten_mau_mo,
      g.nguoi_mat?.ho_ten || '',
      g.nguoi_mat?.ngay_an_tang || '',
      g.nguoi_mat?.thong_tin_than_nhan || '',
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return `\uFEFF${[headers.join(','), ...lines].join('\n')}`;
};

module.exports = {
  listGraves,
  getGraveDetail,
  allocateGrave,
  updateGraveLifecycle,
  exportGravesCsv,
};
