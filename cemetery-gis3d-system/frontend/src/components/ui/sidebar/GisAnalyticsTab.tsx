'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  ZoneCapacityItem,
  TopologyAuditData,
  fetchZonesCapacity,
  fetchTopologyAudit,
} from '../../../services/gisAnalyticsApi';

interface GisAnalyticsTabProps {
  refreshTrigger: number;
}

export const GisAnalyticsTab: React.FC<GisAnalyticsTabProps> = ({ refreshTrigger }) => {
  const [zonesCapacity, setZonesCapacity] = useState<ZoneCapacityItem[]>([]);
  const [auditData, setAuditData] = useState<TopologyAuditData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [zones, audit] = await Promise.all([fetchZonesCapacity(), fetchTopologyAudit()]);
      setZonesCapacity(zones);
      setAuditData(audit);
    } catch {
      setAuditData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, refreshTrigger]);

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Kiểm toán Topology 3D
        </span>
        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 transition"
          title="Tải lại phân tích PostGIS"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {auditData ? (
        <div
          className={`p-3.5 rounded-xl border ${
            auditData.hop_le_toan_khu
              ? 'bg-emerald-950/30 border-emerald-500/30'
              : 'bg-rose-950/30 border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold mb-2">
            {auditData.hop_le_toan_khu ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span className={auditData.hop_le_toan_khu ? 'text-emerald-300' : 'text-rose-300'}>
              {auditData.hop_le_toan_khu ? 'Toàn khu hợp lệ' : `Phát hiện ${auditData.tong_so_vi_pham} lỗi`}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] tabular-nums">
            <div className="bg-slate-950/60 rounded-lg p-1.5">
              <div className="text-slate-400">Ngoài khu</div>
              <div className="font-bold text-white mt-0.5">{auditData.vi_pham_chua_trong_phan_khu.length}</div>
            </div>
            <div className="bg-slate-950/60 rounded-lg p-1.5">
              <div className="text-slate-400">Chồng lấp</div>
              <div className="font-bold text-white mt-0.5">{auditData.vi_pham_chong_lap_lo_mo.length}</div>
            </div>
            <div className="bg-slate-950/60 rounded-lg p-1.5">
              <div className="text-slate-400">Vùng đệm</div>
              <div className="font-bold text-white mt-0.5">{auditData.vi_pham_vung_dem_ha_tang.length}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-slate-400 text-center">
          {loading ? 'Đang truy vấn PostGIS...' : 'Chưa kết nối được API kiểm toán.'}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Sức chứa theo phân khu (PostGIS)
        </div>
        {zonesCapacity.map((z) => (
          <div key={z.ma_phan_khu} className="p-3 rounded-xl bg-slate-900/70 border border-white/10 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-white">{z.ten_phan_khu}</span>
              <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                {z.thong_ke_lo_hien_huu.ty_le_lap_day_phan_tram}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
                style={{ width: `${Math.min(100, z.thong_ke_lo_hien_huu.ty_le_lap_day_phan_tram)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 tabular-nums">
              <span>Còn trống: {z.thong_ke_lo_hien_huu.so_lo_trong}/{z.thong_ke_lo_hien_huu.tong_so_lo} lô</span>
              <span>Ước tính: +{z.suc_chua_quy_hoach.suc_chua_con_lai_uoc_tinh} lô</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono tabular-nums">
              Quỹ đất khả dụng còn lại: {z.dien_tich_con_lai_m2} m²
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};