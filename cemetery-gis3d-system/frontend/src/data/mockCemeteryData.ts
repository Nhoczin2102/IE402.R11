import { GraveLot } from '../types/cemetery';

// Hàm tính cao độ địa hình đồi lượn sóng chuẩn TIN/DEM
export const getTerrainHeight = (x: number, z: number): number => {
  return Math.sin(x * 0.05) * 1.8 + Math.cos(z * 0.04) * 1.5 + (x * 0.02 + z * 0.015) * 1.5;
};

const defaultSurfaces = [
  { id: 'F_GROUND', surfaceType: 'GroundSurface' as const, label: 'Móng bệ bê tông tiếp đất', areaM2: 3.52 },
  { id: 'F_WALL', surfaceType: 'WallSurface' as const, label: '4 Mặt tường bao thân mộ', areaM2: 4.80 },
  { id: 'F_ROOF', surfaceType: 'RoofSurface' as const, label: 'Nắp mộ & Mặt bia đá', areaM2: 2.95 },
];

const rawLots: Omit<GraveLot, 'cao_do_z' | 'position'>[] = [
  {
    ma_lo_dat: 'A-01', ma_phan_khu: 'Khu A', vi_tri_hang_o: 'Hàng 1 - Ô 1', trang_thai: 'Đã an táng',
    dien_tich_lo: 3.52, do_sau_huyet: 2.0, ten_mau_mo: 'Mộ đơn đá Granite', chieu_cao_chuan: 1.2,
    surfaces: defaultSurfaces,
    nguoi_mat: { ho_ten: 'Nguyễn Văn An', ngay_sinh: '12/04/1942', ngay_mat: '20/08/2019', ngay_an_tang: '23/08/2019', thong_tin_than_nhan: 'Nguyễn Văn Bình (Con trai) - 0901234567' },
    topology: { khoang_cach_ke_can: 0.6, hop_le_quy_hoach: true },
  },
  {
    ma_lo_dat: 'A-02', ma_phan_khu: 'Khu A', vi_tri_hang_o: 'Hàng 1 - Ô 2', trang_thai: 'Trống',
    dien_tich_lo: 3.52, do_sau_huyet: 2.0, ten_mau_mo: 'Mộ đơn tiêu chuẩn', chieu_cao_chuan: 1.1,
    surfaces: defaultSurfaces,
    topology: { khoang_cach_ke_can: 0.6, hop_le_quy_hoach: true },
  },
  {
    ma_lo_dat: 'A-03', ma_phan_khu: 'Khu A', vi_tri_hang_o: 'Hàng 1 - Ô 3', trang_thai: 'Đã đặt trước',
    dien_tich_lo: 3.52, do_sau_huyet: 2.0, ten_mau_mo: 'Mộ đơn tiêu chuẩn', chieu_cao_chuan: 1.1,
    surfaces: defaultSurfaces,
    nguoi_mat: { ho_ten: 'Đặng Thị Cúc (Đặt trước)', thong_tin_than_nhan: 'Lê Minh Tâm - 0918223344' },
    topology: { khoang_cach_ke_can: 0.55, hop_le_quy_hoach: true },
  },
  {
    ma_lo_dat: 'A-04', ma_phan_khu: 'Khu A', vi_tri_hang_o: 'Hàng 2 - Ô 1', trang_thai: 'Đã an táng',
    dien_tich_lo: 3.80, do_sau_huyet: 2.2, ten_mau_mo: 'Mộ đá xanh Thanh Hóa', chieu_cao_chuan: 1.3,
    surfaces: defaultSurfaces,
    nguoi_mat: { ho_ten: 'Trần Hoàng Dũng', ngay_sinh: '05/09/1935', ngay_mat: '11/11/2021', ngay_an_tang: '14/11/2021', thong_tin_than_nhan: 'Trần Thị Mai - 0987654321' },
    topology: { khoang_cach_ke_can: 0.6, hop_le_quy_hoach: true },
  },
  {
    ma_lo_dat: 'B-01', ma_phan_khu: 'Khu B', vi_tri_hang_o: 'Hàng 1 - Ô 1', trang_thai: 'Đã an táng',
    dien_tich_lo: 4.20, do_sau_huyet: 2.2, ten_mau_mo: 'Lăng mộ gia tộc nhỏ', chieu_cao_chuan: 1.45,
    surfaces: defaultSurfaces,
    nguoi_mat: { ho_ten: 'Phạm Hữu Phước', ngay_sinh: '19/02/1950', ngay_mat: '02/03/2023', ngay_an_tang: '05/03/2023', thong_tin_than_nhan: 'Phạm Quốc Bảo - 0933445566' },
    topology: { khoang_cach_ke_can: 0.8, hop_le_quy_hoach: true },
  },
  {
    ma_lo_dat: 'B-02', ma_phan_khu: 'Khu B', vi_tri_hang_o: 'Hàng 1 - Ô 2', trang_thai: 'Trống',
    dien_tich_lo: 4.20, do_sau_huyet: 2.2, ten_mau_mo: 'Lăng mộ gia tộc nhỏ', chieu_cao_chuan: 1.45,
    surfaces: defaultSurfaces,
    topology: { khoang_cach_ke_can: 0.8, hop_le_quy_hoach: true },
  },
  {
    ma_lo_dat: 'B-03', ma_phan_khu: 'Khu B', vi_tri_hang_o: 'Hàng 2 - Ô 1', trang_thai: 'Trống',
    dien_tich_lo: 3.52, do_sau_huyet: 2.0, ten_mau_mo: 'Mộ đơn tiêu chuẩn', chieu_cao_chuan: 1.1,
    surfaces: defaultSurfaces,
    topology: { khoang_cach_ke_can: 0.5, hop_le_quy_hoach: true },
  },
  {
    ma_lo_dat: 'C-01', ma_phan_khu: 'Khu C', vi_tri_hang_o: 'Hàng 1 - Ô 1', trang_thai: 'Đã an táng',
    dien_tich_lo: 3.60, do_sau_huyet: 1.9, ten_mau_mo: 'Mộ đơn có mái che', chieu_cao_chuan: 1.5,
    surfaces: defaultSurfaces,
    nguoi_mat: { ho_ten: 'Võ Thị Sáu', ngay_sinh: '10/10/1948', ngay_mat: '15/06/2020', ngay_an_tang: '18/06/2020', thong_tin_than_nhan: 'Võ Văn Hùng - 0977889900' },
    topology: { khoang_cach_ke_can: 0.65, hop_le_quy_hoach: true },
  },
  {
    ma_lo_dat: 'C-02', ma_phan_khu: 'Khu C', vi_tri_hang_o: 'Hàng 1 - Ô 2', trang_thai: 'Đã đặt trước',
    dien_tich_lo: 3.60, do_sau_huyet: 1.9, ten_mau_mo: 'Mộ đơn có mái che', chieu_cao_chuan: 1.5,
    surfaces: defaultSurfaces,
    nguoi_mat: { ho_ten: 'Hoàng Văn Thụ (Đặt trước)', thong_tin_than_nhan: 'Hoàng Lan Anh - 0944556677' },
    topology: { khoang_cach_ke_can: 0.65, hop_le_quy_hoach: true },
  },
  {
    ma_lo_dat: 'C-03', ma_phan_khu: 'Khu C', vi_tri_hang_o: 'Hàng 2 - Ô 1', trang_thai: 'Trống',
    dien_tich_lo: 3.52, do_sau_huyet: 1.8, ten_mau_mo: 'Mộ đơn tiêu chuẩn', chieu_cao_chuan: 1.1,
    surfaces: defaultSurfaces,
    topology: { khoang_cach_ke_can: 0.6, hop_le_quy_hoach: true },
  },
];

// Tọa độ bố trí trên không gian 3D
const coordinatesMap: Record<string, [number, number]> = {
  'A-01': [-22, -16], 'A-02': [-17, -16], 'A-03': [-12, -16], 'A-04': [-22, -10],
  'B-01': [-3, 2],    'B-02': [3, 2],     'B-03': [-3, 8],
  'C-01': [16, -12],  'C-02': [21, -12],  'C-03': [16, -6],
};

export const INITIAL_GRAVES: GraveLot[] = rawLots.map((item) => {
  const [x, z] = coordinatesMap[item.ma_lo_dat] || [0, 0];
  const y = getTerrainHeight(x, z);
  return {
    ...item,
    cao_do_z: Number(y.toFixed(2)),
    position: [x, y, z],
  };
});