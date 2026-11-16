import React, { useState } from 'react';
import { Search, Navigation, MapPin, PlusCircle, XCircle } from 'lucide-react';
import { GraveLot } from '../../types/cemetery';

interface SearchFilterSidebarProps {
  graves: GraveLot[];
  selectedGrave: GraveLot | null;
  onSelectGrave: (grave: GraveLot) => void;
  routeActive: boolean;
  onToggleRoute: () => void;
  onOpenAllocateModal: () => void;
}

export const SearchFilterSidebar: React.FC<SearchFilterSidebarProps> = ({
  graves,
  selectedGrave,
  onSelectGrave,
  routeActive,
  onToggleRoute,
  onOpenAllocateModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSection, setFilterSection] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredGraves = graves.filter((g) => {
    const matchText =
      g.ma_lo_dat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.nguoi_mat?.ho_ten && g.nguoi_mat.ho_ten.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchSec = filterSection === 'ALL' || g.ma_phan_khu === filterSection;
    const matchStat = filterStatus === 'ALL' || g.trang_thai === filterStatus;
    return matchText && matchSec && matchStat;
  });

  const statusBadge = {
    'Trống': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'Đã an táng': 'bg-slate-700/70 text-slate-300 border-slate-600',
    'Đã đặt trước': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  };

  return (
    <aside className="w-80 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col h-full z-10 text-slate-100">
      {/* Khu vực tìm kiếm & Lọc */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm mã lô (A-01) hoặc họ tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Tất cả phân khu</option>
            <option value="Khu A">Khu A (Đồi Đông)</option>
            <option value="Khu B">Khu B (Trung Tâm)</option>
            <option value="Khu C">Khu C (Đồi Tây)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="Trống">Còn trống</option>
            <option value="Đã an táng">Đã an táng</option>
            <option value="Đã đặt trước">Đã đặt trước</option>
          </select>
        </div>

        {/* Các nút tác vụ nhanh */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onToggleRoute}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition shadow ${
              routeActive
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {routeActive ? <XCircle className="w-3.5 h-3.5" /> : <Navigation className="w-3.5 h-3.5" />}
            <span>{routeActive ? 'Tắt dẫn đường' : 'Dẫn đường 3D'}</span>
          </button>

          <button
            onClick={onOpenAllocateModal}
            className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Cấp phát mộ</span>
          </button>
        </div>
      </div>

      {/* Danh sách kết quả */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="flex justify-between items-center px-1 text-[11px] text-slate-400">
          <span>DANH SÁCH LÔ QUY HOẠCH</span>
          <span className="font-mono">{filteredGraves.length} lô</span>
        </div>

        {filteredGraves.map((lot) => {
          const isSelected = selectedGrave?.ma_lo_dat === lot.ma_lo_dat;
          return (
            <div
              key={lot.ma_lo_dat}
              onClick={() => onSelectGrave(lot)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-sky-950/50 border-sky-500/80 shadow-md shadow-sky-950/50'
                  : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-sm text-white">{lot.ma_lo_dat}</span>
                  <span className="text-[11px] text-slate-400">• {lot.ma_phan_khu}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusBadge[lot.trang_thai]}`}>
                  {lot.trang_thai}
                </span>
              </div>

              <div className="text-xs text-slate-300 truncate pl-5">
                {lot.nguoi_mat ? lot.nguoi_mat.ho_ten : <span className="text-slate-500 italic">Vị trí đất trống sẵn sàng</span>}
              </div>
              <div className="text-[10px] text-slate-500 pl-5 mt-1 font-mono">
                Cao độ Z: {lot.cao_do_z}m | Diện tích: {lot.dien_tich_lo}m²
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};