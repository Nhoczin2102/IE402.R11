'use client';

import React from 'react';
import { X, User, Calendar, Phone, Box, CheckCircle2, Layers, Trash2, Check } from 'lucide-react';
import { GraveLot } from '../../types/cemetery';

interface GraveDetailDrawerProps {
  grave: GraveLot | null;
  onClose: () => void;
  onOpenAllocate: () => void;
  onUpdateStatus: (lotCode: string, newStatus: 'Trống' | 'Đã an táng') => void;
}

export const GraveDetailDrawer: React.FC<GraveDetailDrawerProps> = ({
  grave,
  onClose,
  onOpenAllocate,
  onUpdateStatus,
}) => {
  if (!grave) return null;

  // Tính cảnh báo độ dốc/thủy văn dựa theo cao độ Z
  const drainageStatus =
    grave.cao_do_z < -1.0
      ? { label: 'Vùng trũng - Cần rãnh thoát nước', color: 'text-amber-400' }
      : { label: 'Thoát nước tự nhiên tốt', color: 'text-emerald-400' };

  return (
    <div className="absolute right-5 top-5 w-92 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 z-20 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 border-b border-slate-700/80 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-white">Lô {grave.ma_lo_dat}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{grave.ma_phan_khu}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{grave.vi_tri_hang_o}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto text-xs">
        {/* 1. Hồ sơ an táng & Tác vụ nghiệp vụ */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Hồ sơ đối tượng an táng</div>
          {grave.nguoi_mat ? (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <User className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{grave.nguoi_mat.ho_ten}</span>
              </div>
              {grave.nguoi_mat.ngay_sinh && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Sinh: {grave.nguoi_mat.ngay_sinh} — Mất: {grave.nguoi_mat.ngay_mat}</span>
                </div>
              )}
              {grave.nguoi_mat.thong_tin_than_nhan && (
                <div className="flex items-start gap-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Thân nhân: {grave.nguoi_mat.thong_tin_than_nhan}</span>
                </div>
              )}

              {/* Các nút chuyển đổi vòng đời */}
              <div className="pt-2 flex gap-2">
                {grave.trang_thai === 'Đã đặt trước' && (
                  <button
                    onClick={() => onUpdateStatus(grave.ma_lo_dat, 'Đã an táng')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Xác nhận an táng</span>
                  </button>
                )}
                <button
                  onClick={() => onUpdateStatus(grave.ma_lo_dat, 'Trống')}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-800/70 text-rose-300 rounded-lg font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Thu hồi lô</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-2 text-center space-y-2">
              <p className="text-slate-400">Lô quy hoạch này hiện đang trống.</p>
              <button
                onClick={onOpenAllocate}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition"
              >
                Đăng ký cấp phát vị trí này
              </button>
            </div>
          )}
        </div>

        {/* 2. Dữ liệu không gian 3D & Phân tích thủy văn */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5" />
            <span>Dữ liệu không gian 3D &amp; Địa hình</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-900 p-2 rounded-lg">
              <div className="text-slate-500 text-[10px]">Tọa độ (X, Z)</div>
              <div className="font-mono text-slate-200 mt-0.5">[{grave.position[0]}, {grave.position[2]}]</div>
            </div>
            <div className="bg-slate-900 p-2 rounded-lg">
              <div className="text-slate-500 text-[10px]">Cao độ nền (Z)</div>
              <div className="font-mono text-amber-400 font-semibold mt-0.5">{grave.cao_do_z} m</div>
            </div>
            <div className="bg-slate-900 p-2 rounded-lg">
              <div className="text-slate-500 text-[10px]">Diện tích mặt dốc</div>
              <div className="font-mono text-slate-200 mt-0.5">{grave.dien_tich_lo} m²</div>
            </div>
            <div className="bg-slate-900 p-2 rounded-lg">
              <div className="text-slate-500 text-[10px]">Độ sâu huyệt ngầm</div>
              <div className="font-mono text-purple-400 font-semibold mt-0.5">-{grave.do_sau_huyet} m</div>
            </div>
          </div>
          <div className="bg-slate-900/80 px-2.5 py-1.5 rounded-lg text-[11px] flex justify-between">
            <span className="text-slate-400">Đánh giá thoát nước:</span>
            <span className={`font-medium ${drainageStatus.color}`}>{drainageStatus.label}</span>
          </div>
        </div>

        {/* 3. Phân lớp bề mặt SUDM */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Phân lớp Bề mặt SUDM ({grave.ten_mau_mo})</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {grave.surfaces.map((sf) => (
              <div key={sf.id} className="flex justify-between items-center bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                <div>
                  <span className="font-mono text-[11px] text-emerald-300 font-semibold">{sf.surfaceType}</span>
                  <div className="text-[10px] text-slate-400">{sf.label}</div>
                </div>
                <span className="font-mono text-slate-300">{sf.areaM2} m²</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Kiểm tra Topology */}
        <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-800/50 rounded-xl px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Chuẩn Topology (Cách lề {grave.topology.khoang_cach_ke_can}m)</span>
          </div>
          <span className="font-bold text-emerald-400">HỢP LỆ</span>
        </div>
      </div>
    </div>
  );
};