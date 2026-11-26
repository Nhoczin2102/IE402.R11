export type GraveStatus = 'Trống' | 'Đã an táng' | 'Đã đặt trước';
export type SUDMSurfaceType = 'GroundSurface' | 'WallSurface' | 'RoofSurface';

export interface SUDMVertex {
  id: string;
  coords: [number, number, number];
}

export interface SUDMFace {
  id: string;
  surfaceType: SUDMSurfaceType;
  label: string;
  areaM2: number;
}

export interface GraveLot {
  ma_lo_dat: string;
  ma_phan_khu: 'Khu A' | 'Khu B' | 'Khu C' | 'PK-A' | 'PK-B' | 'PK-C' | (string & {});
  ma_mau_mo?: string;
  vi_tri_hang_o: string;
  trang_thai: GraveStatus;
  dien_tich_lo: number;
  cao_do_z: number;
  goc_xoay_z?: number;
  do_sau_huyet: number;
  position: [number, number, number]; // Tọa độ thế giới [x, y, z]
  // Thông tin mẫu mộ B-Rep/SUDM
  ten_mau_mo: string;
  chieu_cao_chuan: number;
  surfaces: SUDMFace[];
  // Thông tin người mất (nếu đã an táng hoặc đặt trước)
  nguoi_mat?: {
    ma_nguoi_mat?: string;
    ho_ten: string;
    ngay_sinh?: string;
    ngay_mat?: string;
    ngay_an_tang?: string;
    thong_tin_than_nhan?: string;
  };
  // Quan hệ Topology kiểm tra quy hoạch
  topology: {
    khoang_cach_ke_can: number;
    hop_le_quy_hoach: boolean;
  };
}