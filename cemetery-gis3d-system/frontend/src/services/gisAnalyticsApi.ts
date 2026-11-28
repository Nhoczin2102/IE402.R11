const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');

export interface ZoneCapacityItem {
  ma_phan_khu: string;
  ten_phan_khu: string;
  loai_phan_khu: string;
  dien_tich_con_lai_m2: number;
  thong_ke_lo_hien_huu: {
    tong_so_lo: number;
    so_lo_trong: number;
    so_lo_da_an_tang: number;
    so_lo_dat_truoc: number;
    ty_le_lap_day_phan_tram: number;
  };
  suc_chua_quy_hoach: {
    dien_tich_mo_chuan_tb_m2: number;
    suc_chua_toi_da_uoc_tinh: number;
    suc_chua_con_lai_uoc_tinh: number;
  };
}

export interface TopologyAuditData {
  hop_le_toan_khu: boolean;
  tong_so_vi_pham: number;
  vi_pham_chua_trong_phan_khu: unknown[];
  vi_pham_chong_lap_lo_mo: unknown[];
  vi_pham_vung_dem_ha_tang: unknown[];
}

export async function fetchZonesCapacity(): Promise<ZoneCapacityItem[]> {
  const res = await fetch(`${API_BASE}/zones/capacity`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data?.zones || [];
}

export async function fetchTopologyAudit(): Promise<TopologyAuditData> {
  const res = await fetch(`${API_BASE}/topology/audit`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}