const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ZoneCapacityItem {
  ma_phan_khu: string;
  ten_phan_khu: string;
  dien_tich_con_lai_m2: number;
  thong_ke_lo_hien_huu: {
    tong_so_lo: number;
    so_lo_trong: number;
    ty_le_lap_day_phan_tram: number;
  };
  suc_chua_quy_hoach: {
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

export interface LiveTopologyReport {
  hop_le_tong_the: boolean;
  containment: { hop_le: boolean };
  adjacency: {
    so_lo_lan_can: number;
    khoang_cach_gan_nhat_m: number | null;
    co_vi_pham: boolean;
  };
  infrastructure_buffer: { co_vi_pham: boolean };
}

export async function fetchZonesCapacity(): Promise<ZoneCapacityItem[]> {
  const res = await fetch(`${API_BASE}/api/zones/capacity`);
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.zones || [];
}

export async function fetchTopologyAudit(): Promise<TopologyAuditData | null> {
  const res = await fetch(`${API_BASE}/api/topology/audit`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data || null;
}

export async function fetchGraveTopology(maLoDat: string, radius = 10): Promise<LiveTopologyReport | null> {
  const res = await fetch(`${API_BASE}/api/topology/graves/${encodeURIComponent(maLoDat)}?radius=${radius}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data || null;
}