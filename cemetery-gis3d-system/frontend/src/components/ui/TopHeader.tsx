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
    <div className="absolute left-5 bottom-5 bg-slate-950/80 backdrop-blur-2xl border border-white/10 ring-1 ring-inset ring-white/5 rounded-2xl px-5 py-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center gap-5 text-xs text-slate-200 z-10 select-none">
      <div>
        <div className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Tổng quỹ đất</div>
        <div className="text-base font-bold text-white mt-0.5 tabular-nums">{total} lô</div>
      </div>

      <div className="h-9 w-px bg-white/10" />

      <div className="min-w-[130px]">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-medium text-slate-400">
          <span>Tỷ lệ lấp đầy</span>
          <span className="text-amber-300 font-mono font-semibold tabular-nums">{fillPercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-400 mt-1 tabular-nums">
          {occupied} an táng · {reserved} đặt trước
        </div>
      </div>

      <div className="h-9 w-px bg-white/10" />

      <div>
        <div className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Khả dụng</div>
        <div className="text-base font-bold text-emerald-400 mt-0.5 tabular-nums">{available} lô</div>
      </div>

      <div className="h-9 w-px bg-white/10" />

      <div className="space-y-1 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          <span className="text-slate-300">Còn trống</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          <span className="text-slate-300">Đặt trước</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span className="text-slate-300">Đã an táng</span>
        </div>
      </div>
    </div>
  );
};