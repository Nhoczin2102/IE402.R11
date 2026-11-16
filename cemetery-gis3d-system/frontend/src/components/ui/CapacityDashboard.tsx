import React from 'react';
import { GraveLot } from '../../types/cemetery';

interface CapacityDashboardProps {
  graves: GraveLot[];
}

export const CapacityDashboard: React.FC<CapacityDashboardProps> = ({ graves }) => {
  const total = graves.length;
  const occupied = graves.filter((g) => g.trang_thai === 'Đã an táng').length;
  const reserved = graves.filter((g) => g.trang_thai === 'Đã đặt trước').length;
  const available = graves.filter((g) => g.trang_thai === 'Trống').length;
  const fillPercent = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;

  return (
    <div className="absolute left-5 bottom-5 bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-6 text-xs text-slate-200 z-10">
      <div>
        <div className="text-slate-400 text-[11px]">Tổng quỹ đất quy hoạch</div>
        <div className="text-base font-extrabold text-white mt-0.5">{total} Lô mộ</div>
      </div>

      <div className="h-8 w-px bg-slate-800" />

      <div>
        <div className="text-slate-400 text-[11px]">Đã sử dụng / Đặt trước</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-base font-extrabold text-amber-400">{occupied + reserved} lô</span>
          <span className="text-[11px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">{fillPercent}%</span>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-800" />

      <div>
        <div className="text-slate-400 text-[11px]">Quỹ đất trống khả dụng</div>
        <div className="text-base font-extrabold text-emerald-400 mt-0.5">{available} Lô</div>
      </div>

      {/* Chú giải màu sắc 3D */}
      <div className="h-8 w-px bg-slate-800" />
      <div className="space-y-1 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
          <span className="text-slate-300">Còn trống</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
          <span className="text-slate-300">Đặt trước</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 inline-block" />
          <span className="text-slate-300">Đã an táng</span>
        </div>
      </div>
    </div>
  );
};