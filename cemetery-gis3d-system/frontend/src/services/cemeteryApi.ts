import { GraveLot } from '../types/cemetery';
import { INITIAL_GRAVES, getTerrainHeight } from '../data/mockCemeteryData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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

  // Gọi API tính đường dẫn 3D ngắn nhất từ Cổng chính
  async getShortestRoute3D(targetX: number, targetZ: number): Promise<[number, number, number][]> {
    try {
      const res = await fetch(`${API_BASE_URL}/routing/shortest-path?targetX=${targetX}&targetZ=${targetZ}`);
      if (!res.ok) throw new Error('Routing API error');
      const json = await res.json();
      return json.routePath;
    } catch {
      // Fallback tính toán trực tiếp trên Client
      const gatePoint: [number, number, number] = [0, getTerrainHeight(0, 42), 42];
      const midJunction: [number, number, number] = [0, getTerrainHeight(0, targetZ), targetZ];
      const targetPoint: [number, number, number] = [targetX, getTerrainHeight(targetX, targetZ), targetZ];
      return [gatePoint, midJunction, targetPoint];
    }
  },
};