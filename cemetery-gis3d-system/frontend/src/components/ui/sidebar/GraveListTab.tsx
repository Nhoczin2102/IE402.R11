'use client';

import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { GraveLot } from '../../../types/cemetery';

interface GraveListTabProps {
  graves: GraveLot[];
  selectedGrave: GraveLot | null;
  onSelectGrave: (grave: GraveLot) => void;
}

const STATUS_BADGE: Record<string, string> = {
  'Trống': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Đã an táng': 'bg-slate-700/60 text-slate-300 border-slate-600/60',
  'Đã đặt trước': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export const GraveListTab: React.FC<GraveListTabProps> = ({ graves, selectedGrave, onSelectGrave }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredGraves = graves.filter((g) => {
    const matchText =
      g.ma_lo_dat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Boolean(g.nguoi_mat?.ho_ten?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchSec = filterSection === 'ALL' || g.ma_phan_khu === filterSection;
    const matchStat = filterStatus === 'ALL' || g.trang_thai === filterStatus;
    return matchText && matchSec && matchStat;
  });

  return (
    <>
      <div className="p-3.5 border-b border-white/10 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm mã lô (A-01) hoặc họ tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/70 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/70"
          >
            <option value="ALL">Tất cả phân khu</option>
            <option value="Khu A">Khu A (Đồi Đông)</option>
            <option value="Khu B">Khu B (Trung Tâm)</option>
            <option value="Khu C">Khu C (Đồi Tây)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/70"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="Trống">Còn trống</option>
            <option value="Đã an táng">Đã an táng</option>
            <option value="Đã đặt trước">Đã đặt trước</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="flex justify-between items-center px-1 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
          <span>Danh sách lô quy hoạch</span>
          <span className="font-mono tabular-nums">{filteredGraves.length} lô</span>
        </div>

        {filteredGraves.map((lot) => {
          const isSelected = selectedGrave?.ma_lo_dat === lot.ma_lo_dat;
          return (
            <div
              key={lot.ma_lo_dat}
              onClick={() => onSelectGrave(lot)}
              className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'bg-sky-500/15 border-sky-400/60 shadow-[0_0_20px_rgba(56,189,248,0.12)]'
                  : 'bg-slate-900/60 border-white/5 hover:bg-slate-800/70 hover:border-white/15'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-sky-400' : 'text-emerald-400'}`} />
                  <span className="font-bold text-sm text-white tabular-nums">{lot.ma_lo_dat}</span>
                  <span className="text-[11px] text-slate-400">· {lot.ma_phan_khu}</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                    STATUS_BADGE[lot.trang_thai] || STATUS_BADGE['Trống']
                  }`}
                >
                  {lot.trang_thai}
                </span>
              </div>

              <div className="text-xs text-slate-300 truncate pl-5">
                {lot.nguoi_mat ? (
                  lot.nguoi_mat.ho_ten
                ) : (
                  <span className="text-slate-500 italic">Vị trí đất trống sẵn sàng</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 pl-5 mt-1 font-mono tabular-nums">
                Z: {lot.cao_do_z}m · S: {lot.dien_tich_lo}m²
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};