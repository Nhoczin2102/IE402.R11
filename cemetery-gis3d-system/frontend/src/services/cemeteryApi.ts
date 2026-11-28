import { GraveLot } from '../types/cemetery';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');

export interface InfrastructureItem {
  ma_ha_tang: string;
  ma_phan_khu: string | null;
  ten_ha_tang: string;
  loai_ha_tang: string;
  dien_tich_xay_dung: number | string;
  chieu_cao_3d: number | string;
  ban_kinh_cach_ly: number | string;
  geojson: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  } | null;
}

export interface RoadSegmentItem {
  ma_tuyen_duong: string;
  ma_phan_khu: string | null;
  ten_tuyen_duong: string;
  loai_duong: string;
  chieu_rong_duong: number | string;
  dien_tich_duong: number | string;
  chieu_dai_3d_m?: number | string;
  geojson: {
    type: 'LineString';
    coordinates: number[][];
  } | null;
}

export const cemeteryApi = {
  async fetchGraves(): Promise<{ data: GraveLot[] }> {
    try {
      const res = await fetch(`${API_BASE}/graves`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : json.data || [];
      return { data: list };
    } catch (err) {
      console.error('[cemeteryApi] Lỗi tải danh sách lô mộ:', err);
      return { data: [] };
    }
  },

  async fetchInfrastructures(): Promise<InfrastructureItem[]> {
    try {
      const res = await fetch(`${API_BASE}/zones/infrastructure`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    } catch (err) {
      console.error('[cemeteryApi] Lỗi tải hạ tầng:', err);
      return [];
    }
  },

  async fetchRoads(): Promise<RoadSegmentItem[]> {
    try {
      const res = await fetch(`${API_BASE}/zones/roads`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    } catch (err) {
      console.error('[cemeteryApi] Lỗi tải tuyến giao thông:', err);
      return [];
    }
  },

  async getShortestRoute3D(
    targetX: number,
    targetZ: number,
    startNode = 'GATE'
  ): Promise<[number, number, number][]> {
    try {
      const url = `${API_BASE}/routing/shortest-path?targetX=${encodeURIComponent(
        targetX
      )}&targetZ=${encodeURIComponent(targetZ)}&startNode=${encodeURIComponent(startNode)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.routePath || [];
    } catch (err) {
      console.error('[cemeteryApi] Lỗi tìm đường 3D:', err);
      return [];
    }
  },

  async allocateGrave(payload: {
    ma_lo_dat: string;
    trang_thai: 'Đã an táng' | 'Đã đặt trước';
    ho_ten: string;
    ngay_sinh?: string;
    ngay_mat?: string;
    ngay_an_tang?: string;
    thong_tin_than_nhan?: string;
  }): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/graves/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        console.error('[cemeteryApi] Lỗi cấp phát lô:', errJson || res.status);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[cemeteryApi] Lỗi kết nối khi cấp phát lô:', err);
      return false;
    }
  },

  async updateGraveStatus(
    lotCode: string,
    payload: {
      trang_thai: 'Trống' | 'Đã an táng' | 'Đã đặt trước';
      ho_ten?: string;
      ngay_sinh?: string;
      ngay_mat?: string;
      ngay_an_tang?: string;
      thong_tin_than_nhan?: string;
    }
  ): Promise<GraveLot | null> {
    try {
      const res = await fetch(`${API_BASE}/graves/${encodeURIComponent(lotCode)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
  const errJson = await res.json().catch(() => null);
  console.warn(
    `[cemeteryApi] Lỗi cập nhật trạng thái lô (HTTP ${res.status}):`,
    JSON.stringify(errJson, null, 2)
  );
  return null;
}
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error('[cemeteryApi] Lỗi kết nối khi cập nhật lô:', err);
      return null;
    }
  },

  getExportCsvUrl(): string {
    return `${API_BASE}/graves/export/csv`;
  },
};