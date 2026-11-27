import { GraveLot } from '../types/cemetery';
import { INITIAL_GRAVES, getTerrainHeight } from '../data/mockCemeteryData';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const API_BASE_URL = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL
  : `${RAW_API_URL.replace(/\/$/, '')}/api`;

export interface InfrastructureItem {
  ma_ha_tang: string;
  ma_phan_khu: string | null;
  ten_ha_tang: string;
  loai_ha_tang: 'CONG' | 'DAI_TUONG_NIEM' | 'NHA_TANG_LE' | 'CAY_XANH' | string;
  dien_tich_xay_dung: number;
  chieu_cao_3d: number;
  ban_kinh_cach_ly: number;
  geojson: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  };
}

export interface RoadSegmentItem {
  ma_tuyen_duong: string;
  ma_phan_khu: string | null;
  ten_tuyen_duong: string;
  loai_duong: string;
  chieu_rong_duong: number;
  chieu_dai_3d_m: number;
  geojson: {
    type: 'LineString';
    coordinates: number[][];
  };
}

export const cemeteryApi = {
  // Lấy danh sách lô mộ 3D từ PostGIS (Fallback về mock data nếu BE offline)
  async fetchGraves(): Promise<{ data: GraveLot[]; isLiveBackend: boolean }> {
    try {
      const res = await fetch(`${API_BASE_URL}/graves`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Backend response error');
      const data: GraveLot[] = await res.json();
      return { data, isLiveBackend: true };
    } catch {
      return { data: INITIAL_GRAVES, isLiveBackend: false };
    }
  },

  // Gửi yêu cầu cấp phát mộ mới xuống PostgreSQL
  async allocateGrave(payload: {
    ma_lo_dat: string;
    trang_thai: 'Đã an táng' | 'Đã đặt trước';
    ho_ten: string;
    thong_tin_than_nhan: string;
  }): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/graves/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Cập nhật trạng thái hoặc thu hồi lô mộ
  async updateGraveStatus(
    maLoDat: string,
    payload: {
      trang_thai: 'Trống' | 'Đã an táng' | 'Đã đặt trước';
      ho_ten?: string;
      thong_tin_than_nhan?: string;
    }
  ): Promise<GraveLot | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/graves/${encodeURIComponent(maLoDat)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    } catch {
      return null;
    }
  },

  // Gọi API tính đường dẫn 3D ngắn nhất từ Cổng chính
  async getShortestRoute3D(targetX: number, targetZ: number): Promise<[number, number, number][]> {
    try {
      const res = await fetch(
        `${API_BASE_URL}/routing/shortest-path?targetX=${targetX}&targetZ=${targetZ}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Routing API error');
      const json = await res.json();
      return json.routePath || json?.data?.routePath;
    } catch {
      const gatePoint: [number, number, number] = [0, getTerrainHeight(0, 42), 42];
      const midJunction: [number, number, number] = [0, getTerrainHeight(0, targetZ), targetZ];
      const targetPoint: [number, number, number] = [targetX, getTerrainHeight(targetX, targetZ), targetZ];
      return [gatePoint, midJunction, targetPoint];
    }
  },

  // Lấy danh sách công trình hạ tầng 3D từ PostGIS
  async fetchInfrastructures(): Promise<InfrastructureItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/zones/infrastructure`, { cache: 'no-store' });
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data || [];
    } catch {
      return [];
    }
  },

  // Lấy danh sách tuyến đường nội bộ 3D từ PostGIS
  async fetchRoads(): Promise<RoadSegmentItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/zones/roads`, { cache: 'no-store' });
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data || [];
    } catch {
      return [];
    }
  },

  getExportCsvUrl(): string {
    return `${API_BASE_URL}/graves/export/csv`;
  },
};